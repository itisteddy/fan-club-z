-- Twitter-style Comments System for Fan Club Z
-- This creates the database schema for persistent comments

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL CHECK (char_length(content) <= 280),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    likes_count INTEGER DEFAULT 0 CHECK (likes_count >= 0),
    replies_count INTEGER DEFAULT 0 CHECK (replies_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes for performance
    CONSTRAINT valid_parent_comment CHECK (parent_comment_id != id)
);

-- Comment likes table (many-to-many)
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent duplicate likes
    CONSTRAINT unique_comment_like UNIQUE (comment_id, user_id)
);

-- Add comments_count to predictions table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'predictions' AND column_name = 'comments_count'
    ) THEN
        ALTER TABLE predictions ADD COLUMN comments_count INTEGER DEFAULT 0 CHECK (comments_count >= 0);
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comments_prediction_id ON comments(prediction_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

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

-- Create triggers
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_comments_updated_at ON comments;
CREATE TRIGGER trigger_update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) policies
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

-- Create a view for comments with user details and like status
CREATE OR REPLACE VIEW comment_details AS
SELECT 
    c.*,
    u.username,
    u.avatar_url,
    u.is_verified,
    COALESCE(cl.user_id = auth.uid(), false) as is_liked_by_user,
    (c.user_id = auth.uid()) as is_own_comment
FROM comments c
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN comment_likes cl ON c.id = cl.comment_id AND cl.user_id = auth.uid()
WHERE c.deleted_at IS NULL;

-- Grant permissions
GRANT ALL ON comments TO authenticated;
GRANT ALL ON comment_likes TO authenticated;
GRANT SELECT ON comment_details TO authenticated;

-- Insert some seed data for testing (optional)
-- Note: This requires existing users and predictions in the database
INSERT INTO comments (content, user_id, prediction_id) 
SELECT 
    'This is a great prediction! I think the odds are in favor of option A.',
    u.id,
    p.id
FROM users u, predictions p 
WHERE u.email = 'test@example.com' 
  AND p.title LIKE '%Nigeria%'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Create materialized view for comment statistics (optional, for analytics)
CREATE MATERIALIZED VIEW IF NOT EXISTS comment_stats AS
SELECT 
    prediction_id,
    COUNT(*) as total_comments,
    COUNT(CASE WHEN parent_comment_id IS NULL THEN 1 END) as top_level_comments,
    COUNT(CASE WHEN parent_comment_id IS NOT NULL THEN 1 END) as replies,
    AVG(likes_count) as avg_likes_per_comment,
    MAX(created_at) as last_comment_at
FROM comments 
WHERE deleted_at IS NULL
GROUP BY prediction_id;

-- Index for the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_comment_stats_prediction_id 
ON comment_stats(prediction_id);

-- Function to refresh comment stats
CREATE OR REPLACE FUNCTION refresh_comment_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY comment_stats;
END;
$$ LANGUAGE plpgsql;

-- You can schedule this to run periodically
-- SELECT cron.schedule('refresh-comment-stats', '*/15 * * * *', 'SELECT refresh_comment_stats();');

COMMIT;