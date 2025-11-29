-- ============================================================================
-- COMBINED REFERRALS & BADGES MIGRATION
-- ============================================================================
-- Run this file in Supabase SQL Editor to set up the referral and badge systems
-- This consolidates all migrations in the correct dependency order
-- ============================================================================

-- ============================================================================
-- STEP 1: Add referral columns to users table
-- ============================================================================

-- Add referral tracking columns to users
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS first_login_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz NULL;

-- Create index on referral_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL;

-- Create index on referred_by for counting referrals
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by) WHERE referred_by IS NOT NULL;

-- Function to generate a unique referral code from username
CREATE OR REPLACE FUNCTION generate_referral_code(p_username text, p_user_id uuid)
RETURNS text AS $$
DECLARE
  base_code text;
  final_code text;
  counter integer := 0;
BEGIN
  -- Clean username: lowercase, remove special chars, limit to 12 chars
  base_code := lower(regexp_replace(COALESCE(p_username, ''), '[^a-zA-Z0-9]', '', 'g'));
  
  -- If too short or empty, use part of UUID
  IF length(base_code) < 3 THEN
    base_code := 'user' || substring(p_user_id::text, 1, 6);
  END IF;
  
  -- Truncate to 12 chars
  base_code := substring(base_code, 1, 12);
  final_code := base_code;
  
  -- Ensure uniqueness by appending number if needed
  WHILE EXISTS (SELECT 1 FROM users WHERE referral_code = final_code) LOOP
    counter := counter + 1;
    final_code := base_code || counter::text;
    
    -- Safety: if we've tried 1000 times, use UUID approach
    IF counter > 1000 THEN
      final_code := base_code || substring(md5(random()::text), 1, 4);
    END IF;
  END LOOP;
  
  RETURN final_code;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing users with referral codes (only those without one)
UPDATE users 
SET referral_code = generate_referral_code(COALESCE(username, full_name), id)
WHERE referral_code IS NULL;

