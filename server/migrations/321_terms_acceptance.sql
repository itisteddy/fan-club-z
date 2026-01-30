-- Phase 5: UGC baseline — Terms/Privacy/Community Guidelines acceptance
-- Store acceptance record: user_id, version, timestamp (no new tracking per prompt)
CREATE TABLE IF NOT EXISTS public.terms_acceptance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  terms_version TEXT NOT NULL DEFAULT '1.0',
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, terms_version)
);

-- Allow user_id to be auth user id (may not exist in public.users yet)
-- Index for fast lookup: has user accepted current version?
CREATE INDEX IF NOT EXISTS idx_terms_acceptance_user_version
  ON public.terms_acceptance(user_id, terms_version);

COMMENT ON TABLE public.terms_acceptance IS 'Phase 5: Record of user acceptance of Terms, Privacy, Community Guidelines';
