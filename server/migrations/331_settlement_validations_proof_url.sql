-- Add proof_url column to settlement_validations for dispute evidence
-- This is a safe, additive migration

DO $$
BEGIN
  -- Add proof_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'settlement_validations' 
    AND column_name = 'proof_url'
  ) THEN
    ALTER TABLE settlement_validations ADD COLUMN proof_url TEXT;
    COMMENT ON COLUMN settlement_validations.proof_url IS 'Optional URL to evidence supporting a dispute';
  END IF;
  
  -- Add resolved_by column if it doesn't exist (admin who resolved the dispute)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'settlement_validations' 
    AND column_name = 'resolved_by'
  ) THEN
    ALTER TABLE settlement_validations ADD COLUMN resolved_by UUID REFERENCES auth.users(id);
    COMMENT ON COLUMN settlement_validations.resolved_by IS 'Admin user who resolved the dispute';
  END IF;
END $$;
