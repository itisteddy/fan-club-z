-- =====================================================
-- Fan Club Z: Simple & Working Comment System Schema
-- =====================================================

-- Drop existing tables to start fresh
DROP TABLE IF EXISTS comment_reactions CASCADE;
DROP TABLE IF EXISTS comment_likes CASCADE;
DROP TABLE IF EXISTS comment_reports CASCADE;
DROP TABLE IF EXISTS comments CASCADE;

-- Drop functions and views
DROP FUNCTION IF EXISTS get_prediction_comments(UUID, INTEGER, INTEGER) CASCADE;
DROP VIEW IF EXISTS comments_with_details CASCADE;

-- =====================================================
-- 1. COMMENTS TABLE
-- =====================================================
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 500),
  likes_count INTEGER DEFAULT 0 CHECK (likes_count >= 0),
  replies_count INTEGER DEFAULT 0 CHECK (replies_count >= 0),
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_count INTEGER DEFAULT 0 CHECK (flag_count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_comments_prediction_id ON comments(prediction_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX idx_comments_tree ON comments(prediction_id, parent_comment_id, created_at DESC);

-- =====================================================
-- 2. COMMENT_LIKES TABLE
-- =====================================================
CREATE TABLE comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) DEFAULT 'like' CHECK (type IN ('like', 'love', 'laugh', 'angry', 'sad')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id, type)
);

CREATE INDEX idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON comment_likes(user_id);

-- =====================================================
-- 3. COMMENT_REPORTS TABLE
-- =====================================================
CREATE TABLE comment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(50) NOT NULL CHECK (reason IN ('spam', 'harassment', 'offensive', 'misinformation', 'other')),
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, reporter_id)
);

CREATE INDEX idx_comment_reports_comment_id ON comment_reports(comment_id);
CREATE INDEX idx_comment_reports_status ON comment_reports(status);
CREATE INDEX idx_comment_reports_created_at ON comment_reports(created_at DESC);

-- =====================================================
-- 4. TRIGGERS FOR MAINTAINING COUNTS
-- =====================================================

-- Function to update likes_count
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments 
    SET likes_count = GREATEST(0, likes_count - 1) 
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update replies_count
CREATE OR REPLACE FUNCTION update_comment_replies_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.parent_comment_id IS NOT NULL THEN
      UPDATE comments 
      SET replies_count = replies_count + 1 
      WHERE id = NEW.parent_comment_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.parent_comment_id IS NOT NULL THEN
      UPDATE comments 
      SET replies_count = GREATEST(0, replies_count - 1) 
      WHERE id = OLD.parent_comment_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update flag_count
CREATE OR REPLACE FUNCTION update_comment_flag_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments 
    SET 
      flag_count = flag_count + 1,
      is_flagged = (flag_count + 1) >= 5
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments 
    SET 
      flag_count = GREATEST(0, flag_count - 1),
      is_flagged = (flag_count - 1) >= 5
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_comment_likes_count ON comment_likes;
CREATE TRIGGER trigger_update_comment_likes_count
  AFTER INSERT OR DELETE ON comment_likes
  FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

DROP TRIGGER IF EXISTS trigger_update_comment_replies_count ON comments;
CREATE TRIGGER trigger_update_comment_replies_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_comment_replies_count();

DROP TRIGGER IF EXISTS trigger_update_comment_flag_count ON comment_reports;
CREATE TRIGGER trigger_update_comment_flag_count
  AFTER INSERT OR DELETE ON comment_reports
  FOR EACH ROW EXECUTE FUNCTION update_comment_flag_count();

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reports ENABLE ROW LEVEL SECURITY;

-- Comments policies
CREATE POLICY "Comments are publicly readable" ON comments FOR SELECT USING (NOT is_deleted);
CREATE POLICY "Users can insert their own comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Comment likes policies
CREATE POLICY "Comment likes are publicly readable" ON comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own comment likes" ON comment_likes FOR ALL USING (auth.uid() = user_id);

