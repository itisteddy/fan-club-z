-- ============================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- Run each section one at a time and verify before proceeding
-- ============================================================

-- ============================================================
-- SECTION 1: Create bet_settlements table (REQUIRED)
-- ============================================================

CREATE TABLE IF NOT EXISTS bet_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bet_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    winning_option_id UUID REFERENCES prediction_options(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'computing', 'computed', 'posting', 'onchain_posted', 'completed', 'failed', 'cancelled')),
    meta JSONB DEFAULT '{}',
    merkle_root VARCHAR(66),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bet_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bet_settlements_bet_id ON bet_settlements(bet_id);
CREATE INDEX IF NOT EXISTS idx_bet_settlements_status ON bet_settlements(status);
CREATE INDEX IF NOT EXISTS idx_bet_settlements_created_at ON bet_settlements(created_at DESC);

-- RLS
ALTER TABLE bet_settlements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors)
DROP POLICY IF EXISTS "bet_settlements_read_all" ON bet_settlements;
DROP POLICY IF EXISTS "bet_settlements_write_service" ON bet_settlements;

-- Create policies
CREATE POLICY "bet_settlements_read_all" ON bet_settlements FOR SELECT USING (true);
CREATE POLICY "bet_settlements_write_service" ON bet_settlements FOR ALL USING (true);

-- ============================================================
-- SECTION 2: Add image_url column to predictions (REQUIRED)
-- ============================================================

ALTER TABLE predictions ADD COLUMN IF NOT EXISTS image_url TEXT;
CREATE INDEX IF NOT EXISTS idx_predictions_image_url ON predictions(image_url) WHERE image_url IS NOT NULL;

-- ============================================================
-- VERIFICATION QUERIES (run after the above)
-- ============================================================

-- Verify bet_settlements table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'bet_settlements'
) AS bet_settlements_exists;

-- Verify image_url column exists
SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'predictions' AND column_name = 'image_url'
) AS image_url_exists;

-- Check bet_settlements count
SELECT COUNT(*) AS bet_settlements_count FROM bet_settlements;

-- Check predictions with image_url
SELECT COUNT(*) AS predictions_with_images FROM predictions WHERE image_url IS NOT NULL;
