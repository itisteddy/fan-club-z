-- Migration 344: Analytics foundation
-- Adds platform-wide daily snapshot table + helper views for the admin analytics dashboard.
-- Safe to run multiple times (IF NOT EXISTS, CREATE OR REPLACE).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. analytics_daily_snapshots
--    One row per calendar day, capturing platform-wide aggregates.
--    Populated by the nightly cron job (server/src/cron/analyticsSnapshot.ts).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.analytics_daily_snapshots (
  day                         DATE        PRIMARY KEY,

  -- User metrics
  new_users_count             INTEGER     NOT NULL DEFAULT 0,
  active_users_count          INTEGER     NOT NULL DEFAULT 0,   -- had at least one stake or comment
  cumulative_users_count      INTEGER     NOT NULL DEFAULT 0,

  -- Prediction / engagement metrics
  new_predictions_count       INTEGER     NOT NULL DEFAULT 0,
  settled_predictions_count   INTEGER     NOT NULL DEFAULT 0,
  total_stakes_count          INTEGER     NOT NULL DEFAULT 0,
  total_stake_amount          NUMERIC(18,8) NOT NULL DEFAULT 0,
  total_payout_amount         NUMERIC(18,8) NOT NULL DEFAULT 0,
  total_creator_earnings_amount NUMERIC(18,8) NOT NULL DEFAULT 0,
  total_comments_count        INTEGER     NOT NULL DEFAULT 0,

  -- Wallet / economy metrics (from wallet_transactions)
  total_deposits_amount       NUMERIC(18,8) NOT NULL DEFAULT 0,
  total_withdrawals_amount    NUMERIC(18,8) NOT NULL DEFAULT 0,
  total_net_flow              NUMERIC(18,8) NOT NULL DEFAULT 0,  -- deposits - withdrawals

  -- Referral metrics
  new_referral_clicks         INTEGER     NOT NULL DEFAULT 0,
  new_referral_signups        INTEGER     NOT NULL DEFAULT 0,

  computed_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_snapshots_day
  ON public.analytics_daily_snapshots (day DESC);

-- RLS: only server-side (service role) writes; admin reads handled via API
ALTER TABLE public.analytics_daily_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analytics_daily_snapshots'
      AND policyname = 'analytics_daily_snapshots_select_admin'
  ) THEN
    -- Allow authenticated users to read (admin gate is enforced at API layer)
    EXECUTE $policy$
      CREATE POLICY analytics_daily_snapshots_select_admin
        ON public.analytics_daily_snapshots FOR SELECT
        USING (true)
    $policy$;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. v_referral_performance  (view – always fresh)
--    Per-referrer scorecard used by the admin referral dashboard.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_referral_performance AS
WITH
  click_agg AS (
    SELECT ref_code,
           COUNT(*)                                            AS total_clicks,
           COUNT(*) FILTER (WHERE clicked_at >= NOW() - INTERVAL '30 days') AS clicks_30d,
           COUNT(*) FILTER (WHERE clicked_at >= NOW() - INTERVAL '7 days')  AS clicks_7d
    FROM   referral_clicks
    GROUP BY ref_code
  ),
  signup_agg AS (
    SELECT ra.referrer_user_id,
           COUNT(*)                                                            AS total_signups,
           COUNT(*) FILTER (WHERE ra.attributed_at >= NOW() - INTERVAL '30 days') AS signups_30d,
           COUNT(*) FILTER (WHERE ra.attributed_at >= NOW() - INTERVAL '7 days')  AS signups_7d
    FROM   referral_attributions ra
    GROUP BY ra.referrer_user_id
  ),
  active_agg AS (
    -- "active referral" = referee who has logged in at least once
    SELECT ra.referrer_user_id,
           COUNT(DISTINCT ra.referee_user_id)                                               AS active_all,
           COUNT(DISTINCT ra.referee_user_id) FILTER (
             WHERE EXISTS (
               SELECT 1 FROM auth_logins al
               WHERE al.user_id = ra.referee_user_id
                 AND al.logged_at >= NOW() - INTERVAL '30 days'
             )
           )                                                                                 AS active_30d,
           COUNT(DISTINCT ra.referee_user_id) FILTER (
             WHERE EXISTS (
               SELECT 1 FROM auth_logins al
               WHERE al.user_id = ra.referee_user_id
                 AND al.logged_at >= NOW() - INTERVAL '7 days'
             )
           )                                                                                 AS active_7d
    FROM   referral_attributions ra
    GROUP BY ra.referrer_user_id
  ),
  stake_agg AS (
    -- Total stakes by referred users, attributed back to referrer
    SELECT ra.referrer_user_id,
           COALESCE(SUM(pe.amount), 0)  AS referred_stake_total,
           COUNT(pe.id)                 AS referred_stakes_count
    FROM   referral_attributions ra
    JOIN   prediction_entries pe ON pe.user_id = ra.referee_user_id
    GROUP BY ra.referrer_user_id
  )
