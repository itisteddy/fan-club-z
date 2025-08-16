-- =====================================================
-- Fan Club Z: Fix Social Features (Likes & Comments)
-- =====================================================

-- =====================================================
-- 1. ADD MISSING COLUMNS TO PREDICTIONS TABLE
-- =====================================================

-- Add likes_count and comments_count to predictions if they don't exist
DO $$ 
BEGIN
    -- Add likes_count column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'predictions' AND column_name = 'likes_count'
    ) THEN
        ALTER TABLE predictions ADD COLUMN likes_count INTEGER DEFAULT 0 CHECK (likes_count >= 0);
    END IF;
    
    -- Add comments_count column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'predictions' AND column_name = 'comments_count'
    ) THEN
        ALTER TABLE predictions ADD COLUMN comments_count INTEGER DEFAULT 0 CHECK (comments_count >= 0);
    END IF;
    
    RAISE NOTICE 'Prediction columns updated successfully';
END $$;

-- =====================================================
-- 2. CREATE PREDICTION_LIKES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS prediction_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) DEFAULT 'like' CHECK (type IN ('like', 'love', 'cheer', 'fire')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate likes
  UNIQUE(prediction_id, user_id, type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_prediction_likes_prediction_id ON prediction_likes(prediction_id);
CREATE INDEX IF NOT EXISTS idx_prediction_likes_user_id ON prediction_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_likes_created_at ON prediction_likes(created_at DESC);

-- =====================================================
-- 3. RLS POLICIES FOR PREDICTION_LIKES
-- =====================================================

ALTER TABLE prediction_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Prediction likes are publicly readable" ON prediction_likes;
DROP POLICY IF EXISTS "Users can manage their own prediction likes" ON prediction_likes;

-- Create new policies
CREATE POLICY "Prediction likes are publicly readable" ON prediction_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own prediction likes" ON prediction_likes FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 4. TRIGGERS FOR MAINTAINING PREDICTION COUNTS
-- =====================================================

-- Function to update prediction likes_count
CREATE OR REPLACE FUNCTION update_prediction_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE predictions 
    SET 
      likes_count = likes_count + 1,
      updated_at = NOW()
    WHERE id = NEW.prediction_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE predictions 
    SET 
      likes_count = GREATEST(0, likes_count - 1),
      updated_at = NOW()
    WHERE id = OLD.prediction_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update prediction comments_count
CREATE OR REPLACE FUNCTION update_prediction_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE predictions 
    SET 
      comments_count = comments_count + 1,
      updated_at = NOW()
    WHERE id = NEW.prediction_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE predictions 
    SET 
      comments_count = GREATEST(0, comments_count - 1),
      updated_at = NOW()
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

-- Only create comments trigger if comments table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments') THEN
    DROP TRIGGER IF EXISTS trigger_update_prediction_comments_count ON comments;
    CREATE TRIGGER trigger_update_prediction_comments_count
      AFTER INSERT OR DELETE ON comments
      FOR EACH ROW EXECUTE FUNCTION update_prediction_comments_count();
    RAISE NOTICE 'Comments trigger created successfully';
  ELSE
    RAISE NOTICE 'Comments table not found - skipping comments trigger';
  END IF;
END $$;

-- =====================================================
-- 5. INITIALIZE EXISTING COUNTS
-- =====================================================

-- Update likes_count for existing predictions
UPDATE predictions 
SET likes_count = (
  SELECT COUNT(*) 
  FROM prediction_likes pl 
  WHERE pl.prediction_id = predictions.id
);

-- Update comments_count for existing predictions (only if comments table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments') THEN
    UPDATE predictions 
    SET comments_count = (
      SELECT COUNT(*) 
      FROM comments c 
      WHERE c.prediction_id = predictions.id
    );
    RAISE NOTICE 'Comments count initialized successfully';
  ELSE
    RAISE NOTICE 'Comments table not found - skipping comments count initialization';
  END IF;
END $$;

-- =====================================================
-- 6. USEFUL VIEWS FOR SOCIAL FEATURES
-- =====================================================

-- View for predictions with social data
CREATE OR REPLACE VIEW predictions_with_social AS
SELECT 
  p.*,
  p.likes_count,
  p.comments_count,
  -- Check if current user liked this prediction
  CASE 
    WHEN auth.uid() IS NOT NULL THEN 
      EXISTS(SELECT 1 FROM prediction_likes pl WHERE pl.prediction_id = p.id AND pl.user_id = auth.uid())
    ELSE FALSE 
  END as is_liked_by_user,
  -- Get creator info
  u.username as creator_username,
  u.full_name as creator_name,
  u.avatar_url as creator_avatar,
  u.is_verified as creator_verified
FROM predictions p
LEFT JOIN users u ON p.creator_id = u.id;

-- =====================================================
-- 7. UTILITY FUNCTIONS
-- =====================================================

-- Function to toggle prediction like
CREATE OR REPLACE FUNCTION toggle_prediction_like(pred_id UUID, like_type VARCHAR DEFAULT 'like')
RETURNS BOOLEAN AS $$
DECLARE
  user_id_val UUID;
  like_exists BOOLEAN;
BEGIN
  -- Get current user
  user_id_val := auth.uid();
  
  IF user_id_val IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Check if like exists
  SELECT EXISTS(
    SELECT 1 FROM prediction_likes 
    WHERE prediction_id = pred_id 
      AND user_id = user_id_val 
      AND type = like_type
  ) INTO like_exists;
  
  IF like_exists THEN
    -- Unlike
    DELETE FROM prediction_likes 
    WHERE prediction_id = pred_id 
      AND user_id = user_id_val 
      AND type = like_type;
    RETURN FALSE;
  ELSE
    -- Like
    INSERT INTO prediction_likes (prediction_id, user_id, type)
    VALUES (pred_id, user_id_val, like_type)
    ON CONFLICT (prediction_id, user_id, type) DO NOTHING;
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's liked predictions
CREATE OR REPLACE FUNCTION get_user_liked_predictions(user_id_param UUID DEFAULT NULL)
RETURNS TABLE (prediction_id UUID, like_type VARCHAR, created_at TIMESTAMPTZ) AS $$
DECLARE
  user_id_val UUID;
BEGIN
  -- Use provided user_id or current authenticated user
  user_id_val := COALESCE(user_id_param, auth.uid());
  
  IF user_id_val IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  RETURN QUERY
  SELECT pl.prediction_id, pl.type, pl.created_at
  FROM prediction_likes pl
  WHERE pl.user_id = user_id_val
  ORDER BY pl.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. CREATE SAMPLE PREDICTION LIKES FOR TESTING
-- =====================================================

-- Insert some sample likes for testing (only if we have users and predictions)
DO $$
DECLARE
  sample_user_id UUID;
  sample_prediction_id UUID;
BEGIN
  -- Get first user and prediction for testing
  SELECT id INTO sample_user_id FROM users LIMIT 1;
  SELECT id INTO sample_prediction_id FROM predictions LIMIT 1;
  
  IF sample_user_id IS NOT NULL AND sample_prediction_id IS NOT NULL THEN
    -- Insert a sample like
    INSERT INTO prediction_likes (prediction_id, user_id, type)
    VALUES (sample_prediction_id, sample_user_id, 'like')
    ON CONFLICT (prediction_id, user_id, type) DO NOTHING;
    
    RAISE NOTICE 'Sample prediction like inserted successfully';
  ELSE
    RAISE NOTICE 'No users or predictions found - skipping sample data';
  END IF;
END $$;

-- =====================================================
-- 9. VERIFICATION QUERIES
-- =====================================================

-- Check that all required tables exist
DO $$
BEGIN
  -- Check prediction_likes table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prediction_likes') THEN
    RAISE NOTICE 'prediction_likes table exists ✓';
  ELSE
    RAISE NOTICE 'prediction_likes table missing ✗';
  END IF;
  
  -- Check predictions columns
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'predictions' AND column_name = 'likes_count'
  ) THEN
    RAISE NOTICE 'predictions.likes_count column exists ✓';
  ELSE
    RAISE NOTICE 'predictions.likes_count column missing ✗';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'predictions' AND column_name = 'comments_count'
  ) THEN
    RAISE NOTICE 'predictions.comments_count column exists ✓';
  ELSE
    RAISE NOTICE 'predictions.comments_count column missing ✗';
  END IF;
  
  -- Check triggers
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'trigger_update_prediction_likes_count'
  ) THEN
    RAISE NOTICE 'prediction likes trigger exists ✓';
  ELSE
    RAISE NOTICE 'prediction likes trigger missing ✗';
  END IF;
END $$;

-- Show current counts
SELECT 
  'Predictions' as table_name,
  COUNT(*) as total_rows,
  AVG(likes_count) as avg_likes,
  AVG(comments_count) as avg_comments
FROM predictions
UNION ALL
SELECT 
  'Prediction Likes' as table_name,
  COUNT(*) as total_rows,
  NULL as avg_likes,
  NULL as avg_comments
FROM prediction_likes;

COMMIT;

-- Success message
SELECT '🎉 Social features (likes & comments) setup completed successfully!' AS status;
