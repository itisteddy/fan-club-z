-- P2.5: Add crypto escrow support to prediction_entries
-- This links entries to escrow locks and tracks the payment provider

-- Add escrow_lock_id and provider columns to prediction_entries
ALTER TABLE public.prediction_entries
  ADD COLUMN IF NOT EXISTS escrow_lock_id uuid REFERENCES public.escrow_locks(id),
  ADD COLUMN IF NOT EXISTS provider text;

-- Create index for efficient lock lookups
CREATE INDEX IF NOT EXISTS idx_prediction_entries_lock 
  ON public.prediction_entries(escrow_lock_id);

-- Add unique constraint: exactly one consumption of a lock
-- This prevents duplicate bets consuming the same lock
CREATE UNIQUE INDEX IF NOT EXISTS uniq_lock_consumption
  ON public.prediction_entries(escrow_lock_id)
  WHERE escrow_lock_id IS NOT NULL;

-- Update escrow_locks table if needed (ensure status enum matches)
-- Note: Migration 105 uses 'state' but we need 'status' for consistency
-- Check if column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'escrow_locks' 
    AND column_name = 'status'
  ) THEN
    -- Add status column if it doesn't exist
    ALTER TABLE public.escrow_locks 
      ADD COLUMN status text CHECK (status IN ('locked','released','consumed'));
    
    -- Migrate state -> status
    UPDATE public.escrow_locks SET status = state WHERE status IS NULL;
    
    -- Make status NOT NULL after migration
    ALTER TABLE public.escrow_locks 
      ALTER COLUMN status SET NOT NULL;
  END IF;
END $$;

-- Add tx_ref column if missing (for linking to on-chain transactions)
ALTER TABLE public.escrow_locks
  ADD COLUMN IF NOT EXISTS tx_ref text,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

