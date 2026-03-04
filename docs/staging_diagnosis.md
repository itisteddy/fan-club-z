# Staging diagnosis (500s and failures)

Use **GET /health/deep** and the **staging smoke test** to see exactly why staging is failing.

---

## How to run

```bash
# From repo root
pnpm run staging-smoke-test
# Or manually:
curl -s https://fanclubz-backend-staging.onrender.com/health/deep | jq .
```

---

## Most likely causes of staging 500s (from /health/deep)

1. **`db.ok: false` or `db.error` set**  
   Backend cannot reach Supabase (wrong **VITE_SUPABASE_URL** or **SUPABASE_SERVICE_ROLE_KEY** on Render, or network/DNS). Fix: set staging env vars on Render to the **staging** Supabase project; see **`docs/staging_env_checklist.md`**.

2. **Failed check `table:users` (or `table:wallets`, `table:predictions`, etc.)**  
   Required table is missing → migrations not applied to staging DB. Fix: run migrations against staging (e.g. `pnpm run db:migrate:staging` with `DATABASE_URL` or `MIGRATION_DATABASE_URL` pointing at staging). See **`docs/staging_setup_supabase.md`**.

2b. **500 on GET /api/demo-wallet/summary (“Failed to load demo wallet summary”)**  
   The `wallets` table is usually missing **demo_credits_balance**, **creator_earnings_balance**, or **stake_balance**. Fix: run **`server/migrations/342_wallets_demo_creator_stake_columns.sql`** on the staging DB (or run full `pnpm run db:migrate:staging`). The backend also falls back to `available_balance`/`reserved_balance` when those columns are missing.

3. **Failed check `wallet:summaryQuery`**  
   `wallets` table exists but is missing columns (e.g. `available_balance`, `demo_credits_balance`). Fix: run full migration suite so schema matches production; apply any missing migrations from `server/migrations/`.

4. **Failed check `table:user_awards_current`** (optional table)  
   Profile/achievements 500. Fix: run migration **340_achievements_badges_awards.sql** (and 341 for comments if needed). See **`docs/staging_setup_supabase.md`** § “user_awards_current”.

5. **GET /health returns `env: "production"` on staging**  
   Backend is running with wrong **APP_ENV** or wrong deployment. Fix: set **APP_ENV=staging** on the Render **staging** service and redeploy from the **staging** branch.

6. **Socket connect fails**  
   CORS or wrong origin. Fix: add staging frontend URL to **CORS_ALLOWLIST** on Render staging; ensure Socket.IO uses the same list (backend uses **getCorsOrigins()** from **CORS_ALLOWLIST**).

---

## Request ID for support

Every error response includes **X-Request-Id** (and `requestId` in JSON body). Use it to correlate with server logs when debugging.
