# Staging Supabase Setup

## 1. Create Staging Project

1. Go to Supabase Dashboard.
2. New Project: fanclubz-staging.
3. Choose region, strong password.

## 2. Capture Credentials

From Project Settings > API:
- SUPABASE_URL ([SUPABASE_URL](https://rzihzwvgpvozekicrdqr.supabase.co))
- SUPABASE_ANON_KEY (eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6aWh6d3ZncHZvemVraWNyZHFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDAwMjYsImV4cCI6MjA4ODA3NjAyNn0.Bv4MW9PeL5lmGH3jQtU8TlgCB07W4thuSz3UjsABvJQ)
- SUPABASE_SERVICE_ROLE_KEY (service_role key - server only)

From Project Settings > Database: DATABASE_URL (Connection string) if needed.
postgresql://postgres.rzihzwvgpvozekicrdqr:gsaBmp5LPsUlFBJG@aws-1-eu-west-1.pooler.supabase.com:6543/postgres
postgresql://postgres:gsaBmp5LPsUlFBJG@db.rzihzwvgpvozekicrdqr.supabase.co:5432/postgres

## 3. Apply Migrations (required for categories and app schema)

If the staging backend returns **500** on `GET /api/v2/predictions`, the DB may be missing columns the API expects. Run **336_predictions_entry_deadline_users_verified.sql** (adds `entry_deadline` to predictions and `is_verified` to users), or run the full migration suite (see below).

The backend seeds `categories` on startup; the table must exist or you'll see "Could not find the table 'public.categories' in the schema cache".

1. You can run **`315_categories_table.sql`** first: it creates `public.categories` and, if `public.predictions` exists, adds `category_id` to it. It no longer errors if `predictions` is missing.
2. For a full app schema, run all migrations from `server/migrations/` **in numeric order** so `predictions`, `users`, and other tables exist before migrations that reference them.
3. If you see "relation public.predictions does not exist", it means an earlier migration that creates `predictions` has not been run yet; run migrations in order or run 315 alone to get categories only.

**Run migrations via script (recommended)**

From the repo root, with staging DB URL in `server/.env` or in root `.env.staging` (as `DATABASE_URL` or `SUPABASE_DB_URL`):

```bash
# Run all migrations in order against staging DB (loads .env.staging when APP_ENV=staging)
pnpm db:migrate:staging
```

From the `server/` directory:

```bash
# Staging: ensure DATABASE_URL in server/.env or use .env.staging at repo root
APP_ENV=staging npm run db:migrate-all

# Or run a single migration file (e.g. fix 500 on GET /api/v2/predictions)
npm run db:migrate-file -- migrations/336_predictions_entry_deadline_users_verified.sql
```

The script uses a direct Postgres connection (`pg`), so no Supabase RPC is required. For `pnpm db:migrate:staging` to use staging, have `DATABASE_URL` (or `SUPABASE_DB_URL`) in root `.env.staging` or in `server/.env` when you run it.

## 4. Auth Redirect URLs (required for sign-in)

Supabase Auth must know your **exact** staging frontend URL. If these are wrong, you get "Sign-in didn't complete" or "This sign-in link is invalid or has expired."

In **Authentication → URL Configuration** for the **staging** Supabase project:

- **Site URL:** Your staging app URL, e.g.  
  `https://fanclubz-staging.vercel.app`  
  (must match where users land; include `https://`.)
- **Redirect URLs:** Add **full** URLs (protocol + path). Add at least:
  - `https://fanclubz-staging.vercel.app/**`
  - `http://localhost:5173/**`
  - `http://localhost:3000/**`
  - `http://localhost:5174/**`
  - Your Supabase Auth callback, e.g.  
    `https://<STAGING_PROJECT_REF>.supabase.co/auth/v1/callback`

If your Vercel staging domain is different (e.g. `staging.fanclubz.app`), use that domain in both Site URL and Redirect URLs. **Do not** add bare hostnames without `https://` or `http://`; that can break OAuth and magic links.

## 5. Fix "Database error saving new user"

If sign-in (e.g. Google) fails with **"Database error saving new user"**, the `handle_new_user` trigger is inserting into `public.users` but RLS is blocking it. Apply the RLS policies:

**Run migration 335** on the staging database (Supabase SQL Editor or from `server/`):

```bash
cd server
MIGRATION_DATABASE_URL='postgresql://postgres.rzihzwvgpvozekicrdqr:YOUR_PASSWORD@aws-1-eu-west-1.pooler.supabase.com:6543/postgres' \
  npm run db:migrate-file -- migrations/335_public_users_rls_signup.sql
```

Or in Supabase Dashboard → SQL Editor, paste and run the contents of `server/migrations/335_public_users_rls_signup.sql`. It enables RLS and adds policies so the auth trigger can insert and users can read/update.

## 6. "Sign-in link is invalid or expired"

- **Magic link (email):** Links are one-time and expire. Use **Return to Home** and sign in again to get a **new** link sent to your email.
- **Wrong Supabase project:** Ensure the staging app uses the **staging** Supabase URL and anon key (Vercel env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` for the staging project). If the app points at production Supabase, links from staging will be invalid.
- **Redirect URL mismatch:** If Site URL or Redirect URLs in Supabase don’t include `https://fanclubz-staging.vercel.app` (or your real staging URL), fix them as in §4 and try again.

## 7. RLS and Storage

Ensure RLS policies and storage buckets match production as needed.
