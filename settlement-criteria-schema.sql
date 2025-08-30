-- Enhanced Settlement Criteria Schema
-- Add settlement criteria fields to predictions table

-- Add settlement criteria columns to predictions table
ALTER TABLE predictions 
ADD COLUMN settlement_criteria JSONB,
ADD COLUMN settlement_deadline_type VARCHAR(50) DEFAULT 'manual' CHECK (settlement_deadline_type IN ('immediate', 'scheduled', 'manual')),
ADD COLUMN settlement_scheduled_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN verification_sources TEXT[], -- Array of acceptable sources for verification
ADD COLUMN minimum_verification_count INTEGER DEFAULT 1,
ADD COLUMN auto_settlement_enabled BOOLEAN DEFAULT FALSE;

-- Create settlement criteria templates table
CREATE TABLE settlement_criteria_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  criteria_template JSONB NOT NULL,
  verification_sources TEXT[],
  auto_settlement_capable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create verification sources table
CREATE TABLE verification_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  url_pattern VARCHAR(500), -- Regex pattern for URL validation
  api_endpoint VARCHAR(500), -- For automatic verification
  category VARCHAR(100) NOT NULL,
  reliability_score DECIMAL(3,2) DEFAULT 5.0, -- 1-10 scale
  auto_verification_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default verification sources
INSERT INTO verification_sources (name, url_pattern, category, reliability_score, auto_verification_enabled) VALUES
('ESPN', '^https?://(www\.)?espn\.com/', 'sports', 9.5, TRUE),
('NFL Official', '^https?://(www\.)?nfl\.com/', 'sports', 10.0, TRUE),
('NBA Official', '^https?://(www\.)?nba\.com/', 'sports', 10.0, TRUE),
('Reuters', '^https?://(www\.)?reuters\.com/', 'news', 9.8, TRUE),
('Associated Press', '^https?://(www\.)?apnews\.com/', 'news', 9.9, TRUE),
('Billboard', '^https?://(www\.)?billboard\.com/', 'entertainment', 8.5, FALSE),
('Box Office Mojo', '^https?://(www\.)?boxofficemojo\.com/', 'entertainment', 9.0, TRUE),
('IMDb', '^https?://(www\.)?imdb\.com/', 'entertainment', 8.8, FALSE),
('Official Government Sources', '^https?://.*\.gov/', 'politics', 10.0, FALSE),
('Federal Election Commission', '^https?://(www\.)?fec\.gov/', 'politics', 10.0, TRUE);

-- Insert settlement criteria templates
INSERT INTO settlement_criteria_templates (name, category, description, criteria_template, verification_sources, auto_settlement_capable) VALUES
(
  'Sports Game Winner',
  'sports',
  'Determine the winner of a sports game',
  '{
    "type": "sports_game",
    "resolution_method": "final_score",
    "overtime_handling": "included",
    "forfeit_handling": "losing_team_forfeits",
    "verification_requirements": {
      "minimum_sources": 2,
      "required_source_types": ["official_league", "major_sports_media"],
      "confirmation_delay": "30_minutes"
    },
    "edge_cases": {
      "postponed_game": "void_all_bets",
      "abandoned_game": "official_ruling_required",
      "disqualification": "official_ruling_stands"
    }
  }',
  ARRAY['ESPN', 'NFL Official', 'NBA Official'],
  TRUE
),
(
  'Movie Box Office Performance',
  'entertainment',
  'Movie weekend box office performance vs threshold',
  '{
    "type": "box_office",
    "measurement_period": "opening_weekend",
    "territory": "domestic_us",
    "verification_requirements": {
      "minimum_sources": 1,
      "required_source_types": ["box_office_tracking"],
      "confirmation_delay": "monday_after_weekend"
    },
    "data_source_priority": ["Box Office Mojo", "The Numbers", "Variety"]
  }',
  ARRAY['Box Office Mojo'],
  TRUE
),
(
  'Election Results',
  'politics',
  'Official election outcome determination',
  '{
    "type": "election",
    "resolution_method": "official_certification",
    "verification_requirements": {
      "minimum_sources": 2,
      "required_source_types": ["government_official", "major_news_ap"],
      "confirmation_delay": "official_certification"
    },
    "edge_cases": {
      "recount_ordered": "await_final_certification",
      "legal_challenge": "await_final_legal_resolution",
      "postponed_election": "void_all_bets"
    }
  }',
  ARRAY['Official Government Sources', 'Associated Press'],
  FALSE
),
(
  'Weather Prediction',
  'custom',
  'Weather conditions at specific time and location',
  '{
    "type": "weather",
    "measurement_time": "specific_datetime",
    "location": "coordinates_required",
    "measurement_source": "national_weather_service",
    "verification_requirements": {
      "minimum_sources": 1,
      "required_source_types": ["official_weather_service"],
      "confirmation_delay": "1_hour_after_event"
    }
  }',
  ARRAY['National Weather Service'],
  TRUE
),
(
  'Stock Price Movement',
  'finance',
  'Stock price above/below threshold at market close',
  '{
    "type": "stock_price",
    "measurement_time": "market_close",
    "price_source": "official_exchange",
    "verification_requirements": {
      "minimum_sources": 2,
      "required_source_types": ["official_exchange", "financial_data_provider"],
      "confirmation_delay": "15_minutes_after_close"
    },
    "edge_cases": {
      "trading_halt": "use_last_traded_price",
      "market_closed": "use_previous_close",
      "stock_delisted": "void_all_bets"
    }
  }',
  ARRAY['NYSE', 'NASDAQ', 'Yahoo Finance'],
  TRUE
);

