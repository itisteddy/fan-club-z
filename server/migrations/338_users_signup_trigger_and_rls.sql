-- Migration 338: Ensure handle_new_user trigger and RLS allow signup (fix "Database error saving new user").
-- Run this on staging if sign-in still fails after 335/337.
-- Safe to run multiple times.

-- 1. Recreate trigger function with SET search_path so it runs correctly in Auth context
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, username, full_name, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = COALESCE(EXCLUDED.username, public.users.username),
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. Ensure only permissive INSERT policy (trigger runs with auth.uid() = NULL)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert own row on signup" ON public.users;
DROP POLICY IF EXISTS "Service role can insert users on signup" ON public.users;
DROP POLICY IF EXISTS "Allow any insert into users" ON public.users;
CREATE POLICY "Allow any insert into users"
  ON public.users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can read users" ON public.users;
CREATE POLICY "Authenticated can read users"
  ON public.users FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can update own row" ON public.users;
CREATE POLICY "Users can update own row"
  ON public.users FOR UPDATE USING (auth.uid() = id);

-- 3. Grant INSERT so the role that runs the trigger can insert (Supabase Auth may use different role)
GRANT INSERT ON public.users TO postgres;
GRANT INSERT ON public.users TO service_role;
GRANT INSERT ON public.users TO authenticated;
