-- Migration 337: add missing columns to prediction_entries + fix users RLS insert policy.
-- Safe to run multiple times (ADD COLUMN IF NOT EXISTS, DROP/CREATE POLICY).

-- prediction_entries: add status, potential_payout, actual_payout if not present
ALTER TABLE public.prediction_entries ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.prediction_entries ADD COLUMN IF NOT EXISTS potential_payout numeric;
ALTER TABLE public.prediction_entries ADD COLUMN IF NOT EXISTS actual_payout numeric;

-- public.users INSERT: allow any role so the handle_new_user trigger always succeeds.
-- auth.uid() can be NULL during the Auth trigger execution context, so a broad INSERT
-- policy is required. SELECT/UPDATE remain restricted.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert own row on signup" ON public.users;
DROP POLICY IF EXISTS "Service role can insert users on signup" ON public.users;
DROP POLICY IF EXISTS "Allow any insert into users" ON public.users;
CREATE POLICY "Allow any insert into users"
  ON public.users FOR INSERT
  WITH CHECK (true);
