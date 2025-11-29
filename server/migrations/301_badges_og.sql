-- Migration 301: Add OG badge columns to users table
-- Part of the OG Badges System implementation

-- Create enum for badge tiers
DO $$ BEGIN
  CREATE TYPE og_badge_tier AS ENUM ('gold', 'silver', 'bronze');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add badge columns to users
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS og_badge og_badge_tier NULL,
  ADD COLUMN IF NOT EXISTS og_badge_assigned_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS og_badge_reason text NULL;

-- Create index for badge lookups
CREATE INDEX IF NOT EXISTS idx_users_og_badge 
  ON users(og_badge) 
  WHERE og_badge IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN users.og_badge IS 'OG Founding user badge tier: gold (first 25), silver (next 100), bronze (next 500)';
COMMENT ON COLUMN users.og_badge_assigned_at IS 'When the OG badge was assigned';
COMMENT ON COLUMN users.og_badge_reason IS 'Reason for badge assignment: backfill:created_at, manual, etc.';
