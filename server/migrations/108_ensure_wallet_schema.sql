-- Ensure extended columns exist in wallet_transactions
ALTER TABLE IF EXISTS public.wallet_transactions
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS external_ref text,
  ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

-- Idempotency on (provider, external_ref)
CREATE UNIQUE INDEX IF NOT EXISTS wallet_tx_provider_extref_uidx
  ON public.wallet_transactions (provider, external_ref);

-- Ensure wallets table exists with all required columns
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id),
  currency varchar DEFAULT 'USD',
  available_balance numeric DEFAULT 0,
  reserved_balance numeric DEFAULT 0,
  escrow_reserved numeric DEFAULT 0,
  total_deposited numeric DEFAULT 0,
  total_withdrawn numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, currency)
);

-- Ensure crypto_addresses table exists
CREATE TABLE IF NOT EXISTS public.crypto_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id),
  chain_id integer NOT NULL,
  address text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (chain_id, address)
);

-- Ensure event_log table exists
CREATE TABLE IF NOT EXISTS public.event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ts timestamptz DEFAULT now(),
  source text NOT NULL,
  kind text NOT NULL,
  ref text,
  payload jsonb DEFAULT '{}'
);
