-- Migration 116: Fix escrow_locks schema inconsistencies
-- Problem: 'state' column CHECK constraint doesn't allow 'consumed'
-- Solution: Update constraint to match actual usage

-- Step 1: Drop the old CHECK constraint on 'state'
ALTER TABLE public.escrow_locks 
  DROP CONSTRAINT IF EXISTS escrow_locks_state_check;

-- Step 2: Add new CHECK constraint that includes 'consumed'
ALTER TABLE public.escrow_locks
  ADD CONSTRAINT escrow_locks_state_check 
  CHECK (state IN ('locked', 'released', 'voided', 'consumed', 'expired'));

-- Step 3: Ensure 'status' column exists with correct constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'escrow_locks' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.escrow_locks 
      ADD COLUMN status text;
  END IF;
END $$;

-- Step 4: Drop old status constraint if it exists
ALTER TABLE public.escrow_locks 
  DROP CONSTRAINT IF EXISTS escrow_locks_status_check;

-- Step 5: Add matching constraint for 'status'
ALTER TABLE public.escrow_locks
  ADD CONSTRAINT escrow_locks_status_check 
  CHECK (status IS NULL OR status IN ('locked', 'released', 'voided', 'consumed', 'expired'));

-- Step 6: Sync status from state for existing rows
UPDATE public.escrow_locks 
SET status = state 
WHERE status IS NULL OR status != state;

-- Step 7: Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_escrow_locks_state 
  ON public.escrow_locks(state) 
  WHERE state IN ('locked', 'consumed');

CREATE INDEX IF NOT EXISTS idx_escrow_locks_user_state 
  ON public.escrow_locks(user_id, state, created_at DESC);

-- Step 8: Add lock_ref column if missing (for idempotency)
ALTER TABLE public.escrow_locks
  ADD COLUMN IF NOT EXISTS lock_ref text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_locks_lock_ref 
  ON public.escrow_locks(lock_ref) 
  WHERE lock_ref IS NOT NULL;

-- Step 9: Add option_id column if missing (for better tracking)
ALTER TABLE public.escrow_locks
  ADD COLUMN IF NOT EXISTS option_id uuid;

-- Verification query
SELECT 
  'escrow_locks schema updated' as status,
  COUNT(*) as total_locks,
  COUNT(*) FILTER (WHERE state = 'locked') as locked_count,
  COUNT(*) FILTER (WHERE state = 'consumed') as consumed_count,
  COUNT(*) FILTER (WHERE state = 'released') as released_count,
  COUNT(*) FILTER (WHERE state = 'expired') as expired_count
FROM public.escrow_locks;

