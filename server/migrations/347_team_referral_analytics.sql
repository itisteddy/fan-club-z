/**
 * Migration 347: Team-Member Referral Analytics
 *
 * Adds:
 *  1. referral_daily_snapshots  – per-referrer, per-day fact table for time-series / cohort views
 *  2. v_team_referral_scorecard – always-fresh view computing all 24+ metrics per referrer
 *  3. upsert_referral_snapshot  – idempotent function to (re)compute one referrer/day row
 *  4. backfill_referral_snapshots – bulk backfill for recent history
 *
 * Prerequisites: migrations 202 (referral_clicks), 203 (referral_attributions),
 *                345 (product_events), 346 (user_activation_status)
 *
 * Composite score formula — MUST stay in sync with
 *   server/src/constants/referralScoring.ts DEFAULT_SCORING_WEIGHTS:
 *
 *   score = qualified_count * 3.0
 *         + d7_retained_count  * 2.0
 *         + d30_retained_count * 5.0
 *         + activated_count    * 1.5
 *         + (stake_volume / 10) * 0.1
 *         + predictions_created * 0.5
 *         - suspicious_signups  * 5.0
 */

-- ============================================================
-- 1. TABLE: referral_daily_snapshots
--    Per-referrer / per-day aggregated facts.
--    Used for trend charts and cohort analysis.
-- ============================================================

CREATE TABLE IF NOT EXISTS referral_daily_snapshots (
  referrer_id    UUID    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day            DATE    NOT NULL,

  -- Click / visit funnel
  clicks_count          INTEGER       NOT NULL DEFAULT 0,
  unique_ips_count      INTEGER       NOT NULL DEFAULT 0,  -- distinct IPs: anti-gaming signal
  unique_sessions_count INTEGER       NOT NULL DEFAULT 0,  -- distinct fingerprints/sessions

  -- Signup funnel
  signups_count         INTEGER       NOT NULL DEFAULT 0,
  onboarding_completions INTEGER      NOT NULL DEFAULT 0,

  -- Quality lifecycle (events first occurring on this day)
  activated_count       INTEGER       NOT NULL DEFAULT 0,
  qualified_count       INTEGER       NOT NULL DEFAULT 0,
  d7_retained_count     INTEGER       NOT NULL DEFAULT 0,
  d30_retained_count    INTEGER       NOT NULL DEFAULT 0,

  -- Economic impact (actions by referred users on this day)
  stake_volume          NUMERIC(18,8) NOT NULL DEFAULT 0,
  stakes_count          INTEGER       NOT NULL DEFAULT 0,
  predictions_created   INTEGER       NOT NULL DEFAULT 0,
  creator_earnings      NUMERIC(18,8) NOT NULL DEFAULT 0,

  -- Social engagement (actions by referred users on this day)
  comments_count        INTEGER       NOT NULL DEFAULT 0,
  likes_count           INTEGER       NOT NULL DEFAULT 0,
  tags_count            INTEGER       NOT NULL DEFAULT 0,

  -- Anti-gaming
  suspicious_signups_count INTEGER     NOT NULL DEFAULT 0,

  -- Pre-computed composite score (matches DEFAULT_SCORING_WEIGHTS in referralScoring.ts)
  composite_score       NUMERIC(10,4) NOT NULL DEFAULT 0,

  computed_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  PRIMARY KEY (referrer_id, day)
);

CREATE INDEX IF NOT EXISTS idx_rds_day
  ON referral_daily_snapshots (day);

CREATE INDEX IF NOT EXISTS idx_rds_referrer_day
  ON referral_daily_snapshots (referrer_id, day DESC);

CREATE INDEX IF NOT EXISTS idx_rds_score_day
  ON referral_daily_snapshots (composite_score DESC, day DESC);

ALTER TABLE referral_daily_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rds_select_all"
  ON referral_daily_snapshots FOR SELECT
  USING (true);


-- ============================================================
-- 2. VIEW: v_team_referral_scorecard
--    All-time scorecard per referrer with all 24+ metrics.
--    Used by the leaderboard and individual scorecard endpoints.
--    Note: predictions_created sourced from product_events to
--    avoid the created_by/creator_id column ambiguity in predictions.
-- ============================================================

CREATE OR REPLACE VIEW v_team_referral_scorecard AS
WITH

