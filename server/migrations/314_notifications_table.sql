-- Notifications table for in-app notifications
-- Phase 4A: Create table if it doesn't exist
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

-- Add missing columns if table exists but columns are missing (for existing installations)
DO $$
BEGIN
  -- Add read_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'read_at'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN read_at TIMESTAMPTZ NULL;
  END IF;

  -- Add href if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'href'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN href TEXT NULL;
  END IF;

  -- Add external_ref if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'external_ref'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN external_ref TEXT NULL;
  END IF;

  -- Add metadata if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Rename 'message' to 'body' if old column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'message'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'body'
  ) THEN
    ALTER TABLE public.notifications RENAME COLUMN message TO body;
  END IF;

  -- Migrate is_read to read_at if old column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'is_read'
  ) THEN
    UPDATE public.notifications 
    SET read_at = CASE WHEN is_read THEN updated_at ELSE NULL END
    WHERE read_at IS NULL;
    -- Note: We don't drop is_read column to avoid breaking existing code
  END IF;
END $$;

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at 
  ON public.notifications (user_id, created_at DESC);

-- Only create read_at index if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'read_at'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_notifications_user_read_at 
      ON public.notifications (user_id, read_at) 
      WHERE read_at IS NULL;
  END IF;
END $$;

-- Unique index for external_ref deduplication (only where external_ref is not null)
-- Only create if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'external_ref'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_external_ref 
      ON public.notifications (external_ref) 
      WHERE external_ref IS NOT NULL;
  END IF;
END $$;

-- Comments
COMMENT ON TABLE public.notifications IS 'In-app notifications for users (wins, losses, payouts, claims, etc.)';
COMMENT ON COLUMN public.notifications.external_ref IS 'Stable reference for idempotency (e.g., notif:win:predictionId:userId)';
COMMENT ON COLUMN public.notifications.href IS 'Deep link path for navigation (e.g., /predictions/:id)';
COMMENT ON COLUMN public.notifications.metadata IS 'Additional context (predictionId, commentId, etc.)';
