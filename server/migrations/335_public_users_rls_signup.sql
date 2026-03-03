-- RLS policies on public.users so "Database error saving new user" is fixed.
-- The handle_new_user() trigger runs after auth signup in a context where auth.uid() is often
-- NULL (no JWT in trigger). So we must allow insert without requiring auth.uid() = id.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Single permissive INSERT policy: any role with INSERT can insert (trigger runs as function owner).
-- Do NOT use auth.uid() = id here — it fails in trigger context.
DROP POLICY IF EXISTS "Users can insert own row on signup" ON public.users;
DROP POLICY IF EXISTS "Service role can insert users on signup" ON public.users;
DROP POLICY IF EXISTS "Allow any insert into users" ON public.users;
CREATE POLICY "Allow any insert into users"
  ON public.users FOR INSERT
  WITH CHECK (true);

-- Allow authenticated and service_role to read users
DROP POLICY IF EXISTS "Authenticated can read users" ON public.users;
CREATE POLICY "Authenticated can read users"
  ON public.users FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Allow users to update their own row (profile)
DROP POLICY IF EXISTS "Users can update own row" ON public.users;
CREATE POLICY "Users can update own row"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);
