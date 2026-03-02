-- Create settlement_validations table for tracking user validation of settlement outcomes
-- Users can accept or dispute settlements; disputes are tracked with status

-- Drop existing broken table if it exists (safe because feature is new)
DROP TABLE IF EXISTS settlement_validations CASCADE;

-- Create the table fresh
CREATE TABLE settlement_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('accept', 'dispute')),
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  resolution_reason TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Each user can only have one validation per prediction
  CONSTRAINT settlement_validations_user_prediction_unique UNIQUE (prediction_id, user_id)
);

-- Create indexes
CREATE INDEX idx_settlement_validations_prediction_id ON settlement_validations(prediction_id);
CREATE INDEX idx_settlement_validations_user_id ON settlement_validations(user_id);
CREATE INDEX idx_settlement_validations_pending ON settlement_validations(status) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE settlement_validations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view settlement validations"
  ON settlement_validations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own validations"
  ON settlement_validations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own validations"
  ON settlement_validations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON settlement_validations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