-- Trigger to auto-generate referral code for new users
CREATE OR REPLACE FUNCTION trigger_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code(COALESCE(NEW.username, NEW.full_name), NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_referral_code ON users;
CREATE TRIGGER trg_users_referral_code
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_referral_code();

-- ============================================================================
-- STEP 2: Create referral_clicks table
-- ============================================================================

CREATE TABLE IF NOT EXISTS referral_clicks (
  id bigserial PRIMARY KEY,
  ref_code text NOT NULL,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  ip inet,
  ua text,
  device_fingerprint text,
  landing_path text,
  utm jsonb DEFAULT '{}'::jsonb,
  converted boolean DEFAULT false,
  converted_user_id uuid NULL
);

CREATE INDEX IF NOT EXISTS idx_referral_clicks_ref_code 
  ON referral_clicks(ref_code, clicked_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_clicks_clicked_at 
  ON referral_clicks(clicked_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_clicks_converted 
  ON referral_clicks(converted) WHERE converted = true;

-- ============================================================================
-- STEP 3: Create referral_attributions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS referral_attributions (
  id bigserial PRIMARY KEY,
  referrer_user_id uuid NOT NULL REFERENCES users(id),
  referee_user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  method text NOT NULL DEFAULT 'first_login',
  attributed_at timestamptz NOT NULL DEFAULT now(),
  ref_code text,
  ip inet,
  device_fingerprint text,
  flags jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_referral_attributions_referrer 
  ON referral_attributions(referrer_user_id, attributed_at DESC);

-- ============================================================================
-- STEP 4: Create auth_logins table
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth_logins (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  logged_at timestamptz NOT NULL DEFAULT now(),
  ip inet,
  device_fingerprint text,
  login_source text DEFAULT 'web'
);

CREATE INDEX IF NOT EXISTS idx_auth_logins_user 
  ON auth_logins(user_id, logged_at DESC);

-- Simple index without function predicate
CREATE INDEX IF NOT EXISTS idx_auth_logins_recent 
  ON auth_logins(logged_at DESC);

COMMENT ON TABLE auth_logins IS 'Tracks user login events for referral activity tracking.';
COMMENT ON COLUMN auth_logins.login_source IS 'Platform: web, android, ios';

-- ============================================================================
-- STEP 5: Add OG badge columns to users table
-- ============================================================================

-- Create enum for badge tiers (if it doesn't exist)
DO $$ BEGIN
  CREATE TYPE og_badge_tier AS ENUM ('gold', 'silver', 'bronze');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add badge columns to users
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS og_badge og_badge_tier NULL,
  ADD COLUMN IF NOT EXISTS og_badge_assigned_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS og_badge_reason text NULL,
  ADD COLUMN IF NOT EXISTS og_badge_member_number integer NULL;

-- Create index for badge lookups
CREATE INDEX IF NOT EXISTS idx_users_og_badge 
  ON users(og_badge) 
  WHERE og_badge IS NOT NULL;

-- ============================================================================
-- STEP 6: Create badge admin view
-- ============================================================================

CREATE OR REPLACE VIEW og_badge_summary AS
SELECT
  og_badge AS tier,
  count(*) AS holders
FROM users
WHERE og_badge IS NOT NULL
GROUP BY og_badge;

-- ============================================================================
-- STEP 7: Badge backfill function
-- ============================================================================

CREATE OR REPLACE FUNCTION backfill_og_badges(
  gold_count integer DEFAULT 25,
  silver_count integer DEFAULT 100,
  bronze_count integer DEFAULT 500,
  p_reason text DEFAULT 'backfill:created_at'
)
RETURNS TABLE(tier text, assigned_count integer, skipped_count integer) AS $$
DECLARE
  v_tier og_badge_tier;
  v_limit integer;
  v_offset integer := 0;
  v_assigned integer;
  v_skipped integer;
BEGIN
  -- Process each tier in order
  FOR v_tier, v_limit IN 
    SELECT 'gold'::og_badge_tier, gold_count
    UNION ALL SELECT 'silver'::og_badge_tier, silver_count
    UNION ALL SELECT 'bronze'::og_badge_tier, bronze_count
  LOOP
    v_assigned := 0;
    v_skipped := 0;
    
    -- Update users without badges, ordered by email_confirmed_at or created_at
    WITH eligible_users AS (
      SELECT id
      FROM users
      WHERE og_badge IS NULL
      ORDER BY COALESCE(email_confirmed_at, created_at) ASC
      OFFSET v_offset
      LIMIT v_limit
    )
    UPDATE users u
    SET 
      og_badge = v_tier,
      og_badge_assigned_at = now(),
      og_badge_reason = p_reason
    FROM eligible_users e
    WHERE u.id = e.id
      AND u.og_badge IS NULL;
    
    GET DIAGNOSTICS v_assigned = ROW_COUNT;
    v_skipped := v_limit - v_assigned;
    
    -- Update offset for next tier
    v_offset := v_offset + v_limit;
    
    tier := v_tier::text;
    assigned_count := v_assigned;
    skipped_count := v_skipped;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 8: Badge member number functions
-- ============================================================================

-- Function to calculate member number based on assignment order (marked STABLE for safety)
CREATE OR REPLACE FUNCTION calculate_og_badge_member_number(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  v_tier og_badge_tier;
  v_assigned_at timestamptz;
  v_number integer;
BEGIN
  SELECT og_badge, og_badge_assigned_at 
  INTO v_tier, v_assigned_at
  FROM users 
  WHERE id = p_user_id;
  
  IF v_tier IS NULL OR v_assigned_at IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT COUNT(*) + 1 INTO v_number
  FROM users
  WHERE og_badge = v_tier
    AND og_badge_assigned_at < v_assigned_at
    AND og_badge_assigned_at IS NOT NULL;
  
  RETURN v_number;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to backfill all member numbers
CREATE OR REPLACE FUNCTION backfill_og_badge_member_numbers()
RETURNS TABLE(tier text, updated_count integer) AS $$
DECLARE
  v_tier og_badge_tier;
  v_updated integer;
BEGIN
  FOR v_tier IN SELECT unnest(enum_range(NULL::og_badge_tier)) LOOP
    WITH numbered AS (
      SELECT 
        id,
        ROW_NUMBER() OVER (
          PARTITION BY og_badge 
          ORDER BY og_badge_assigned_at ASC NULLS LAST, created_at ASC
        ) AS member_num
      FROM users
      WHERE og_badge = v_tier
    )
    UPDATE users u
    SET og_badge_member_number = numbered.member_num
    FROM numbered
    WHERE u.id = numbered.id
      AND (u.og_badge_member_number IS NULL OR u.og_badge_member_number != numbered.member_num);
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    tier := v_tier::text;
    updated_count := v_updated;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 9: Create referral stats materialized view
-- ============================================================================

-- Drop if exists to recreate with correct schema
DROP MATERIALIZED VIEW IF EXISTS referral_stats_mv CASCADE;

CREATE MATERIALIZED VIEW referral_stats_mv AS
WITH click_stats AS (
  SELECT 
    u.id AS referrer_id,
    COUNT(*) AS total_clicks
  FROM users u
  JOIN referral_clicks rc ON rc.ref_code = u.referral_code
  WHERE u.referral_code IS NOT NULL
  GROUP BY u.id
),
signup_stats AS (
  SELECT 
    referrer_user_id,
    COUNT(*) AS total_signups
  FROM referral_attributions
  GROUP BY referrer_user_id
),
active_stats_all AS (
  SELECT 
    ra.referrer_user_id,
    COUNT(DISTINCT ra.referee_user_id) AS active_count
  FROM referral_attributions ra
  JOIN auth_logins al ON al.user_id = ra.referee_user_id
  GROUP BY ra.referrer_user_id
),
active_stats_30d AS (
  SELECT 
    ra.referrer_user_id,
    COUNT(DISTINCT ra.referee_user_id) AS active_count
  FROM referral_attributions ra
  JOIN auth_logins al ON al.user_id = ra.referee_user_id
  WHERE al.logged_at >= (now() - interval '30 days')
  GROUP BY ra.referrer_user_id
)
SELECT
  u.id AS referrer_user_id,
  u.username,
  u.full_name,
  u.avatar_url,
  u.og_badge,
  u.og_badge_member_number,
  COALESCE(cs.total_clicks, 0) AS total_clicks,
  COALESCE(ss.total_signups, 0) AS total_signups,
  COALESCE(aa.active_count, 0) AS active_logins_all,
  COALESCE(a30.active_count, 0) AS active_logins_30d,
  CASE 
    WHEN COALESCE(cs.total_clicks, 0) > 0 
    THEN ROUND((COALESCE(ss.total_signups, 0)::numeric / cs.total_clicks) * 100, 1)
    ELSE 0 
  END AS conversion_rate,
  now() AS last_updated
FROM users u
LEFT JOIN click_stats cs ON cs.referrer_id = u.id
LEFT JOIN signup_stats ss ON ss.referrer_user_id = u.id
LEFT JOIN active_stats_all aa ON aa.referrer_user_id = u.id
LEFT JOIN active_stats_30d a30 ON a30.referrer_user_id = u.id
WHERE u.referral_code IS NOT NULL;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX ON referral_stats_mv (referrer_user_id);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_referral_stats_mv_active_all 
  ON referral_stats_mv (active_logins_all DESC);

CREATE INDEX IF NOT EXISTS idx_referral_stats_mv_signups 
  ON referral_stats_mv (total_signups DESC);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_referral_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY referral_stats_mv;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 10: Grant permissions
-- ============================================================================

-- Grant read access to materialized view
GRANT SELECT ON referral_stats_mv TO authenticated;
GRANT SELECT ON referral_stats_mv TO anon;

-- Grant read access to badge summary
GRANT SELECT ON og_badge_summary TO authenticated;
GRANT SELECT ON og_badge_summary TO anon;

-- ============================================================================
-- DONE! 
-- ============================================================================
-- To assign OG badges to earliest users, run:
-- SELECT * FROM backfill_og_badges(25, 100, 500);
-- SELECT * FROM backfill_og_badge_member_numbers();
--
-- To refresh referral stats (do periodically):
-- SELECT refresh_referral_stats();
-- ============================================================================
