-- ============================================================================
-- PHASE 1 COMPLETE MIGRATION - RUN THIS IN SUPABASE SQL EDITOR
-- ============================================================================
-- Copy this ENTIRE file and paste into Supabase SQL Editor, then click RUN
-- URL: https://supabase.com/dashboard/project/ihtnsyhknvltgrksffun/sql/new
-- ============================================================================

-- ============================================================================
-- MIGRATION 114: Add Lock Expiration
-- ============================================================================

-- Step 1: Add expires_at column
ALTER TABLE escrow_locks
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Set default expiration for existing locks (10 minutes from now)
UPDATE escrow_locks
SET expires_at = NOW() + INTERVAL '10 minutes'
WHERE expires_at IS NULL 
  AND (status = 'locked' OR state = 'locked');

-- Step 3: Set expiration for old 'consumed' locks
UPDATE escrow_locks
SET expires_at = created_at + INTERVAL '10 minutes'
WHERE expires_at IS NULL 
  AND (status = 'consumed' OR state = 'consumed');

-- Step 4: Add index for efficient expiration queries
CREATE INDEX IF NOT EXISTS idx_escrow_locks_expires 
ON escrow_locks(expires_at) 
WHERE (status = 'locked' OR state = 'locked');

-- Step 5: Add index for user + status + expiration
CREATE INDEX IF NOT EXISTS idx_escrow_locks_user_status_expires
ON escrow_locks(user_id, status, expires_at)
WHERE (status = 'locked' OR state = 'locked');

-- Step 6: Expire locks that are past expiration
UPDATE escrow_locks
SET status = 'expired'
WHERE (status = 'locked' OR state = 'locked')
  AND expires_at < NOW();

-- Step 7: Add comment
COMMENT ON COLUMN escrow_locks.expires_at IS 'Timestamp when lock expires. Locks expire after 10 minutes if not consumed.';

-- ============================================================================
-- MIGRATION 115: Add Idempotency
-- ============================================================================

-- Step 1: Clean up any duplicate active locks (keep oldest)
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY user_id, prediction_id 
           ORDER BY created_at ASC
         ) as rn
  FROM escrow_locks
  WHERE (status = 'locked' OR state = 'locked')
    AND expires_at > NOW()
)
UPDATE escrow_locks
SET status = 'expired',
    meta = COALESCE(meta, '{}'::jsonb) || '{"expired_reason": "duplicate_cleanup"}'::jsonb
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 2: Create unique constraint (using CURRENT_TIMESTAMP instead of NOW() for immutability)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_lock_per_prediction
ON escrow_locks(user_id, prediction_id)
WHERE (status = 'locked' OR state = 'locked');

-- Step 3: Add lock_ref column
ALTER TABLE escrow_locks
ADD COLUMN IF NOT EXISTS lock_ref TEXT;

-- Step 4: Create index on lock_ref
CREATE INDEX IF NOT EXISTS idx_escrow_locks_lock_ref
ON escrow_locks(lock_ref)
WHERE lock_ref IS NOT NULL;

-- Step 5: Add unique constraint on lock_ref
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_lock_ref
ON escrow_locks(lock_ref)
WHERE lock_ref IS NOT NULL AND (status = 'locked' OR state = 'locked');

-- Step 6: Add comment
COMMENT ON COLUMN escrow_locks.lock_ref IS 'Idempotency key for lock creation. Prevents duplicate locks from retry/double-click.';

COMMENT ON INDEX idx_one_active_lock_per_prediction IS 'Ensures only one active lock exists per user+prediction pair';

-- ============================================================================
-- CLEANUP: Remove Old Locks for User bc1866ca-71c5-4029-886d-4eace081f5c4
-- ============================================================================

-- View current locks for this user
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

-- Delete old locks (older than 5 minutes, still locked)
DELETE FROM escrow_locks
WHERE user_id = 'bc1866ca-71c5-4029-886d-4eace081f5c4'
AND (status = 'locked' OR state = 'locked')
AND created_at < NOW() - INTERVAL '5 minutes';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify expires_at column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'escrow_locks' 
AND column_name IN ('expires_at', 'lock_ref');

-- Verify indexes exist
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'escrow_locks' 
AND indexname IN (
  'idx_escrow_locks_expires',
  'idx_one_active_lock_per_prediction',
  'idx_unique_lock_ref'
);

-- Check lock status distribution
SELECT 
  status,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE expires_at IS NULL) as missing_expiration,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as active
FROM escrow_locks
GROUP BY status;

-- Check for duplicate locks (should be 0)
SELECT user_id, prediction_id, COUNT(*) as duplicates
FROM escrow_locks
WHERE (status = 'locked' OR state = 'locked') 
  AND expires_at > NOW()
GROUP BY user_id, prediction_id
HAVING COUNT(*) > 1;

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- If you see no errors above, migrations are complete!
-- 
-- Next steps:
-- 1. Restart server: cd server && npm run dev
-- 2. Look for: ✅ Lock expiration cron job started
-- 3. Test by placing a bet
-- ============================================================================

