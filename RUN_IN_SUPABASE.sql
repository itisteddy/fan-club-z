-- ============================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- Run each section one at a time and verify before proceeding
-- ============================================================

-- ============================================================
-- STEP 1: Check current bet_settlements table structure
-- ============================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bet_settlements'
ORDER BY ordinal_position;

-- ============================================================
-- STEP 2: If table exists but missing columns, add them
-- ============================================================

-- Add status column if missing
ALTER TABLE bet_settlements 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- Add other missing columns
ALTER TABLE bet_settlements 
ADD COLUMN IF NOT EXISTS winning_option_id UUID;

ALTER TABLE bet_settlements 
ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}';

ALTER TABLE bet_settlements 
ADD COLUMN IF NOT EXISTS merkle_root VARCHAR(66);

ALTER TABLE bet_settlements 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE bet_settlements 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================================
-- STEP 3: Create indexes if they don't exist
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bet_settlements_status ON bet_settlements(status);
CREATE INDEX IF NOT EXISTS idx_bet_settlements_created_at ON bet_settlements(created_at DESC);

-- ============================================================
-- STEP 4: Add image_url column to predictions
-- ============================================================
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS image_url TEXT;
CREATE INDEX IF NOT EXISTS idx_predictions_image_url ON predictions(image_url) WHERE image_url IS NOT NULL;

-- ============================================================
-- STEP 5: Verify the changes
-- ============================================================

-- Check bet_settlements columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bet_settlements'
ORDER BY ordinal_position;

-- Check predictions has image_url
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'predictions' AND column_name = 'image_url';

-- Count records
SELECT 
    (SELECT COUNT(*) FROM bet_settlements) AS bet_settlements_count,
    (SELECT COUNT(*) FROM predictions WHERE image_url IS NOT NULL) AS predictions_with_images;
