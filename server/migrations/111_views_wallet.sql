-- Migration 111: Wallet Read Model Views
-- Fast, normalized views for wallet summary and activity
-- Idempotent - safe to run multiple times

-- ========================================
-- Wallet Summary View
-- ========================================
-- Computes available, reserved, and total from wallets table
-- Filters by currency to only show USD balances
-- Handles both column name variants: available/reserved OR available_balance/reserved_balance
CREATE OR REPLACE VIEW v_wallet_summary AS
SELECT
  w.user_id,
  COALESCE(
    COALESCE(w.available, w.available_balance),
    0
  )::numeric AS available,
  COALESCE(
    COALESCE(w.reserved, w.reserved_balance),
    0
  )::numeric AS reserved,
  (
    COALESCE(COALESCE(w.available, w.available_balance), 0) +
    COALESCE(COALESCE(w.reserved, w.reserved_balance), 0)
  )::numeric AS total
FROM wallets w
WHERE w.currency = 'USD';

-- ========================================
-- Wallet Activity View
-- ========================================
-- Latest 200 transactions, filtered by provider
-- Only crypto-base-usdc transactions (no demo)
CREATE OR REPLACE VIEW v_wallet_activity AS
SELECT
  t.id,
  t.user_id,
  CASE
    WHEN t.direction = 'credit' AND t.channel = 'escrow_deposit' THEN 'DEPOSIT'
    WHEN t.direction = 'debit' AND t.channel = 'escrow_withdraw' THEN 'WITHDRAW'
    WHEN t.direction = 'debit' AND t.channel = 'escrow_consumed' THEN 'BET'
    WHEN t.direction = 'credit' AND t.channel = 'escrow_consumed' THEN 'PAYOUT'
    WHEN t.channel = 'escrow_locked' THEN 'LOCK'
    WHEN t.channel = 'escrow_released' THEN 'UNLOCK'
    ELSE UPPER(t.channel)
  END AS kind,
  t.amount::numeric,
  t.currency,
  t.created_at,
  t.meta
FROM wallet_transactions t
WHERE t.provider IN ('crypto-base-usdc')  -- Only crypto, no demo
ORDER BY t.created_at DESC
LIMIT 200;

-- Create index for fast user lookups on activity
CREATE INDEX IF NOT EXISTS idx_wallet_activity_user_created 
  ON wallet_transactions(user_id, created_at DESC)
  WHERE provider IN ('crypto-base-usdc');

