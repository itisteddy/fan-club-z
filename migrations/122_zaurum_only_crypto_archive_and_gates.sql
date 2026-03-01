-- Phase 2: Legacy crypto archive foundation for zaurum_only mode
-- Additive + idempotent schema only.

CREATE TABLE IF NOT EXISTS public.legacy_crypto_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_version TEXT NOT NULL,
  user_id UUID NOT NULL,
  chain TEXT NOT NULL,
  address TEXT NOT NULL,
  snapped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_legacy_crypto_accounts_version_unique
  ON public.legacy_crypto_accounts (snapshot_version, user_id, chain, address);

CREATE INDEX IF NOT EXISTS idx_legacy_crypto_accounts_user
  ON public.legacy_crypto_accounts (user_id, snapped_at DESC);

CREATE TABLE IF NOT EXISTS public.legacy_crypto_balances_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_version TEXT NOT NULL,
  user_id UUID NOT NULL,
  asset TEXT NOT NULL,
  amount NUMERIC(18,8) NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  snapped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_legacy_crypto_balances_version_unique
  ON public.legacy_crypto_balances_snapshot (snapshot_version, user_id, asset, source);

CREATE INDEX IF NOT EXISTS idx_legacy_crypto_balances_user
  ON public.legacy_crypto_balances_snapshot (user_id, snapped_at DESC);

CREATE TABLE IF NOT EXISTS public.legacy_crypto_events_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_version TEXT NOT NULL,
  source TEXT NOT NULL, -- wallet_transactions | blockchain_transactions
  source_id TEXT NOT NULL,
  user_id UUID NULL,
  event_type TEXT NOT NULL,
  amount NUMERIC(18,8) NULL,
  currency TEXT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapped_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_legacy_crypto_events_version_unique
  ON public.legacy_crypto_events_snapshot (snapshot_version, source, source_id);

CREATE INDEX IF NOT EXISTS idx_legacy_crypto_events_user
  ON public.legacy_crypto_events_snapshot (user_id, occurred_at DESC);
