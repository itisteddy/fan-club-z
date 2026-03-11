# Staging Supabase Setup

Create a staging Supabase project and apply migrations.

## 1. Create Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. New project → choose org, name (e.g. `fanclubz-staging`), region, password
3. Wait for project to be ready

## 2. Apply Migrations

From repo root:

```bash
# Set staging DATABASE_URL (from Supabase dashboard: Settings → Database)
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# Run all migrations
pnpm run db:migrate-all
# or
cd server && pnpm run db:migrate
```

## 3. Auth Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://fanclubz-staging.vercel.app`
- **Redirect URLs**: Add
  - `https://fanclubz-staging.vercel.app/**`
  - `https://fanclubz-staging.vercel.app`
  - `capacitor://localhost` (for native builds)

## 4. Realtime Publication (if using Supabase Realtime)

Add required tables to `supabase_realtime` publication:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.predictions;
```

## 5. Copy Env to Render/Vercel

Use the staging project's:

- **Project URL** → `VITE_SUPABASE_URL` (frontend) and backend config
- **anon/public key** → `VITE_SUPABASE_ANON_KEY` (frontend)
- **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (backend only, never expose)
