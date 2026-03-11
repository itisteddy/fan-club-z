-- Add direction column to wallet_transactions if missing.
-- Used by wallet activity feed and settlement logic. Safe for prod parity (IF NOT EXISTS).
ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS direction text;
