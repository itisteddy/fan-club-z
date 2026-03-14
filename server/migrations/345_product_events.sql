-- Migration 345: product_events table
-- Server-instrumented product analytics events for the highest-value user actions.
-- Design: single wide table with JSONB properties; idempotency via unique index on idempotency_key.
-- Safe to run multiple times (IF NOT EXISTS, ADD CONSTRAINT IF NOT EXISTS).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. product_events
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_events (
  id                  BIGSERIAL PRIMARY KEY,
  event_name          TEXT        NOT NULL,
  user_id             UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  anonymous_id        TEXT,                     -- pre-signup referral clicks etc.
  session_id          TEXT,
  properties          JSONB       NOT NULL DEFAULT '{}',
  idempotency_key     TEXT,                     -- "{event_name}:{entity_id}" for server events
  occurred_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  server_received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Allowed event names (server-enforced taxonomy)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_events_name_check' AND conrelid = 'public.product_events'::regclass
  ) THEN
    ALTER TABLE public.product_events
      ADD CONSTRAINT product_events_name_check
      CHECK (event_name IN (
        -- Lifecycle
        'signup_completed',
        'onboarding_completed',
        'login_completed',
        'session_started',
        -- Predictions
        'prediction_viewed',
        'prediction_created',
        -- Staking
        'stake_placed',
        -- Claims / settlements
        'claim_started',
        'claim_completed',
        'claim_failed',
        -- Social
        'comment_created',
        'like_added',
        'tag_used',
        'share_clicked',
        -- Referrals
        'referral_link_clicked',
        'referred_signup_completed'
      ));
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Indexes
-- ─────────────────────────────────────────────────────────────────────────────

-- Idempotency: unique, partial (NULL keys are not deduplicated intentionally)
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_events_idempotency
  ON public.product_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Per-user event history
CREATE INDEX IF NOT EXISTS idx_product_events_user_event
  ON public.product_events (user_id, event_name, occurred_at DESC);

-- Time-series aggregation (e.g. COUNT per day per event)
CREATE INDEX IF NOT EXISTS idx_product_events_event_day
  ON public.product_events (event_name, (occurred_at::DATE) DESC);

-- General time-series scan
CREATE INDEX IF NOT EXISTS idx_product_events_occurred
  ON public.product_events (occurred_at DESC);

-- Session lookup
CREATE INDEX IF NOT EXISTS idx_product_events_session
  ON public.product_events (session_id, occurred_at DESC)
  WHERE session_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS – read via admin API layer; writes from server role only
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_events'
      AND policyname = 'product_events_select_service'
  ) THEN
    CREATE POLICY product_events_select_service
      ON public.product_events FOR SELECT USING (true);
  END IF;
END $$;

COMMENT ON TABLE  public.product_events IS 'Server-instrumented product analytics events. Idempotent via idempotency_key unique index. Never insert from client directly.';
COMMENT ON COLUMN public.product_events.idempotency_key IS 'Format: "{event_name}:{entity_id}". Null allowed for events without a stable entity ID (prediction_viewed, share_clicked, etc.).';
COMMENT ON COLUMN public.product_events.anonymous_id IS 'Stable identifier for pre-signup users (e.g. referral click before account creation).';
