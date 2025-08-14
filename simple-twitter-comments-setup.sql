-- ============================================================================
-- SIMPLE TWITTER-STYLE COMMENTS SETUP FOR FAN CLUB Z
-- ============================================================================
-- This script adds Twitter-style comment features to your existing database
-- Run this in your Supabase SQL Editor

-- Step 1: Add missing columns to existing comments table
-- ============================================================================

-- Add deleted_at column for soft deletes
ALTER TABLE comments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add edited_at column to track edits
ALTER TABLE comments ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;

-- Add likes_count column
ALTER TABLE comments ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Add replies_count column
ALTER TABLE comments ADD COLUMN IF NOT EXISTS replies_count INTEGER DEFAULT 0;

-- Add parent_comment_id for threading
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_comment_id UUID;

-- Add foreign key constraint for parent_comment_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'comments_parent_comment_id_fkey'
    ) THEN
        ALTER TABLE comments 
        ADD CONSTRAINT comments_parent_comment_id_fkey 
        FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add check constraints
DO $$
BEGIN
    -- Check if likes_count constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'comments_likes_count_check'
    ) THEN
        ALTER TABLE comments 
        ADD CONSTRAINT comments_likes_count_check 
        CHECK (likes_count >= 0);
    END IF;
    
    -- Check if replies_count constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'comments_replies_count_check'
    ) THEN
        ALTER TABLE comments 
        ADD CONSTRAINT comments_replies_count_check 
        CHECK (replies_count >= 0);
    END IF;
    
    -- Check if content length constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'comments_content_length_check'
    ) THEN
        ALTER TABLE comments 
        ADD CONSTRAINT comments_content_length_check 
        CHECK (char_length(content) <= 280);
    END IF;
    
    -- Check if parent comment constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'comments_valid_parent_check'
    ) THEN
        ALTER TABLE comments 
        ADD CONSTRAINT comments_valid_parent_check 
        CHECK (parent_comment_id != id);
    END IF;
END $$;

-- Step 2: Create comment_likes table
-- ============================================================================
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent duplicate likes
    UNIQUE (comment_id, user_id)
);

-- Step 3: Add comments_count to predictions table
-- ============================================================================
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

-- Add check constraint for comments_count
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'predictions_comments_count_check'
    ) THEN
        ALTER TABLE predictions 
        ADD CONSTRAINT predictions_comments_count_check 
        CHECK (comments_count >= 0);
    END IF;
END $$;