-- Referrers: users who have ever had a referral code
referrers AS (
  SELECT id, username, full_name, avatar_url, referral_code, created_at
  FROM public.users
  WHERE referral_code IS NOT NULL
),

-- Click funnel aggregates per referral code
click_stats AS (
  SELECT
    ref_code,
    COUNT(*)                                                               AS total_clicks,
    COUNT(DISTINCT ip::text)                                               AS unique_ips,
    COUNT(DISTINCT COALESCE(device_fingerprint, ip::text, ua))             AS unique_sessions,
    COUNT(*) FILTER (WHERE clicked_at >= NOW() - INTERVAL '7 days')       AS clicks_7d,
    COUNT(*) FILTER (WHERE clicked_at >= NOW() - INTERVAL '30 days')      AS clicks_30d
  FROM referral_clicks
  GROUP BY ref_code
),

-- Signup funnel + lifecycle per referrer
-- Each referee is counted once per referrer (UNIQUE constraint on referee_user_id
-- prevents double attribution; this view counts each referee exactly once)
referral_lifecycle AS (
  SELECT
    ra.referrer_user_id,
    COUNT(*)                                                                AS total_signups,
    COUNT(*) FILTER (WHERE ra.attributed_at >= NOW() - INTERVAL '7 days')  AS signups_7d,
    COUNT(*) FILTER (WHERE ra.attributed_at >= NOW() - INTERVAL '30 days') AS signups_30d,

    -- Anti-gaming: suspicious-flagged signups (device/IP limit violations)
    COUNT(*) FILTER (WHERE (ra.flags->>'suspicious')::boolean = TRUE)      AS suspicious_count,

    -- Quality lifecycle flags (updated by daily cron)
    COUNT(*) FILTER (WHERE ra.is_activated)                                AS activated_count,
    COUNT(*) FILTER (WHERE ra.is_qualified)                                AS qualified_count,
    COUNT(*) FILTER (WHERE uas.d7_retained  = TRUE)                        AS d7_retained_count,
    COUNT(*) FILTER (WHERE uas.d30_retained = TRUE)                        AS d30_retained_count,

    -- Login activity windows
    COUNT(DISTINCT ra.referee_user_id) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM auth_logins al
        WHERE al.user_id = ra.referee_user_id
          AND al.logged_at >= NOW() - INTERVAL '30 days'
      )
    ) AS active_referrals_30d,
    COUNT(DISTINCT ra.referee_user_id) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM auth_logins al
        WHERE al.user_id = ra.referee_user_id
          AND al.logged_at >= NOW() - INTERVAL '7 days'
      )
    ) AS active_referrals_7d
  FROM referral_attributions ra
  LEFT JOIN user_activation_status uas ON uas.user_id = ra.referee_user_id
  GROUP BY ra.referrer_user_id
),

-- Stake volume from prediction_entries (single join — no cartesian risk)
stake_stats AS (
  SELECT
    ra.referrer_user_id,
    COALESCE(SUM(pe.amount), 0) AS stake_volume,
    COUNT(pe.id)                 AS stakes_count
  FROM referral_attributions ra
  LEFT JOIN prediction_entries pe ON pe.user_id = ra.referee_user_id
  GROUP BY ra.referrer_user_id
),

-- Creator earnings from user_stats_daily (one row per user per day — summed)
earnings_stats AS (
  SELECT
    ra.referrer_user_id,
    COALESCE(SUM(usd.creator_earnings_amount), 0) AS creator_earnings
  FROM referral_attributions ra
  LEFT JOIN user_stats_daily usd ON usd.user_id = ra.referee_user_id
  GROUP BY ra.referrer_user_id
),

-- Social + engagement events from product_events
-- Uses product_events.user_id = referee's user_id
-- Counts are 0 for pre-migration history (product_events added in migration 345)
social_stats AS (
  SELECT
    ra.referrer_user_id,
    COUNT(evt.id) FILTER (WHERE evt.event_name = 'onboarding_completed') AS onboarding_completions,
    COUNT(evt.id) FILTER (WHERE evt.event_name = 'prediction_created')   AS predictions_created,
    COUNT(evt.id) FILTER (WHERE evt.event_name = 'comment_created')      AS comments_count,
    COUNT(evt.id) FILTER (WHERE evt.event_name = 'like_added')           AS likes_count,
    COUNT(evt.id) FILTER (WHERE evt.event_name = 'tag_used')             AS tags_count
  FROM referral_attributions ra
  LEFT JOIN product_events evt ON evt.user_id = ra.referee_user_id
  GROUP BY ra.referrer_user_id
)

