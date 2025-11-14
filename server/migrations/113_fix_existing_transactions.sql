-- Migration 113: Fix Existing Transactions
-- Backfill provider and channel for existing wallet_transactions
-- This fixes the issue where transactions exist but wallet summary shows 0

-- Update transactions that are clearly crypto-related but missing provider/channel
-- Based on the transaction pattern, set appropriate values

-- Set provider and channel for deposit transactions (likely crypto)
UPDATE wallet_transactions
SET 
  provider = 'crypto-base-usdc',
  channel = 'crypto'
WHERE 
  provider IS NULL 
  AND channel IS NULL
  AND (type = 'deposit' OR type = 'credit')
  AND amount > 0;

-- Set provider and channel for bet_lock transactions (these are escrow locks)
UPDATE wallet_transactions
SET 
  provider = 'crypto-base-usdc',
  channel = 'escrow_locked'
WHERE 
  provider IS NULL 
  AND channel IS NULL
  AND (type = 'bet_lock' OR type = 'prediction_lock');

-- Set provider for withdrawals
UPDATE wallet_transactions
SET 
  provider = 'crypto-base-usdc',
  channel = 'crypto'
WHERE 
  provider IS NULL 
  AND channel IS NULL
  AND (type = 'withdraw' OR type = 'debit')
  AND amount > 0;

-- Create a summary of what was updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM wallet_transactions
  WHERE provider = 'crypto-base-usdc';
  
  RAISE NOTICE 'Updated % transactions with provider and channel', updated_count;
END $$;

