-- Ledger Sanity Check
-- Run these queries in Supabase SQL Editor

-- 1. Check wallet transactions for test user
SELECT 
  created_at, 
  type, 
  channel, 
  provider, 
  amount, 
  status, 
  external_ref
FROM wallet_transactions
WHERE user_id = '00000000-0000-0000-0000-000000000000'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check wallet balances for test user
SELECT 
  available_balance, 
  reserved_balance, 
  total_deposited, 
  total_withdrawn,
  currency,
  updated_at
FROM wallets
WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- 3. Check crypto addresses
SELECT * FROM crypto_addresses 
WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- 4. Check event log
SELECT * FROM event_log 
WHERE source = 'base-watcher'
ORDER BY ts DESC
LIMIT 5;

-- Expected Results:
-- ✅ wallet_transactions: 1 row with type='deposit', channel='crypto', provider='base-usdc', amount=10
-- ✅ wallets: available_balance=10, total_deposited=10
-- ✅ crypto_addresses: address=0x9CCD0C785E5E7737e39EB9625D7Fc181608cBa9c
-- ✅ event_log: deposit event with correct payload

