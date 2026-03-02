-- Add moderation columns to users table (this codebase uses public.users, not public.profiles)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ban_reason TEXT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS banned_by UUID NULL REFERENCES public.users(id);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verified_by UUID NULL REFERENCES public.users(id);

-- Create content_reports table if not exists
CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.users(id),
  target_type TEXT NOT NULL, -- 'prediction', 'comment', 'user'
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
  resolution_action TEXT NULL, -- 'dismiss', 'warn', 'remove', 'ban'
  resolution_notes TEXT NULL,
  resolved_at TIMESTAMPTZ NULL,
  resolved_by UUID NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for pending reports
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON public.content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_target ON public.content_reports(target_type, target_id);

-- Comments for documentation
COMMENT ON COLUMN public.users.is_admin IS 'Whether this user has admin privileges';
COMMENT ON COLUMN public.users.is_banned IS 'Whether this user is banned from the platform';
COMMENT ON COLUMN public.users.is_verified IS 'Whether this user is a verified creator';

