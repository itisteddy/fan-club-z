-- Check all locks for this user
SELECT 
  id,
  prediction_id,
  amount,
  status,
  state,
  created_at,
  expires_at,
  lock_ref,
  CASE 
    WHEN expires_at IS NULL THEN 'NO_EXPIRY'
    WHEN expires_at < NOW() THEN 'EXPIRED'
    ELSE 'ACTIVE'
  END as computed_status
FROM escrow_locks
WHERE user_id = 'bc1866ca-71c5-4029-886d-4eace001f5c4'
ORDER BY created_at DESC
LIMIT 20;

-- Check wallet_transactions
SELECT 
  id,
  type,
  amount,
  currency,
  status,
  provider,
  created_at
FROM wallet_transactions
WHERE user_id = 'bc1866ca-71c5-4029-886d-4eace001f5c4'
ORDER BY created_at DESC
LIMIT 10;

-- Check if there's a wallets table entry
SELECT 
  user_id,
  available_balance,
  reserved_balance,
  updated_at
FROM wallets
WHERE user_id = 'bc1866ca-71c5-4029-886d-4eace001f5c4';

