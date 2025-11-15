-- Extend wallet_transactions table with payment channel support
ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS channel text CHECK (channel IN ('crypto','fiat')),
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS external_ref text,
  ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

-- Create index for efficient user transaction queries
CREATE INDEX IF NOT EXISTS idx_wtx_user_created_at
  ON public.wallet_transactions (user_id, created_at DESC);

-- Create unique constraint to prevent duplicate external references per provider
CREATE UNIQUE INDEX IF NOT EXISTS uq_wtx_provider_ref
  ON public.wallet_transactions (provider, external_ref);