SELECT
  r.id                 AS referrer_id,
  r.username,
  r.full_name,
  r.avatar_url,
  r.referral_code,
  r.created_at         AS referrer_joined_at,

  -- ── Click funnel ──────────────────────────────────────────
  COALESCE(cs.total_clicks,    0) AS total_clicks,
  COALESCE(cs.unique_ips,      0) AS unique_ips,
  COALESCE(cs.unique_sessions, 0) AS unique_sessions,
  COALESCE(cs.clicks_7d,       0) AS clicks_7d,
  COALESCE(cs.clicks_30d,      0) AS clicks_30d,

  -- ── Signup funnel ─────────────────────────────────────────
  COALESCE(rl.total_signups,           0) AS total_signups,
  COALESCE(rl.signups_7d,              0) AS signups_7d,
  COALESCE(rl.signups_30d,             0) AS signups_30d,
  COALESCE(ss2.onboarding_completions, 0) AS onboarding_completions,

  -- ── Quality lifecycle ─────────────────────────────────────
  COALESCE(rl.activated_count,   0) AS activated_count,
  COALESCE(rl.qualified_count,   0) AS qualified_count,
  COALESCE(rl.d7_retained_count, 0) AS d7_retained_count,
  COALESCE(rl.d30_retained_count,0) AS d30_retained_count,

  -- Login activity
  COALESCE(rl.active_referrals_30d, 0) AS active_referrals_30d,
  COALESCE(rl.active_referrals_7d,  0) AS active_referrals_7d,

  -- ── Economic impact ───────────────────────────────────────
  COALESCE(sk.stake_volume,          0) AS referred_stake_volume,
  COALESCE(sk.stakes_count,          0) AS referred_stakes_count,
  COALESCE(ss2.predictions_created,  0) AS referred_predictions_created,
  COALESCE(es.creator_earnings,      0) AS referred_creator_earnings,

  -- ── Social engagement ─────────────────────────────────────
  COALESCE(ss2.comments_count, 0) AS referred_comments_count,
  COALESCE(ss2.likes_count,    0) AS referred_likes_count,
  COALESCE(ss2.tags_count,     0) AS referred_tags_count,

  -- ── Anti-gaming ───────────────────────────────────────────
  COALESCE(rl.suspicious_count, 0) AS suspicious_signups_count,

  -- ── Funnel rates (%) ─────────────────────────────────────
  CASE
    WHEN COALESCE(cs.total_clicks, 0) > 0
    THEN ROUND(COALESCE(rl.total_signups, 0)::NUMERIC / cs.total_clicks * 100, 1)
    ELSE 0
  END AS click_to_signup_pct,

  CASE
    WHEN COALESCE(rl.total_signups, 0) > 0
    THEN ROUND(COALESCE(rl.activated_count, 0)::NUMERIC / rl.total_signups * 100, 1)
    ELSE 0
  END AS signup_to_activation_pct,

  CASE
    WHEN COALESCE(rl.total_signups, 0) > 0
    THEN ROUND(COALESCE(rl.qualified_count, 0)::NUMERIC / rl.total_signups * 100, 1)
    ELSE 0
  END AS qualification_rate_pct,

  CASE
    WHEN COALESCE(rl.total_signups, 0) > 0
    THEN ROUND(COALESCE(rl.d7_retained_count, 0)::NUMERIC / rl.total_signups * 100, 1)
    ELSE 0
  END AS d7_retention_rate_pct,

  CASE
    WHEN COALESCE(rl.total_signups, 0) > 0
    THEN ROUND(COALESCE(rl.d30_retained_count, 0)::NUMERIC / rl.total_signups * 100, 1)
    ELSE 0
  END AS d30_retention_rate_pct,

  -- ── Composite score ───────────────────────────────────────
  -- Formula MUST match DEFAULT_SCORING_WEIGHTS in referralScoring.ts
  -- qualified=3.0, d7_retained=2.0, d30_retained=5.0, activated=1.5,
  -- stake_vol/10*0.1, predictions*0.5, suspicious*-5.0
  ROUND(
    COALESCE(rl.qualified_count,    0)     *  3.0
  + COALESCE(rl.d7_retained_count,  0)     *  2.0
  + COALESCE(rl.d30_retained_count, 0)     *  5.0
  + COALESCE(rl.activated_count,    0)     *  1.5
  + (COALESCE(sk.stake_volume,      0) / 10.0) * 0.1
  + COALESCE(ss2.predictions_created, 0)   *  0.5
  - COALESCE(rl.suspicious_count,   0)     *  5.0
  , 2) AS composite_score

