-- Seed staging DB with demo predictions and users.
-- Run this once on a fresh staging Supabase DB (SQL Editor or via db:migrate-file).
-- Creates 3 demo auth users, public users, and 6 open predictions.

-- ============================================================
-- 1. Demo auth users (bypasses Supabase Auth API requirement)
-- ============================================================
INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_user_meta_data, raw_app_meta_data, is_anonymous
)
VALUES
  (
    '10000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'demo1@fanclubz.app', '', now(),
    now(), now(),
    '{"username":"alexjordan","full_name":"Alex Jordan"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    false
  ),
  (
    '10000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'demo2@fanclubz.app', '', now(),
    now(), now(),
    '{"username":"samriley","full_name":"Sam Riley"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    false
  ),
  (
    '10000000-0000-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'demo3@fanclubz.app', '', now(),
    now(), now(),
    '{"username":"morganlee","full_name":"Morgan Lee"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    false
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. public.users (the trigger would normally create these,
--    but we insert directly for seeding)
-- ============================================================
INSERT INTO public.users (id, email, username, full_name, created_at, updated_at)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'demo1@fanclubz.app', 'alexjordan',  'Alex Jordan',  now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'demo2@fanclubz.app', 'samriley',    'Sam Riley',    now(), now()),
  ('10000000-0000-0000-0000-000000000003', 'demo3@fanclubz.app', 'morganlee',   'Morgan Lee',   now(), now())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. predictions
-- ============================================================
INSERT INTO public.predictions
  (id, creator_id, title, description, status, entry_deadline, created_at, updated_at)
VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Will Bitcoin hit $150k before end of 2026?',
    'BTC has been consolidating. Will it break out to $150,000 by December 31 2026?',
    'open',
    now() + interval '90 days',
    now(), now()
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'Will the 2026 World Cup host nation reach the semi-finals?',
    'The host nation has home advantage. Will they make it to the semi-finals?',
    'open',
    now() + interval '120 days',
    now(), now()
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000003',
    'Will Taylor Swift announce a new album in 2026?',
    'After the Eras Tour, all eyes are on what''s next. New album announcement in 2026?',
    'open',
    now() + interval '60 days',
    now(), now()
  ),
  (
    '20000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    'Will Apple release a foldable iPhone in 2026?',
    'Rumours have been swirling. Will Apple ship a foldable device this year?',
    'open',
    now() + interval '180 days',
    now(), now()
  ),
  (
    '20000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000002',
    'Will the Lakers win the NBA Championship 2026?',
    'Can LeBron and the Lakers bring another ring to LA this season?',
    'open',
    now() + interval '45 days',
    now(), now()
  ),
  (
    '20000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000003',
    'Will a major AI model pass the AGI threshold in 2026?',
    'Researchers debate what AGI means, but will any model be broadly declared to have reached it this year?',
    'open',
    now() + interval '200 days',
    now(), now()
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. prediction options (Yes / No for each)
-- ============================================================
INSERT INTO public.prediction_options (id, prediction_id, label, sort_order, created_at)
SELECT
  gen_random_uuid(),
  p.id,
  opt.label,
  opt.ord,
  now()
FROM public.predictions p
CROSS JOIN (VALUES ('Yes', 0), ('No', 1)) AS opt(label, ord)
WHERE p.id IN (
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000004',
  '20000000-0000-0000-0000-000000000005',
  '20000000-0000-0000-0000-000000000006'
)
ON CONFLICT DO NOTHING;
