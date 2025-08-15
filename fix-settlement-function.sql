-- Fix for the settlement function error in Supabase
-- Copy and paste this complete function into your Supabase SQL Editor

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
  v_platform_fee_rate DECIMAL(5,2) := 0.025; -- 2.5% platform fee
  v_creator_fee_rate DECIMAL(5,2) := 0.01; -- 1% creator fee
  v_platform_fee DECIMAL(18,8);
  v_creator_fee DECIMAL(18,8);
  v_total_payout DECIMAL(18,8);
  entry_record RECORD;
  v_user_payout DECIMAL(18,8);
  v_creator_id UUID;
BEGIN
  -- Get prediction details
  SELECT pool_total, creator_id INTO v_total_pool, v_creator_id
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
    
    -- Add payout to user's wallet
    UPDATE wallets
    SET 
      balance = balance + v_user_payout,
      updated_at = NOW()
    WHERE user_id = entry_record.user_id;
    
    -- Record wallet transaction
    INSERT INTO wallet_transactions (
      wallet_id,
      type,
      amount,
      description,
      reference_id,
      status
    ) VALUES (
      (SELECT id FROM wallets WHERE user_id = entry_record.user_id),
      'prediction_release',
      v_user_payout,
      'Prediction payout - ' || (SELECT title FROM predictions WHERE id = p_prediction_id),
      entry_record.id,
      'completed'
    );
  END LOOP;

  -- Mark losing entries
  UPDATE prediction_entries
  SET 
    status = 'lost',
    updated_at = NOW()
  WHERE prediction_id = p_prediction_id 
  AND option_id != p_winning_option_id
  AND status = 'active';

  -- Add creator payout to wallet
  IF v_creator_fee > 0 THEN
    UPDATE wallets
    SET 
      balance = balance + v_creator_fee,
      updated_at = NOW()
    WHERE user_id = v_creator_id;
    
    -- Record creator payout transaction
    INSERT INTO wallet_transactions (
      wallet_id,
      type,
      amount,
      description,
      reference_id,
      status
    ) VALUES (
      (SELECT id FROM wallets WHERE user_id = v_creator_id),
      'creator_payout',
      v_creator_fee,
      'Creator fee - ' || (SELECT title FROM predictions WHERE id = p_prediction_id),
      v_settlement_id,
      'completed'
    );
  END IF;

  RETURN QUERY SELECT v_settlement_id;
END;
$$;
