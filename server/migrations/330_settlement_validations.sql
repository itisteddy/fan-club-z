-- Create settlement_validations table for tracking user validation of settlement outcomes
-- Users can accept or dispute settlements; disputes are tracked with status

-- Step 1: Create the table
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

-- Step 2: Create indexes (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settlement_validations') THEN
    -- Basic indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_settlement_validations_prediction_id') THEN
      CREATE INDEX idx_settlement_validations_prediction_id ON settlement_validations(prediction_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_settlement_validations_user_id') THEN
      CREATE INDEX idx_settlement_validations_user_id ON settlement_validations(user_id);
    END IF;
    
    -- Partial index for pending disputes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_settlement_validations_pending') THEN
      CREATE INDEX idx_settlement_validations_pending ON settlement_validations(status) WHERE status = 'pending';
    END IF;
  END IF;
END $$;

-- Step 3: Enable RLS
ALTER TABLE settlement_validations ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies (drop first if exist to avoid errors)
DROP POLICY IF EXISTS "Users can view settlement validations" ON settlement_validations;
DROP POLICY IF EXISTS "Users can create their own validations" ON settlement_validations;
DROP POLICY IF EXISTS "Users can update their own validations" ON settlement_validations;
DROP POLICY IF EXISTS "Service role full access" ON settlement_validations;

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
