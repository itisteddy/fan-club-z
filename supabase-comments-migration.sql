-- ============================================================================
-- TWITTER-STYLE COMMENTS MIGRATION FOR EXISTING FAN CLUB Z DATABASE
-- ============================================================================
-- This script safely migrates your existing comments table to support the new features
-- Run this in your Supabase SQL Editor

-- Step 1: Update existing comments table structure
-- ============================================================================

-- Add missing columns to existing comments table
DO $$
BEGIN
    -- Add deleted_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE comments ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added deleted_at column to comments table';
    END IF;

    -- Add edited_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' AND column_name = 'edited_at'
    ) THEN
        ALTER TABLE comments ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added edited_at column to comments table';
    END IF;

    -- Add likes_count column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' AND column_name = 'likes_count'
    ) THEN
        ALTER TABLE comments ADD COLUMN likes_count INTEGER DEFAULT 0 CHECK (likes_count >= 0);
        RAISE NOTICE 'Added likes_count column to comments table';
    END IF;

    -- Add replies_count column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' AND column_name = 'replies_count'
    ) THEN
        ALTER TABLE comments ADD COLUMN replies_count INTEGER DEFAULT 0 CHECK (replies_count >= 0);
        RAISE NOTICE 'Added replies_count column to comments table';
    END IF;

    -- Add parent_comment_id column if it doesn't exist (for threading)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' AND column_name = 'parent_comment_id'
    ) THEN
        ALTER TABLE comments ADD COLUMN parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added parent_comment_id column to comments table';
    END IF;
END $$;

-- Update content column to have character limit if needed
DO $$
BEGIN
    -- Add character limit constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%char_length%' 
        AND table_name = 'comments'
    ) THEN
        ALTER TABLE comments ADD CONSTRAINT comments_content_length_check 
        CHECK (char_length(content) <= 280);
        RAISE NOTICE 'Added 280 character limit to comments content';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Character limit constraint already exists';
END $$;

-- Step 2: Create comment_likes table if it doesn't exist
-- ============================================================================
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_comment_likes_comment FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Prevent duplicate likes
    CONSTRAINT unique_comment_like UNIQUE (comment_id, user_id)
);

-- Step 3: Add comments_count to predictions table if it doesn't exist
-- ============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'predictions' AND column_name = 'comments_count'
    ) THEN
        ALTER TABLE predictions ADD COLUMN comments_count INTEGER DEFAULT 0 CHECK (comments_count >= 0);
        
        -- Initialize comments_count for existing predictions
        UPDATE predictions SET comments_count = (
            SELECT COUNT(*) 
            FROM comments 
            WHERE comments.prediction_id = predictions.id 
              AND comments.parent_comment_id IS NULL
              AND comments.deleted_at IS NULL
        );
        
        RAISE NOTICE 'Added and initialized comments_count column to predictions table';
    END IF;
END $$;

