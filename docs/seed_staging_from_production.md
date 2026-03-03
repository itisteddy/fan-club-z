# Seed Staging from Production

You can copy data from your **production** database into **staging** so staging has realistic data (predictions, categories, users) for testing.

## Requirements

- **PRODUCTION_DATABASE_URL** – Production Postgres URL (read-only recommended).
- **STAGING_DATABASE_URL** – Staging Postgres URL (data will be inserted/upserted).

Get these from each project’s Supabase **Project Settings → Database → Connection string**.

## What gets copied

1. **categories** – All rows.
2. **public.users** – All rows (so creator names/avatars match on predictions).
3. **predictions** – All rows (or limited with `SEED_LIMIT_PREDICTIONS`).
4. **prediction_options** – All rows, or only those for the limited predictions.

Auth is **not** copied: `auth.users` stays as-is on staging. So production users cannot log in on staging; only users who sign up on staging can sign in. The copied `public.users` rows are for display (e.g. “creator” on predictions).

## Run the script

From the **server/** directory:

```bash
PRODUCTION_DATABASE_URL='postgresql://...prod...' \
STAGING_DATABASE_URL='postgresql://...staging...' \
npm run db:seed-staging-from-production
```

Optional: limit how many predictions (and their options) are copied:

```bash
SEED_LIMIT_PREDICTIONS=50 \
PRODUCTION_DATABASE_URL='...' \
STAGING_DATABASE_URL='...' \
npm run db:seed-staging-from-production
```

## Safety

- Use a **read-only** or restricted production user for `PRODUCTION_DATABASE_URL` if possible.
- The script only **reads** from production and **writes** to staging; it does not change production.
- Inserts use `ON CONFLICT (id) DO UPDATE`, so re-running updates existing rows instead of duplicating.

## After seeding

Staging will show the same categories and predictions (and creator names from `public.users`). New signups on staging still create new auth and `public.users` rows; the copied data is independent of who can log in.
