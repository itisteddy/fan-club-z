-- RLS policies on public.users so "Database error saving new user" is fixed.
-- The handle_new_user() trigger inserts into public.users after auth signup; RLS must allow that insert.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow insert when the new row's id matches the authenticated user (Supabase Auth sets auth.uid() during signup)
DROP POLICY IF EXISTS "Users can insert own row on signup" ON public.users;
CREATE POLICY "Users can insert own row on signup"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow authenticated and service_role to read users (own row and others for creator display, leaderboards)
DROP POLICY IF EXISTS "Authenticated can read users" ON public.users;
CREATE POLICY "Authenticated can read users"
  ON public.users FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Allow users to update their own row (profile)
DROP POLICY IF EXISTS "Users can update own row" ON public.users;
CREATE POLICY "Users can update own row"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);