FROM referrers r
LEFT JOIN click_stats      cs  ON cs.ref_code          = r.referral_code
LEFT JOIN referral_lifecycle rl ON rl.referrer_user_id  = r.id
LEFT JOIN stake_stats       sk  ON sk.referrer_user_id  = r.id
LEFT JOIN earnings_stats    es  ON es.referrer_user_id  = r.id
LEFT JOIN social_stats      ss2 ON ss2.referrer_user_id = r.id

WHERE (COALESCE(cs.total_clicks, 0) + COALESCE(rl.total_signups, 0)) > 0;


-- ============================================================
-- 3. FUNCTION: upsert_referral_snapshot
--    (Re)computes and upserts one row in referral_daily_snapshots.
--    Idempotent — safe to re-run for any past day.
-- ============================================================

CREATE OR REPLACE FUNCTION upsert_referral_snapshot(
  p_referrer_id UUID,
  p_day         DATE
) RETURNS VOID AS $$
DECLARE
  v_ref_code               TEXT;
  v_clicks_count           INTEGER := 0;
  v_unique_ips             INTEGER := 0;
  v_unique_sessions        INTEGER := 0;
  v_signups                INTEGER := 0;
  v_onboarding             INTEGER := 0;
  v_activated              INTEGER := 0;
  v_qualified              INTEGER := 0;
  v_d7_retained            INTEGER := 0;
  v_d30_retained           INTEGER := 0;
  v_stake_volume           NUMERIC := 0;
  v_stakes_count           INTEGER := 0;
  v_predictions_created    INTEGER := 0;
  v_creator_earnings       NUMERIC := 0;
  v_comments               INTEGER := 0;
  v_likes                  INTEGER := 0;
  v_tags                   INTEGER := 0;
  v_suspicious             INTEGER := 0;
  v_score                  NUMERIC := 0;
