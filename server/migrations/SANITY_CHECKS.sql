-- Sanity Checks for Debugging Bet Placement
-- Replace :uid, :escrowLockId, :predictionId with actual values

-- ========================================
-- Check 1: Last 5 locks for user
-- ========================================
SELECT 
  id, 
  user_id, 
  prediction_id, 
  amount, 
  currency, 
  status, 
  state,
  created_at
FROM escrow_locks
WHERE user_id = :uid  -- Replace with actual user_id UUID
ORDER BY created_at DESC
LIMIT 5;

-- ========================================
-- Check 2: Status of specific lock
-- ========================================
SELECT 
  id, 
  status, 
  state,
  user_id,
  prediction_id,
  amount,
  currency
FROM escrow_locks 
WHERE id = :escrowLockId;  -- Replace with actual escrow_lock_id UUID

-- ========================================
-- Check 3: Prediction ID match
-- ========================================
SELECT 
  :predictionId AS url_id,  -- Replace with prediction_id from URL
  (SELECT prediction_id FROM escrow_locks WHERE id = :escrowLockId) AS lock_prediction_id;

-- ========================================
-- Check 4: Lock amount vs stake
-- ========================================
SELECT 
  id,
  amount AS locked_amount,
  :stakeAmount AS requested_stake,  -- Replace with stake amount
  (amount >= :stakeAmount) AS has_sufficient_funds
FROM escrow_locks 
WHERE id = :escrowLockId;

-- ========================================
-- Check 5: Recent entries for user
-- ========================================
SELECT 
  pe.id,
  pe.prediction_id,
  pe.option_id,
  pe.amount,
  pe.escrow_lock_id,
  pe.provider,
  pe.created_at,
  el.status AS lock_status
FROM prediction_entries pe
LEFT JOIN escrow_locks el ON pe.escrow_lock_id = el.id
WHERE pe.user_id = :uid  -- Replace with actual user_id
ORDER BY pe.created_at DESC
LIMIT 10;

-- ========================================
-- Check 6: Verify unique constraint exists
-- ========================================
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'prediction_entries'
  AND indexname = 'uniq_lock_consumption';

-- ========================================
-- Check 7: Check for duplicate lock consumption attempts
-- ========================================
SELECT 
  escrow_lock_id,
  COUNT(*) AS entry_count
FROM prediction_entries
WHERE escrow_lock_id IS NOT NULL
GROUP BY escrow_lock_id
HAVING COUNT(*) > 1;

