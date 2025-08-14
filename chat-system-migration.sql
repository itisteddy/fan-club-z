-- Fan Club Z Chat System Database Migration
-- This script adds chat functionality to the existing Fan Club Z database
-- Run this in your Supabase SQL Editor after the main schema

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create chat_messages table for persistent chat storage
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'emoji', 'system')),
  reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Create chat_participants table to track who's in chat rooms
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_online BOOLEAN DEFAULT FALSE,
  UNIQUE(prediction_id, user_id)
);

-- 3. Create chat_reactions table for message reactions
CREATE TABLE IF NOT EXISTS chat_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(50) NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(message_id, user_id, reaction_type)
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_prediction_id ON chat_messages(prediction_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to ON chat_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_deleted_at ON chat_messages(deleted_at);

CREATE INDEX IF NOT EXISTS idx_chat_participants_prediction_id ON chat_participants(prediction_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_online ON chat_participants(is_online);
CREATE INDEX IF NOT EXISTS idx_chat_participants_last_seen ON chat_participants(last_seen_at);

CREATE INDEX IF NOT EXISTS idx_chat_reactions_message_id ON chat_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_reactions_user_id ON chat_reactions(user_id);

-- 5. Create function to update last_seen_at when user sends message
CREATE OR REPLACE FUNCTION update_chat_participant_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO chat_participants (prediction_id, user_id, last_seen_at, is_online)
  VALUES (NEW.prediction_id, NEW.user_id, NOW(), TRUE)
  ON CONFLICT (prediction_id, user_id)
  DO UPDATE SET 
    last_seen_at = NOW(),
    is_online = TRUE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to automatically update participant activity
DROP TRIGGER IF EXISTS trigger_update_chat_activity ON chat_messages;
CREATE TRIGGER trigger_update_chat_activity
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_participant_activity();

-- 7. Create function to get message count for predictions
CREATE OR REPLACE FUNCTION get_prediction_message_count(prediction_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER 
    FROM chat_messages 
    WHERE prediction_id = prediction_uuid 
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to mark user as offline
CREATE OR REPLACE FUNCTION mark_user_offline(user_uuid UUID, prediction_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE chat_participants 
  SET is_online = FALSE, last_seen_at = NOW()
  WHERE user_id = user_uuid AND prediction_id = prediction_uuid;
END;
$$ LANGUAGE plpgsql;

-- 9. Add message_count column to predictions table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'predictions' AND column_name = 'message_count'
    ) THEN
        ALTER TABLE predictions ADD COLUMN message_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 10. Create function to update message count on predictions
CREATE OR REPLACE FUNCTION update_prediction_message_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
    UPDATE predictions 
    SET message_count = COALESCE(message_count, 0) + 1
    WHERE id = NEW.prediction_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle soft delete (when deleted_at is set)
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE predictions 
      SET message_count = GREATEST(COALESCE(message_count, 0) - 1, 0)
      WHERE id = NEW.prediction_id;
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      UPDATE predictions 
      SET message_count = COALESCE(message_count, 0) + 1
      WHERE id = NEW.prediction_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE predictions 
    SET message_count = GREATEST(COALESCE(message_count, 0) - 1, 0)
    WHERE id = OLD.prediction_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger to automatically update message count
DROP TRIGGER IF EXISTS trigger_update_message_count ON chat_messages;
CREATE TRIGGER trigger_update_message_count
  AFTER INSERT OR UPDATE OR DELETE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_prediction_message_count();

-- 12. Create updated_at trigger for chat_messages
DROP TRIGGER IF EXISTS trigger_chat_messages_updated_at ON chat_messages;
CREATE TRIGGER trigger_chat_messages_updated_at
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 13. Set up Row Level Security (RLS) policies

-- Enable RLS for all chat tables
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reactions ENABLE ROW LEVEL SECURITY;

-- Chat Messages Policies
CREATE POLICY "Users can read messages for predictions they can access" ON chat_messages
  FOR SELECT
  USING (
    -- Users can read messages if they can access the prediction
    EXISTS (
      SELECT 1 FROM predictions p 
      WHERE p.id = prediction_id 
      AND (p.is_private = FALSE OR p.creator_id = auth.uid())
    )
  );

CREATE POLICY "Authenticated users can send messages" ON chat_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    -- Ensure user can access the prediction
    EXISTS (
      SELECT 1 FROM predictions p 
      WHERE p.id = prediction_id 
      AND (p.is_private = FALSE OR p.creator_id = auth.uid())
    )
  );

CREATE POLICY "Users can edit their own messages" ON chat_messages
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can soft delete their own messages" ON chat_messages
  FOR UPDATE
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

-- Chat Participants Policies
CREATE POLICY "Users can read participant info for accessible predictions" ON chat_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM predictions p 
      WHERE p.id = prediction_id 
      AND (p.is_private = FALSE OR p.creator_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage their own participation" ON chat_participants
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Chat Reactions Policies
CREATE POLICY "Users can read all reactions" ON chat_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN predictions p ON p.id = cm.prediction_id
      WHERE cm.id = message_id 
      AND (p.is_private = FALSE OR p.creator_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage their own reactions" ON chat_reactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 14. Initialize message counts for existing predictions
UPDATE predictions 
SET message_count = (
  SELECT COUNT(*) 
  FROM chat_messages 
  WHERE chat_messages.prediction_id = predictions.id 
  AND deleted_at IS NULL
)
WHERE message_count IS NULL OR message_count = 0;

-- 15. Create view for chat messages with user information
CREATE OR REPLACE VIEW chat_messages_with_users AS
SELECT 
  cm.*,
  u.username,
  u.avatar_url,
  u.full_name
FROM chat_messages cm
JOIN users u ON u.id = cm.user_id
WHERE cm.deleted_at IS NULL;

-- 16. Create view for online participants
CREATE OR REPLACE VIEW online_chat_participants AS
SELECT 
  cp.*,
  u.username,
  u.avatar_url,
  u.full_name
FROM chat_participants cp
JOIN users u ON u.id = cp.user_id
WHERE cp.is_online = TRUE;

-- 17. Create function to clean up old offline participants
CREATE OR REPLACE FUNCTION cleanup_offline_participants()
RETURNS void AS $$
BEGIN
  -- Mark participants as offline if they haven't been seen in 10 minutes
  UPDATE chat_participants 
  SET is_online = FALSE 
  WHERE is_online = TRUE 
  AND last_seen_at < NOW() - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql;

-- 18. Create system user for system messages (if not exists)
INSERT INTO users (
  id,
  email,
  username,
  full_name,
  avatar_url,
  kyc_level,
  kyc_status,
  auth_provider,
  reputation_score
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'system@fanclubz.app',
  'System',
  'Fan Club Z System',
  NULL,
  'enhanced',
  'approved',
  'system',
  1000.00
) ON CONFLICT (id) DO NOTHING;

-- Create system wallet
INSERT INTO wallets (user_id, currency, available_balance, reserved_balance)
VALUES ('00000000-0000-0000-0000-000000000000', 'USD', 0, 0)
ON CONFLICT (user_id, currency) DO NOTHING;

-- 19. Create function to send system message
CREATE OR REPLACE FUNCTION send_system_message(
  p_prediction_id UUID,
  p_content TEXT,
  p_message_type TEXT DEFAULT 'system'
)
RETURNS UUID AS $$
DECLARE
  message_id UUID;
BEGIN
  INSERT INTO chat_messages (
    prediction_id,
    user_id,
    content,
    message_type
  ) VALUES (
    p_prediction_id,
    '00000000-0000-0000-0000-000000000000',
    p_content,
    p_message_type
  ) RETURNING id INTO message_id;
  
  RETURN message_id;
END;
$$ LANGUAGE plpgsql;

-- 20. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Success message
SELECT 'Chat system migration completed successfully!' AS status,
       'Created tables: chat_messages, chat_participants, chat_reactions' AS tables_created,
       'Added RLS policies and triggers for real-time functionality' AS features_added;