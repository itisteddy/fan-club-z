-- Fix RLS Policies for Chat Functionality
-- Run this in Supabase SQL Editor to resolve policy conflicts

-- First, drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can send chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can edit their own messages" ON chat_messages;

DROP POLICY IF EXISTS "Users can read chat participants" ON chat_participants;
DROP POLICY IF EXISTS "Users can manage their participation" ON chat_participants;

DROP POLICY IF EXISTS "Users can read reactions" ON chat_reactions;
DROP POLICY IF EXISTS "Users can manage their reactions" ON chat_reactions;

-- Recreate policies with proper names and logic
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow reading all messages (for now - can be restricted later)
CREATE POLICY "Enable read access for all messages" ON chat_messages
  FOR SELECT
  USING (true);

-- Policy: Allow users to insert their own messages
CREATE POLICY "Enable insert for authenticated users" ON chat_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to update their own messages
CREATE POLICY "Enable update for message owners" ON chat_messages
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to delete their own messages (soft delete)
CREATE POLICY "Enable delete for message owners" ON chat_messages
  FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS for chat_participants
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

-- Policy: Allow reading participant info
CREATE POLICY "Enable read access for participants" ON chat_participants
  FOR SELECT
  USING (true);

-- Policy: Allow users to manage their own participation
CREATE POLICY "Enable participation management" ON chat_participants
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable RLS for chat_reactions
ALTER TABLE chat_reactions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow reading all reactions
CREATE POLICY "Enable read access for reactions" ON chat_reactions
  FOR SELECT
  USING (true);

-- Policy: Allow users to manage their own reactions
CREATE POLICY "Enable reaction management" ON chat_reactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Verify that all tables exist and have correct structure
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('chat_messages', 'chat_participants', 'chat_reactions')
ORDER BY table_name, ordinal_position;

-- Check that RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename IN ('chat_messages', 'chat_participants', 'chat_reactions');

-- List all policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('chat_messages', 'chat_participants', 'chat_reactions')
ORDER BY tablename, policyname;