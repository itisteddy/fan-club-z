-- Enhanced Comment System with Nested Replies and Real-time Features
-- Fan Club Z v2.0 Comment Enhancement

-- Ensure comments table exists with proper structure
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 500),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    edited_at TIMESTAMP WITH TIME ZONE NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    is_flagged BOOLEAN DEFAULT FALSE,
    likes_count INTEGER DEFAULT 0 CHECK (likes_count >= 0),
    replies_count INTEGER DEFAULT 0 CHECK (replies_count >= 0),
    depth INTEGER DEFAULT 0 CHECK (depth >= 0 AND depth <= 3), -- Max 3 levels of nesting
    thread_id UUID, -- For efficient querying of comment threads
    is_deleted BOOLEAN DEFAULT FALSE -- Soft delete for moderation
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_prediction_id ON comments(prediction_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_thread_id ON comments(thread_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_depth ON comments(depth);

-- Comment likes table for emoji reactions
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) DEFAULT 'like' CHECK (reaction_type IN ('like', 'love', 'laugh', 'angry', 'sad', 'thumbs_up')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- Comment reports table for moderation
CREATE TABLE IF NOT EXISTS comment_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('spam', 'harassment', 'offensive', 'misinformation', 'other')),
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, reporter_id) -- Prevent duplicate reports from same user
);

CREATE INDEX IF NOT EXISTS idx_comment_reports_comment_id ON comment_reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_status ON comment_reports(status);

-- Comment notifications for real-time updates
CREATE TABLE IF NOT EXISTS comment_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('reply', 'like', 'mention')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comment_notifications_user_id ON comment_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_notifications_unread ON comment_notifications(user_id, is_read) WHERE is_read = FALSE;

-- Function to automatically set thread_id and depth for nested comments
CREATE OR REPLACE FUNCTION set_comment_thread_and_depth()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is a top-level comment
    IF NEW.parent_comment_id IS NULL THEN
        NEW.depth := 0;
        NEW.thread_id := NEW.id;
    ELSE
        -- Get parent comment info
        SELECT depth + 1, COALESCE(thread_id, id)
        INTO NEW.depth, NEW.thread_id
        FROM comments 
        WHERE id = NEW.parent_comment_id;
        
        -- Enforce max depth of 3
        IF NEW.depth > 3 THEN
            RAISE EXCEPTION 'Maximum comment nesting depth of 3 exceeded';
        END IF;
        
        -- Update parent's replies count
        UPDATE comments 
        SET replies_count = replies_count + 1,
            updated_at = NOW()
        WHERE id = NEW.parent_comment_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set thread_id and depth on insert
DROP TRIGGER IF EXISTS trigger_set_comment_thread_and_depth ON comments;
CREATE TRIGGER trigger_set_comment_thread_and_depth
    BEFORE INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION set_comment_thread_and_depth();

