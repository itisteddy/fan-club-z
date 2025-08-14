-- Create chat_messages table for persistent chat storage
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_prediction_id ON chat_messages(prediction_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to ON chat_messages(reply_to_id);

-- Create chat_participants table to track who's in chat rooms
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_online BOOLEAN DEFAULT FALSE,
  UNIQUE(prediction_id, user_id)
);

-- Create indexes for chat participants
CREATE INDEX IF NOT EXISTS idx_chat_participants_prediction_id ON chat_participants(prediction_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_online ON chat_participants(is_online);

-- Create chat_reactions table for message reactions
CREATE TABLE IF NOT EXISTS chat_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(50) NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(message_id, user_id, reaction_type)
);

-- Create indexes for reactions
CREATE INDEX IF NOT EXISTS idx_chat_reactions_message_id ON chat_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_reactions_user_id ON chat_reactions(user_id);

-- Create function to update last_seen_at when user sends message
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

-- Create trigger to automatically update participant activity
DROP TRIGGER IF EXISTS trigger_update_chat_activity ON chat_messages;
CREATE TRIGGER trigger_update_chat_activity
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_participant_activity();

-- Create function to get message count for predictions
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

-- Create function to mark user as offline
CREATE OR REPLACE FUNCTION mark_user_offline(user_uuid UUID, prediction_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE chat_participants 
  SET is_online = FALSE, last_seen_at = NOW()
  WHERE user_id = user_uuid AND prediction_id = prediction_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies for chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read messages for predictions they have access to
CREATE POLICY "Users can read chat messages" ON chat_messages
  FOR SELECT
  USING (true); -- For now, allow reading all messages. Can be restricted later.

-- Policy: Users can insert their own messages
CREATE POLICY "Users can send chat messages" ON chat_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update/delete their own messages
CREATE POLICY "Users can edit their own messages" ON chat_messages
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable RLS for chat_participants
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read participant info
CREATE POLICY "Users can read chat participants" ON chat_participants
  FOR SELECT
  USING (true);

-- Policy: Users can join/update their own participation
CREATE POLICY "Users can manage their participation" ON chat_participants
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable RLS for chat_reactions
ALTER TABLE chat_reactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all reactions
CREATE POLICY "Users can read reactions" ON chat_reactions
  FOR SELECT
  USING (true);

-- Policy: Users can manage their own reactions
CREATE POLICY "Users can manage their reactions" ON chat_reactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add comment counts to predictions view (if not exists)
ALTER TABLE predictions 
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;

-- Create function to update message count on predictions
CREATE OR REPLACE FUNCTION update_prediction_message_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE predictions 
    SET message_count = COALESCE(message_count, 0) + 1
    WHERE id = NEW.prediction_id;
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

-- Create trigger to automatically update message count
DROP TRIGGER IF EXISTS trigger_update_message_count ON chat_messages;
CREATE TRIGGER trigger_update_message_count
  AFTER INSERT OR DELETE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_prediction_message_count();