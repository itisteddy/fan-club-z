-- Basic Comment System Setup - Apply this first in Supabase
-- This creates a minimal working comment system

-- Ensure comments table exists with basic structure
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 500),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add likes_count column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'comments' AND column_name = 'likes_count') THEN
        ALTER TABLE comments ADD COLUMN likes_count INTEGER DEFAULT 0 CHECK (likes_count >= 0);
    END IF;
    
    -- Add replies_count column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'comments' AND column_name = 'replies_count') THEN
        ALTER TABLE comments ADD COLUMN replies_count INTEGER DEFAULT 0 CHECK (replies_count >= 0);
    END IF;
    
    -- Add depth column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'comments' AND column_name = 'depth') THEN
        ALTER TABLE comments ADD COLUMN depth INTEGER DEFAULT 0 CHECK (depth >= 0 AND depth <= 3);
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_prediction_id ON comments(prediction_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "comments_select_policy" ON comments;
DROP POLICY IF EXISTS "comments_insert_policy" ON comments;
DROP POLICY IF EXISTS "comments_update_policy" ON comments;
DROP POLICY IF EXISTS "comments_delete_policy" ON comments;

-- Create RLS policies
CREATE POLICY "comments_select_policy" ON comments
    FOR SELECT USING (true); -- Allow everyone to read comments

CREATE POLICY "comments_insert_policy" ON comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_update_policy" ON comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "comments_delete_policy" ON comments
    FOR DELETE USING (auth.uid() = user_id);

-- Function to update comments count on predictions table
CREATE OR REPLACE FUNCTION update_prediction_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment comments count
        UPDATE predictions 
        SET comments_count = COALESCE(comments_count, 0) + 1,
            updated_at = NOW()
        WHERE id = NEW.prediction_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement comments count
        UPDATE predictions 
        SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.prediction_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comments count
DROP TRIGGER IF EXISTS trigger_update_prediction_comments_count ON comments;
CREATE TRIGGER trigger_update_prediction_comments_count
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_prediction_comments_count();

-- Add comments_count column to predictions table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'predictions' AND column_name = 'comments_count') THEN
        ALTER TABLE predictions ADD COLUMN comments_count INTEGER DEFAULT 0 CHECK (comments_count >= 0);
    END IF;
END $$;

-- Update existing predictions with correct comment counts
UPDATE predictions 
SET comments_count = (
    SELECT COUNT(*) 
    FROM comments 
    WHERE comments.prediction_id = predictions.id
)
WHERE comments_count IS NULL OR comments_count = 0;

COMMIT;
