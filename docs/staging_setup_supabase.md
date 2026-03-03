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
postgresql://postgres.rzihzwvgpvozekicrdqr:QAZxcvbnm<LP@1984@aws-1-eu-west-1.pooler.supabase.com:6543/postgres
postgresql://postgres:QAZxcvbnm<LP@1984@db.rzihzwvgpvozekicrdqr.supabase.co:5432/postgres

## 3. Apply Migrations (required for categories and app schema)

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

# Or run a single migration file
npm run db:migrate-file -- migrations/315_categories_table.sql
```

The script uses a direct Postgres connection (`pg`), so no Supabase RPC is required. For `pnpm db:migrate:staging` to use staging, have `DATABASE_URL` (or `SUPABASE_DB_URL`) in root `.env.staging` or in `server/.env` when you run it.

## 4. Auth Redirect URLs

In Authentication > URL Configuration:
- Site URL: https://staging.fanclubz.app
- Redirect URLs: Add staging domain, localhost:3000, localhost:5173, localhost:5174

## 5. RLS and Storage

Ensure RLS policies and storage buckets match production as needed.
