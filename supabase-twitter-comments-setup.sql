-- ============================================================================
-- TWITTER-STYLE COMMENTS SYSTEM FOR FAN CLUB Z
-- ============================================================================
-- Run this entire script in your Supabase SQL Editor
-- This will set up the complete Twitter-style comment system

-- Step 1: Create comments table
-- ============================================================================
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL CHECK (char_length(content) <= 280),
    user_id UUID NOT NULL,
    prediction_id UUID NOT NULL,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    likes_count INTEGER DEFAULT 0 CHECK (likes_count >= 0),
    replies_count INTEGER DEFAULT 0 CHECK (replies_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_parent_comment CHECK (parent_comment_id != id),
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_prediction FOREIGN KEY (prediction_id) REFERENCES predictions(id) ON DELETE CASCADE
);

-- Step 2: Create comment_likes table
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

-- Step 3: Add comments_count to predictions table
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
    END IF;
END $$;

-- Step 4: Create indexes for better performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_comments_prediction_id ON comments(prediction_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- Step 5: Create trigger functions
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
    IF TG_OP = 'INSERT' AND NEW.parent_comment_id IS NULL THEN
        -- Only count top-level comments
        UPDATE predictions 
        SET comments_count = comments_count + 1 
        WHERE id = NEW.prediction_id;
    ELSIF TG_OP = 'DELETE' AND OLD.parent_comment_id IS NULL THEN
        -- Only count top-level comments
        UPDATE predictions 
        SET comments_count = GREATEST(comments_count - 1, 0) 
        WHERE id = OLD.prediction_id;
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
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_prediction_comment_count();

DROP TRIGGER IF EXISTS trigger_update_comments_updated_at ON comments;
CREATE TRIGGER trigger_update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Enable Row Level Security (RLS)
-- ============================================================================
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- Comments policies
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

-- Step 8: Grant permissions
-- ============================================================================
GRANT ALL ON comments TO authenticated;
GRANT ALL ON comment_likes TO authenticated;

-- Step 9: Insert sample data (optional - only if you have existing data)
-- ============================================================================
-- This will add a sample comment if there are existing users and predictions
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
        INSERT INTO comments (content, user_id, prediction_id) 
        VALUES (
            'Great prediction! I think this is really interesting. 🚀',
            sample_user_id,
            sample_prediction_id
        )
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Sample comment added successfully!';
    ELSE
        RAISE NOTICE 'No sample data added - need existing users and predictions first';
    END IF;
END $$;

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================

-- Verification queries (run these to check if everything is working)
SELECT 'Comments table created' as status, COUNT(*) as count FROM comments;
SELECT 'Comment likes table created' as status, COUNT(*) as count FROM comment_likes;
SELECT 'Predictions with comments_count column' as status, COUNT(*) as count 
FROM information_schema.columns 
WHERE table_name = 'predictions' AND column_name = 'comments_count';

-- Show sample data
SELECT 
    c.id,
    c.content,
    u.username as author,
    p.title as prediction_title,
    c.likes_count,
    c.replies_count,
    c.created_at
FROM comments c
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN predictions p ON c.prediction_id = p.id
LIMIT 5;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '🎉 Twitter-style Comments System setup complete!';
    RAISE NOTICE '📱 Features enabled:';
    RAISE NOTICE '  ✅ Persistent comments with 280 character limit';
    RAISE NOTICE '  ✅ Threaded replies and nesting';
    RAISE NOTICE '  ✅ Like/unlike functionality';
    RAISE NOTICE '  ✅ Edit and delete capabilities';
    RAISE NOTICE '  ✅ Automatic count management';
    RAISE NOTICE '  ✅ Row Level Security enabled';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Next steps:';
    RAISE NOTICE '  1. Deploy your application';
    RAISE NOTICE '  2. Navigate to any prediction detail page';
    RAISE NOTICE '  3. Click the comments button to expand';
    RAISE NOTICE '  4. Start commenting!';
END $$;
