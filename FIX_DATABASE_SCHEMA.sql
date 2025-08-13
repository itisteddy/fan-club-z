-- ============================================================================
-- FAN CLUB Z DATABASE SCHEMA FIX
-- ============================================================================
-- Run this SQL in your Supabase SQL Editor to fix all database schema issues
-- This will add missing columns and tables needed for the application

-- 1. Add missing columns to predictions table
ALTER TABLE predictions 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

-- 2. Add fee column to wallet_transactions table
ALTER TABLE wallet_transactions 
ADD COLUMN IF NOT EXISTS fee DECIMAL(18,8) DEFAULT 0.00000000;

-- 3. Create prediction_likes table for tracking user likes on predictions
CREATE TABLE IF NOT EXISTS prediction_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prediction_id, user_id)
);

-- 4. Create comment_likes table for tracking user likes on comments
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- 5. Add likes_count to comments table
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_predictions_likes_count ON predictions(likes_count);
CREATE INDEX IF NOT EXISTS idx_predictions_comments_count ON predictions(comments_count);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_fee ON wallet_transactions(fee);
CREATE INDEX IF NOT EXISTS idx_prediction_likes_prediction_id ON prediction_likes(prediction_id);
CREATE INDEX IF NOT EXISTS idx_prediction_likes_user_id ON prediction_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- 7. Create functions to automatically update counts
CREATE OR REPLACE FUNCTION update_prediction_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE predictions 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.prediction_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE predictions 
    SET likes_count = GREATEST(likes_count - 1, 0) 
    WHERE id = OLD.prediction_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_prediction_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE predictions 
    SET comments_count = comments_count + 1 
    WHERE id = NEW.prediction_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE predictions 
    SET comments_count = GREATEST(comments_count - 1, 0) 
    WHERE id = OLD.prediction_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments 
    SET likes_count = COALESCE(likes_count, 0) + 1 
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments 
    SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) 
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 8. Create triggers for automatic count updates
DROP TRIGGER IF EXISTS update_prediction_likes_count_trigger ON prediction_likes;
CREATE TRIGGER update_prediction_likes_count_trigger
  AFTER INSERT OR DELETE ON prediction_likes
  FOR EACH ROW EXECUTE FUNCTION update_prediction_likes_count();

DROP TRIGGER IF EXISTS update_prediction_comments_count_trigger ON comments;
CREATE TRIGGER update_prediction_comments_count_trigger
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_prediction_comments_count();

DROP TRIGGER IF EXISTS update_comment_likes_count_trigger ON comment_likes;
CREATE TRIGGER update_comment_likes_count_trigger
  AFTER INSERT OR DELETE ON comment_likes
  FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

-- 9. Update existing predictions to have correct counts
UPDATE predictions 
SET 
  likes_count = (
    SELECT COUNT(*) 
    FROM prediction_likes 
    WHERE prediction_likes.prediction_id = predictions.id
  ),
  comments_count = (
    SELECT COUNT(*) 
    FROM comments 
    WHERE comments.prediction_id = predictions.id
  );

-- 10. Update existing comments to have correct likes counts
UPDATE comments 
SET likes_count = (
  SELECT COUNT(*) 
  FROM comment_likes 
  WHERE comment_likes.comment_id = comments.id
);

-- 11. Enable Row Level Security (RLS) for new tables
ALTER TABLE prediction_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies for prediction_likes
DROP POLICY IF EXISTS "Users can view all prediction likes" ON prediction_likes;
CREATE POLICY "Users can view all prediction likes" ON prediction_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like predictions" ON prediction_likes;
CREATE POLICY "Users can like predictions" ON prediction_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike their own likes" ON prediction_likes;
CREATE POLICY "Users can unlike their own likes" ON prediction_likes
  FOR DELETE USING (auth.uid() = user_id);

-- 13. Create RLS policies for comment_likes
DROP POLICY IF EXISTS "Users can view all comment likes" ON comment_likes;
CREATE POLICY "Users can view all comment likes" ON comment_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like comments" ON comment_likes;
CREATE POLICY "Users can like comments" ON comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike their own comment likes" ON comment_likes;
CREATE POLICY "Users can unlike their own comment likes" ON comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- 14. Grant necessary permissions
GRANT ALL ON prediction_likes TO authenticated;
GRANT ALL ON comment_likes TO authenticated;

-- 15. Verify the changes
SELECT 
  'predictions' as table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'predictions' 
  AND column_name IN ('likes_count', 'comments_count')
UNION ALL
SELECT 
  'wallet_transactions' as table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'wallet_transactions' 
  AND column_name = 'fee'
UNION ALL
SELECT 
  'comments' as table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'comments' 
  AND column_name = 'likes_count';

-- 16. Show table creation status
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE tablename IN ('prediction_likes', 'comment_likes');
