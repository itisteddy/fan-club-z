# Staging Supabase Setup

## 1. Create Staging Project

1. Go to Supabase Dashboard.
2. New Project: fanclubz-staging.
3. Choose region, strong password.

## 2. Capture Credentials

From Project Settings > API:
- SUPABASE_URL (Project URL)
- SUPABASE_ANON_KEY (anon key)
- SUPABASE_SERVICE_ROLE_KEY (service_role key - server only)

From Project Settings > Database: DATABASE_URL (Connection string) if needed.

## 3. Apply Migrations

Run migrations from server/migrations/ in order via SQL Editor or migration script.

## 4. Auth Redirect URLs

In Authentication > URL Configuration:
- Site URL: https://staging.fanclubz.app
- Redirect URLs: Add staging domain, localhost:3000, localhost:5173, localhost:5174

## 5. RLS and Storage

Ensure RLS policies and storage buckets match production as needed.
