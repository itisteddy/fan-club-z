-- Migration 205: Create referral stats materialized view
-- PREREQUISITES: 
--   - 201_users_referrals.sql (referral_code column on users)
--   - 202_referral_clicks.sql
--   - 203_referral_attributions.sql
--   - 204_auth_logins.sql
--   - 301_badges_og.sql (og_badge column on users)
--
-- If you haven't run 301_badges_og.sql yet, run this simplified version first,
-- then run 206_referral_stats_mv_v2.sql after adding the badge columns.

-- Drop if exists
DROP MATERIALIZED VIEW IF EXISTS referral_stats_mv CASCADE;

-- Create materialized view (without og_badge if not yet added)
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

-- Grant permissions
GRANT SELECT ON referral_stats_mv TO authenticated;
GRANT SELECT ON referral_stats_mv TO anon;

-- Comment
COMMENT ON MATERIALIZED VIEW referral_stats_mv IS 'Pre-computed referral statistics for leaderboard. Refresh periodically.';
