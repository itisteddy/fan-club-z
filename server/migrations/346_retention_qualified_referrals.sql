-- Migration 346: Retention, activation status, qualified referrals, expanded daily snapshots.
-- Depends on: 203_referral_attributions, 344_analytics_daily_snapshots, 345_product_events.
-- All statements are idempotent (IF NOT EXISTS / CREATE OR REPLACE / ON CONFLICT).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. user_activation_status
--    One row per user. Tracks activation, D1/D7/D30 retention, active-days-14d.
--    Populated by the daily retentionCompute cron and by backfill_user_activation().
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_activation_status (
  user_id                     UUID        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  signup_day                  DATE        NOT NULL,

  -- Activation = first economic action (stake placed OR prediction created)
  is_activated                BOOLEAN     NOT NULL DEFAULT FALSE,
  activated_at                TIMESTAMPTZ,
  first_stake_at              TIMESTAMPTZ,
  first_prediction_created_at TIMESTAMPTZ,

  -- D1/D7/D30 retention (NULL = window not yet elapsed; TRUE/FALSE = result)
  -- Definition:
  --   D1  = any auth_login between signup_day+1 and signup_day+1 (calendar day 1)
  --   D7  = any auth_login between signup_day+1 and signup_day+7
  --   D30 = any auth_login between signup_day+1 and signup_day+30
  d1_retained                 BOOLEAN,
  d7_retained                 BOOLEAN,
  d30_retained                BOOLEAN,

  -- Count of distinct calendar days with at least one auth_login in the
  -- first 14 days after signup (used for qualified-referral gate).
  active_days_14d             INTEGER     NOT NULL DEFAULT 0,

  computed_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activation_signup_day
  ON public.user_activation_status (signup_day DESC);

CREATE INDEX IF NOT EXISTS idx_user_activation_activated
  ON public.user_activation_status (is_activated, activated_at DESC)
  WHERE is_activated = TRUE;

ALTER TABLE public.user_activation_status ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_activation_status'
      AND policyname = 'uas_select_all'
  ) THEN
    CREATE POLICY uas_select_all ON public.user_activation_status FOR SELECT USING (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Extend referral_attributions with qualification/retention flags
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.referral_attributions
  ADD COLUMN IF NOT EXISTS is_activated  BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS activated_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_qualified  BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS qualified_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_retained   BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS retained_at   TIMESTAMPTZ;

-- Qualified referral definition (stored for auditability):
--   referee had >= 2 active days AND >= 1 economic action within 14 days of attributed_at.
COMMENT ON COLUMN public.referral_attributions.is_qualified IS
  'TRUE when referee has >= 2 active days (auth_logins) AND >= 1 economic action (stake or prediction created) within 14 days of attributed_at.';
COMMENT ON COLUMN public.referral_attributions.is_retained IS
  'TRUE when referee has any auth_login between day 15 and day 30 after attributed_at (30-day retention window).';

CREATE INDEX IF NOT EXISTS idx_referral_attributions_qualified
  ON public.referral_attributions (is_qualified, qualified_at DESC)
  WHERE is_qualified = TRUE;

CREATE INDEX IF NOT EXISTS idx_referral_attributions_activated
  ON public.referral_attributions (is_activated, activated_at DESC)
  WHERE is_activated = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Expand analytics_daily_snapshots with new metric columns
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.analytics_daily_snapshots
  -- Stakers (distinct users with at least one stake that day)
  ADD COLUMN IF NOT EXISTS unique_stakers_count           INTEGER       NOT NULL DEFAULT 0,

  -- Activation events (users who made their first economic action on this day)
  ADD COLUMN IF NOT EXISTS new_activated_users_count      INTEGER       NOT NULL DEFAULT 0,

  -- Weekly Active Economic Users (7-day rolling window ending on this day)
  ADD COLUMN IF NOT EXISTS weekly_active_economic_users   INTEGER       NOT NULL DEFAULT 0,

  -- Referral funnel (events that occurred on this day)
  ADD COLUMN IF NOT EXISTS new_activated_referrals_count  INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS new_qualified_referrals_count  INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS new_retained_referrals_count   INTEGER       NOT NULL DEFAULT 0,

  -- Claims (from product_events; 0 before migration 345)
  ADD COLUMN IF NOT EXISTS claim_completed_count          INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS claim_failed_count             INTEGER       NOT NULL DEFAULT 0,

  -- Social
  ADD COLUMN IF NOT EXISTS likes_count                    INTEGER       NOT NULL DEFAULT 0,

  -- Total product events logged that day
  ADD COLUMN IF NOT EXISTS product_events_count           INTEGER       NOT NULL DEFAULT 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Replace upsert_analytics_snapshot to include new columns
--    (CREATE OR REPLACE replaces the version from migration 344)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_analytics_snapshot(p_day DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_users               INTEGER := 0;
  v_active_users            INTEGER := 0;
  v_cumulative_users        INTEGER := 0;
  v_new_predictions         INTEGER := 0;
  v_settled_predictions     INTEGER := 0;
  v_total_stakes            INTEGER := 0;
  v_total_stake_amt         NUMERIC := 0;
  v_total_payout_amt        NUMERIC := 0;
  v_total_creator_earn      NUMERIC := 0;
  v_total_comments          INTEGER := 0;
  v_total_deposits          NUMERIC := 0;
  v_total_withdrawals       NUMERIC := 0;
  v_new_clicks              INTEGER := 0;
  v_new_signups             INTEGER := 0;
  -- New columns
  v_unique_stakers          INTEGER := 0;
  v_new_activated_users     INTEGER := 0;
  v_waeu                    INTEGER := 0;
  v_new_activated_refs      INTEGER := 0;
  v_new_qualified_refs      INTEGER := 0;
  v_new_retained_refs       INTEGER := 0;
  v_claim_completed         INTEGER := 0;
  v_claim_failed            INTEGER := 0;
  v_likes_count             INTEGER := 0;
  v_product_events_count    INTEGER := 0;
BEGIN

  -- ── Original columns (unchanged from migration 344) ────────────────────────

  SELECT COUNT(*) INTO v_new_users
  FROM users WHERE DATE(created_at) = p_day;

  SELECT COUNT(*) INTO v_cumulative_users
  FROM users WHERE created_at < (p_day + INTERVAL '1 day');

  SELECT COUNT(DISTINCT user_id) INTO v_active_users
  FROM user_stats_daily
  WHERE day = p_day AND (stakes_count > 0 OR comments_count > 0);

  SELECT COUNT(*) INTO v_new_predictions
  FROM predictions WHERE DATE(created_at) = p_day;

  SELECT COUNT(*) INTO v_settled_predictions
  FROM predictions
  WHERE settled_at IS NOT NULL AND DATE(settled_at) = p_day;

  SELECT
    COALESCE(SUM(stakes_count), 0),
    COALESCE(SUM(stake_amount), 0),
    COALESCE(SUM(payouts_amount), 0),
    COALESCE(SUM(creator_earnings_amount), 0),
    COALESCE(SUM(comments_count), 0)
  INTO v_total_stakes, v_total_stake_amt, v_total_payout_amt, v_total_creator_earn, v_total_comments
  FROM user_stats_daily WHERE day = p_day;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_deposits
  FROM wallet_transactions
  WHERE DATE(created_at) = p_day
    AND (direction = 'credit' OR type = 'credit')
    AND status = 'completed';

  SELECT COALESCE(SUM(amount), 0) INTO v_total_withdrawals
  FROM wallet_transactions
  WHERE DATE(created_at) = p_day
    AND (direction = 'debit' OR type = 'debit')
    AND status = 'completed';

  SELECT COUNT(*) INTO v_new_clicks
  FROM referral_clicks WHERE DATE(clicked_at) = p_day;

  SELECT COUNT(*) INTO v_new_signups
  FROM referral_attributions WHERE DATE(attributed_at) = p_day;

  -- ── New columns ────────────────────────────────────────────────────────────

  -- Unique stakers that day
  SELECT COUNT(DISTINCT user_id) INTO v_unique_stakers
  FROM user_stats_daily WHERE day = p_day AND stakes_count > 0;

  -- Newly activated users (first economic action on this day)
  BEGIN
    SELECT COUNT(*) INTO v_new_activated_users
    FROM user_activation_status
    WHERE is_activated = TRUE AND DATE(activated_at) = p_day;
  EXCEPTION WHEN undefined_table THEN
    v_new_activated_users := 0;
  END;

  -- Weekly Active Economic Users: distinct users with stake in the 7-day window ending p_day
  SELECT COUNT(DISTINCT user_id) INTO v_waeu
  FROM user_stats_daily
  WHERE day BETWEEN (p_day - INTERVAL '6 days')::DATE AND p_day
    AND stakes_count > 0;

  -- Referral funnel (activated / qualified / retained events on p_day)
  BEGIN
    SELECT
      COUNT(*) FILTER (WHERE is_activated = TRUE AND DATE(activated_at) = p_day),
      COUNT(*) FILTER (WHERE is_qualified = TRUE AND DATE(qualified_at) = p_day),
      COUNT(*) FILTER (WHERE is_retained  = TRUE AND DATE(retained_at)  = p_day)
    INTO v_new_activated_refs, v_new_qualified_refs, v_new_retained_refs
    FROM referral_attributions;
  EXCEPTION WHEN undefined_column THEN
    v_new_activated_refs := 0;
    v_new_qualified_refs := 0;
    v_new_retained_refs  := 0;
  END;

  -- Claims from product_events
  BEGIN
    SELECT
      COUNT(*) FILTER (WHERE event_name = 'claim_completed'),
      COUNT(*) FILTER (WHERE event_name = 'claim_failed')
    INTO v_claim_completed, v_claim_failed
    FROM product_events
    WHERE occurred_at::DATE = p_day;
  EXCEPTION WHEN undefined_table THEN
    v_claim_completed := 0;
    v_claim_failed    := 0;
  END;

  -- Likes from product_events (like_added) for going-forward accuracy
  BEGIN
    SELECT COUNT(*) INTO v_likes_count
    FROM product_events
    WHERE event_name = 'like_added' AND occurred_at::DATE = p_day;
  EXCEPTION WHEN undefined_table THEN
    v_likes_count := 0;
  END;

  -- Total product events
  BEGIN
    SELECT COUNT(*) INTO v_product_events_count
    FROM product_events WHERE occurred_at::DATE = p_day;
  EXCEPTION WHEN undefined_table THEN
    v_product_events_count := 0;
  END;

  -- ── Upsert ────────────────────────────────────────────────────────────────
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
    -- New
    unique_stakers_count,
    new_activated_users_count,
    weekly_active_economic_users,
    new_activated_referrals_count,
    new_qualified_referrals_count,
    new_retained_referrals_count,
    claim_completed_count,
    claim_failed_count,
    likes_count,
    product_events_count,
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
    v_unique_stakers,
    v_new_activated_users,
    v_waeu,
    v_new_activated_refs,
    v_new_qualified_refs,
    v_new_retained_refs,
    v_claim_completed,
    v_claim_failed,
    v_likes_count,
    v_product_events_count,
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
    unique_stakers_count          = EXCLUDED.unique_stakers_count,
    new_activated_users_count     = EXCLUDED.new_activated_users_count,
    weekly_active_economic_users  = EXCLUDED.weekly_active_economic_users,
    new_activated_referrals_count = EXCLUDED.new_activated_referrals_count,
    new_qualified_referrals_count = EXCLUDED.new_qualified_referrals_count,
    new_retained_referrals_count  = EXCLUDED.new_retained_referrals_count,
    claim_completed_count         = EXCLUDED.claim_completed_count,
    claim_failed_count            = EXCLUDED.claim_failed_count,
    likes_count                   = EXCLUDED.likes_count,
    product_events_count          = EXCLUDED.product_events_count,
    updated_at                    = NOW();
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. compute_user_activation(p_user_id)
--    Called per-user by the retention cron or on-demand.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_user_activation(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_signup_day              DATE;
  v_first_stake_at          TIMESTAMPTZ;
  v_first_prediction_at     TIMESTAMPTZ;
  v_is_activated            BOOLEAN := FALSE;
  v_activated_at            TIMESTAMPTZ;
  v_d1                      BOOLEAN;
  v_d7                      BOOLEAN;
  v_d30                     BOOLEAN;
  v_active_days_14d         INTEGER := 0;
  v_now                     TIMESTAMPTZ := NOW();
BEGIN
  -- Signup day from users table
  SELECT DATE(created_at) INTO v_signup_day
  FROM users WHERE id = p_user_id;

  IF v_signup_day IS NULL THEN RETURN; END IF;

  -- First stake (from prediction_entries)
  SELECT MIN(created_at) INTO v_first_stake_at
  FROM prediction_entries
  WHERE user_id = p_user_id;

  -- First prediction created (from predictions)
  BEGIN
    SELECT MIN(created_at) INTO v_first_prediction_at
    FROM predictions
    WHERE created_by = p_user_id;
  EXCEPTION WHEN undefined_column THEN
    -- Try creator_id column name
    BEGIN
      SELECT MIN(created_at) INTO v_first_prediction_at
      FROM predictions
      WHERE creator_id = p_user_id;
    EXCEPTION WHEN undefined_column THEN
      v_first_prediction_at := NULL;
    END;
  END;

  -- Activation = earliest of first stake OR first prediction created
  v_is_activated := (v_first_stake_at IS NOT NULL OR v_first_prediction_at IS NOT NULL);
  IF v_is_activated THEN
    v_activated_at := LEAST(
      COALESCE(v_first_stake_at, 'infinity'::TIMESTAMPTZ),
      COALESCE(v_first_prediction_at, 'infinity'::TIMESTAMPTZ)
    );
  END IF;

  -- D1: any login on calendar day (signup_day + 1)
  IF v_now > (v_signup_day + INTERVAL '1 day') THEN
    SELECT EXISTS (
      SELECT 1 FROM auth_logins
      WHERE user_id = p_user_id
        AND logged_at::DATE = (v_signup_day + INTERVAL '1 day')::DATE
    ) INTO v_d1;
  END IF;

  -- D7: any login between day +1 and day +7
  IF v_now > (v_signup_day + INTERVAL '7 days') THEN
    SELECT EXISTS (
      SELECT 1 FROM auth_logins
      WHERE user_id = p_user_id
        AND logged_at::DATE BETWEEN (v_signup_day + INTERVAL '1 day')::DATE
                                AND (v_signup_day + INTERVAL '7 days')::DATE
    ) INTO v_d7;
  END IF;

  -- D30: any login between day +1 and day +30
  IF v_now > (v_signup_day + INTERVAL '30 days') THEN
    SELECT EXISTS (
      SELECT 1 FROM auth_logins
      WHERE user_id = p_user_id
        AND logged_at::DATE BETWEEN (v_signup_day + INTERVAL '1 day')::DATE
                                AND (v_signup_day + INTERVAL '30 days')::DATE
    ) INTO v_d30;
  END IF;

  -- Active days in first 14 days (distinct login days, days 0..14)
  SELECT COUNT(DISTINCT logged_at::DATE) INTO v_active_days_14d
  FROM auth_logins
  WHERE user_id = p_user_id
    AND logged_at::DATE BETWEEN v_signup_day
                            AND (v_signup_day + INTERVAL '14 days')::DATE;

  -- Upsert into user_activation_status
  INSERT INTO public.user_activation_status (
    user_id, signup_day,
    is_activated, activated_at, first_stake_at, first_prediction_created_at,
    d1_retained, d7_retained, d30_retained,
    active_days_14d, computed_at
  ) VALUES (
    p_user_id, v_signup_day,
    v_is_activated, v_activated_at, v_first_stake_at, v_first_prediction_at,
    v_d1, v_d7, v_d30,
    v_active_days_14d, v_now
  )
  ON CONFLICT (user_id) DO UPDATE SET
    is_activated                = EXCLUDED.is_activated,
    activated_at                = EXCLUDED.activated_at,
    first_stake_at              = EXCLUDED.first_stake_at,
    first_prediction_created_at = EXCLUDED.first_prediction_created_at,
    d1_retained                 = EXCLUDED.d1_retained,
    d7_retained                 = EXCLUDED.d7_retained,
    d30_retained                = EXCLUDED.d30_retained,
    active_days_14d             = EXCLUDED.active_days_14d,
    computed_at                 = EXCLUDED.computed_at;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. compute_qualified_referrals(p_days_back)
--    Updates referral_attributions qualified/retained flags.
--    Returns count of newly qualified referrals.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_qualified_referrals(p_days_back INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rec           RECORD;
  v_newly_qualified INTEGER := 0;
  v_active_days   INTEGER;
  v_has_economic  BOOLEAN;
  v_has_retained  BOOLEAN;
  v_cutoff        TIMESTAMPTZ;
BEGIN
  v_cutoff := NOW() - (p_days_back || ' days')::INTERVAL;

  FOR v_rec IN
    SELECT ra.id,
           ra.referee_user_id,
           ra.attributed_at,
           ra.is_activated,
           ra.is_qualified,
           ra.is_retained
    FROM referral_attributions ra
    WHERE ra.attributed_at >= v_cutoff
      AND (ra.is_qualified = FALSE OR ra.is_retained = FALSE OR ra.is_activated = FALSE)
  LOOP
    -- ── Activation: any economic action by the referee (all-time) ──
    IF NOT v_rec.is_activated THEN
      SELECT EXISTS (
        SELECT 1 FROM prediction_entries
        WHERE user_id = v_rec.referee_user_id
        LIMIT 1
      ) INTO v_has_economic;

      IF NOT v_has_economic THEN
        -- Also check predictions created
        BEGIN
          SELECT EXISTS (
            SELECT 1 FROM predictions
            WHERE created_by = v_rec.referee_user_id
            LIMIT 1
          ) INTO v_has_economic;
        EXCEPTION WHEN undefined_column THEN
          BEGIN
            SELECT EXISTS (
              SELECT 1 FROM predictions
              WHERE creator_id = v_rec.referee_user_id
              LIMIT 1
            ) INTO v_has_economic;
          EXCEPTION WHEN undefined_column THEN
            v_has_economic := FALSE;
          END;
        END;
      END IF;

      IF v_has_economic THEN
        UPDATE referral_attributions
        SET is_activated = TRUE,
            activated_at = NOW()
        WHERE id = v_rec.id;
      END IF;
    END IF;

    -- ── Qualification: >= 2 active days AND economic action within 14 days ──
    IF NOT v_rec.is_qualified THEN
      -- Count distinct active days in first 14 days after attribution
      SELECT COUNT(DISTINCT logged_at::DATE) INTO v_active_days
      FROM auth_logins
      WHERE user_id = v_rec.referee_user_id
        AND logged_at BETWEEN v_rec.attributed_at
                          AND (v_rec.attributed_at + INTERVAL '14 days');

      -- Check economic action in first 14 days
      SELECT EXISTS (
        SELECT 1 FROM prediction_entries
        WHERE user_id = v_rec.referee_user_id
          AND created_at BETWEEN v_rec.attributed_at
                             AND (v_rec.attributed_at + INTERVAL '14 days')
        LIMIT 1
      ) INTO v_has_economic;

      IF NOT v_has_economic THEN
        BEGIN
          SELECT EXISTS (
            SELECT 1 FROM predictions
            WHERE created_by = v_rec.referee_user_id
              AND created_at BETWEEN v_rec.attributed_at
                                 AND (v_rec.attributed_at + INTERVAL '14 days')
            LIMIT 1
          ) INTO v_has_economic;
        EXCEPTION WHEN undefined_column THEN
          v_has_economic := FALSE;
        END;
      END IF;

      IF v_active_days >= 2 AND v_has_economic THEN
        UPDATE referral_attributions
        SET is_qualified = TRUE,
            qualified_at = NOW()
        WHERE id = v_rec.id;
        v_newly_qualified := v_newly_qualified + 1;
      END IF;
    END IF;

    -- ── Retention: any login between day 15 and day 30 post-attribution ──
    IF NOT v_rec.is_retained
       AND NOW() > (v_rec.attributed_at + INTERVAL '14 days')
    THEN
      SELECT EXISTS (
        SELECT 1 FROM auth_logins
        WHERE user_id = v_rec.referee_user_id
          AND logged_at BETWEEN (v_rec.attributed_at + INTERVAL '14 days')
                            AND (v_rec.attributed_at + INTERVAL '30 days')
        LIMIT 1
      ) INTO v_has_retained;

      IF v_has_retained THEN
        UPDATE referral_attributions
        SET is_retained = TRUE,
            retained_at = NOW()
        WHERE id = v_rec.id;
      END IF;
    END IF;

  END LOOP;

  RETURN v_newly_qualified;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. backfill_user_activation_status(p_days_back)
--    Populates user_activation_status for the last N days of signups.
--    Returns row count processed.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.backfill_user_activation_status(p_days_back INTEGER DEFAULT 365)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_count   INTEGER := 0;
  v_cutoff  DATE;
BEGIN
  v_cutoff := (CURRENT_DATE - p_days_back)::DATE;

  FOR v_user_id IN
    SELECT id FROM users
    WHERE DATE(created_at) >= v_cutoff
    ORDER BY created_at DESC
  LOOP
    PERFORM compute_user_activation(v_user_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Updated v_referral_performance view (extends migration 344 version)
--    Adds is_qualified, is_retained, activated counts.
-- Note: DROP + recreate required because CREATE OR REPLACE VIEW cannot rename
--       existing columns (PostgreSQL error 42P16).
-- ─────────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.v_referral_performance;
CREATE OR REPLACE VIEW public.v_referral_performance AS
WITH
  click_agg AS (
    SELECT ref_code,
           COUNT(*)                                                    AS total_clicks,
           COUNT(*) FILTER (WHERE clicked_at >= NOW() - INTERVAL '30 days') AS clicks_30d,
           COUNT(*) FILTER (WHERE clicked_at >= NOW() - INTERVAL '7 days')  AS clicks_7d
    FROM   referral_clicks
    GROUP BY ref_code
  ),
  signup_agg AS (
    SELECT ra.referrer_user_id,
           COUNT(*)                                                                      AS total_signups,
           COUNT(*) FILTER (WHERE ra.attributed_at >= NOW() - INTERVAL '30 days')       AS signups_30d,
           COUNT(*) FILTER (WHERE ra.attributed_at >= NOW() - INTERVAL '7 days')        AS signups_7d,
           COUNT(*) FILTER (WHERE ra.is_activated = TRUE)                                AS activated_count,
           COUNT(*) FILTER (WHERE ra.is_qualified = TRUE)                                AS qualified_count,
           COUNT(*) FILTER (WHERE ra.is_retained  = TRUE)                                AS retained_count
    FROM   referral_attributions ra
    GROUP BY ra.referrer_user_id
  ),
  active_agg AS (
    SELECT ra.referrer_user_id,
           COUNT(DISTINCT ra.referee_user_id)                                            AS active_all,
           COUNT(DISTINCT ra.referee_user_id) FILTER (
             WHERE EXISTS (
               SELECT 1 FROM auth_logins al
               WHERE al.user_id = ra.referee_user_id
                 AND al.logged_at >= NOW() - INTERVAL '30 days'
             )
           )                                                                              AS active_30d,
           COUNT(DISTINCT ra.referee_user_id) FILTER (
             WHERE EXISTS (
               SELECT 1 FROM auth_logins al
               WHERE al.user_id = ra.referee_user_id
                 AND al.logged_at >= NOW() - INTERVAL '7 days'
             )
           )                                                                              AS active_7d
    FROM   referral_attributions ra
    GROUP BY ra.referrer_user_id
  ),
  stake_agg AS (
    SELECT ra.referrer_user_id,
           COALESCE(SUM(pe.amount), 0)   AS referred_stake_total,
           COUNT(pe.id)                  AS referred_stakes_count
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
  COALESCE(ca.total_clicks,  0)                                 AS total_clicks,
  COALESCE(ca.clicks_30d,    0)                                 AS clicks_30d,
  COALESCE(ca.clicks_7d,     0)                                 AS clicks_7d,
  COALESCE(sa.total_signups, 0)                                 AS total_signups,
  COALESCE(sa.signups_30d,   0)                                 AS signups_30d,
  COALESCE(sa.signups_7d,    0)                                 AS signups_7d,
  COALESCE(sa.activated_count, 0)                               AS activated_referrals,
  COALESCE(sa.qualified_count, 0)                               AS qualified_referrals,
  COALESCE(sa.retained_count,  0)                               AS retained_referrals,
  COALESCE(aa.active_all,    0)                                 AS active_referrals_all,
  COALESCE(aa.active_30d,    0)                                 AS active_referrals_30d,
  COALESCE(aa.active_7d,     0)                                 AS active_referrals_7d,
  COALESCE(stk.referred_stake_total,  0)                        AS referred_stake_total,
  COALESCE(stk.referred_stakes_count, 0)                        AS referred_stakes_count,
  CASE
    WHEN COALESCE(ca.total_clicks, 0) > 0
    THEN ROUND((COALESCE(sa.total_signups, 0)::NUMERIC / ca.total_clicks) * 100, 1)
    ELSE 0
  END                                                           AS conversion_rate_pct,
  CASE
    WHEN COALESCE(sa.total_signups, 0) > 0
    THEN ROUND((COALESCE(sa.qualified_count, 0)::NUMERIC / sa.total_signups) * 100, 1)
    ELSE 0
  END                                                           AS qualification_rate_pct
FROM users u
LEFT JOIN click_agg   ca  ON ca.ref_code         = u.referral_code
LEFT JOIN signup_agg  sa  ON sa.referrer_user_id = u.id
LEFT JOIN active_agg  aa  ON aa.referrer_user_id = u.id
LEFT JOIN stake_agg   stk ON stk.referrer_user_id = u.id
WHERE u.referral_code IS NOT NULL
  AND (COALESCE(ca.total_clicks, 0) > 0 OR COALESCE(sa.total_signups, 0) > 0);

-- ─────────────────────────────────────────────────────────────────────────────
-- Comments
-- ─────────────────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.user_activation_status IS 'Per-user activation and D1/D7/D30 retention. Computed by the daily retention cron.';
COMMENT ON FUNCTION public.compute_user_activation IS 'Recompute activation + retention for one user. Idempotent via ON CONFLICT DO UPDATE.';
COMMENT ON FUNCTION public.compute_qualified_referrals IS 'Batch-update referral_attributions is_qualified/is_retained flags. Returns count of newly qualified.';
COMMENT ON FUNCTION public.backfill_user_activation_status IS 'Backfill user_activation_status for the last N days of signups.';
COMMENT ON FUNCTION public.upsert_analytics_snapshot IS 'Upsert one day of platform-wide aggregates (replaces migration 344 version with new columns).';
