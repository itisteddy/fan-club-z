-- User blocks: blocker can hide another user's content from their feed
-- Feature: UGC moderation (block user from profile or content overflow)
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_user_id),
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_user_id);

COMMENT ON TABLE public.user_blocks IS 'User-block list: blocker_id has blocked blocked_user_id; blocked user content is hidden for blocker';