-- Step 4: Create indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_comments_prediction_id ON comments(prediction_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_deleted_at ON comments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- Step 5: Create trigger functions
-- ============================================================================

-- Function to update reply count
CREATE OR REPLACE FUNCTION update_comment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.parent_comment_id IS NOT NULL THEN
        UPDATE comments 
        SET replies_count = replies_count + 1 
        WHERE id = NEW.parent_comment_id;
    ELSIF TG_OP = 'DELETE' AND OLD.parent_comment_id IS NOT NULL THEN
        UPDATE comments 
        SET replies_count = GREATEST(replies_count - 1, 0) 
        WHERE id = OLD.parent_comment_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update like count
CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE comments 
        SET likes_count = likes_count + 1 
        WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE comments 
        SET likes_count = GREATEST(likes_count - 1, 0) 
        WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update prediction comment count
CREATE OR REPLACE FUNCTION update_prediction_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.parent_comment_id IS NULL AND NEW.deleted_at IS NULL THEN
        UPDATE predictions 
        SET comments_count = comments_count + 1 
        WHERE id = NEW.prediction_id;
    ELSIF TG_OP = 'DELETE' AND OLD.parent_comment_id IS NULL THEN
        UPDATE predictions 
        SET comments_count = GREATEST(comments_count - 1, 0) 
        WHERE id = OLD.prediction_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.parent_comment_id IS NULL THEN
        IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
            UPDATE predictions 
            SET comments_count = GREATEST(comments_count - 1, 0) 
            WHERE id = NEW.prediction_id;
        ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
            UPDATE predictions 
            SET comments_count = comments_count + 1 
            WHERE id = NEW.prediction_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create triggers
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_update_comment_reply_count ON comments;
CREATE TRIGGER trigger_update_comment_reply_count
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_comment_reply_count();

DROP TRIGGER IF EXISTS trigger_update_comment_like_count ON comment_likes;
CREATE TRIGGER trigger_update_comment_like_count
    AFTER INSERT OR DELETE ON comment_likes
    FOR EACH ROW EXECUTE FUNCTION update_comment_like_count();

DROP TRIGGER IF EXISTS trigger_update_prediction_comment_count ON comments;
CREATE TRIGGER trigger_update_prediction_comment_count
    AFTER INSERT OR DELETE OR UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_prediction_comment_count();

DROP TRIGGER IF EXISTS trigger_update_comments_updated_at ON comments;
CREATE TRIGGER trigger_update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Initialize counts for existing data
-- ============================================================================

-- Initialize likes_count to 0 for existing comments
UPDATE comments SET likes_count = 0 WHERE likes_count IS NULL;

-- Initialize replies_count to 0 for existing comments
UPDATE comments SET replies_count = 0 WHERE replies_count IS NULL;

-- Initialize comments_count for existing predictions
UPDATE predictions SET comments_count = COALESCE((
    SELECT COUNT(*) 
    FROM comments 
    WHERE comments.prediction_id = predictions.id 
      AND comments.parent_comment_id IS NULL
      AND comments.deleted_at IS NULL
), 0) WHERE comments_count IS NULL;

-- Step 8: Enable Row Level Security
-- ============================================================================
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view all comments" ON comments;
DROP POLICY IF EXISTS "Users can insert their own comments" ON comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;

-- Create comment policies
CREATE POLICY "Users can view all comments" ON comments
    FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Users can insert their own comments" ON comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON comments
    FOR DELETE USING (auth.uid() = user_id);

-- Drop existing like policies first
DROP POLICY IF EXISTS "Users can view all comment likes" ON comment_likes;
DROP POLICY IF EXISTS "Users can insert their own comment likes" ON comment_likes;
DROP POLICY IF EXISTS "Users can delete their own comment likes" ON comment_likes;

-- Create comment like policies
CREATE POLICY "Users can view all comment likes" ON comment_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own comment likes" ON comment_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comment likes" ON comment_likes
    FOR DELETE USING (auth.uid() = user_id);

-- Step 9: Grant permissions
-- ============================================================================
GRANT ALL ON comments TO authenticated;
GRANT ALL ON comment_likes TO authenticated;

-- Step 10: Create a test comment (optional)
-- ============================================================================
DO $$
DECLARE
    sample_user_id UUID;
    sample_prediction_id UUID;
BEGIN
    -- Get a sample user
    SELECT id INTO sample_user_id FROM users LIMIT 1;
    
    -- Get a sample prediction
    SELECT id INTO sample_prediction_id FROM predictions LIMIT 1;
    
    -- Insert sample comment if we have both user and prediction
    IF sample_user_id IS NOT NULL AND sample_prediction_id IS NOT NULL THEN
        INSERT INTO comments (content, user_id, prediction_id, likes_count, replies_count) 
        VALUES (
            'Great prediction! Looking forward to seeing how this plays out. 🚀',
            sample_user_id,
            sample_prediction_id,
            0,
            0
        )
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Success message
SELECT 
    '🎉 Twitter-style Comments System Setup Complete!' as message,
    'Your comment system is now ready to use!' as status;

-- Show verification data
SELECT 
    'Comments' as table_name,
    COUNT(*) as total_rows,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_comments,
    COUNT(*) FILTER (WHERE parent_comment_id IS NOT NULL) as replies
FROM comments
UNION ALL
SELECT 
    'Comment Likes' as table_name,
    COUNT(*) as total_rows,
    NULL as active_comments,
    NULL as replies
FROM comment_likes
UNION ALL
SELECT 
    'Predictions' as table_name,
    COUNT(*) as total_rows,
    COUNT(*) FILTER (WHERE comments_count > 0) as with_comments,
    NULL as replies
FROM predictions;
