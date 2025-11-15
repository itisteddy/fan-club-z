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
