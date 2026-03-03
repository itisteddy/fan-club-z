-- Achievements system: user_stats_daily, award_definitions, user_awards_current, badge_definitions, user_badges.
-- Fixes "Could not find the table 'public.user_awards_current' in the schema cache" and 500s on /achievements, public-profile.
-- Safe to run multiple times (IF NOT EXISTS, ON CONFLICT DO UPDATE).

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

DROP POLICY IF EXISTS user_stats_daily_select_own ON public.user_stats_daily;
CREATE POLICY user_stats_daily_select_own ON public.user_stats_daily FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS award_definitions_public_read ON public.award_definitions;
CREATE POLICY award_definitions_public_read ON public.award_definitions FOR SELECT USING (true);

DROP POLICY IF EXISTS user_awards_current_public_read ON public.user_awards_current;
CREATE POLICY user_awards_current_public_read ON public.user_awards_current FOR SELECT USING (true);

DROP POLICY IF EXISTS badge_definitions_public_read ON public.badge_definitions;
CREATE POLICY badge_definitions_public_read ON public.badge_definitions FOR SELECT USING (true);

DROP POLICY IF EXISTS user_badges_public_read ON public.user_badges;
CREATE POLICY user_badges_public_read ON public.user_badges FOR SELECT USING (true);

DROP POLICY IF EXISTS user_stats_daily_insert_service_only ON public.user_stats_daily;
CREATE POLICY user_stats_daily_insert_service_only ON public.user_stats_daily FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS user_awards_current_insert_service_only ON public.user_awards_current;
CREATE POLICY user_awards_current_insert_service_only ON public.user_awards_current FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS user_badges_insert_service_only ON public.user_badges;
CREATE POLICY user_badges_insert_service_only ON public.user_badges FOR INSERT WITH CHECK (false);

-- Display / ordering and progress (116 + 117)
ALTER TABLE public.award_definitions ADD COLUMN IF NOT EXISTS sort_order INTEGER;
ALTER TABLE public.badge_definitions ADD COLUMN IF NOT EXISTS sort_order INTEGER, ADD COLUMN IF NOT EXISTS is_key BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE public.award_definitions
SET sort_order = CASE key
  WHEN 'TOP_CREATOR' THEN 10
  WHEN 'TOP_WINNERS' THEN 20
  WHEN 'TOP_PROFITERS' THEN 30
  WHEN 'TOP_COMMENTER' THEN 40
  WHEN 'TOP_PARTICIPANTS' THEN 50
  ELSE COALESCE(sort_order, 999)
END
WHERE sort_order IS NULL OR sort_order = 999;

UPDATE public.badge_definitions
SET sort_order = CASE key
  WHEN 'FIRST_STAKE' THEN 10
  WHEN 'TEN_STAKES' THEN 20
  WHEN 'FIRST_COMMENT' THEN 30
  WHEN 'FIRST_CREATOR_EARNING' THEN 40
  ELSE COALESCE(sort_order, 999)
END,
is_key = COALESCE(is_key, true)
WHERE sort_order IS NULL OR sort_order = 999 OR is_key IS NULL;

ALTER TABLE public.badge_definitions ADD COLUMN IF NOT EXISTS progress_metric TEXT;
ALTER TABLE public.badge_definitions ADD COLUMN IF NOT EXISTS goal_value NUMERIC(18,8);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'badge_definitions_progress_metric_check') THEN
    ALTER TABLE public.badge_definitions
      ADD CONSTRAINT badge_definitions_progress_metric_check
      CHECK (progress_metric IS NULL OR progress_metric IN ('stakes_count', 'comments_count', 'creator_earnings_amount')) NOT VALID;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

UPDATE public.badge_definitions
SET
  title = CASE key WHEN 'FIRST_COMMENT' THEN '100 Comments' WHEN 'FIRST_CREATOR_EARNING' THEN '10 Creator Earnings' ELSE title END,
  description = CASE key WHEN 'FIRST_COMMENT' THEN 'Posted 100 comments on Fan Club Z.' WHEN 'FIRST_CREATOR_EARNING' THEN 'Earned at least 10 in creator fees.' ELSE description END,
  progress_metric = CASE key WHEN 'FIRST_STAKE' THEN 'stakes_count' WHEN 'TEN_STAKES' THEN 'stakes_count' WHEN 'FIRST_COMMENT' THEN 'comments_count' WHEN 'FIRST_CREATOR_EARNING' THEN 'creator_earnings_amount' ELSE progress_metric END,
  goal_value = CASE key WHEN 'FIRST_STAKE' THEN 1 WHEN 'TEN_STAKES' THEN 10 WHEN 'FIRST_COMMENT' THEN 100 WHEN 'FIRST_CREATOR_EARNING' THEN 10 ELSE goal_value END
WHERE key IN ('FIRST_STAKE', 'TEN_STAKES', 'FIRST_COMMENT', 'FIRST_CREATOR_EARNING');
