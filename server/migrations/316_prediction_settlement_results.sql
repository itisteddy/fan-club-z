-- Migration: Create prediction_settlement_results table for canonical per-user settlement outputs
-- Phase 6A: Canonical payout/settlement outputs

-- Create prediction_settlement_results table
CREATE TABLE IF NOT EXISTS public.prediction_settlement_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES public.predictions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'demo-wallet' | 'crypto-base-usdc' | etc.
  stake_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
  returned_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
  net NUMERIC(15, 2) NOT NULL DEFAULT 0, -- returned_total - stake_total
  status VARCHAR(20) NOT NULL, -- 'win' | 'loss' | 'refund' | 'pending'
  claim_status VARCHAR(30), -- 'not_applicable' | 'available' | 'claimed' | 'not_available'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(prediction_id, user_id, provider)
);

-- Create indexes for lookups
CREATE INDEX IF NOT EXISTS idx_settlement_results_prediction_user
  ON public.prediction_settlement_results (prediction_id, user_id);

CREATE INDEX IF NOT EXISTS idx_settlement_results_user
  ON public.prediction_settlement_results (user_id);

CREATE INDEX IF NOT EXISTS idx_settlement_results_prediction
  ON public.prediction_settlement_results (prediction_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_settlement_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers don't support IF NOT EXISTS, so guard with a catalog check.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'settlement_results_updated_at'
  ) THEN
    CREATE TRIGGER settlement_results_updated_at
      BEFORE UPDATE ON public.prediction_settlement_results
      FOR EACH ROW
      EXECUTE FUNCTION update_settlement_results_updated_at();
  END IF;
END $$;
