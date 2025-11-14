-- Migration 115: Add Idempotency for Locks
-- Prevents duplicate locks for same user+prediction

-- Step 1: Clean up any duplicate active locks first (keep the oldest one for each user+prediction)
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

-- Step 2: Create unique constraint - one active lock per user+prediction
-- This prevents race conditions where multiple locks are created simultaneously
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_lock_per_prediction
ON escrow_locks(user_id, prediction_id)
WHERE ((status = 'locked' OR state = 'locked') AND expires_at > NOW());

-- Step 3: Add lock_ref column if it doesn't exist (for request idempotency)
ALTER TABLE escrow_locks
ADD COLUMN IF NOT EXISTS lock_ref TEXT;

-- Step 4: Create index on lock_ref for idempotent lookups
CREATE INDEX IF NOT EXISTS idx_escrow_locks_lock_ref
ON escrow_locks(lock_ref)
WHERE lock_ref IS NOT NULL;

-- Step 5: Add unique constraint on lock_ref to prevent duplicate requests
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_lock_ref
ON escrow_locks(lock_ref)
WHERE lock_ref IS NOT NULL AND (status = 'locked' OR state = 'locked');

-- Step 6: Add comments
COMMENT ON COLUMN escrow_locks.lock_ref IS 'Idempotency key for lock creation. Prevents duplicate locks from retry/double-click.';

COMMENT ON INDEX idx_one_active_lock_per_prediction IS 'Ensures only one active lock exists per user+prediction pair';

-- Verification query
-- SELECT 
--   user_id,
--   prediction_id,
--   COUNT(*) as lock_count,
--   array_agg(id ORDER BY created_at) as lock_ids,
--   array_agg(status ORDER BY created_at) as statuses
-- FROM escrow_locks
-- WHERE (status = 'locked' OR state = 'locked') AND expires_at > NOW()
-- GROUP BY user_id, prediction_id
-- HAVING COUNT(*) > 1;
-- -- Should return 0 rows after migration

