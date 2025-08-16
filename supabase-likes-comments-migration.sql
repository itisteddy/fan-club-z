-- Fan Club Z: Prediction Likes and Comments Migration
-- This migration adds proper tables for likes and improves comment counts

-- Create prediction_likes table
CREATE TABLE IF NOT EXISTS prediction_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(prediction_id, user_id)
);

-- Create comment_likes table
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(comment_id, user_id)
);

-- Add likes_count column to predictions if it doesn't exist
ALTER TABLE predictions 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Add likes_count column to comments if it doesn't exist
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Add comments_count column to predictions if it doesn't exist
ALTER TABLE predictions 
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prediction_likes_prediction_id ON prediction_likes(prediction_id);
CREATE INDEX IF NOT EXISTS idx_prediction_likes_user_id ON prediction_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- Function to update prediction likes count
CREATE OR REPLACE FUNCTION update_prediction_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE predictions 
    SET likes_count = (
      SELECT COUNT(*) FROM prediction_likes 
      WHERE prediction_id = NEW.prediction_id
    )
    WHERE id = NEW.prediction_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE predictions 
    SET likes_count = (
      SELECT COUNT(*) FROM prediction_likes 
      WHERE prediction_id = OLD.prediction_id
    )
    WHERE id = OLD.prediction_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update comment likes count
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments 
    SET likes_count = (
      SELECT COUNT(*) FROM comment_likes 
      WHERE comment_id = NEW.comment_id
    )
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments 
    SET likes_count = (
      SELECT COUNT(*) FROM comment_likes 
      WHERE comment_id = OLD.comment_id
    )
    WHERE id = OLD.comment_id;
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
    SET comments_count = (
      SELECT COUNT(*) FROM comments 
      WHERE prediction_id = NEW.prediction_id
    )
    WHERE id = NEW.prediction_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE predictions 
    SET comments_count = (
      SELECT COUNT(*) FROM comments 
      WHERE prediction_id = OLD.prediction_id
    )
    WHERE id = OLD.prediction_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_prediction_likes_count ON prediction_likes;
CREATE TRIGGER trigger_update_prediction_likes_count
  AFTER INSERT OR DELETE ON prediction_likes
  FOR EACH ROW EXECUTE FUNCTION update_prediction_likes_count();

DROP TRIGGER IF EXISTS trigger_update_comment_likes_count ON comment_likes;
CREATE TRIGGER trigger_update_comment_likes_count
  AFTER INSERT OR DELETE ON comment_likes
  FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

DROP TRIGGER IF EXISTS trigger_update_prediction_comments_count ON comments;
CREATE TRIGGER trigger_update_prediction_comments_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_prediction_comments_count();

-- Enable Row Level Security
ALTER TABLE prediction_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prediction_likes
DROP POLICY IF EXISTS "Users can view all prediction likes" ON prediction_likes;
CREATE POLICY "Users can view all prediction likes" ON prediction_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own prediction likes" ON prediction_likes;
CREATE POLICY "Users can manage their own prediction likes" ON prediction_likes
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for comment_likes
DROP POLICY IF EXISTS "Users can view all comment likes" ON comment_likes;
CREATE POLICY "Users can view all comment likes" ON comment_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own comment likes" ON comment_likes;
CREATE POLICY "Users can manage their own comment likes" ON comment_likes
  FOR ALL USING (auth.uid() = user_id);

-- Initialize counts for existing records
UPDATE predictions SET likes_count = 0 WHERE likes_count IS NULL;
UPDATE comments SET likes_count = 0 WHERE likes_count IS NULL;
UPDATE predictions SET comments_count = (
  SELECT COUNT(*) FROM comments WHERE prediction_id = predictions.id
) WHERE comments_count IS NULL;

-- Insert some sample likes for testing
INSERT INTO prediction_likes (prediction_id, user_id, created_at)
SELECT 
  p.id,
  u.id,
  NOW() - INTERVAL '1 hour'
FROM predictions p
CROSS JOIN users u
WHERE random() < 0.3 -- 30% chance of like
ON CONFLICT (prediction_id, user_id) DO NOTHING;

COMMIT;
