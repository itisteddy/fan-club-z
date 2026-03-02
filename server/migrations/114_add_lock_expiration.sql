-- Migration 114: Add Lock Expiration
-- Prevents locks from staying forever and blocking user balance

-- Step 1: Add expires_at column
ALTER TABLE escrow_locks
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Set default expiration for existing locks (10 minutes from now)
-- Only set for locks that are still 'locked' and don't have expiration
UPDATE escrow_locks
SET expires_at = NOW() + INTERVAL '10 minutes'
WHERE expires_at IS NULL 
  AND (status = 'locked' OR state = 'locked');

-- Step 3: Set expiration for old 'consumed' locks (already in the past, for cleanup)
UPDATE escrow_locks
SET expires_at = created_at + INTERVAL '10 minutes'
WHERE expires_at IS NULL 
  AND (status = 'consumed' OR state = 'consumed');

-- Step 4: Add index for efficient expiration queries
CREATE INDEX IF NOT EXISTS idx_escrow_locks_expires 
ON escrow_locks(expires_at) 
WHERE (status = 'locked' OR state = 'locked');

-- Step 5: Add index for user + status + expiration (for balance queries)
CREATE INDEX IF NOT EXISTS idx_escrow_locks_user_status_expires
ON escrow_locks(user_id, status, expires_at)
WHERE (status = 'locked' OR state = 'locked');

-- Step 6: Add 'expired' status to locks that are past expiration
-- This is a one-time cleanup, the cron job will handle future expirations
UPDATE escrow_locks
SET status = 'expired'
WHERE (status = 'locked' OR state = 'locked')
  AND expires_at < NOW();

-- Step 7: Add comment for documentation
COMMENT ON COLUMN escrow_locks.expires_at IS 'Timestamp when lock expires. Locks expire after 10 minutes if not consumed.';

-- Verification query (run after migration)
-- SELECT 
--   status,
--   COUNT(*) as count,
--   COUNT(*) FILTER (WHERE expires_at IS NULL) as without_expiration,
--   COUNT(*) FILTER (WHERE expires_at < NOW()) as expired,
--   COUNT(*) FILTER (WHERE expires_at > NOW()) as active
-- FROM escrow_locks
-- GROUP BY status;

