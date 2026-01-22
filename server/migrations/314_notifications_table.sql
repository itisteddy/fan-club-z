-- Notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'win', 'loss', 'payout', 'claim', 'dispute', 'comment', 'reminder', 'demo_credit', 'refund'
  title TEXT NOT NULL,
  body TEXT NULL,
  href TEXT NULL, -- deep link path like '/predictions/:id' or '/wallet'
  metadata JSONB DEFAULT '{}'::jsonb,
  external_ref TEXT NULL, -- for dedupe/idempotency
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at 
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_at 
  ON public.notifications (user_id, read_at) 
  WHERE read_at IS NULL;

-- Unique index for external_ref deduplication (only where external_ref is not null)
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_external_ref 
  ON public.notifications (external_ref) 
  WHERE external_ref IS NOT NULL;

-- Comments
COMMENT ON TABLE public.notifications IS 'In-app notifications for users (wins, losses, payouts, claims, etc.)';
COMMENT ON COLUMN public.notifications.external_ref IS 'Stable reference for idempotency (e.g., notif:win:predictionId:userId)';
COMMENT ON COLUMN public.notifications.href IS 'Deep link path for navigation (e.g., /predictions/:id)';
COMMENT ON COLUMN public.notifications.metadata IS 'Additional context (predictionId, commentId, etc.)';
