-- Migration 320: Fix escrow_locks for fiat staking (Phase 7B)
-- Problem: Fiat staking fails with 500 because columns are missing
-- This combines changes from migrations 114, 115, 116 that may not have been run

-- ============================================
-- Step 1: Add expires_at column (from 114)
-- ============================================
ALTER TABLE public.escrow_locks
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- ============================================
-- Step 2: Add lock_ref column (from 116)
-- ============================================
ALTER TABLE public.escrow_locks
  ADD COLUMN IF NOT EXISTS lock_ref TEXT;

-- ============================================
-- Step 3: Add option_id column (from 116)
-- ============================================
ALTER TABLE public.escrow_locks
  ADD COLUMN IF NOT EXISTS option_id UUID;

-- ============================================
-- Step 4: Fix state CHECK constraint (from 116)
-- ============================================
ALTER TABLE public.escrow_locks 
  DROP CONSTRAINT IF EXISTS escrow_locks_state_check;

ALTER TABLE public.escrow_locks
  ADD CONSTRAINT escrow_locks_state_check 
  CHECK (state IN ('locked', 'released', 'voided', 'consumed', 'expired'));

-- ============================================
-- Step 5: Ensure status column exists with correct constraint
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'escrow_locks' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.escrow_locks ADD COLUMN status TEXT;
  END IF;
END $$;

ALTER TABLE public.escrow_locks 
  DROP CONSTRAINT IF EXISTS escrow_locks_status_check;

ALTER TABLE public.escrow_locks
  ADD CONSTRAINT escrow_locks_status_check 
  CHECK (status IS NULL OR status IN ('locked', 'released', 'voided', 'consumed', 'expired'));

-- ============================================
-- Step 6: Add currency and meta columns if missing
-- ============================================
ALTER TABLE public.escrow_locks
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;

-- ============================================
-- Step 7: Create helpful indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_escrow_locks_expires 
  ON public.escrow_locks(expires_at) 
  WHERE (status = 'locked' OR state = 'locked');

CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_locks_lock_ref 
  ON public.escrow_locks(lock_ref) 
  WHERE lock_ref IS NOT NULL;

-- ============================================
-- Verification
-- ============================================
SELECT 
  'escrow_locks schema ready for fiat staking' as status,
  COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'escrow_locks'
  AND column_name IN ('expires_at', 'lock_ref', 'option_id', 'currency', 'meta', 'status');