-- Comment reports policies
CREATE POLICY "Users can create reports" ON comment_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view their own reports" ON comment_reports FOR SELECT USING (auth.uid() = reporter_id);

-- =====================================================
-- 6. SIMPLIFIED FUNCTION FOR GETTING COMMENTS
-- =====================================================

-- Simple function to get comments without ambiguity
CREATE OR REPLACE FUNCTION get_prediction_comments_simple(pred_id UUID)
RETURNS TABLE (
  comment_id UUID,
  comment_content TEXT,
  comment_user_id UUID,
  comment_parent_id UUID,
  comment_likes_count INTEGER,
  comment_replies_count INTEGER,
  comment_is_edited BOOLEAN,
  comment_created_at TIMESTAMPTZ,
  comment_updated_at TIMESTAMPTZ,
  user_username VARCHAR,
  user_full_name VARCHAR,
  user_avatar_url TEXT,
  user_is_verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as comment_id,
    c.content as comment_content,
    c.user_id as comment_user_id,
    c.parent_comment_id as comment_parent_id,
    c.likes_count as comment_likes_count,
    c.replies_count as comment_replies_count,
    c.is_edited as comment_is_edited,
    c.created_at as comment_created_at,
    c.updated_at as comment_updated_at,
    u.username as user_username,
    u.full_name as user_full_name,
    u.avatar_url as user_avatar_url,
    COALESCE(u.is_verified, false) as user_is_verified
  FROM comments c
  JOIN users u ON c.user_id = u.id
  WHERE c.prediction_id = pred_id 
    AND NOT c.is_deleted
  ORDER BY 
    CASE WHEN c.parent_comment_id IS NULL THEN c.created_at ELSE '1970-01-01'::timestamptz END DESC,
    c.parent_comment_id ASC NULLS FIRST,
    c.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. TEST THE SETUP
-- =====================================================

-- Insert test data if possible
DO $$
DECLARE
  sample_user_id UUID;
  sample_prediction_id UUID;
  comment1_id UUID;
BEGIN
  -- Get sample user and prediction
  SELECT id INTO sample_user_id FROM users LIMIT 1;
  SELECT id INTO sample_prediction_id FROM predictions LIMIT 1;
  
  IF sample_user_id IS NOT NULL AND sample_prediction_id IS NOT NULL THEN
    -- Insert test comment
    INSERT INTO comments (prediction_id, user_id, content)
    VALUES (sample_prediction_id, sample_user_id, 'Test comment - system is working! 🎉')
    RETURNING id INTO comment1_id;
    
    -- Insert test reply
    IF comment1_id IS NOT NULL THEN
      INSERT INTO comments (prediction_id, user_id, parent_comment_id, content)
      VALUES (sample_prediction_id, sample_user_id, comment1_id, 'Test reply - nested comments work! 👍');
      
      -- Insert test like
      INSERT INTO comment_likes (comment_id, user_id, type)
      VALUES (comment1_id, sample_user_id, 'like');
    END IF;
    
    RAISE NOTICE 'Test data inserted successfully';
  ELSE
    RAISE NOTICE 'No test data available - create users and predictions first';
  END IF;
END $$;

-- =====================================================
-- 8. VERIFICATION
-- =====================================================

-- Test the function
SELECT 'Testing comment function...' as status;

-- Show table structures
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'comments'
ORDER BY ordinal_position;

-- Test basic query
SELECT 
  COUNT(*) as total_comments,
  COUNT(DISTINCT prediction_id) as predictions_with_comments,
  COUNT(CASE WHEN parent_comment_id IS NULL THEN 1 END) as top_level_comments,
  COUNT(CASE WHEN parent_comment_id IS NOT NULL THEN 1 END) as replies
FROM comments;

-- Test triggers work
SELECT 
  c.id,
  c.content,
  c.likes_count,
  c.replies_count,
  (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) as actual_likes,
  (SELECT COUNT(*) FROM comments cr WHERE cr.parent_comment_id = c.id) as actual_replies
FROM comments c
LIMIT 5;

SELECT '✅ Comment system setup complete!' as final_status;
