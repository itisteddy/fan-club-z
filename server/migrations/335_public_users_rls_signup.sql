-- RLS policies on public.users so "Database error saving new user" is fixed.
-- The handle_new_user() trigger runs after auth signup; the Auth backend often runs in a context
-- where auth.uid() is not yet set, so we must allow service_role to insert as well.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow insert: (1) when the new row's id matches auth.uid() (client signup), or (2) as service_role (trigger from Auth backend)
DROP POLICY IF EXISTS "Users can insert own row on signup" ON public.users;
CREATE POLICY "Users can insert own row on signup"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Service role can insert users on signup" ON public.users;
CREATE POLICY "Service role can insert users on signup"
  ON public.users FOR INSERT
  TO service_role
  WITH CHECK (true);

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
