-- Simple prediction media cache table
-- Run this in Supabase SQL Editor

-- Drop existing table if it has issues
DROP TABLE IF EXISTS prediction_media;

-- Create fresh table with correct structure
CREATE TABLE prediction_media (
  prediction_id text PRIMARY KEY,
  image_url text,
  query text,
  source text,
  created_at timestamptz DEFAULT now()
);

-- Add index for performance
CREATE INDEX idx_prediction_media_created_at 
  ON prediction_media(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE prediction_media ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (images are public)
CREATE POLICY "Anyone can read prediction_media"
  ON prediction_media FOR SELECT
  USING (true);

-- Allow anyone to insert/update (for caching)
CREATE POLICY "Anyone can insert prediction_media"
  ON prediction_media FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update prediction_media"
  ON prediction_media FOR UPDATE
  USING (true);
