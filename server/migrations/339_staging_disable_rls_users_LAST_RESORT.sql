-- Migration 339: STAGING / LAST RESORT ONLY.
-- Run this ONLY if sign-in still fails after 338 and you confirmed the error is "Database error saving new user".
-- This disables RLS on public.users so the handle_new_user trigger can always insert.
-- Do NOT use in production if you rely on RLS for public.users.

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
