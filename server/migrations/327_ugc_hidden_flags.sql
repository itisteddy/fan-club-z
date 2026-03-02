-- UGC hidden flags for moderation actions
ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS hidden_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS hidden_by UUID NULL REFERENCES public.users(id);

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS hidden_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS hidden_by UUID NULL REFERENCES public.users(id);

CREATE INDEX IF NOT EXISTS idx_predictions_hidden_at ON public.predictions(hidden_at);
CREATE INDEX IF NOT EXISTS idx_comments_hidden_at ON public.comments(hidden_at);
