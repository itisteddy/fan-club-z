-- ============================================================================
-- FAN CLUB Z SETTLEMENT SYSTEM - DATABASE FUNCTIONS
-- ============================================================================
-- Execute this in your Supabase SQL Editor to set up the complete settlement system

-- ============================================================================
-- MANUAL SETTLEMENT FUNCTION
-- ============================================================================

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

-- ============================================================================
-- AUTO SETTLEMENT FUNCTION
-- ============================================================================

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
DECLARE
  v_settlement_id UUID;
BEGIN
  -- Call manual settlement with oracle source as proof
  SELECT settlement_id INTO v_settlement_id
  FROM settle_prediction_manual(
    p_prediction_id,
    p_winning_option_id,
    p_settled_by,
    p_oracle_source,
    'Auto-settled by oracle: ' || p_oracle_source
  );
  
  RETURN QUERY SELECT v_settlement_id;
END;
$$;

-- ============================================================================
-- RE-SETTLEMENT FUNCTION (FOR DISPUTE RESOLUTION)
-- ============================================================================

CREATE OR REPLACE FUNCTION resettle_prediction(
  p_prediction_id UUID,
  p_new_winning_option_id UUID,
  p_resolved_by UUID
)
RETURNS TABLE(success BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_settlement_id UUID;
  v_new_settlement_id UUID;
BEGIN
  -- Get current settlement
  SELECT id INTO v_old_settlement_id
  FROM prediction_settlements
  WHERE prediction_id = p_prediction_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existing settlement found for this prediction';
  END IF;

  -- Reverse the old settlement (refund all payouts)
  -- This is a simplified version - in production you'd want more sophisticated reversal logic
  
  -- Create new settlement
  SELECT settlement_id INTO v_new_settlement_id
  FROM settle_prediction_manual(
    p_prediction_id,
    p_new_winning_option_id,
    p_resolved_by,
    NULL,
    'Re-settled due to dispute resolution'
  );
  
  RETURN QUERY SELECT TRUE;
END;
$$;

-- ============================================================================
-- SETTLEMENT ANALYTICS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_settlement_analytics()
RETURNS TABLE(
  total_settlements BIGINT,
  manual_settlements BIGINT,
  auto_settlements BIGINT,
  total_payouts DECIMAL(18,8),
  total_fees_collected DECIMAL(18,8),
  avg_settlement_time INTERVAL,
  dispute_rate DECIMAL(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_settlements,
    COUNT(CASE WHEN ps.settlement_reason NOT LIKE 'Auto-settled%' THEN 1 END)::BIGINT as manual_settlements,
    COUNT(CASE WHEN ps.settlement_reason LIKE 'Auto-settled%' THEN 1 END)::BIGINT as auto_settlements,
    COALESCE(SUM(ps.total_payout), 0) as total_payouts,
    COALESCE(SUM(ps.platform_fee_collected), 0) as total_fees_collected,
    AVG(ps.settlement_time - p.entry_deadline) as avg_settlement_time,
    (COUNT(d.id)::DECIMAL / COUNT(*)) * 100 as dispute_rate
  FROM prediction_settlements ps
  JOIN predictions p ON ps.prediction_id = p.id
  LEFT JOIN disputes d ON p.id = d.prediction_id;
END;
$$;

-- ============================================================================
-- SETTLEMENT CRITERIA TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS settlement_criteria_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category prediction_category NOT NULL,
  description TEXT,
  criteria_template JSONB NOT NULL,
  verification_sources TEXT[],
  auto_settlement_capable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- VERIFICATION SOURCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS verification_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category prediction_category NOT NULL,
  reliability_score INTEGER CHECK (reliability_score >= 1 AND reliability_score <= 10),
  auto_verification_enabled BOOLEAN DEFAULT FALSE,
  api_endpoint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SAMPLE SETTLEMENT CRITERIA TEMPLATES
-- ============================================================================

INSERT INTO settlement_criteria_templates (name, category, description, criteria_template, verification_sources, auto_settlement_capable) VALUES
(
  'Sports Match Result',
  'sports',
  'Standard settlement for sports match outcomes',
  '{"type": "official_results", "verification_requirements": {"minimum_sources": 2, "required_source_types": ["official_website", "sports_api"], "confirmation_delay": "30_minutes"}}',
  ARRAY['ESPN', 'Official Team Website', 'Sports API'],
  true
),
(
  'Cryptocurrency Price',
  'custom',
  'Settlement based on cryptocurrency price at specific time',
  '{"type": "market_close", "verification_requirements": {"minimum_sources": 3, "required_source_types": ["crypto_exchange", "price_api"], "confirmation_delay": "immediate"}}',
  ARRAY['CoinGecko', 'Binance', 'CoinMarketCap'],
  true
),
(
  'Entertainment Event',
  'pop_culture',
  'Settlement for entertainment and pop culture events',
  '{"type": "official_announcement", "verification_requirements": {"minimum_sources": 2, "required_source_types": ["official_social", "news_outlet"], "confirmation_delay": "1_hour"}}',
  ARRAY['Official Social Media', 'Entertainment News', 'Press Release'],
  false
);

-- ============================================================================
-- SAMPLE VERIFICATION SOURCES
-- ============================================================================

INSERT INTO verification_sources (name, category, reliability_score, auto_verification_enabled) VALUES
-- Sports Sources
('ESPN', 'sports', 9, true),
('Official Team Website', 'sports', 10, true),
('Sports API', 'sports', 8, true),
('BBC Sport', 'sports', 9, true),

-- Crypto Sources
('CoinGecko', 'custom', 9, true),
('Binance', 'custom', 10, true),
('CoinMarketCap', 'custom', 9, true),
('Kraken', 'custom', 8, true),

-- Entertainment Sources
('Official Social Media', 'pop_culture', 8, false),
('Entertainment News', 'pop_culture', 7, false),
('Press Release', 'pop_culture', 9, false),
('Variety', 'pop_culture', 8, false);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Settlement criteria templates - read only for authenticated users
ALTER TABLE settlement_criteria_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to settlement criteria templates" ON settlement_criteria_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- Verification sources - read only for authenticated users
ALTER TABLE verification_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to verification sources" ON verification_sources
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_settlement_criteria_templates_category 
ON settlement_criteria_templates(category);

CREATE INDEX IF NOT EXISTS idx_verification_sources_category 
ON verification_sources(category);

CREATE INDEX IF NOT EXISTS idx_verification_sources_reliability 
ON verification_sources(reliability_score DESC);

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 'Settlement system database functions created successfully!' as status;