SELECT
  u.id                                                          AS referrer_id,
  u.username,
  u.full_name,
  u.avatar_url,
  u.created_at                                                  AS referrer_joined_at,
  COALESCE(ca.total_clicks, 0)                                  AS total_clicks,
  COALESCE(ca.clicks_30d, 0)                                   AS clicks_30d,
  COALESCE(ca.clicks_7d, 0)                                    AS clicks_7d,
  COALESCE(sa.total_signups, 0)                                 AS total_signups,
  COALESCE(sa.signups_30d, 0)                                   AS signups_30d,
  COALESCE(sa.signups_7d, 0)                                    AS signups_7d,
  COALESCE(aa.active_all, 0)                                    AS active_referrals_all,
  COALESCE(aa.active_30d, 0)                                    AS active_referrals_30d,
  COALESCE(aa.active_7d, 0)                                     AS active_referrals_7d,
  COALESCE(stk.referred_stake_total, 0)                         AS referred_stake_total,
  COALESCE(stk.referred_stakes_count, 0)                        AS referred_stakes_count,
  CASE
    WHEN COALESCE(ca.total_clicks, 0) > 0
    THEN ROUND((COALESCE(sa.total_signups, 0)::NUMERIC / ca.total_clicks) * 100, 1)
    ELSE 0
  END                                                           AS conversion_rate_pct
FROM users u
LEFT JOIN click_agg   ca  ON ca.ref_code          = u.referral_code
LEFT JOIN signup_agg  sa  ON sa.referrer_user_id  = u.id
LEFT JOIN active_agg  aa  ON aa.referrer_user_id  = u.id
LEFT JOIN stake_agg   stk ON stk.referrer_user_id = u.id
WHERE u.referral_code IS NOT NULL
  AND (COALESCE(ca.total_clicks, 0) > 0 OR COALESCE(sa.total_signups, 0) > 0);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Backfill helper function: upsert_analytics_snapshot(day DATE)
