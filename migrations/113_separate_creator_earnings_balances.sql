-- Item 1: Separate demo credits, creator earnings, and stake balance.
-- Safe additive migration: keep legacy available_balance/reserved_balance fields for rollback/back-compat.

ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS demo_credits_balance NUMERIC(18,8) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS creator_earnings_balance NUMERIC(18,8) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stake_balance NUMERIC(18,8) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallets_demo_credits_balance_nonnegative'
  ) THEN
    ALTER TABLE public.wallets
      ADD CONSTRAINT wallets_demo_credits_balance_nonnegative
      CHECK (demo_credits_balance >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallets_creator_earnings_balance_nonnegative'
  ) THEN
    ALTER TABLE public.wallets
      ADD CONSTRAINT wallets_creator_earnings_balance_nonnegative
      CHECK (creator_earnings_balance >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallets_stake_balance_nonnegative'
  ) THEN
    ALTER TABLE public.wallets
      ADD CONSTRAINT wallets_stake_balance_nonnegative
      CHECK (stake_balance >= 0) NOT VALID;
  END IF;
END $$;

-- Backfill explicit balances from existing wallet rows.
-- DEMO_USD rows map available_balance -> demo_credits_balance.
UPDATE public.wallets
SET demo_credits_balance = COALESCE(NULLIF(demo_credits_balance, 0), COALESCE(available_balance, 0)),
    updated_at = NOW()
WHERE currency = 'DEMO_USD';

-- USD rows map available_balance -> stake_balance (legacy behavior preserved).
UPDATE public.wallets
SET stake_balance = COALESCE(NULLIF(stake_balance, 0), COALESCE(available_balance, 0)),
    updated_at = NOW()
WHERE currency = 'USD';

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS from_account TEXT,
  ADD COLUMN IF NOT EXISTS to_account TEXT,
  ADD COLUMN IF NOT EXISTS reference_type TEXT,
  ADD COLUMN IF NOT EXISTS reference_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created_at
  ON public.wallet_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_creator_accounts
  ON public.wallet_transactions (user_id, to_account, from_account, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference
  ON public.wallet_transactions (reference_type, reference_id);

-- If the table already uses "meta", mirror it into "metadata" for existing rows (best effort).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wallet_transactions'
      AND column_name = 'meta'
  ) THEN
    EXECUTE '
      UPDATE public.wallet_transactions
      SET metadata = COALESCE(metadata, meta)
      WHERE metadata IS NULL AND meta IS NOT NULL
    ';
  END IF;
END $$;

-- RLS: owner can read own balances/transactions (service role still bypasses).
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'wallets' AND policyname = 'wallets_select_own'
  ) THEN
    CREATE POLICY wallets_select_own
      ON public.wallets
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'wallet_transactions' AND policyname = 'wallet_transactions_select_own'
  ) THEN
    CREATE POLICY wallet_transactions_select_own
      ON public.wallet_transactions
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Optional lock-down: writes should happen via server/service role only.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'wallet_transactions' AND policyname = 'wallet_transactions_insert_service_only'
  ) THEN
    CREATE POLICY wallet_transactions_insert_service_only
      ON public.wallet_transactions
      FOR INSERT
      WITH CHECK (false);
  END IF;
EXCEPTION WHEN insufficient_privilege THEN
  -- Ignore in environments where policy management is restricted during migration.
  NULL;
END $$;
