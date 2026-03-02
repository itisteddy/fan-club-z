-- Migration 329: Add account_status and deleted_at columns to users table
-- Implements explicit status states: active, deleted, suspended
-- Replaces implicit is_banned + ban_reason='self_deleted' pattern.

-- Add account_status column with default 'active'
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active'
  CHECK (account_status IN ('active', 'deleted', 'suspended'));

-- Add deleted_at timestamp for soft-delete tracking
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Backfill: users with is_banned=true and ban_reason='self_deleted' -> status='deleted'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_banned'
  ) THEN
    UPDATE public.users
      SET account_status = 'deleted',
          deleted_at = COALESCE(banned_at, NOW())
      WHERE is_banned = true AND LOWER(COALESCE(ban_reason, '')) = 'self_deleted'
        AND account_status = 'active';
    -- Admin-suspended users
    UPDATE public.users
      SET account_status = 'suspended'
      WHERE is_banned = true AND LOWER(COALESCE(ban_reason, '')) != 'self_deleted'
        AND ban_reason IS NOT NULL
        AND account_status = 'active';
  END IF;
END $$;

-- Index for quick lookups by status
CREATE INDEX IF NOT EXISTS idx_users_account_status ON public.users (account_status);
