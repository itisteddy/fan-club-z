-- =====================================================
-- Fan Club Z: Fixed Comment System Schema
-- =====================================================

-- Drop existing tables to start fresh
DROP TABLE IF EXISTS comment_reactions CASCADE;
DROP TABLE IF EXISTS comment_likes CASCADE;
DROP TABLE IF EXISTS comment_reports CASCADE;
DROP TABLE IF EXISTS comments CASCADE;

-- =====================================================
-- 1. COMMENTS TABLE (Fixed syntax)
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

-- Create indexes separately (this fixes the syntax error)
CREATE INDEX idx_comments_prediction_id ON comments(prediction_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX idx_comments_tree ON comments(prediction_id, parent_comment_id, created_at DESC);

-- =====================================================
-- 2. COMMENT_LIKES TABLE (for reactions)
-- =====================================================
CREATE TABLE comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) DEFAULT 'like' CHECK (type IN ('like', 'love', 'laugh', 'angry', 'sad')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate likes
  UNIQUE(comment_id, user_id, type)
);

-- Create indexes for comment_likes
CREATE INDEX idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON comment_likes(user_id);

-- =====================================================
-- 3. COMMENT_REPORTS TABLE (for moderation)
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
  
  -- Unique constraint to prevent duplicate reports
  UNIQUE(comment_id, reporter_id)
);

-- Create indexes for comment_reports
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
      is_flagged = (flag_count + 1) >= 5  -- Auto-flag after 5 reports
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
-- 6. USEFUL VIEWS
-- =====================================================

-- View for comments with user info and like status
CREATE OR REPLACE VIEW comments_with_details AS
SELECT 
  c.*,
  u.username,
  u.full_name,
  u.avatar_url,
  u.is_verified,
  -- Check if current user liked this comment
  CASE 
    WHEN auth.uid() IS NOT NULL THEN 
      EXISTS(SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = auth.uid())
    ELSE FALSE 
  END as is_liked_by_user,
  -- Check if current user owns this comment
  CASE 
    WHEN auth.uid() IS NOT NULL THEN c.user_id = auth.uid()
    ELSE FALSE 
  END as is_owned_by_user
FROM comments c
JOIN users u ON c.user_id = u.id
WHERE NOT c.is_deleted;

-- =====================================================
-- 7. USEFUL FUNCTIONS
-- =====================================================

-- Function to get comments for a prediction with proper nesting
CREATE OR REPLACE FUNCTION get_prediction_comments(pred_id UUID, page_limit INTEGER DEFAULT 20, page_offset INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  prediction_id UUID,
  user_id UUID,
  parent_comment_id UUID,
  content TEXT,
  likes_count INTEGER,
  replies_count INTEGER,
  is_edited BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  username VARCHAR,
  full_name VARCHAR,
  avatar_url TEXT,
  is_verified BOOLEAN,
  is_liked_by_user BOOLEAN,
  is_owned_by_user BOOLEAN,
  replies JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH top_level_comments AS (
    SELECT 
      c.*,
      cvd.username,
      cvd.full_name,
      cvd.avatar_url,
      cvd.is_verified,
      cvd.is_liked_by_user,
      cvd.is_owned_by_user
    FROM comments_with_details cvd
    JOIN comments c ON cvd.id = c.id
    WHERE c.prediction_id = pred_id 
      AND c.parent_comment_id IS NULL
    ORDER BY c.created_at DESC
    LIMIT page_limit OFFSET page_offset
  ),
  comment_replies AS (
    SELECT 
      r.*,
      rvd.username,
      rvd.full_name,
      rvd.avatar_url,
      rvd.is_verified,
      rvd.is_liked_by_user,
      rvd.is_owned_by_user,
      r.parent_comment_id
    FROM comments_with_details rvd
    JOIN comments r ON rvd.id = r.id
    WHERE r.parent_comment_id IN (SELECT tlc.id FROM top_level_comments tlc)
    ORDER BY r.created_at ASC
  )
  SELECT 
    tlc.id,
    tlc.prediction_id,
    tlc.user_id,
    tlc.parent_comment_id,
    tlc.content,
    tlc.likes_count,
    tlc.replies_count,
    tlc.is_edited,
    tlc.created_at,
    tlc.updated_at,
    tlc.username,
    tlc.full_name,
    tlc.avatar_url,
    tlc.is_verified,
    tlc.is_liked_by_user,
    tlc.is_owned_by_user,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', cr.id,
          'user_id', cr.user_id,
          'content', cr.content,
          'likes_count', cr.likes_count,
          'is_edited', cr.is_edited,
          'created_at', cr.created_at,
          'updated_at', cr.updated_at,
          'user', jsonb_build_object(
            'id', cr.user_id,
            'username', cr.username,
            'full_name', cr.full_name,
            'avatar_url', cr.avatar_url,
            'is_verified', cr.is_verified
          ),
          'is_liked_by_user', cr.is_liked_by_user,
          'is_owned_by_user', cr.is_owned_by_user
        ) ORDER BY cr.created_at ASC
      ) FILTER (WHERE cr.id IS NOT NULL),
      '[]'::jsonb
    ) as replies
  FROM top_level_comments tlc
  LEFT JOIN comment_replies cr ON cr.parent_comment_id = tlc.id
  GROUP BY 
    tlc.id, tlc.prediction_id, tlc.user_id, tlc.parent_comment_id,
    tlc.content, tlc.likes_count, tlc.replies_count, tlc.is_edited,
    tlc.created_at, tlc.updated_at, tlc.username, tlc.full_name,
    tlc.avatar_url, tlc.is_verified, tlc.is_liked_by_user, tlc.is_owned_by_user
  ORDER BY tlc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert some test comments (only if users and predictions exist)
DO $$
DECLARE
  sample_user_id UUID;
  sample_prediction_id UUID;
  comment1_id UUID;
BEGIN
  -- Get a sample user and prediction for testing
  SELECT id INTO sample_user_id FROM users LIMIT 1;
  SELECT id INTO sample_prediction_id FROM predictions LIMIT 1;
  
  IF sample_user_id IS NOT NULL AND sample_prediction_id IS NOT NULL THEN
    -- Insert a top-level comment
    INSERT INTO comments (prediction_id, user_id, content)
    VALUES (sample_prediction_id, sample_user_id, 'This is a test comment for the new comment system!')
    RETURNING id INTO comment1_id;
    
    -- Insert a reply
    INSERT INTO comments (prediction_id, user_id, parent_comment_id, content)
    VALUES (sample_prediction_id, sample_user_id, comment1_id, 'This is a reply to the test comment!');
    
    RAISE NOTICE 'Sample comments inserted successfully';
  ELSE
    RAISE NOTICE 'No users or predictions found - skipping sample data';
  END IF;
END $$;

-- =====================================================
-- 9. VERIFICATION QUERIES
-- =====================================================

-- Verify tables were created successfully
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('comments', 'comment_likes', 'comment_reports')
ORDER BY table_name, ordinal_position;

-- Verify indexes were created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('comments', 'comment_likes', 'comment_reports')
ORDER BY tablename, indexname;

-- Verify triggers were created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'public' 
  AND event_object_table IN ('comments', 'comment_likes', 'comment_reports')
ORDER BY event_object_table, trigger_name;

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('comments', 'comment_likes', 'comment_reports');

-- Test the custom function if data exists
SELECT * FROM get_prediction_comments(
  (SELECT id FROM predictions LIMIT 1),
  5,
  0
) LIMIT 3;

-- Final success message
SELECT 'Comment system schema deployed successfully! ✅' as status;