-- Step 4: Create or update indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_comments_prediction_id ON comments(prediction_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_deleted_at ON comments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- Step 5: Create/update trigger functions
-- ============================================================================

-- Function to update reply count when a reply is added/removed
CREATE OR REPLACE FUNCTION update_comment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.parent_comment_id IS NOT NULL THEN
        -- Increment reply count for parent comment
        UPDATE comments 
        SET replies_count = replies_count + 1 
        WHERE id = NEW.parent_comment_id;
    ELSIF TG_OP = 'DELETE' AND OLD.parent_comment_id IS NOT NULL THEN
        -- Decrement reply count for parent comment
        UPDATE comments 
        SET replies_count = GREATEST(replies_count - 1, 0) 
        WHERE id = OLD.parent_comment_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update like count when a like is added/removed
CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment like count
        UPDATE comments 
        SET likes_count = likes_count + 1 
        WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement like count
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
        -- Only count top-level, non-deleted comments
        UPDATE predictions 
        SET comments_count = comments_count + 1 
        WHERE id = NEW.prediction_id;
    ELSIF TG_OP = 'DELETE' AND OLD.parent_comment_id IS NULL THEN
        -- Only count top-level comments
        UPDATE predictions 
        SET comments_count = GREATEST(comments_count - 1, 0) 
        WHERE id = OLD.prediction_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.parent_comment_id IS NULL THEN
        -- Handle soft delete (deleted_at changed)
        IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
            -- Comment was soft deleted
            UPDATE predictions 
            SET comments_count = GREATEST(comments_count - 1, 0) 
            WHERE id = NEW.prediction_id;
        ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
            -- Comment was restored
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

-- Step 6: Create/recreate triggers
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

-- Update likes_count for existing comments
UPDATE comments SET likes_count = (
    SELECT COUNT(*) 
    FROM comment_likes 
    WHERE comment_likes.comment_id = comments.id
) WHERE likes_count IS NULL OR likes_count = 0;

-- Update replies_count for existing comments
UPDATE comments SET replies_count = (
    SELECT COUNT(*) 
    FROM comments AS replies 
    WHERE replies.parent_comment_id = comments.id
      AND replies.deleted_at IS NULL
) WHERE replies_count IS NULL OR replies_count = 0;

-- Step 8: Enable Row Level Security (RLS)
-- ============================================================================
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- Comments policies (drop and recreate to ensure they're correct)
DROP POLICY IF EXISTS "Users can view all comments" ON comments;
CREATE POLICY "Users can view all comments" ON comments
    FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can insert their own comments" ON comments;
CREATE POLICY "Users can insert their own comments" ON comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
CREATE POLICY "Users can update their own comments" ON comments
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;
CREATE POLICY "Users can delete their own comments" ON comments
    FOR DELETE USING (auth.uid() = user_id);

-- Comment likes policies
DROP POLICY IF EXISTS "Users can view all comment likes" ON comment_likes;
CREATE POLICY "Users can view all comment likes" ON comment_likes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own comment likes" ON comment_likes;
CREATE POLICY "Users can insert their own comment likes" ON comment_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comment likes" ON comment_likes;
CREATE POLICY "Users can delete their own comment likes" ON comment_likes
    FOR DELETE USING (auth.uid() = user_id);

-- Step 9: Grant permissions
-- ============================================================================
GRANT ALL ON comments TO authenticated;
GRANT ALL ON comment_likes TO authenticated;

-- Step 10: Verification and summary
-- ============================================================================

-- Show table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'comments' 
ORDER BY ordinal_position;

-- Show current data counts
SELECT 
    'Comments' as table_name, 
    COUNT(*) as total_rows,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_rows,
    COUNT(*) FILTER (WHERE parent_comment_id IS NOT NULL) as replies
FROM comments
UNION ALL
SELECT 
    'Comment Likes' as table_name,
    COUNT(*) as total_rows,
    NULL as active_rows,
    NULL as replies
FROM comment_likes
UNION ALL
SELECT 
    'Predictions with comments' as table_name,
    COUNT(*) FILTER (WHERE comments_count > 0) as total_rows,
    NULL as active_rows,
    NULL as replies
FROM predictions;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Twitter-style Comments Migration Complete!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Migration completed successfully:';
    RAISE NOTICE '  • Updated existing comments table structure';
    RAISE NOTICE '  • Added support for threading (replies)';
    RAISE NOTICE '  • Added like/unlike functionality';
    RAISE NOTICE '  • Added soft delete capability';
    RAISE NOTICE '  • Added 280 character limit';
    RAISE NOTICE '  • Created automatic count management';
    RAISE NOTICE '  • Enabled Row Level Security';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Next steps:';
    RAISE NOTICE '  1. Deploy your application';
    RAISE NOTICE '  2. Navigate to any prediction detail page';
    RAISE NOTICE '  3. Click the "comments" button to expand';
    RAISE NOTICE '  4. Start using the Twitter-style comment system!';
    RAISE NOTICE '';
    RAISE NOTICE '📱 Both systems now work together:';
    RAISE NOTICE '  • WebSocket Chat: Real-time ephemeral discussions';
    RAISE NOTICE '  • Twitter Comments: Persistent threaded commentary';
END $$;
