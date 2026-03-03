-- Comments: ensure 'content' column exists (API uses it; base schema has 'body').
-- Safe to run multiple times.

ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS content TEXT NULL;

UPDATE public.comments SET content = body WHERE content IS NULL AND body IS NOT NULL;

COMMENT ON COLUMN public.comments.content IS 'Comment text (API field); synced from body if present.';
