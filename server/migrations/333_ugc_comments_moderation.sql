-- UGC comment + moderation support (Phase 0-4 + Apple 1.2)

-- Comments: edits + soft delete + idempotency
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deleted_by UUID NULL REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS deleted_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_request_id UUID NULL,
  ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_comments_deleted_at ON public.comments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_comments_deleted_by ON public.comments(deleted_by);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_comment_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_comments_client_request
  ON public.comments(user_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

-- Comment likes
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON public.comment_likes(user_id);

-- Comment mentions
CREATE TABLE IF NOT EXISTS public.comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(comment_id, mentioned_user_id)
);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_comment_id ON public.comment_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_mentioned_user_id ON public.comment_mentions(mentioned_user_id);

-- Content hides (viewer-specific)
CREATE TABLE IF NOT EXISTS public.content_hides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);
CREATE INDEX IF NOT EXISTS idx_content_hides_user ON public.content_hides(user_id);
CREATE INDEX IF NOT EXISTS idx_content_hides_target ON public.content_hides(target_type, target_id);

-- Moderation actions (admin audit trail)
CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  actor_user_id UUID NOT NULL REFERENCES public.users(id),
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_target ON public.moderation_actions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_actor ON public.moderation_actions(actor_user_id);

-- Content reports: normalize status + details + uniqueness
ALTER TABLE public.content_reports
  ADD COLUMN IF NOT EXISTS details TEXT NULL;

ALTER TABLE public.content_reports
  ALTER COLUMN status SET DEFAULT 'open';

UPDATE public.content_reports SET status = 'open' WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS idx_content_reports_unique
  ON public.content_reports(reporter_id, target_type, target_id);

-- Prediction removal fields (admin actions)
ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS removed_by UUID NULL REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS remove_reason TEXT NULL;
