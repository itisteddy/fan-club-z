-- Migration 120: Convert stranded USD stake_balance to DEMO_USD demo_credits_balance
-- Since fiat betting is disabled and the app uses Crypto (USDC) and Demo (DEMO_USD),
-- any off-chain USD stake_balance (e.g. from moved Creator Earnings) is unusable.
-- This migration moves those stranded funds to the user's Demo Credits so they can stake them.

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT user_id, stake_balance
    FROM public.wallets
    WHERE currency = 'USD' AND stake_balance > 0
  LOOP
    -- Ensure the user has a DEMO_USD wallet
    INSERT INTO public.wallets (
      user_id, currency, available_balance, reserved_balance, demo_credits_balance, creator_earnings_balance, stake_balance, updated_at
    ) VALUES (
      rec.user_id, 'DEMO_USD', 0, 0, 0, 0, 0, NOW()
    ) ON CONFLICT (user_id, currency) DO NOTHING;

    -- Add the USD stake_balance to the DEMO_USD demo_credits_balance and available_balance
    UPDATE public.wallets
    SET demo_credits_balance = COALESCE(demo_credits_balance, 0) + rec.stake_balance,
        available_balance = COALESCE(available_balance, 0) + rec.stake_balance,
        updated_at = NOW()
    WHERE user_id = rec.user_id AND currency = 'DEMO_USD';

    -- Zero out the USD stake_balance
    UPDATE public.wallets
    SET stake_balance = 0,
        -- We also reduce available_balance if it was tracking stake_balance, 
        -- but we must ensure it doesn't drop below zero.
        available_balance = GREATEST(0, available_balance - rec.stake_balance),
        updated_at = NOW()
    WHERE user_id = rec.user_id AND currency = 'USD';
  END LOOP;
END $$;
