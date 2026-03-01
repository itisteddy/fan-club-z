-- Migration 118: Fix historical creator earnings balances.
-- Migration 113 incorrectly dumped all historical available_balance into stake_balance.
-- This migration retroactively calculates all creator earnings from wallet_transactions
-- and properly separates them from the stake_balance for existing users.

WITH creator_txs AS (
  SELECT
    user_id,
    COALESCE(SUM(amount), 0) as total_creator_earned
  FROM public.wallet_transactions
  WHERE
    currency = 'USD'
    AND COALESCE(direction, 'credit') = 'credit'
    AND COALESCE(status, 'completed') = 'completed'
    AND (
      COALESCE(to_account, '') = 'CREATOR_EARNINGS'
      OR UPPER(COALESCE(type, '')) = 'CREATOR_EARNING_CREDIT'
      OR COALESCE(channel, '') = 'creator_fee'
    )
    AND NOT (
      COALESCE(from_account, '') = 'CREATOR_EARNINGS'
      AND COALESCE(to_account, '') = 'STAKE'
    )
  GROUP BY user_id
),
transfers_out AS (
  SELECT
    user_id,
    COALESCE(SUM(amount), 0) as total_transferred_out
  FROM public.wallet_transactions
  WHERE
    currency = 'USD'
    AND COALESCE(status, 'completed') = 'completed'
    AND COALESCE(from_account, '') = 'CREATOR_EARNINGS'
    AND COALESCE(to_account, '') = 'STAKE'
  GROUP BY user_id
),
computed_balances AS (
  SELECT
    c.user_id,
    c.total_creator_earned - COALESCE(t.total_transferred_out, 0) as net_creator_earnings
  FROM creator_txs c
  LEFT JOIN transfers_out t ON c.user_id = t.user_id
)
UPDATE public.wallets w
SET
  creator_earnings_balance = cb.net_creator_earnings,
  stake_balance = GREATEST(0, w.stake_balance - (cb.net_creator_earnings - w.creator_earnings_balance)),
  available_balance = GREATEST(0, w.available_balance - (cb.net_creator_earnings - w.creator_earnings_balance)),
  updated_at = NOW()
FROM computed_balances cb
WHERE w.user_id = cb.user_id
  AND w.currency = 'USD'
  AND cb.net_creator_earnings != w.creator_earnings_balance;
