-- Migration 204: Create auth_logins table
-- Tracks user login events for referral activity tracking
-- MUST BE RUN BEFORE 205_referral_stats_mv.sql

CREATE TABLE IF NOT EXISTS auth_logins (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  logged_at timestamptz NOT NULL DEFAULT now(),
  ip inet,
  device_fingerprint text,
  login_source text DEFAULT 'web'
);

-- Index for user login history
CREATE INDEX IF NOT EXISTS idx_auth_logins_user 
  ON auth_logins(user_id, logged_at DESC);

-- Simple index for recent logins (no function predicate to avoid IMMUTABLE issue)
CREATE INDEX IF NOT EXISTS idx_auth_logins_recent 
  ON auth_logins(logged_at DESC);

-- Comment for documentation
COMMENT ON TABLE auth_logins IS 'Tracks user login events for referral activity tracking.';
COMMENT ON COLUMN auth_logins.login_source IS 'Platform: web, android, ios';