--    Can be called manually or by the cron job.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_analytics_snapshot(p_day DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_users             INTEGER;
  v_active_users          INTEGER;
  v_cumulative_users      INTEGER;
  v_new_predictions       INTEGER;
  v_settled_predictions   INTEGER;
  v_total_stakes          INTEGER;
  v_total_stake_amt       NUMERIC;
  v_total_payout_amt      NUMERIC;
  v_total_creator_earn    NUMERIC;
  v_total_comments        INTEGER;
  v_total_deposits        NUMERIC;
  v_total_withdrawals     NUMERIC;
  v_new_clicks            INTEGER;
  v_new_signups           INTEGER;
BEGIN
  -- New users on this day
  SELECT COUNT(*) INTO v_new_users
  FROM users
  WHERE DATE(created_at) = p_day;

  -- Cumulative users up to end of day
  SELECT COUNT(*) INTO v_cumulative_users
  FROM users
  WHERE created_at < (p_day + INTERVAL '1 day');

  -- Active users (had a stake OR comment on this day)
  SELECT COUNT(DISTINCT user_id) INTO v_active_users
  FROM user_stats_daily
  WHERE day = p_day
    AND (stakes_count > 0 OR comments_count > 0);

  -- New predictions created on this day
  SELECT COUNT(*) INTO v_new_predictions
  FROM predictions
  WHERE DATE(created_at) = p_day;

  -- Settled predictions on this day
  SELECT COUNT(*) INTO v_settled_predictions
  FROM predictions
  WHERE settled_at IS NOT NULL
    AND DATE(settled_at) = p_day;

  -- Stake aggregates from user_stats_daily (already computed by achievementsService)
  SELECT
    COALESCE(SUM(stakes_count), 0),
    COALESCE(SUM(stake_amount), 0),
    COALESCE(SUM(payouts_amount), 0),
    COALESCE(SUM(creator_earnings_amount), 0),
    COALESCE(SUM(comments_count), 0)
  INTO v_total_stakes, v_total_stake_amt, v_total_payout_amt, v_total_creator_earn, v_total_comments
  FROM user_stats_daily
  WHERE day = p_day;

  -- Wallet deposits (credit transactions)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_deposits
  FROM wallet_transactions
  WHERE DATE(created_at) = p_day
    AND (direction = 'credit' OR type = 'credit')
    AND status = 'completed';

  -- Wallet withdrawals (debit transactions)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_withdrawals
  FROM wallet_transactions
  WHERE DATE(created_at) = p_day
    AND (direction = 'debit' OR type = 'debit')
    AND status = 'completed';

  -- Referral clicks on this day
  SELECT COUNT(*) INTO v_new_clicks
  FROM referral_clicks
  WHERE DATE(clicked_at) = p_day;

  -- Referral signups (attributions) on this day
  SELECT COUNT(*) INTO v_new_signups
  FROM referral_attributions
  WHERE DATE(attributed_at) = p_day;

  INSERT INTO public.analytics_daily_snapshots (
    day,
    new_users_count,
    active_users_count,
    cumulative_users_count,
    new_predictions_count,
    settled_predictions_count,
    total_stakes_count,
    total_stake_amount,
    total_payout_amount,
    total_creator_earnings_amount,
    total_comments_count,
    total_deposits_amount,
    total_withdrawals_amount,
    total_net_flow,
    new_referral_clicks,
    new_referral_signups,
    computed_at,
    updated_at
  ) VALUES (
    p_day,
    v_new_users,
    v_active_users,
    v_cumulative_users,
    v_new_predictions,
    v_settled_predictions,
    v_total_stakes,
    v_total_stake_amt,
    v_total_payout_amt,
    v_total_creator_earn,
    v_total_comments,
    v_total_deposits,
    v_total_withdrawals,
    v_total_deposits - v_total_withdrawals,
    v_new_clicks,
    v_new_signups,
    NOW(),
    NOW()
  )
  ON CONFLICT (day) DO UPDATE SET
    new_users_count               = EXCLUDED.new_users_count,
    active_users_count            = EXCLUDED.active_users_count,
    cumulative_users_count        = EXCLUDED.cumulative_users_count,
    new_predictions_count         = EXCLUDED.new_predictions_count,
    settled_predictions_count     = EXCLUDED.settled_predictions_count,
    total_stakes_count            = EXCLUDED.total_stakes_count,
    total_stake_amount            = EXCLUDED.total_stake_amount,
    total_payout_amount           = EXCLUDED.total_payout_amount,
    total_creator_earnings_amount = EXCLUDED.total_creator_earnings_amount,
    total_comments_count          = EXCLUDED.total_comments_count,
    total_deposits_amount         = EXCLUDED.total_deposits_amount,
    total_withdrawals_amount      = EXCLUDED.total_withdrawals_amount,
    total_net_flow                = EXCLUDED.total_net_flow,
    new_referral_clicks           = EXCLUDED.new_referral_clicks,
    new_referral_signups          = EXCLUDED.new_referral_signups,
    updated_at                    = NOW();
END;
$$;

COMMENT ON TABLE  public.analytics_daily_snapshots IS 'Platform-wide daily aggregates. Populated by nightly cron (analyticsSnapshot). Queries against this table are O(days) not O(rows).';
COMMENT ON VIEW   public.v_referral_performance     IS 'Per-referrer scorecard used by admin analytics dashboard. Always fresh (not materialized).';
COMMENT ON FUNCTION public.upsert_analytics_snapshot IS 'Upsert a single day analytics snapshot. Called by cron and backfill scripts.';
