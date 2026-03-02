-- Phase 7 close-out: expand wallet_transactions channel CHECK to allow existing rows
-- Reason: production data contains legacy channels like 'settlement_loss', 'blockchain', and NULLs.
-- This keeps the constraint useful without blocking migrations.

ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_channel_check;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_channel_check
  CHECK (
    channel IS NULL OR channel IN (
      'crypto',
      'fiat',
      'escrow_deposit',
      'escrow_withdraw',
      'escrow_locked',
      'escrow_consumed',
      'escrow_released',
      'escrow_unlock',
      'payout',
      'platform_fee',
      'creator_fee',
      -- legacy channels observed in production
      'settlement_loss',
      'blockchain'
    )
  );

