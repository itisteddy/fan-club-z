-- Item 3: Achievements system (cached daily stats + awards + permanent badges)
-- Additive migration; safe to deploy before app changes.

CREATE TABLE IF NOT EXISTS public.user_stats_daily (
  user_id UUID NOT NULL,
  day DATE NOT NULL,
  stakes_count NUMERIC NOT NULL DEFAULT 0,
  markets_participated_count NUMERIC NOT NULL DEFAULT 0,
  stake_amount NUMERIC(18,8) NOT NULL DEFAULT 0,
  payouts_amount NUMERIC(18,8) NOT NULL DEFAULT 0,
  net_profit NUMERIC(18,8) NOT NULL DEFAULT 0,
  creator_earnings_amount NUMERIC(18,8) NOT NULL DEFAULT 0,
  comments_count NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, day)
);

CREATE INDEX IF NOT EXISTS idx_user_stats_daily_day
  ON public.user_stats_daily (day);

CREATE TABLE IF NOT EXISTS public.award_definitions (
  key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  metric TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'DESC',
  icon_key TEXT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO public.award_definitions (key, title, description, metric, direction, icon_key, is_enabled)
VALUES
  ('TOP_CREATOR', 'Top Creator', 'Highest creator earnings in the selected window.', 'creator_earnings_amount', 'DESC', 'creator', TRUE),
  ('TOP_WINNERS', 'Top Winners', 'Highest payout total in the selected window.', 'payouts_amount', 'DESC', 'trophy', TRUE),
  ('TOP_PROFITERS', 'Top Profiters', 'Highest net profit (payouts minus stakes) in the selected window.', 'net_profit', 'DESC', 'trending_up', TRUE),
  ('TOP_COMMENTER', 'Top Commenter', 'Most comments posted in the selected window.', 'comments_count', 'DESC', 'message_circle', TRUE),
  ('TOP_PARTICIPANTS', 'Top Participants', 'Most stake actions in the selected window.', 'stakes_count', 'DESC', 'users', TRUE)
ON CONFLICT (key) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  metric = EXCLUDED.metric,
  direction = EXCLUDED.direction,
  icon_key = EXCLUDED.icon_key,
  is_enabled = EXCLUDED.is_enabled;

CREATE TABLE IF NOT EXISTS public.user_awards_current (
  award_key TEXT NOT NULL REFERENCES public.award_definitions(key) ON DELETE CASCADE,
  time_window TEXT NOT NULL CHECK (time_window IN ('7d', '30d', 'all')),
  user_id UUID NOT NULL,
  rank INTEGER NOT NULL CHECK (rank > 0),
  score NUMERIC(18,8) NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (award_key, time_window, user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_awards_current_rank
  ON public.user_awards_current (award_key, time_window, rank);

CREATE TABLE IF NOT EXISTS public.badge_definitions (
  key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_key TEXT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO public.badge_definitions (key, title, description, icon_key, is_enabled)
VALUES
  ('FIRST_STAKE', 'First Stake', 'Placed your first stake on Fan Club Z.', 'target', TRUE),
  ('TEN_STAKES', '10 Stakes', 'Placed at least 10 stakes.', 'layers', TRUE),
  ('FIRST_COMMENT', 'First Comment', 'Posted your first comment.', 'message_circle', TRUE),
  ('FIRST_CREATOR_EARNING', 'First Creator Earning', 'Earned creator fees for the first time.', 'sparkles', TRUE)
ON CONFLICT (key) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  icon_key = EXCLUDED.icon_key,
  is_enabled = EXCLUDED.is_enabled;

CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id UUID NOT NULL,
  badge_key TEXT NOT NULL REFERENCES public.badge_definitions(key) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (user_id, badge_key)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_earned_at
  ON public.user_badges (user_id, earned_at DESC);

ALTER TABLE public.user_stats_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_awards_current ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_stats_daily' AND policyname = 'user_stats_daily_select_own'
  ) THEN
    CREATE POLICY user_stats_daily_select_own
      ON public.user_stats_daily
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'award_definitions' AND policyname = 'award_definitions_public_read'
  ) THEN
    CREATE POLICY award_definitions_public_read
      ON public.award_definitions
      FOR SELECT
      USING (TRUE);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_awards_current' AND policyname = 'user_awards_current_public_read'
  ) THEN
    CREATE POLICY user_awards_current_public_read
      ON public.user_awards_current
      FOR SELECT
      USING (TRUE);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'badge_definitions' AND policyname = 'badge_definitions_public_read'
  ) THEN
    CREATE POLICY badge_definitions_public_read
      ON public.badge_definitions
      FOR SELECT
      USING (TRUE);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_badges' AND policyname = 'user_badges_public_read'
  ) THEN
    CREATE POLICY user_badges_public_read
      ON public.user_badges
      FOR SELECT
      USING (TRUE);
  END IF;
END $$;

-- Optional lock-down: writes are server/service-role only (service role bypasses RLS).
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('user_stats_daily'::text, 'user_stats_daily_insert_service_only'::text),
      ('user_awards_current', 'user_awards_current_insert_service_only'),
      ('user_badges', 'user_badges_insert_service_only')
    ) AS t(tablename, policyname)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = rec.tablename AND policyname = rec.policyname
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (false)',
        rec.policyname,
        rec.tablename
      );
    END IF;
  END LOOP;
EXCEPTION WHEN insufficient_privilege THEN
  NULL;
END $$;
