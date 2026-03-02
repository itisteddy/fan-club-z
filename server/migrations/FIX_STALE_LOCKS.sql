-- Fix stale escrow locks and clean up demo data
-- This script resolves the 409 Conflict error by cleaning up orphaned locks

-- 1. Release or void all stale locks (locks that were never consumed)
-- These are locks in 'locked' status with no corresponding prediction_entry
UPDATE escrow_locks
SET status = 'released',
    state = 'released',
    released_at = NOW()
WHERE (status = 'locked' OR state = 'locked')
  AND id NOT IN (
    SELECT escrow_lock_id 
    FROM prediction_entries 
    WHERE escrow_lock_id IS NOT NULL
  );

-- 2. Clean up demo wallet transactions (removes the $200+ demo balance)
DELETE FROM wallet_transactions 
WHERE provider = 'demo' 
   OR channel = 'demo'
   OR meta->>'provider' = 'demo';

-- 3. Reset wallet balances to reflect only crypto transactions
UPDATE wallets 
SET available_balance = COALESCE((
    SELECT SUM(CASE 
        WHEN direction = 'credit' THEN amount 
        WHEN direction = 'debit' THEN -amount 
        ELSE 0 
    END)
    FROM wallet_transactions
    WHERE wallet_transactions.user_id = wallets.user_id
      AND wallet_transactions.currency = wallets.currency
      AND provider IN ('crypto-base-usdc', 'crypto')
), 0),
    reserved_balance = 0,
    updated_at = NOW()
WHERE currency = 'USD';

-- 4. Verify the fixes
SELECT 
    'Stale locks released' as action,
    COUNT(*) as count
FROM escrow_locks
WHERE (status = 'released' OR state = 'released')
  AND released_at > NOW() - INTERVAL '1 minute';

SELECT 
    'Current wallet balances' as info,
    user_id,
    currency,
    available_balance,
    reserved_balance
FROM wallets
WHERE currency = 'USD';
