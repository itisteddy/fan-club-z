-- Fan Club Z: server-authoritative wallet mode for cross-platform parity
-- Default: demo

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS wallet_mode text;

-- Backfill existing rows
UPDATE public.users
SET wallet_mode = 'demo'
WHERE wallet_mode IS NULL;

-- Default + constraint
ALTER TABLE public.users
  ALTER COLUMN wallet_mode SET DEFAULT 'demo';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_wallet_mode_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_wallet_mode_check
  CHECK (wallet_mode IN ('demo', 'crypto', 'fiat'));

ALTER TABLE public.users
  ALTER COLUMN wallet_mode SET NOT NULL;

