-- Phase 9: Resolution reasoning + source on settled predictions
-- Adds optional resolution_reason and resolution_source_url for display on prediction detail.

ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS resolution_reason TEXT;

ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS resolution_source_url TEXT;

COMMENT ON COLUMN public.predictions.resolution_reason IS 'Short reasoning or summary for the settlement (e.g. "Final score 2-1").';
COMMENT ON COLUMN public.predictions.resolution_source_url IS 'URL to official source or proof (e.g. results page, news article).';
