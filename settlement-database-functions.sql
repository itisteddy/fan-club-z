-- Settlement Database Functions for Fan Club Z v2.0
-- This file contains all database functions required for the settlement system

-- Function to settle a prediction manually
CREATE OR REPLACE FUNCTION settle_prediction_manual(
  p_prediction_id UUID,
  p_winning_option_id UUID,
  p_settled_by UUID,
  p_proof_url TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(settlement_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settlement_id UUID;
  v_total_pool DECIMAL(18,8);
  v_winning_pool DECIMAL(18,8);
  v_platform_fee_rate DECIMAL(5,2) := 0.05; -- 5% platform fee
  v_creator_fee_rate DECIMAL(5,2) := 0.01; -- 1% creator fee
  v_platform_fee DECIMAL(18,8);
  v_creator_fee DECIMAL(18,8);
  v_total_payout DECIMAL(18,8);
  entry_record RECORD;
  v_user_payout DECIMAL(18,8);
BEGIN
  -- Get prediction details
  SELECT pool_total INTO v_total_pool 
  FROM predictions 
  WHERE id = p_prediction_id AND status = 'closed';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prediction not found or not closed';
  END IF;

  -- Get winning option pool
  SELECT total_staked INTO v_winning_pool
  FROM prediction_options
  WHERE id = p_winning_option_id AND prediction_id = p_prediction_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Winning option not found';
  END IF;

  -- Calculate fees
  v_platform_fee := v_total_pool * v_platform_fee_rate;
  v_creator_fee := v_total_pool * v_creator_fee_rate;
  v_total_payout := v_total_pool - v_platform_fee - v_creator_fee;

  -- Start transaction
  BEGIN
    -- Create settlement record
    INSERT INTO prediction_settlements (
      prediction_id,
      winning_option_id,
      total_payout,
      platform_fee_collected,
      creator_payout_amount,
      settlement_time,
      settled_by,
      proof_url,
      settlement_reason
    ) VALUES (
      p_prediction_id,
      p_winning_option_id,
      v_total_payout,
      v_platform_fee,
      v_creator_fee,
      NOW(),
      p_settled_by,
      p_proof_url,
      p_reason
    ) RETURNING id INTO v_settlement_id;

    -- Update prediction status and outcome
    UPDATE predictions 
    SET 
      status = 'settled',
      settled_outcome_id = p_winning_option_id,
      updated_at = NOW()
    WHERE id = p_prediction_id;

    -- Mark winning option
    UPDATE prediction_options
    SET is_winning_outcome = TRUE
    WHERE id = p_winning_option_id;

    -- Process payouts for winning entries
    FOR entry_record IN
      SELECT pe.id, pe.user_id, pe.amount
      FROM prediction_entries pe
      WHERE pe.prediction_id = p_prediction_id 
      AND pe.option_id = p_winning_option_id
      AND pe.status = 'active'
    LOOP
      -- Calculate individual payout
      v_user_payout := (entry_record.amount / v_winning_pool) * v_total_payout;
      
      -- Update entry with payout
      UPDATE prediction_entries
      SET 
        status = 'won',
        actual_payout = v_user_payout,
        updated_at = NOW()
      WHERE id = entry_record.id;

      -- Credit user wallet
      UPDATE wallets
      SET 
        available_balance = available_balance + v_user_payout,
        reserved_balance = reserved_balance - entry_record.amount,
        updated_at = NOW()
      WHERE user_id = entry_record.user_id AND currency = 'USD';

      -- Create wallet transaction
      INSERT INTO wallet_transactions (
        user_id,
        type,
        currency,
        amount,
        status,
        reference,
        related_prediction_entry_id,
        created_at
      ) VALUES (
        entry_record.user_id,
        'prediction_release',
        'USD',
        v_user_payout,
        'completed',
        'settlement_' || v_settlement_id,
        entry_record.id,
        NOW()
      );
    END LOOP;

    -- Mark losing entries
    UPDATE prediction_entries
    SET 
      status = 'lost',
      actual_payout = 0,
      updated_at = NOW()
    WHERE prediction_id = p_prediction_id 
    AND option_id != p_winning_option_id
    AND status = 'active';

    -- Process creator payout if applicable
    IF v_creator_fee > 0 THEN
      INSERT INTO creator_payouts (
        creator_id,
        prediction_id,
        amount,
        currency,
        status,
        created_at
      )
      SELECT 
        creator_id,
        p_prediction_id,
        v_creator_fee,
        'USD',
        'pending',
        NOW()
      FROM predictions
      WHERE id = p_prediction_id;
    END IF;

    RETURN QUERY SELECT v_settlement_id;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Settlement failed: %', SQLERRM;
  END;
END;
$$;

-- Function to settle a prediction automatically (via oracle)
CREATE OR REPLACE FUNCTION settle_prediction_auto(
  p_prediction_id UUID,
  p_winning_option_id UUID,
  p_oracle_source TEXT,
  p_settled_by UUID
)
RETURNS TABLE(settlement_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT settle_prediction_manual.settlement_id
  FROM settle_prediction_manual(
    p_prediction_id,
    p_winning_option_id,
    p_settled_by,
    NULL,
    'Auto-settled via ' || p_oracle_source
  );
END;
$$;

-- Function to re-settle a prediction (for dispute resolution)
CREATE OR REPLACE FUNCTION resettle_prediction(
  p_prediction_id UUID,
  p_new_winning_option_id UUID,
  p_resolved_by UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_settlement_id UUID;
  v_total_pool DECIMAL(18,8);
  v_old_winning_pool DECIMAL(18,8);
  v_new_winning_pool DECIMAL(18,8);
  v_platform_fee_rate DECIMAL(5,2) := 0.05;
  v_creator_fee_rate DECIMAL(5,2) := 0.01;
  v_platform_fee DECIMAL(18,8);
  v_creator_fee DECIMAL(18,8);
  v_total_payout DECIMAL(18,8);
  entry_record RECORD;
  v_user_payout DECIMAL(18,8);
  v_old_payout DECIMAL(18,8);
BEGIN
  -- Get existing settlement
  SELECT id INTO v_old_settlement_id
  FROM prediction_settlements
  WHERE prediction_id = p_prediction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existing settlement found';
  END IF;

  -- Get prediction pool
  SELECT pool_total INTO v_total_pool
  FROM predictions
  WHERE id = p_prediction_id;

  -- Get new winning option pool
  SELECT total_staked INTO v_new_winning_pool
  FROM prediction_options
  WHERE id = p_new_winning_option_id AND prediction_id = p_prediction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'New winning option not found';
  END IF;

  -- Calculate new fees and payouts
  v_platform_fee := v_total_pool * v_platform_fee_rate;
  v_creator_fee := v_total_pool * v_creator_fee_rate;
  v_total_payout := v_total_pool - v_platform_fee - v_creator_fee;

  BEGIN
    -- Reverse previous payouts
    FOR entry_record IN
      SELECT pe.id, pe.user_id, pe.amount, pe.actual_payout, pe.option_id
      FROM prediction_entries pe
      WHERE pe.prediction_id = p_prediction_id
      AND pe.status IN ('won', 'lost')
    LOOP
      -- Reverse wallet changes for winners
      IF entry_record.actual_payout > 0 THEN
        UPDATE wallets
        SET 
          available_balance = available_balance - entry_record.actual_payout,
          reserved_balance = reserved_balance + entry_record.amount,
          updated_at = NOW()
        WHERE user_id = entry_record.user_id AND currency = 'USD';

        -- Create reversal transaction
        INSERT INTO wallet_transactions (
          user_id,
          type,
          currency,
          amount,
          status,
          reference,
          related_prediction_entry_id,
          created_at
        ) VALUES (
          entry_record.user_id,
          'prediction_reversal',
          'USD',
          -entry_record.actual_payout,
          'completed',
          'reversal_' || v_old_settlement_id,
          entry_record.id,
          NOW()
        );
      END IF;

      -- Reset entry status
      UPDATE prediction_entries
      SET 
        status = 'active',
        actual_payout = NULL,
        updated_at = NOW()
      WHERE id = entry_record.id;
    END LOOP;

    -- Reset option winning status
    UPDATE prediction_options
    SET is_winning_outcome = NULL
    WHERE prediction_id = p_prediction_id;

    -- Process new settlement
    PERFORM settle_prediction_manual(
      p_prediction_id,
      p_new_winning_option_id,
      p_resolved_by,
      NULL,
      'Re-settled due to dispute resolution'
    );

    -- Mark settlement as dispute-resolved
    UPDATE prediction_settlements
    SET dispute_resolved = TRUE
    WHERE prediction_id = p_prediction_id;

    RETURN TRUE;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Re-settlement failed: %', SQLERRM;
  END;
END;
$$;

-- Function to get settlement analytics
CREATE OR REPLACE FUNCTION get_settlement_analytics()
RETURNS TABLE(
  total_settled INTEGER,
  total_volume DECIMAL(18,8),
  avg_settlement_time INTERVAL,
  pending_settlements INTEGER,
  open_disputes INTEGER,
  settlement_success_rate DECIMAL(5,2),
  total_fees_collected DECIMAL(18,8)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM predictions WHERE status = 'settled') as total_settled,
    (SELECT COALESCE(SUM(ps.total_payout), 0) FROM prediction_settlements ps) as total_volume,
    (SELECT AVG(ps.settlement_time - p.entry_deadline) 
     FROM prediction_settlements ps 
     JOIN predictions p ON ps.prediction_id = p.id) as avg_settlement_time,
    (SELECT COUNT(*)::INTEGER FROM predictions WHERE status = 'closed') as pending_settlements,
    (SELECT COUNT(*)::INTEGER FROM disputes WHERE status = 'open') as open_disputes,
    (SELECT 
      CASE 
        WHEN COUNT(*) > 0 THEN 
          (COUNT(*) FILTER (WHERE NOT EXISTS (
            SELECT 1 FROM disputes d WHERE d.prediction_id = p.id AND d.status = 'open'
          )) * 100.0 / COUNT(*))::DECIMAL(5,2)
        ELSE 100.0
      END
     FROM predictions p WHERE p.status = 'settled') as settlement_success_rate,
    (SELECT COALESCE(SUM(ps.platform_fee_collected), 0) FROM prediction_settlements ps) as total_fees_collected;
END;
$$;

-- Function to get prediction settlement history
CREATE OR REPLACE FUNCTION get_prediction_settlement_history(p_prediction_id UUID)
RETURNS TABLE(
  settlement_id UUID,
  winning_option_label TEXT,
  total_payout DECIMAL(18,8),
  platform_fee DECIMAL(18,8),
  creator_fee DECIMAL(18,8),
  settlement_time TIMESTAMP WITH TIME ZONE,
  settled_by_username TEXT,
  proof_url TEXT,
  settlement_reason TEXT,
  dispute_resolved BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    po.label,
    ps.total_payout,
    ps.platform_fee_collected,
    ps.creator_payout_amount,
    ps.settlement_time,
    u.username,
    ps.proof_url,
    ps.settlement_reason,
    ps.dispute_resolved
  FROM prediction_settlements ps
  JOIN prediction_options po ON ps.winning_option_id = po.id
  LEFT JOIN users u ON ps.settled_by = u.id
  WHERE ps.prediction_id = p_prediction_id
  ORDER BY ps.settlement_time DESC;
END;
$$;

-- Add helpful indexes for settlement operations
CREATE INDEX IF NOT EXISTS idx_predictions_status_closed ON predictions(status) WHERE status = 'closed';
CREATE INDEX IF NOT EXISTS idx_prediction_settlements_prediction_id ON prediction_settlements(prediction_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status_open ON disputes(status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_prediction_entries_settlement ON prediction_entries(prediction_id, option_id, status);

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION settle_prediction_manual TO authenticated;
GRANT EXECUTE ON FUNCTION settle_prediction_auto TO authenticated;
GRANT EXECUTE ON FUNCTION resettle_prediction TO authenticated;
GRANT EXECUTE ON FUNCTION get_settlement_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_prediction_settlement_history TO authenticated;
