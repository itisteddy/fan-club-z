-- Phase pre-live Zaurum economy chunk 1:
-- Add source-bucket tracking fields for migration + claim-cap accounting.

ALTER TABLE IF EXISTS public.wallet_transactions
  ADD COLUMN IF NOT EXISTS source_bucket text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'wallet_transactions_source_bucket_check'
  ) THEN
    ALTER TABLE public.wallet_transactions
      ADD CONSTRAINT wallet_transactions_source_bucket_check
      CHECK (
        source_bucket IS NULL OR
        source_bucket IN (
          'claim_zaurum',
          'won_zaurum',
          'creator_fee_zaurum',
          'legacy_migrated_zaurum',
          'mixed'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_bucket_created
  ON public.wallet_transactions (user_id, source_bucket, created_at DESC);

ALTER TABLE IF EXISTS public.wallets
  ADD COLUMN IF NOT EXISTS claim_zaurum_balance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS won_zaurum_balance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS creator_fee_zaurum_balance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS legacy_migrated_zaurum_balance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS legacy_migration_version text,
  ADD COLUMN IF NOT EXISTS legacy_migration_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS legacy_migration_demo_credits numeric,
  ADD COLUMN IF NOT EXISTS legacy_migration_uncapped_zaurum numeric,
  ADD COLUMN IF NOT EXISTS legacy_migration_cap_zaurum numeric;

UPDATE public.wallets
SET
  claim_zaurum_balance = COALESCE(claim_zaurum_balance, 0),
  won_zaurum_balance = COALESCE(won_zaurum_balance, 0),
  creator_fee_zaurum_balance = COALESCE(creator_fee_zaurum_balance, 0),
  legacy_migrated_zaurum_balance = COALESCE(legacy_migrated_zaurum_balance, 0)
WHERE currency = 'DEMO_USD';
