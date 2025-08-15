-- Fix Comment System Migration - Add Missing Columns First
-- Fan Club Z v2.0 Comment System Fix

-- Start transaction
BEGIN;

-- First, let's check what columns exist and add missing ones
DO $$ 
BEGIN
    -- Add thread_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'comments' AND column_name = 'thread_id') THEN
        ALTER TABLE comments ADD COLUMN thread_id UUID;
    END IF;
    
    -- Add depth column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'comments' AND column_name = 'depth') THEN
        ALTER TABLE comments ADD COLUMN depth INTEGER DEFAULT 0 CHECK (depth >= 0 AND depth <= 3);
    END IF;
    
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
    
    -- Add is_edited column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'comments' AND column_name = 'is_edited') THEN
        ALTER TABLE comments ADD COLUMN is_edited BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add edited_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'comments' AND column_name = 'edited_at') THEN
        ALTER TABLE comments ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE NULL;
    END IF;
    
    -- Add is_flagged column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'comments' AND column_name = 'is_flagged') THEN
        ALTER TABLE comments ADD COLUMN is_flagged BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add is_deleted column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'comments' AND column_name = 'is_deleted') THEN
        ALTER TABLE comments ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add parent_comment_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'comments' AND column_name = 'parent_comment_id') THEN
        ALTER TABLE comments ADD COLUMN parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Update existing comments to set thread_id for top-level comments
UPDATE comments 
SET thread_id = id, depth = 0 
WHERE parent_comment_id IS NULL AND thread_id IS NULL;

-- Create indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_comments_thread_id ON comments(thread_id);
CREATE INDEX IF NOT EXISTS idx_comments_depth ON comments(depth);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_likes_count ON comments(likes_count);

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

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_set_comment_thread_and_depth ON comments;
CREATE TRIGGER trigger_set_comment_thread_and_depth
    BEFORE INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION set_comment_thread_and_depth();

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

-- Drop existing trigger if it exists and create new one
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
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and create new one
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

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_create_like_notification ON comment_likes;
CREATE TRIGGER trigger_create_like_notification
    AFTER INSERT ON comment_likes
    FOR EACH ROW
    EXECUTE FUNCTION create_like_notification();

-- RLS (Row Level Security) policies
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "comments_select_policy" ON comments;
DROP POLICY IF EXISTS "comments_insert_policy" ON comments;
DROP POLICY IF EXISTS "comments_update_policy" ON comments;
DROP POLICY IF EXISTS "comments_delete_policy" ON comments;

-- Create new policies
CREATE POLICY "comments_select_policy" ON comments
    FOR SELECT USING (NOT is_flagged OR is_flagged = FALSE);

CREATE POLICY "comments_insert_policy" ON comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_update_policy" ON comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "comments_delete_policy" ON comments
    FOR DELETE USING (auth.uid() = user_id);

-- RLS for comment_likes
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comment_likes_select_policy" ON comment_likes;
DROP POLICY IF EXISTS "comment_likes_insert_policy" ON comment_likes;
DROP POLICY IF EXISTS "comment_likes_delete_policy" ON comment_likes;

CREATE POLICY "comment_likes_select_policy" ON comment_likes
    FOR SELECT USING (true);

CREATE POLICY "comment_likes_insert_policy" ON comment_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comment_likes_delete_policy" ON comment_likes
    FOR DELETE USING (auth.uid() = user_id);

-- RLS for comment_notifications
ALTER TABLE comment_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comment_notifications_select_policy" ON comment_notifications;
DROP POLICY IF EXISTS "comment_notifications_update_policy" ON comment_notifications;

CREATE POLICY "comment_notifications_select_policy" ON comment_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "comment_notifications_update_policy" ON comment_notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Create view for easy comment querying
CREATE OR REPLACE VIEW comment_with_user AS
SELECT 
    c.id,
    c.content,
    c.user_id,
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
    c.is_deleted,
    u.username,
    u.avatar_url,
    u.is_verified,
    u.full_name
FROM comments c
LEFT JOIN users u ON c.user_id = u.id
WHERE NOT c.is_deleted;

-- Commit the transaction
COMMIT;
