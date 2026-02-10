-- Migration 334: Apple App Store Review compliance fixes
-- Run this in Supabase SQL editor BEFORE resubmitting to App Store
-- Ensures all columns needed by delete-account, UGC moderation, and content reports exist.
-- Safe to run multiple times (all operations are IF NOT EXISTS / idempotent).

-- ============================================================
-- 1) account_status + deleted_at on users (from migration 329)
-- ============================================================
DO $$
BEGIN
  -- Add account_status if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'account_status'
  ) THEN
    ALTER TABLE public.users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active';
    ALTER TABLE public.users ADD CONSTRAINT users_account_status_check
      CHECK (account_status IN ('active', 'deleted', 'suspended'));
  END IF;

  -- Add deleted_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;

  -- Add is_banned if missing (legacy column still used by fallback layers)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_banned'
  ) THEN
    ALTER TABLE public.users ADD COLUMN is_banned BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Add ban_reason if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'ban_reason'
  ) THEN
    ALTER TABLE public.users ADD COLUMN ban_reason TEXT NULL;
  END IF;

  -- Add banned_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'banned_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN banned_at TIMESTAMPTZ NULL;
  END IF;

  -- Add banned_by if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'banned_by'
  ) THEN
    ALTER TABLE public.users ADD COLUMN banned_by UUID NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_account_status ON public.users (account_status);

-- ============================================================
-- 2) user_blocks table (from migration 322)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_blocks_unique UNIQUE (blocker_id, blocked_user_id),
  CONSTRAINT user_blocks_no_self CHECK (blocker_id != blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks (blocker_id);

-- ============================================================
-- 3) content_reports table (from migration 328)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('prediction', 'comment', 'user')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  reason_category TEXT NULL,
  details TEXT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'actioned', 'dismissed')),
  reviewed_by UUID NULL,
  reviewed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT content_reports_unique UNIQUE (reporter_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status ON public.content_reports (status);

-- ============================================================
-- 4) content_hides table (from migration 327)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.content_hides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT content_hides_unique UNIQUE (user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_content_hides_user ON public.content_hides (user_id);

-- ============================================================
-- 5) terms_acceptance table (from migration 321)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.terms_acceptance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT terms_acceptance_unique UNIQUE (user_id, terms_version)
);

-- ============================================================
-- VERIFICATION: Run this SELECT to confirm all columns exist
-- ============================================================
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'users'
-- AND column_name IN ('account_status', 'deleted_at', 'is_banned', 'ban_reason', 'banned_at', 'banned_by');
