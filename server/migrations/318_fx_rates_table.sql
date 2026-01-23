-- Phase 7D: FX rates storage for NGN<->USD display-only estimates
-- Minimal table for last-known-good rate + metadata

CREATE TABLE IF NOT EXISTS public.fx_rates (
  pair TEXT PRIMARY KEY,
  rate NUMERIC NOT NULL,
  source TEXT NOT NULL,
  as_of TIMESTAMPTZ,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fx_rates_retrieved_at ON public.fx_rates (retrieved_at);

COMMENT ON TABLE public.fx_rates IS 'Phase 7D: Last known FX rate (e.g. NGNUSD). Display-only.';
