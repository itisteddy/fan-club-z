-- Staging parity: add legacy columns used by current API handlers.
-- Safe additive migration for environments created from 100_base_schema.sql.

-- predictions columns required by profile/prediction endpoints
ALTER TABLE IF EXISTS public.predictions
  ADD COLUMN IF NOT EXISTS pool_total NUMERIC(18,8) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS participant_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS platform_fee_percentage NUMERIC(5,2) NULL,
  ADD COLUMN IF NOT EXISTS creator_fee_percentage NUMERIC(5,2) NULL;

CREATE INDEX IF NOT EXISTS idx_predictions_settled_at
  ON public.predictions (settled_at DESC)
  WHERE settled_at IS NOT NULL;

-- wallet_transactions columns required by demo faucet + creator earnings history
ALTER TABLE IF EXISTS public.wallet_transactions
  ADD COLUMN IF NOT EXISTS direction TEXT NULL,
  ADD COLUMN IF NOT EXISTS description TEXT NULL,
  ADD COLUMN IF NOT EXISTS prediction_id UUID NULL,
  ADD COLUMN IF NOT EXISTS from_account TEXT NULL,
  ADD COLUMN IF NOT EXISTS to_account TEXT NULL,
  ADD COLUMN IF NOT EXISTS reference_type TEXT NULL,
  ADD COLUMN IF NOT EXISTS reference_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS metadata JSONB NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'wallet_transactions'
      AND constraint_name = 'wallet_transactions_prediction_id_fkey'
  ) THEN
    ALTER TABLE public.wallet_transactions
      ADD CONSTRAINT wallet_transactions_prediction_id_fkey
      FOREIGN KEY (prediction_id) REFERENCES public.predictions(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_prediction_id
  ON public.wallet_transactions (prediction_id)
  WHERE prediction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_accounts_created
  ON public.wallet_transactions (user_id, to_account, from_account, created_at DESC);

