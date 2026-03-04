-- Add demo_credits_balance, creator_earnings_balance, stake_balance to public.wallets.
-- Required for /api/demo-wallet/summary and Zaurum-only wallet flows.
-- Safe to run on DBs that already have these (ADD COLUMN IF NOT EXISTS).

ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS demo_credits_balance NUMERIC(18,8) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS creator_earnings_balance NUMERIC(18,8) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stake_balance NUMERIC(18,8) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallets_demo_credits_balance_nonnegative') THEN
    ALTER TABLE public.wallets ADD CONSTRAINT wallets_demo_credits_balance_nonnegative CHECK (demo_credits_balance >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallets_creator_earnings_balance_nonnegative') THEN
    ALTER TABLE public.wallets ADD CONSTRAINT wallets_creator_earnings_balance_nonnegative CHECK (creator_earnings_balance >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallets_stake_balance_nonnegative') THEN
    ALTER TABLE public.wallets ADD CONSTRAINT wallets_stake_balance_nonnegative CHECK (stake_balance >= 0) NOT VALID;
  END IF;
END $$;

-- Backfill: DEMO_USD -> demo_credits_balance, USD -> stake_balance
UPDATE public.wallets
SET demo_credits_balance = COALESCE(NULLIF(demo_credits_balance, 0), COALESCE(available_balance, 0)), updated_at = NOW()
WHERE currency = 'DEMO_USD';

UPDATE public.wallets
SET stake_balance = COALESCE(NULLIF(stake_balance, 0), COALESCE(available_balance, 0)), updated_at = NOW()
WHERE currency = 'USD';
