-- Support notes table for admin annotations on users
CREATE TABLE IF NOT EXISTS public.support_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  author_id UUID NOT NULL REFERENCES public.users(id),
  note TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general', -- 'general', 'issue', 'resolution', 'warning'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_notes_user_id ON public.support_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_support_notes_created_at ON public.support_notes(created_at DESC);

-- Comments
COMMENT ON TABLE public.support_notes IS 'Admin notes attached to user accounts for support investigations';
COMMENT ON COLUMN public.support_notes.category IS 'Note category: general, issue, resolution, warning';

