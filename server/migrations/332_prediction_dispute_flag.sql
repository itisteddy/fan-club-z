-- Add has_pending_dispute flag to predictions table
-- This tracks whether a prediction has any unresolved disputes

DO $$
BEGIN
  -- Add has_pending_dispute column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'predictions' 
    AND column_name = 'has_pending_dispute'
  ) THEN
    ALTER TABLE predictions ADD COLUMN has_pending_dispute BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN predictions.has_pending_dispute IS 'True if prediction has unresolved disputes';
    
    -- Create index for efficient querying
    CREATE INDEX IF NOT EXISTS idx_predictions_has_pending_dispute 
      ON predictions(has_pending_dispute) 
      WHERE has_pending_dispute = TRUE;
  END IF;
END $$;
