-- Combined Migration: 109 + 110
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/ihtnsyhknvltgrksffun/sql

-- ========================================
-- STEP 1: Ensure escrow_locks table exists (from migration 105)
-- ========================================

-- Create escrow_locks table for managing prediction fund locks
CREATE TABLE IF NOT EXISTS public.escrow_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id),
  prediction_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  state text NOT NULL CHECK (state IN ('locked','released','voided')),
  created_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz
);

-- Prevent duplicate active lock by same user for same prediction
CREATE UNIQUE INDEX IF NOT EXISTS uq_lock_user_pred_active
ON public.escrow_locks (user_id, prediction_id)
WHERE state = 'locked';

-- ========================================
-- STEP 2: Migration 109 - Crypto Escrow Support
-- ========================================

-- P2.5: Add crypto escrow support to prediction_entries
-- This links entries to escrow locks and tracks the payment provider

-- Add escrow_lock_id and provider columns to prediction_entries
-- Note: We can't use REFERENCES in ADD COLUMN IF NOT EXISTS, so we'll add it without the constraint first
ALTER TABLE public.prediction_entries
  ADD COLUMN IF NOT EXISTS escrow_lock_id uuid,
  ADD COLUMN IF NOT EXISTS provider text;

-- Add foreign key constraint separately (only if column was just created or constraint doesn't exist)
DO $$
BEGIN
  -- Check if foreign key already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'prediction_entries_escrow_lock_id_fkey'
  ) THEN
    -- Add foreign key constraint
    ALTER TABLE public.prediction_entries
      ADD CONSTRAINT prediction_entries_escrow_lock_id_fkey 
      FOREIGN KEY (escrow_lock_id) REFERENCES public.escrow_locks(id);
  END IF;
END $$;

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

-- ========================================
-- Migration 110: Cleanup Demo Data
-- ========================================

-- Cleanup: Remove demo data and reset wallet balances
-- This migration removes demo transactions and resets wallet snapshots to zero
-- After this, balances will be computed only from crypto transactions

-- Delete all demo provider transactions
DELETE FROM wallet_transactions 
WHERE provider = 'demo';

-- Reset wallet balances to zero (they will be recalculated from transactions)
-- Only reset if you want a clean slate; otherwise balances persist
-- Uncomment the following if you want to reset:
-- UPDATE wallets 
-- SET available_balance = 0, 
--     reserved_balance = 0,
--     updated_at = now()
-- WHERE currency = 'USD';

-- Optional: If you have a legacy wallet summary view that aggregates transactions,
-- ensure it filters by provider:
-- CREATE OR REPLACE VIEW wallet_summary AS
-- SELECT 
--   user_id,
--   currency,
--   COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END), 0) -
--   COALESCE(SUM(CASE WHEN direction = 'debit'  THEN amount ELSE 0 END), 0) AS available_balance
-- FROM wallet_transactions
-- WHERE provider IN ('crypto-base-usdc')  -- Only crypto, no demo
-- GROUP BY user_id, currency;
