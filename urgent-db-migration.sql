-- Urgent Database Schema Fix for Fan Club Z
-- Run this SQL in your Supabase SQL Editor to add missing columns

-- Add participant_count column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'predictions' 
        AND column_name = 'participant_count'
    ) THEN
        ALTER TABLE predictions ADD COLUMN participant_count INTEGER DEFAULT 0;
        
        -- Update existing records to have participant_count = 0
        UPDATE predictions SET participant_count = 0 WHERE participant_count IS NULL;
        
        RAISE NOTICE 'Added participant_count column to predictions table';
    ELSE
        RAISE NOTICE 'participant_count column already exists';
    END IF;
END $$;

-- Ensure other potentially missing columns exist
DO $$ 
BEGIN
    -- Check and add creator_fee_percentage if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'predictions' 
        AND column_name = 'creator_fee_percentage'
    ) THEN
        ALTER TABLE predictions ADD COLUMN creator_fee_percentage DECIMAL(5,2) DEFAULT 0.00;
        RAISE NOTICE 'Added creator_fee_percentage column';
    END IF;
    
    -- Check and add platform_fee_percentage if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'predictions' 
        AND column_name = 'platform_fee_percentage'
    ) THEN
        ALTER TABLE predictions ADD COLUMN platform_fee_percentage DECIMAL(5,2) DEFAULT 3.00;
        RAISE NOTICE 'Added platform_fee_percentage column';
    END IF;
END $$;

-- Create index on participant_count for performance
CREATE INDEX IF NOT EXISTS predictions_participant_count_idx ON predictions(participant_count);

-- Success message
SELECT 'Database schema updated successfully! participant_count column added.' AS status;
