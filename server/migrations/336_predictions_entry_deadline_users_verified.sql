-- Add columns required by GET /api/v2/predictions when they are missing (e.g. staging after 100_base_schema only)
-- Safe to run: ADD COLUMN IF NOT EXISTS.

ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS entry_deadline timestamptz NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

COMMENT ON COLUMN public.predictions.entry_deadline IS 'After this time no new entries; used by list filter and auto-close';
COMMENT ON COLUMN public.users.is_verified IS 'Whether this user is a verified creator';
