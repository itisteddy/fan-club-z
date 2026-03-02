-- Update wallet_transactions CHECK constraints to allow settlement activity

ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_type_check
  CHECK (
    type IN (
      'deposit',
      'withdraw',
      'bet_lock',
      'bet_unlock',
      'payout',
      'platform_fee',
      'creator_fee',
      'adjustment'
    )
  );

ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_channel_check;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_channel_check
  CHECK (
    channel IN (
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
      'creator_fee'
    )
  );