BEGIN
  -- Fetch referral code
  SELECT referral_code INTO v_ref_code
  FROM public.users WHERE id = p_referrer_id;

  IF v_ref_code IS NULL THEN
    RETURN; -- No referral code → nothing to snapshot
  END IF;

  -- Click stats for this day
  SELECT
    COUNT(*),
    COUNT(DISTINCT ip::text),
    COUNT(DISTINCT COALESCE(device_fingerprint, ip::text, ua))
  INTO v_clicks_count, v_unique_ips, v_unique_sessions
  FROM referral_clicks
  WHERE ref_code = v_ref_code
    AND clicked_at::date = p_day;

  -- Signups attributed on this day
  SELECT COUNT(*) INTO v_signups
  FROM referral_attributions
  WHERE referrer_user_id = p_referrer_id
    AND attributed_at::date = p_day;

  -- Suspicious signups on this day
  SELECT COUNT(*) INTO v_suspicious
  FROM referral_attributions
  WHERE referrer_user_id = p_referrer_id
    AND attributed_at::date = p_day
    AND (flags->>'suspicious')::boolean = TRUE;

  -- Onboarding completions by referred users on this day
  BEGIN
    SELECT COUNT(*) INTO v_onboarding
    FROM referral_attributions ra
    JOIN product_events evt ON evt.user_id = ra.referee_user_id
    WHERE ra.referrer_user_id = p_referrer_id
      AND evt.event_name = 'onboarding_completed'
      AND evt.occurred_at::date = p_day;
  EXCEPTION WHEN undefined_table THEN
    v_onboarding := 0;
  END;

  -- Activated on this day (activation_at falls on this day)
  BEGIN
    SELECT COUNT(*) INTO v_activated
    FROM referral_attributions ra
    JOIN user_activation_status uas ON uas.user_id = ra.referee_user_id
    WHERE ra.referrer_user_id = p_referrer_id
      AND ra.is_activated = TRUE
      AND uas.activated_at::date = p_day;
  EXCEPTION WHEN undefined_table THEN
    v_activated := 0;
  END;

  -- Qualified on this day (qualified_at falls on this day)
  SELECT COUNT(*) INTO v_qualified
  FROM referral_attributions
  WHERE referrer_user_id = p_referrer_id
    AND is_qualified = TRUE
    AND qualified_at::date = p_day;

  -- D7 retained: attributed users whose signup_day + 7 = today and they ARE d7_retained
  BEGIN
    SELECT COUNT(*) INTO v_d7_retained
    FROM referral_attributions ra
    JOIN user_activation_status uas ON uas.user_id = ra.referee_user_id
    WHERE ra.referrer_user_id = p_referrer_id
      AND uas.d7_retained = TRUE
      AND (uas.signup_day + INTERVAL '7 days')::date = p_day;
  EXCEPTION WHEN undefined_table THEN
    v_d7_retained := 0;
  END;

  -- D30 retained: signup_day + 30 = today and d30_retained
  BEGIN
    SELECT COUNT(*) INTO v_d30_retained
    FROM referral_attributions ra
    JOIN user_activation_status uas ON uas.user_id = ra.referee_user_id
    WHERE ra.referrer_user_id = p_referrer_id
      AND uas.d30_retained = TRUE
      AND (uas.signup_day + INTERVAL '30 days')::date = p_day;
  EXCEPTION WHEN undefined_table THEN
    v_d30_retained := 0;
  END;

  -- Stake volume and count on this day
  SELECT
    COALESCE(SUM(pe.amount), 0),
    COUNT(pe.id)
  INTO v_stake_volume, v_stakes_count
  FROM referral_attributions ra
  JOIN prediction_entries pe ON pe.user_id = ra.referee_user_id
  WHERE ra.referrer_user_id = p_referrer_id
    AND pe.created_at::date = p_day;

  -- Predictions created on this day (via product_events)
  BEGIN
    SELECT COUNT(*) INTO v_predictions_created
    FROM referral_attributions ra
    JOIN product_events evt ON evt.user_id = ra.referee_user_id
    WHERE ra.referrer_user_id = p_referrer_id
      AND evt.event_name = 'prediction_created'
      AND evt.occurred_at::date = p_day;
  EXCEPTION WHEN undefined_table THEN
    v_predictions_created := 0;
  END;

  -- Creator earnings for referred users on this day
  SELECT COALESCE(SUM(usd.creator_earnings_amount), 0) INTO v_creator_earnings
  FROM referral_attributions ra
  JOIN user_stats_daily usd ON usd.user_id = ra.referee_user_id
  WHERE ra.referrer_user_id = p_referrer_id
    AND usd.day = p_day;

  -- Social events on this day
  BEGIN
    SELECT
      COUNT(*) FILTER (WHERE evt.event_name = 'comment_created'),
      COUNT(*) FILTER (WHERE evt.event_name = 'like_added'),
      COUNT(*) FILTER (WHERE evt.event_name = 'tag_used')
    INTO v_comments, v_likes, v_tags
    FROM referral_attributions ra
    JOIN product_events evt ON evt.user_id = ra.referee_user_id
    WHERE ra.referrer_user_id = p_referrer_id
      AND evt.occurred_at::date = p_day;
  EXCEPTION WHEN undefined_table THEN
    v_comments := 0; v_likes := 0; v_tags := 0;
  END;

  -- Composite score (matches DEFAULT_SCORING_WEIGHTS in referralScoring.ts)
  -- NOTE: this is a cumulative score for the day, not the all-time score.
  -- The leaderboard recomputes all-time totals from the raw tables via the view.
  v_score := ROUND(
      v_qualified        *  3.0
    + v_d7_retained      *  2.0
    + v_d30_retained     *  5.0
    + v_activated        *  1.5
    + (v_stake_volume / 10.0) * 0.1
    + v_predictions_created   * 0.5
    - v_suspicious       *  5.0
  , 4);

  -- Upsert into referral_daily_snapshots
  INSERT INTO referral_daily_snapshots (
    referrer_id, day,
    clicks_count, unique_ips_count, unique_sessions_count,
    signups_count, onboarding_completions,
    activated_count, qualified_count, d7_retained_count, d30_retained_count,
    stake_volume, stakes_count, predictions_created, creator_earnings,
    comments_count, likes_count, tags_count,
    suspicious_signups_count, composite_score, computed_at
  ) VALUES (
    p_referrer_id, p_day,
    v_clicks_count, v_unique_ips, v_unique_sessions,
    v_signups, v_onboarding,
    v_activated, v_qualified, v_d7_retained, v_d30_retained,
    v_stake_volume, v_stakes_count, v_predictions_created, v_creator_earnings,
    v_comments, v_likes, v_tags,
    v_suspicious, v_score, NOW()
  )
  ON CONFLICT (referrer_id, day) DO UPDATE SET
    clicks_count          = EXCLUDED.clicks_count,
    unique_ips_count      = EXCLUDED.unique_ips_count,
    unique_sessions_count = EXCLUDED.unique_sessions_count,
    signups_count         = EXCLUDED.signups_count,
    onboarding_completions= EXCLUDED.onboarding_completions,
    activated_count       = EXCLUDED.activated_count,
    qualified_count       = EXCLUDED.qualified_count,
    d7_retained_count     = EXCLUDED.d7_retained_count,
    d30_retained_count    = EXCLUDED.d30_retained_count,
    stake_volume          = EXCLUDED.stake_volume,
    stakes_count          = EXCLUDED.stakes_count,
    predictions_created   = EXCLUDED.predictions_created,
    creator_earnings      = EXCLUDED.creator_earnings,
    comments_count        = EXCLUDED.comments_count,
    likes_count           = EXCLUDED.likes_count,
    tags_count            = EXCLUDED.tags_count,
    suspicious_signups_count = EXCLUDED.suspicious_signups_count,
    composite_score       = EXCLUDED.composite_score,
    computed_at           = NOW();

