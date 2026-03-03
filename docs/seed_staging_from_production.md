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

**Option A – from repo root** (loads `.env` for `PRODUCTION_DATABASE_URL` or `DATABASE_URL`):

```bash
# Set staging URL if not in .env; production can come from .env
STAGING_DATABASE_URL='postgresql://...staging...' ./scripts/run-seed-staging.sh
```

**Option B – from server/** (pass both URLs):

```bash
cd server
PRODUCTION_DATABASE_URL='postgresql://...prod...' \
STAGING_DATABASE_URL='postgresql://...staging...' \
npm run db:seed-staging-from-production
```

Get the production URL from Supabase → **Project Settings → Database → Connection string** (production project). Use the staging project’s connection string for `STAGING_DATABASE_URL`. Prefer the **pooler** (port 6543) if the direct URL (port 5432) gives `ENOTFOUND` or connection errors from your network.

Optional: limit how many predictions (and their options) are copied:

```bash
SEED_LIMIT_PREDICTIONS=50 \
PRODUCTION_DATABASE_URL='...' \
STAGING_DATABASE_URL='...' \
npm run db:seed-staging-from-production
```

## Troubleshooting: password authentication failed

If you see `password authentication failed for user 'postgres'`:

1. **Which URL failed?** The script now reports either "Production connection failed" or "Staging connection failed" so you know which URL to fix.
2. **Copy the connection string again** from Supabase → Project Settings → Database → Connection string (use **URI**). Ensure you use the **database password** (not the anon key).
3. **Special characters in password** – If the password contains `@`, `#`, `/`, `?`, `%`, or other reserved characters, **URL-encode** them in the URI (e.g. `@` → `%40`, `#` → `%23`). Or put the URL in single quotes so the shell doesn’t interpret characters.
4. **Pooler vs direct** – For the **pooler** (port 6543), the username is usually `postgres.PROJECT_REF` (e.g. `postgres.abc123xyz`). For the **direct** connection (port 5432), use `postgres`. Get both from the Supabase connection string dropdown.
5. **Password typo** – Easy to mix `1` (one) and `l` (letter); double-check.

6. **Direct URL `ENOTFOUND`** – If the direct host (`db.<ref>.supabase.co`) fails to resolve, use the **pooler** connection string (port 6543, host `aws-…pooler.supabase.com`) for that environment.

**Same-DB test:** To run the script against a single database (e.g. staging → staging) for a dry run, set `SEED_ALLOW_SAME_DB=1` and use the same URL for both `PRODUCTION_DATABASE_URL` and `STAGING_DATABASE_URL`.

## Safety

- Use a **read-only** or restricted production user for `PRODUCTION_DATABASE_URL` if possible.
- The script only **reads** from production and **writes** to staging; it does not change production.
- Inserts use `ON CONFLICT (id) DO UPDATE`, so re-running updates existing rows instead of duplicating.

## After seeding

Staging will show the same categories and predictions (and creator names from `public.users`). New signups on staging still create new auth and `public.users` rows; the copied data is independent of who can log in.
