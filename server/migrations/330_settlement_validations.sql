-- Create settlement_validations table for tracking user validation of settlement outcomes
-- Users can accept or dispute settlements; disputes are tracked with status

CREATE TABLE IF NOT EXISTS settlement_validations (
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

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_settlement_validations_prediction_id ON settlement_validations(prediction_id);
CREATE INDEX IF NOT EXISTS idx_settlement_validations_user_id ON settlement_validations(user_id);
CREATE INDEX IF NOT EXISTS idx_settlement_validations_status ON settlement_validations(status) WHERE status = 'pending';

-- RLS policies
ALTER TABLE settlement_validations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read validations for predictions they're involved in
CREATE POLICY "Users can view settlement validations"
  ON settlement_validations FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to insert their own validations
CREATE POLICY "Users can create their own validations"
  ON settlement_validations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own validations (for changing accept to dispute, etc.)
CREATE POLICY "Users can update their own validations"
  ON settlement_validations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role bypass for admin operations
CREATE POLICY "Service role full access"
  ON settlement_validations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
