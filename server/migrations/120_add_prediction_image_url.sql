-- Add image_url column to predictions table for stable image storage
-- This ensures images don't change once assigned to a prediction

-- Add the column
ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_predictions_image_url ON predictions(image_url) WHERE image_url IS NOT NULL;

-- Comment
COMMENT ON COLUMN predictions.image_url IS 'Stable image URL for the prediction card. Once set, should not change.';

