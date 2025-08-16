-- ============================================================================
-- Fan Club Z v2.0 - Social Features Database Schema
-- Complete schema for likes and comments with persistence
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PREDICTION LIKES TABLE
-- ============================================================================

-- Drop and recreate prediction_likes table with proper structure
DROP TABLE IF EXISTS prediction_likes CASCADE;

CREATE TABLE prediction_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique constraint: one like per user per prediction
    UNIQUE(prediction_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_prediction_likes_prediction_id ON prediction_likes(prediction_id);
CREATE INDEX idx_prediction_likes_user_id ON prediction_likes(user_id);
CREATE INDEX idx_prediction_likes_created_at ON prediction_likes(created_at);

-- ============================================================================
-- COMMENTS TABLE
-- ============================================================================

-- Drop and recreate comments table with proper structure
DROP TABLE IF EXISTS comments CASCADE;

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 500),
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_comments_prediction_id ON comments(prediction_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_comment_id ON comments(parent_comment_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- ============================================================================
-- COMMENT LIKES TABLE
-- ============================================================================

-- Drop and recreate comment_likes table
DROP TABLE IF EXISTS comment_likes CASCADE;

CREATE TABLE comment_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique constraint: one like per user per comment
    UNIQUE(comment_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON comment_likes(user_id);

-- ============================================================================
-- UPDATE PREDICTIONS TABLE TO TRACK COUNTS
-- ============================================================================

-- Add likes_count and comments_count columns to predictions if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'predictions' AND column_name = 'likes_count') THEN
        ALTER TABLE predictions ADD COLUMN likes_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'predictions' AND column_name = 'comments_count') THEN
        ALTER TABLE predictions ADD COLUMN comments_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- ============================================================================
-- FUNCTIONS TO MAINTAIN COUNT CONSISTENCY
-- ============================================================================

-- Function to update prediction likes count
CREATE OR REPLACE FUNCTION update_prediction_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE predictions 
        SET likes_count = likes_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.prediction_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE predictions 
        SET likes_count = GREATEST(likes_count - 1, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.prediction_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update prediction comments count
CREATE OR REPLACE FUNCTION update_prediction_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE predictions 
        SET comments_count = comments_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.prediction_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE predictions 
        SET comments_count = GREATEST(comments_count - 1, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.prediction_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_prediction_likes_count ON prediction_likes;
DROP TRIGGER IF EXISTS trigger_update_prediction_comments_count ON comments;

-- Create triggers for automatic count updates
CREATE TRIGGER trigger_update_prediction_likes_count
    AFTER INSERT OR DELETE ON prediction_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_prediction_likes_count();

CREATE TRIGGER trigger_update_prediction_comments_count
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_prediction_comments_count();

-- ============================================================================
-- INITIALIZE COUNTS FOR EXISTING DATA
-- ============================================================================

-- Update existing predictions with correct counts
UPDATE predictions SET 
    likes_count = (
        SELECT COUNT(*) 
        FROM prediction_likes 
        WHERE prediction_likes.prediction_id = predictions.id
    ),
    comments_count = (
        SELECT COUNT(*) 
        FROM comments 
        WHERE comments.prediction_id = predictions.id
    ),
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE prediction_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- Prediction likes policies
CREATE POLICY "Anyone can view prediction likes" ON prediction_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can create their own prediction likes" ON prediction_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prediction likes" ON prediction_likes
    FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Anyone can view comments" ON comments
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON comments
    FOR DELETE USING (auth.uid() = user_id);

-- Comment likes policies
CREATE POLICY "Anyone can view comment likes" ON comment_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can create their own comment likes" ON comment_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comment likes" ON comment_likes
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert some sample likes and comments for testing
DO $$
DECLARE
    sample_prediction_id UUID;
    sample_user_id UUID;
    sample_comment_id UUID;
BEGIN
    -- Get a sample prediction and user for testing
    SELECT id INTO sample_prediction_id FROM predictions LIMIT 1;
    SELECT id INTO sample_user_id FROM users LIMIT 1;
    
    -- Only insert sample data if we have predictions and users
    IF sample_prediction_id IS NOT NULL AND sample_user_id IS NOT NULL THEN
        -- Insert sample likes
        INSERT INTO prediction_likes (prediction_id, user_id) 
        VALUES (sample_prediction_id, sample_user_id)
        ON CONFLICT (prediction_id, user_id) DO NOTHING;
        
        -- Insert sample comments
        INSERT INTO comments (prediction_id, user_id, content)
        VALUES (sample_prediction_id, sample_user_id, 'This is a test comment for the social features!')
        ON CONFLICT DO NOTHING
        RETURNING id INTO sample_comment_id;
        
        -- Insert sample comment likes
        IF sample_comment_id IS NOT NULL THEN
            INSERT INTO comment_likes (comment_id, user_id)
            VALUES (sample_comment_id, sample_user_id)
            ON CONFLICT (comment_id, user_id) DO NOTHING;
        END IF;
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify the schema was created correctly
SELECT 
    'prediction_likes' as table_name,
    COUNT(*) as row_count
FROM prediction_likes
UNION ALL
SELECT 
    'comments' as table_name,
    COUNT(*) as row_count
FROM comments
UNION ALL
SELECT 
    'comment_likes' as table_name,
    COUNT(*) as row_count
FROM comment_likes
UNION ALL
SELECT 
    'predictions_with_counts' as table_name,
    COUNT(*) as row_count
FROM predictions 
WHERE likes_count IS NOT NULL AND comments_count IS NOT NULL;

-- Show sample data
SELECT 
    p.id,
    p.title,
    p.likes_count,
    p.comments_count
FROM predictions p
ORDER BY p.created_at DESC
LIMIT 5;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT 'Social features database schema setup completed successfully! ✅' as status;