-- Function to validate settlement criteria
CREATE OR REPLACE FUNCTION validate_settlement_criteria(criteria JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check required fields
  IF NOT (criteria ? 'type') THEN
    RAISE EXCEPTION 'Settlement criteria must include type';
  END IF;
  
  IF NOT (criteria ? 'verification_requirements') THEN
    RAISE EXCEPTION 'Settlement criteria must include verification_requirements';
  END IF;
  
  -- Validate verification requirements structure
  IF NOT (criteria->'verification_requirements' ? 'minimum_sources') THEN
    RAISE EXCEPTION 'Verification requirements must include minimum_sources';
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function to check if auto-settlement is possible
CREATE OR REPLACE FUNCTION can_auto_settle(p_prediction_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  prediction_record RECORD;
  criteria_type TEXT;
  has_api_sources BOOLEAN;
BEGIN
  SELECT p.settlement_criteria, p.auto_settlement_enabled
  INTO prediction_record
  FROM predictions p
  WHERE p.id = p_prediction_id;
  
  IF NOT FOUND OR NOT prediction_record.auto_settlement_enabled THEN
    RETURN FALSE;
  END IF;
  
  -- Check if criteria type supports auto-settlement
  criteria_type := prediction_record.settlement_criteria->>'type';
  
  -- Check if we have API-enabled verification sources
  SELECT EXISTS(
    SELECT 1 FROM verification_sources vs
    WHERE vs.name = ANY(
      SELECT jsonb_array_elements_text(
        prediction_record.settlement_criteria->'data_source_priority'
      )
    )
    AND vs.auto_verification_enabled = TRUE
  ) INTO has_api_sources;
  
  RETURN has_api_sources;
END;
$$;

-- Updated settle_prediction_manual function with criteria validation
CREATE OR REPLACE FUNCTION settle_prediction_manual_with_criteria(
  p_prediction_id UUID,
  p_winning_option_id UUID,
  p_settled_by UUID,
  p_proof_url TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_verification_sources TEXT[] DEFAULT NULL
)
RETURNS TABLE(settlement_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settlement_id UUID;
  v_criteria JSONB;
  v_required_sources TEXT[];
  v_min_sources INTEGER;
  prediction_record RECORD;
BEGIN
  -- Get prediction with criteria
  SELECT p.*, p.settlement_criteria INTO prediction_record
  FROM predictions p
  WHERE p.id = p_prediction_id AND p.status = 'closed';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prediction not found or not closed';
  END IF;
  
  v_criteria := prediction_record.settlement_criteria;
  
  -- Validate settlement criteria compliance
  IF v_criteria IS NOT NULL THEN
    v_min_sources := (v_criteria->'verification_requirements'->>'minimum_sources')::INTEGER;
    
    IF array_length(p_verification_sources, 1) < v_min_sources THEN
      RAISE EXCEPTION 'Insufficient verification sources. Required: %, Provided: %', 
        v_min_sources, 
        COALESCE(array_length(p_verification_sources, 1), 0);
    END IF;
    
    -- Validate that provided sources match acceptable sources
    IF v_criteria ? 'data_source_priority' THEN
      v_required_sources := ARRAY(
        SELECT jsonb_array_elements_text(v_criteria->'data_source_priority')
      );
      
      -- Check if at least one provided source is in the acceptable list
      IF NOT EXISTS (
        SELECT 1 WHERE p_verification_sources && v_required_sources
      ) THEN
        RAISE EXCEPTION 'Verification sources must include at least one acceptable source: %', 
          array_to_string(v_required_sources, ', ');
      END IF;
    END IF;
  END IF;
  
  -- Call original settlement function
  RETURN QUERY
  SELECT settle_prediction_manual.settlement_id
  FROM settle_prediction_manual(
    p_prediction_id,
    p_winning_option_id,
    p_settled_by,
    p_proof_url,
    p_reason
  );
  
  -- Log criteria compliance
  INSERT INTO settlement_criteria_compliance (
    prediction_id,
    settlement_id,
    criteria_met,
    verification_sources_used,
    compliance_notes
  ) VALUES (
    p_prediction_id,
    (SELECT id FROM prediction_settlements WHERE prediction_id = p_prediction_id ORDER BY settlement_time DESC LIMIT 1),
    TRUE,
    p_verification_sources,
    'Manual settlement with criteria validation'
  );
END;
$$;

-- Create settlement criteria compliance tracking
CREATE TABLE settlement_criteria_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES predictions(id),
  settlement_id UUID NOT NULL,
  criteria_met BOOLEAN NOT NULL,
  verification_sources_used TEXT[],
  compliance_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_settlement_criteria TO authenticated;
GRANT EXECUTE ON FUNCTION can_auto_settle TO authenticated;
GRANT EXECUTE ON FUNCTION settle_prediction_manual_with_criteria TO authenticated;

-- Create indexes for performance
CREATE INDEX idx_predictions_settlement_criteria ON predictions USING gin(settlement_criteria);
CREATE INDEX idx_settlement_criteria_compliance_prediction_id ON settlement_criteria_compliance(prediction_id);
CREATE INDEX idx_verification_sources_category ON verification_sources(category);
