-- Cleanup Old Pending Locks
-- This removes locks that are older than 5 minutes and still in 'locked' state
-- These are likely from failed/abandoned bet attempts

-- Step 1: View current locks for your user
SELECT 
  id,
  user_id,
  prediction_id,
  amount,
  COALESCE(status, state) as lock_status,
  created_at,
  NOW() - created_at as age
FROM escrow_locks
WHERE user_id = 'bc1866ca-71c5-4029-886d-4eace081f5c4'
ORDER BY created_at DESC;

-- Step 2: Count locks to be deleted (older than 5 minutes, still locked)
SELECT 
  COUNT(*) as locks_to_delete,
  SUM(amount) as total_amount_to_free
FROM escrow_locks
WHERE user_id = 'bc1866ca-71c5-4029-886d-4eace081f5c4'
AND (status = 'locked' OR state = 'locked')
AND created_at < NOW() - INTERVAL '5 minutes';

-- Step 3: Delete old locked entries (uncomment to execute)
DELETE FROM escrow_locks
WHERE user_id = 'bc1866ca-71c5-4029-886d-4eace081f5c4'
AND (status = 'locked' OR state = 'locked')
AND created_at < NOW() - INTERVAL '5 minutes';

-- Step 4: Verify cleanup - should show only recent locks or consumed locks
SELECT 
  id,
  prediction_id,
  amount,
  COALESCE(status, state) as lock_status,
  created_at
FROM escrow_locks
WHERE user_id = 'bc1866ca-71c5-4029-886d-4eace081f5c4'
ORDER BY created_at DESC;