-- Function to update comment counts and timestamps
CREATE OR REPLACE FUNCTION update_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update prediction comment count
        UPDATE predictions 
        SET comments_count = comments_count + 1,
            updated_at = NOW()
        WHERE id = NEW.prediction_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Update prediction comment count
        UPDATE predictions 
        SET comments_count = GREATEST(comments_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.prediction_id;
        
        -- Update parent comment replies count if it was a reply
        IF OLD.parent_comment_id IS NOT NULL THEN
            UPDATE comments 
            SET replies_count = GREATEST(replies_count - 1, 0),
                updated_at = NOW()
            WHERE id = OLD.parent_comment_id;
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update comment counts
DROP TRIGGER IF EXISTS trigger_update_comment_counts ON comments;
CREATE TRIGGER trigger_update_comment_counts
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_counts();

-- Function to update like counts
CREATE OR REPLACE FUNCTION update_comment_like_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE comments 
        SET likes_count = likes_count + 1,
            updated_at = NOW()
        WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE comments 
        SET likes_count = GREATEST(likes_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update like counts
DROP TRIGGER IF EXISTS trigger_update_comment_like_counts ON comment_likes;
CREATE TRIGGER trigger_update_comment_like_counts
    AFTER INSERT OR DELETE ON comment_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_like_counts();

-- Function to create notification on comment activity
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    parent_user_id UUID;
    prediction_creator_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Reply notification
        IF NEW.parent_comment_id IS NOT NULL THEN
            SELECT user_id INTO parent_user_id 
            FROM comments 
            WHERE id = NEW.parent_comment_id;
            
            -- Don't notify if replying to own comment
            IF parent_user_id != NEW.user_id THEN
                INSERT INTO comment_notifications (user_id, comment_id, type)
                VALUES (parent_user_id, NEW.id, 'reply');
            END IF;
        END IF;
        
        -- Notify prediction creator of new top-level comment
        IF NEW.parent_comment_id IS NULL THEN
            SELECT creator_id INTO prediction_creator_id 
            FROM predictions 
            WHERE id = NEW.prediction_id;
            
            -- Don't notify if commenting on own prediction
            IF prediction_creator_id != NEW.user_id THEN
                INSERT INTO comment_notifications (user_id, comment_id, type)
                VALUES (prediction_creator_id, NEW.id, 'reply');
            END IF;
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create notifications
DROP TRIGGER IF EXISTS trigger_create_comment_notification ON comments;
CREATE TRIGGER trigger_create_comment_notification
    AFTER INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION create_comment_notification();

-- Function to create like notification
CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
DECLARE
    comment_user_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT user_id INTO comment_user_id 
        FROM comments 
        WHERE id = NEW.comment_id;
        
        -- Don't notify if liking own comment
        IF comment_user_id != NEW.user_id THEN
            INSERT INTO comment_notifications (user_id, comment_id, type)
            VALUES (comment_user_id, NEW.comment_id, 'like');
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create like notifications
DROP TRIGGER IF EXISTS trigger_create_like_notification ON comment_likes;
CREATE TRIGGER trigger_create_like_notification
    AFTER INSERT ON comment_likes
    FOR EACH ROW
    EXECUTE FUNCTION create_like_notification();

-- Function to get comment thread with all replies
CREATE OR REPLACE FUNCTION get_comment_thread(thread_id_param UUID, user_id_param UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    content TEXT,
    user_id UUID,
    username VARCHAR,
    avatar_url TEXT,
    is_verified BOOLEAN,
    prediction_id UUID,
    parent_comment_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_edited BOOLEAN,
    is_flagged BOOLEAN,
    likes_count INTEGER,
    replies_count INTEGER,
    depth INTEGER,
    is_liked BOOLEAN,
    is_own BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        CASE 
            WHEN c.is_deleted THEN '[deleted]' 
            ELSE c.content 
        END as content,
        c.user_id,
        CASE 
            WHEN c.is_deleted THEN '[deleted]' 
            ELSE u.username 
        END as username,
        CASE 
            WHEN c.is_deleted THEN NULL 
            ELSE u.avatar_url 
        END as avatar_url,
        CASE 
            WHEN c.is_deleted THEN FALSE 
            ELSE COALESCE(u.is_verified, FALSE) 
        END as is_verified,
        c.prediction_id,
        c.parent_comment_id,
        c.created_at,
        c.updated_at,
        c.edited_at,
        c.is_edited,
        c.is_flagged,
        c.likes_count,
        c.replies_count,
        c.depth,
        CASE 
            WHEN user_id_param IS NULL THEN FALSE
            WHEN c.is_deleted THEN FALSE
            ELSE EXISTS(SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = user_id_param)
        END as is_liked,
        CASE 
            WHEN user_id_param IS NULL THEN FALSE
            WHEN c.is_deleted THEN FALSE
            ELSE c.user_id = user_id_param
        END as is_own
    FROM comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.thread_id = thread_id_param
    ORDER BY c.depth ASC, c.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get paginated comments for a prediction
CREATE OR REPLACE FUNCTION get_prediction_comments(
    prediction_id_param UUID, 
    user_id_param UUID DEFAULT NULL,
    page_param INTEGER DEFAULT 1,
    limit_param INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    user_id UUID,
    username VARCHAR,
    avatar_url TEXT,
    is_verified BOOLEAN,
    prediction_id UUID,
    parent_comment_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_edited BOOLEAN,
    is_flagged BOOLEAN,
    likes_count INTEGER,
    replies_count INTEGER,
    depth INTEGER,
    thread_id UUID,
    is_liked BOOLEAN,
    is_own BOOLEAN
) AS $$
DECLARE
    offset_param INTEGER := (page_param - 1) * limit_param;
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        CASE 
            WHEN c.is_deleted THEN '[deleted]' 
            ELSE c.content 
        END as content,
        c.user_id,
        CASE 
            WHEN c.is_deleted THEN '[deleted]' 
            ELSE u.username 
        END as username,
        CASE 
            WHEN c.is_deleted THEN NULL 
            ELSE u.avatar_url 
        END as avatar_url,
        CASE 
            WHEN c.is_deleted THEN FALSE 
            ELSE COALESCE(u.is_verified, FALSE) 
        END as is_verified,
        c.prediction_id,
        c.parent_comment_id,
        c.created_at,
        c.updated_at,
        c.edited_at,
        c.is_edited,
        c.is_flagged,
        c.likes_count,
        c.replies_count,
        c.depth,
        c.thread_id,
        CASE 
            WHEN user_id_param IS NULL THEN FALSE
            WHEN c.is_deleted THEN FALSE
            ELSE EXISTS(SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = user_id_param)
        END as is_liked,
        CASE 
            WHEN user_id_param IS NULL THEN FALSE
            WHEN c.is_deleted THEN FALSE
            ELSE c.user_id = user_id_param
        END as is_own
    FROM comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.prediction_id = prediction_id_param 
        AND c.parent_comment_id IS NULL  -- Only top-level comments
    ORDER BY c.created_at DESC
    LIMIT limit_param OFFSET offset_param;
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security) policies for comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all non-flagged comments
CREATE POLICY "comments_select_policy" ON comments
    FOR SELECT USING (NOT is_flagged OR is_flagged = FALSE);

-- Policy: Authenticated users can insert comments
CREATE POLICY "comments_insert_policy" ON comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own comments
CREATE POLICY "comments_update_policy" ON comments
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own comments
CREATE POLICY "comments_delete_policy" ON comments
    FOR DELETE USING (auth.uid() = user_id);

-- RLS for comment_likes
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comment_likes_select_policy" ON comment_likes
    FOR SELECT USING (true);

CREATE POLICY "comment_likes_insert_policy" ON comment_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comment_likes_delete_policy" ON comment_likes
    FOR DELETE USING (auth.uid() = user_id);

-- RLS for comment_reports
ALTER TABLE comment_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comment_reports_select_policy" ON comment_reports
    FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "comment_reports_insert_policy" ON comment_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- RLS for comment_notifications
ALTER TABLE comment_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comment_notifications_select_policy" ON comment_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "comment_notifications_update_policy" ON comment_notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Create some sample data for testing
INSERT INTO comments (content, user_id, prediction_id) 
SELECT 
    'This is a great prediction! I think option A will win.',
    u.id,
    p.id
FROM users u
CROSS JOIN predictions p
WHERE u.username = 'fanclubz_user' 
    AND p.title LIKE '%Nigeria%'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Commit the transaction
COMMIT;

-- Create a view for easy comment querying with user data
CREATE OR REPLACE VIEW comment_with_user AS
SELECT 
    c.*,
    u.username,
    u.avatar_url,
    u.is_verified,
    u.full_name
FROM comments c
LEFT JOIN users u ON c.user_id = u.id
WHERE NOT c.is_deleted;

-- Index for the view
CREATE INDEX IF NOT EXISTS idx_comment_with_user_prediction ON comment_with_user(prediction_id);

COMMIT;