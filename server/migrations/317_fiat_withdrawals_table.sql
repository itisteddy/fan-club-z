-- Migration: Create fiat_withdrawals table for Phase 7C
-- Handles withdrawal requests, admin approval flow, and Paystack transfers

-- Create fiat_withdrawals table
CREATE TABLE IF NOT EXISTS public.fiat_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_kobo INTEGER NOT NULL CHECK (amount_kobo > 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
  status VARCHAR(30) NOT NULL DEFAULT 'requested',
  -- Status values: requested, approved, rejected, processing, paid, failed, cancelled
  bank_code VARCHAR(20) NOT NULL,
  account_number VARCHAR(20) NOT NULL,
  account_name VARCHAR(255),
  reason TEXT, -- Rejection reason
  external_ref VARCHAR(255) UNIQUE, -- Idempotency key
  paystack_recipient_code VARCHAR(255), -- Paystack recipient code
  paystack_transfer_code VARCHAR(255), -- Paystack transfer code
  paystack_reference VARCHAR(255), -- Paystack reference
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add status constraint
DO $$
BEGIN
  ALTER TABLE public.fiat_withdrawals
    ADD CONSTRAINT fiat_withdrawals_status_check
    CHECK (status IN ('requested', 'approved', 'rejected', 'processing', 'paid', 'failed', 'cancelled'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fiat_withdrawals_user_id
  ON public.fiat_withdrawals (user_id);

CREATE INDEX IF NOT EXISTS idx_fiat_withdrawals_status
  ON public.fiat_withdrawals (status);

CREATE INDEX IF NOT EXISTS idx_fiat_withdrawals_created_at
  ON public.fiat_withdrawals (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fiat_withdrawals_external_ref
  ON public.fiat_withdrawals (external_ref);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_fiat_withdrawals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'fiat_withdrawals_updated_at'
  ) THEN
    CREATE TRIGGER fiat_withdrawals_updated_at
      BEFORE UPDATE ON public.fiat_withdrawals
      FOR EACH ROW
      EXECUTE FUNCTION update_fiat_withdrawals_updated_at();
  END IF;
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.fiat_withdrawals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.fiat_withdrawals TO service_role;

-- Add comment
COMMENT ON TABLE public.fiat_withdrawals IS 'Fiat (NGN) withdrawal requests via Paystack - Phase 7C';
