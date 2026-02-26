-- Item 2: auditable top-up stake events for aggregated positions.
-- Additive migration; safe to deploy before app changes.

CREATE TABLE IF NOT EXISTS public.position_stake_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prediction_id UUID NOT NULL,
  option_id UUID NOT NULL,
  entry_id UUID NULL,
  amount NUMERIC(18,8) NOT NULL CHECK (amount > 0),
  mode TEXT NOT NULL CHECK (mode IN ('DEMO', 'REAL')),
  quote_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_position_stake_events_user_created
  ON public.position_stake_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_position_stake_events_prediction
  ON public.position_stake_events (prediction_id, option_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_position_stake_events_entry
  ON public.position_stake_events (entry_id)
  WHERE entry_id IS NOT NULL;

ALTER TABLE public.position_stake_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'position_stake_events'
      AND policyname = 'position_stake_events_select_own'
  ) THEN
    CREATE POLICY position_stake_events_select_own
      ON public.position_stake_events
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Optional lock-down: inserts are performed by server using service-role key (bypasses RLS).
-- Deny direct client inserts explicitly.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'position_stake_events'
      AND policyname = 'position_stake_events_insert_service_only'
  ) THEN
    CREATE POLICY position_stake_events_insert_service_only
      ON public.position_stake_events
      FOR INSERT
      WITH CHECK (false);
  END IF;
EXCEPTION WHEN insufficient_privilege THEN
  NULL;
END $$;
