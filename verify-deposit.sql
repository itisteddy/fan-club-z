-- Verify Deposit Detection in Database
-- Run this in your Supabase SQL Editor

-- 1. Check wallet balance (should show 10 USDC)
SELECT 
  user_id,
  available_balance,
  reserved_balance,
  total_deposited,
  total_withdrawn,
  updated_at
FROM wallets 
WHERE user_id = '00000000-0000-0000-0000-000000000000'
  AND currency = 'USD';

-- 2. Check deposit transaction (should have one record)
SELECT 
  id,
  user_id,
  type,
  channel,
  provider,
  amount,
  status,
  external_ref,
  description,
  created_at
FROM wallet_transactions 
WHERE user_id = '00000000-0000-0000-0000-000000000000'
  AND channel = 'crypto'
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Check event log (should show base-watcher event)
SELECT 
  id,
  source,
  kind,
  ref,
  payload,
  ts
FROM event_log 
WHERE source = 'base-watcher'
ORDER BY ts DESC 
LIMIT 5;

-- 4. Summary Query
SELECT 
  'Wallet Balance' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM wallets 
      WHERE user_id = '00000000-0000-0000-0000-000000000000' 
        AND available_balance >= 10
    ) THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status
UNION ALL
SELECT 
  'Transaction Record' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM wallet_transactions 
      WHERE user_id = '00000000-0000-0000-0000-000000000000'
        AND channel = 'crypto'
        AND provider = 'base-usdc'
        AND status = 'success'
    ) THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status
UNION ALL
SELECT 
  'Event Log' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM event_log 
      WHERE source = 'base-watcher'
        AND kind = 'deposit'
    ) THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status;

