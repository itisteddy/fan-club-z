-- Step 1: Check current locks
SELECT 
  id,
  user_id,
  prediction_id,
  amount,
  status,
  state,
  created_at,
  expires_at,
  CASE 
    WHEN expires_at IS NULL THEN 'NO_EXPIRY'
    WHEN expires_at < NOW() THEN 'EXPIRED'
    ELSE 'ACTIVE'
  END as lock_status
FROM escrow_locks
WHERE user_id = 'bc1866ca-71c5-4029-886d-4eace001f5c4'
ORDER BY created_at DESC;

-- Step 2: Clean up expired locks
UPDATE escrow_locks
SET 
  status = 'expired',
  state = 'expired',
  meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object(
    'expired_reason', 'manual_cleanup',
    'expired_at', NOW()::text
  )
WHERE user_id = 'bc1866ca-71c5-4029-886d-4eace001f5c4'
  AND (status = 'locked' OR state = 'locked')
  AND (
    expires_at IS NULL  -- Old locks without expiry
    OR expires_at < NOW()  -- Expired locks
  );

-- Step 3: Verify cleanup
SELECT 
  status,
  state,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM escrow_locks
WHERE user_id = 'bc1866ca-71c5-4029-886d-4eace001f5c4'
GROUP BY status, state;

