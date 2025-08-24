-- ============================================================================
-- ADD SETTLED_AT COLUMN MIGRATION
-- ============================================================================
-- This script adds the missing settled_at column to the predictions table
-- Execute this in your Supabase SQL Editor

-- Add settled_at column to predictions table
ALTER TABLE predictions 
ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;

-- Add winning_option_id column if it doesn't exist (for manual settlements)
ALTER TABLE predictions 
ADD COLUMN IF NOT EXISTS winning_option_id UUID REFERENCES prediction_options(id);

-- Create index for the new columns
CREATE INDEX IF NOT EXISTS idx_predictions_settled_at ON predictions(settled_at);
CREATE INDEX IF NOT EXISTS idx_predictions_winning_option_id ON predictions(winning_option_id);

-- Update any existing settled predictions to have a settled_at timestamp
UPDATE predictions 
SET settled_at = updated_at 
WHERE status = 'settled' AND settled_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN predictions.settled_at IS 'Timestamp when the prediction was settled';
COMMENT ON COLUMN predictions.winning_option_id IS 'ID of the winning option after settlement';
