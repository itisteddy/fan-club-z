-- Add escrow_reserved column to wallets table
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS escrow_reserved numeric DEFAULT 0;
