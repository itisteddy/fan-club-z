-- Phase 1: Zaurum internal ledger foundation (no UI switch)
-- Adds bucketed wallet accounts + append-only ledger, plus idempotent backfill.

CREATE TABLE IF NOT EXISTS public.wallet_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type TEXT NOT NULL CHECK (owner_type IN ('user', 'system')),
  owner_id UUID NOT NULL,
  currency TEXT NOT NULL CHECK (currency = 'ZAU'),
  bucket TEXT NOT NULL CHECK (
    bucket IN (
      'PROMO_AVAILABLE',
      'PROMO_LOCKED',
      'CREATOR_EARNINGS',
      'CASH_AVAILABLE',
      'CASH_LOCKED',
      'WITHDRAWABLE'
    )
  ),
  balance NUMERIC(18,8) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (owner_type, owner_id, currency, bucket)
);

CREATE INDEX IF NOT EXISTS idx_wallet_accounts_owner
  ON public.wallet_accounts (owner_type, owner_id);

CREATE INDEX IF NOT EXISTS idx_wallet_accounts_currency_bucket
  ON public.wallet_accounts (currency, bucket);

CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  currency TEXT NOT NULL CHECK (currency = 'ZAU'),
  amount NUMERIC(18,8) NOT NULL CHECK (amount > 0),

  from_owner_type TEXT NULL CHECK (from_owner_type IS NULL OR from_owner_type IN ('user', 'system')),
  from_owner_id UUID NULL,
  from_bucket TEXT NULL,

  to_owner_type TEXT NULL CHECK (to_owner_type IS NULL OR to_owner_type IN ('user', 'system')),
  to_owner_id UUID NULL,
  to_bucket TEXT NULL,

  type TEXT NOT NULL CHECK (
    type IN (
      'OPENING_BALANCE',
      'DAILY_CLAIM',
      'STAKE_LOCK',
      'STAKE_UNLOCK',
      'PAYOUT',
      'PLATFORM_FEE',
      'CREATOR_EARNING_CREDIT',
      'CREATOR_EARNING_MOVE',
      'ADJUSTMENT'
    )
  ),
  reference_type TEXT NULL,
  reference_id TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT wallet_ledger_has_side CHECK (
    from_owner_id IS NOT NULL OR to_owner_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_created_at
  ON public.wallet_ledger (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_to_owner
  ON public.wallet_ledger (to_owner_type, to_owner_id, to_bucket, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_from_owner
  ON public.wallet_ledger (from_owner_type, from_owner_id, from_bucket, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_reference
  ON public.wallet_ledger (reference_type, reference_id, type);

-- Idempotency helper for deterministic one-time references (e.g., opening balances).
-- Use a non-partial unique index so ON CONFLICT(type, reference_type, reference_id)
-- can infer the arbiter index reliably in all PG environments.
DROP INDEX IF EXISTS idx_wallet_ledger_type_ref_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_ledger_type_ref_unique
  ON public.wallet_ledger (type, reference_type, reference_id);

-- System owner IDs (UUID constants) for internal treasury/system accounts.
-- PLATFORM_TREASURY_ZAU = 00000000-0000-0000-0000-000000000001

INSERT INTO public.wallet_accounts (owner_type, owner_id, currency, bucket, balance, updated_at)
VALUES
  ('system', '00000000-0000-0000-0000-000000000001', 'ZAU', 'CASH_AVAILABLE', 0, NOW()),
  ('system', '00000000-0000-0000-0000-000000000001', 'ZAU', 'CASH_LOCKED', 0, NOW()),
  ('system', '00000000-0000-0000-0000-000000000001', 'ZAU', 'WITHDRAWABLE', 0, NOW())
ON CONFLICT (owner_type, owner_id, currency, bucket) DO NOTHING;

-- Ensure all users have ZAU account buckets (phase1 active + phase2 ready buckets).
INSERT INTO public.wallet_accounts (owner_type, owner_id, currency, bucket, balance, updated_at)
SELECT
  'user',
  u.id,
  'ZAU',
  b.bucket,
  0,
  NOW()
FROM public.users u
CROSS JOIN (
  VALUES
    ('PROMO_AVAILABLE'),
    ('PROMO_LOCKED'),
    ('CREATOR_EARNINGS'),
    ('CASH_AVAILABLE'),
    ('CASH_LOCKED'),
    ('WITHDRAWABLE')
) AS b(bucket)
ON CONFLICT (owner_type, owner_id, currency, bucket) DO NOTHING;

-- Idempotent opening balance: DEMO_USD demo credits -> ZAU PROMO_AVAILABLE
WITH opening_rows AS (
  SELECT
    w.user_id,
    GREATEST(0, COALESCE(w.demo_credits_balance, w.available_balance, 0))::NUMERIC(18,8) AS amount
  FROM public.wallets w
  WHERE w.currency = 'DEMO_USD'
    AND GREATEST(0, COALESCE(w.demo_credits_balance, w.available_balance, 0)) > 0
),
inserted AS (
  INSERT INTO public.wallet_ledger (
    currency,
    amount,
    to_owner_type,
    to_owner_id,
    to_bucket,
    type,
    reference_type,
    reference_id,
    metadata
  )
  SELECT
    'ZAU',
    o.amount,
    'user',
    o.user_id,
    'PROMO_AVAILABLE',
    'OPENING_BALANCE',
    'migration',
    'phase1_opening_demo:' || o.user_id::text,
    jsonb_build_object(
      'source', 'wallets.DEMO_USD.demo_credits_balance',
      'migration', '121_zaurum_wallet_ledger_foundation'
    )
  FROM opening_rows o
  ON CONFLICT (type, reference_type, reference_id) DO NOTHING
  RETURNING to_owner_id, amount
)
UPDATE public.wallet_accounts a
SET
  balance = a.balance + agg.amount,
  updated_at = NOW()
FROM (
  SELECT to_owner_id, SUM(amount) AS amount
  FROM inserted
  GROUP BY to_owner_id
) agg
WHERE a.owner_type = 'user'
  AND a.owner_id = agg.to_owner_id
  AND a.currency = 'ZAU'
  AND a.bucket = 'PROMO_AVAILABLE';

-- Idempotent opening balance: USD creator earnings -> ZAU CREATOR_EARNINGS
WITH opening_creator AS (
  SELECT
    w.user_id,
    GREATEST(0, COALESCE(w.creator_earnings_balance, 0))::NUMERIC(18,8) AS amount
  FROM public.wallets w
  WHERE w.currency = 'USD'
    AND GREATEST(0, COALESCE(w.creator_earnings_balance, 0)) > 0
),
inserted AS (
  INSERT INTO public.wallet_ledger (
    currency,
    amount,
    to_owner_type,
    to_owner_id,
    to_bucket,
    type,
    reference_type,
    reference_id,
    metadata
  )
  SELECT
    'ZAU',
    o.amount,
    'user',
    o.user_id,
    'CREATOR_EARNINGS',
    'OPENING_BALANCE',
    'migration',
    'phase1_opening_creator:' || o.user_id::text,
    jsonb_build_object(
      'source', 'wallets.USD.creator_earnings_balance',
      'migration', '121_zaurum_wallet_ledger_foundation'
    )
  FROM opening_creator o
  ON CONFLICT (type, reference_type, reference_id) DO NOTHING
  RETURNING to_owner_id, amount
)
UPDATE public.wallet_accounts a
SET
  balance = a.balance + agg.amount,
  updated_at = NOW()
FROM (
  SELECT to_owner_id, SUM(amount) AS amount
  FROM inserted
  GROUP BY to_owner_id
) agg
WHERE a.owner_type = 'user'
  AND a.owner_id = agg.to_owner_id
  AND a.currency = 'ZAU'
  AND a.bucket = 'CREATOR_EARNINGS';