END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 4. FUNCTION: backfill_referral_snapshots
--    Calls upsert_referral_snapshot for every active referrer
--    for every day in the last p_days_back days.
--    Returns count of (referrer, day) pairs processed.
-- ============================================================

CREATE OR REPLACE FUNCTION backfill_referral_snapshots(
  p_days_back INTEGER DEFAULT 90
) RETURNS INTEGER AS $$
DECLARE
  v_referrer  RECORD;
  v_day       DATE;
  v_processed INTEGER := 0;
  v_start_day DATE := CURRENT_DATE - p_days_back;
BEGIN
  -- Iterate over referrers who have had activity in the window
  FOR v_referrer IN
    SELECT DISTINCT u.id
    FROM public.users u
    WHERE u.referral_code IS NOT NULL
      AND (
        EXISTS (
          SELECT 1 FROM referral_clicks rc
          WHERE rc.ref_code = u.referral_code
            AND rc.clicked_at >= v_start_day
        )
        OR EXISTS (
          SELECT 1 FROM referral_attributions ra
          WHERE ra.referrer_user_id = u.id
            AND ra.attributed_at >= v_start_day
        )
      )
  LOOP
    -- For each active referrer, iterate over all days in the window
    v_day := v_start_day;
    WHILE v_day <= CURRENT_DATE LOOP
      BEGIN
        PERFORM upsert_referral_snapshot(v_referrer.id, v_day);
        v_processed := v_processed + 1;
      EXCEPTION WHEN OTHERS THEN
        -- Log and continue; never fail the entire backfill
        RAISE WARNING '[backfill_referral_snapshots] referrer=% day=% error=%',
          v_referrer.id, v_day, SQLERRM;
      END;
      v_day := v_day + INTERVAL '1 day';
    END LOOP;
  END LOOP;

  RETURN v_processed;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- Comment on key design choices
-- ============================================================

COMMENT ON TABLE referral_daily_snapshots IS
  'Per-referrer per-day aggregated analytics. Used for sparklines, cohort trends, and time-series analysis. Re-computed nightly by backfill_referral_snapshots() via the retentionCompute cron.';

COMMENT ON VIEW v_team_referral_scorecard IS
  'Always-fresh all-time scorecard for every referrer with a referral_code. Composite score formula defined in server/src/constants/referralScoring.ts DEFAULT_SCORING_WEIGHTS.';

COMMENT ON FUNCTION upsert_referral_snapshot(UUID, DATE) IS
  'Idempotent: safely re-runnable for any past day. Called by backfill_referral_snapshots and the admin backfill endpoint.';

COMMENT ON FUNCTION backfill_referral_snapshots(INTEGER) IS
  'Backfills referral_daily_snapshots for all active referrers in the last p_days_back days. Returns count of (referrer,day) rows processed.';
