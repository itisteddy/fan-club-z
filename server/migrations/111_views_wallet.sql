-- Migration 111: Wallet Read Model Views
-- Fast, normalized views for wallet summary and activity
-- Idempotent - safe to run multiple times

-- ========================================
-- Wallet Summary View
-- ========================================
-- Computes available, reserved, and total from wallets table
-- Filters by currency to only show USD balances
-- Uses available_balance/reserved_balance (standard wallet schema)
DROP VIEW IF EXISTS v_wallet_summary;
CREATE OR REPLACE VIEW v_wallet_summary AS
SELECT
  w.user_id,
  COALESCE(w.available_balance, 0)::numeric AS available,
  COALESCE(w.reserved_balance, 0)::numeric AS reserved,
  (
    COALESCE(w.available_balance, 0) +
    COALESCE(w.reserved_balance, 0)
  )::numeric AS total
FROM wallets w
WHERE w.currency = 'USD';

-- ========================================
-- Wallet Activity View
-- ========================================
-- Latest 200 transactions, filtered by provider
-- Only crypto-base-usdc transactions (no demo). Uses type/channel when direction column absent.
CREATE OR REPLACE VIEW v_wallet_activity AS
SELECT
  t.id,
  t.user_id,
  CASE
    WHEN t.channel = 'escrow_deposit' OR t.type = 'deposit' THEN 'DEPOSIT'
    WHEN t.channel = 'escrow_withdraw' OR t.type = 'withdraw' THEN 'WITHDRAW'
    WHEN t.channel = 'escrow_consumed' AND t.type IN ('bet_lock','bet_unlock') THEN 'BET'
    WHEN t.channel = 'escrow_consumed' OR t.type = 'payout' THEN 'PAYOUT'
    WHEN t.channel = 'escrow_locked' THEN 'LOCK'
    WHEN t.channel = 'escrow_released' THEN 'UNLOCK'
    WHEN t.channel IS NOT NULL THEN UPPER(t.channel)
    ELSE UPPER(COALESCE(t.type, 'OTHER'))
  END AS kind,
  t.amount::numeric,
  t.currency,
  t.created_at,
  t.meta
FROM wallet_transactions t
WHERE t.provider IN ('crypto-base-usdc', 'base/usdc') OR t.provider IS NULL
ORDER BY t.created_at DESC
LIMIT 200;

-- Create index for fast user lookups on activity
CREATE INDEX IF NOT EXISTS idx_wallet_activity_user_created 
  ON wallet_transactions(user_id, created_at DESC)
  WHERE provider IN ('crypto-base-usdc');

