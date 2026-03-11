# Staging Troubleshooting

When staging shows errors that production doesn't, use this checklist. Most issues are **environment configuration**, not code.

---

## Quick fix: "Profile not found" + "User not found" + "Failed to faucet demo credits"

If you see all three, your user is not in staging's `public.users`. Run:

```bash
pnpm run db:add-user-to-staging <your-user-id>
```

Get your user ID from the 404 URL (e.g. `.../users/bc1866ca-71c5-4029-886d-4eace081f5c4/public-profile`) or DevTools.

Then fix **"Source not authorized"** in Supabase Dashboard → Authentication → URL Configuration → add `https://fanclubz-staging.vercel.app` and `https://fanclubz-staging.vercel.app/**` to Redirect URLs.

---

## 0. Database port (prod → staging)

To sync data from prod to staging:

```bash
pnpm run db:port-prod-to-staging
```

Requires connection strings in the script. Copies auth.users, public.users, predictions, prediction_options, wallets, escrow_locks, prediction_entries, etc. Some tables may fail due to schema drift or FK constraints—core data (users, predictions, stakes) is copied.

---

## 1. Render DATABASE_URL – use pooler (fixes ENETUNREACH)

Render cannot reach Supabase's direct DB (port 5432, IPv6-only). Use the **connection pooler** (port 6543):

- Supabase Dashboard → Project Settings → Database → Connection string → **URI** + **Transaction** mode
- Copy the pooler URL (e.g. `postgresql://postgres.[ref]:[pwd]@aws-0-[region].pooler.supabase.com:6543/postgres`)
- Render → fanclubz-backend-staging → Environment → set `DATABASE_URL` to that URL
- Redeploy

---

## 2. "POST /api/v2/settlement/manual/merkle 404 (Not Found)"

**Cause:** Render staging backend is running old code or the deploy failed.

**Fix:**
1. Render Dashboard → fanclubz-backend-staging → **Logs** → check for build errors.
2. **Manual Deploy** → Deploy latest commit from `staging` (or your deploy branch).
3. Wait for deploy to finish, then run: `pnpm run parity-check`
4. If parity check still fails, verify the settlement route exists: `curl -X POST https://fanclubz-backend-staging.onrender.com/api/v2/settlement/manual/merkle -H "Content-Type: application/json" -d '{}'` — expect 400/401/403, **not** 404.

---

## 3. "WebSocket connection failed" / "WebSocket is closed before the connection is established"

**Causes:**
- **Render cold start:** Free tier spins down after 15 min; first connect can fail while the service wakes up.
- **WebSocket-first transport:** Client tried WebSocket before HTTP; on cold start, WebSocket upgrade often fails.
- **CORS:** Staging origin must be in allowlist (defaults include `https://fanclubz-staging.vercel.app`).

**Fix (code):**
- Client uses `transports: ['polling', 'websocket']` (polling first) so HTTP wakes Render, then upgrades.
- Server has `connectTimeout: 45000` for cold start.
- Redeploy both frontend (Vercel) and backend (Render) after these changes.

**Fix (config):**
1. Render → Environment → `CORS_ALLOWLIST` should include `https://fanclubz-staging.vercel.app` (or leave unset to use defaults).
2. Check Render logs for `[RT-CORS]` – if you see `❌ Blocked origin`, add that URL.
3. If still failing after cold start, wait 30–60s and refresh; reconnection will retry.

---

## 4. "The source https://fanclubz-staging.vercel.app has not been authorized yet"

**Cause:** Supabase (Auth) does not allow the staging frontend origin. This is **Supabase project config**, not backend.

**Fix:**
1. Supabase Dashboard → your **staging** project → **Authentication** → **URL Configuration**
2. Add to **Site URL** (or use as additional): `https://fanclubz-staging.vercel.app`
3. Add to **Redirect URLs**: `https://fanclubz-staging.vercel.app/**`, `https://fanclubz-staging.vercel.app`
4. Save and retry.

---

## 5. Quick verification

```bash
# Parity check (run locally)
pnpm run parity-check

# Manual settlement route check
curl -X POST https://fanclubz-backend-staging.onrender.com/api/v2/settlement/manual/merkle \
  -H "Content-Type: application/json" \
  -d '{"predictionId":"x","winningOptionId":"y"}' -w "\n%{http_code}\n"
# Expect: 400 or 401 or 403 — NOT 404
```

---

## 6. 404 on /api/referrals/my-stats or /api/v2/users/.../public-profile ("Profile not found" / "User not found")

**Cause:** Your user exists in Supabase Auth (you're logged in) but not in `public.users` in staging. The db port may have skipped them (e.g. email conflict) or they signed up on staging after the port.

**Fix (fastest):** Add your specific user from prod to staging:

```bash
# Replace with your user ID (from the 404 URL or DevTools)
pnpm run db:add-user-to-staging bc1866ca-71c5-4029-886d-4eace081f5c4
```

Or re-run the full port to sync more users:

```bash
pnpm run db:port-prod-to-staging
```

Also ensure `REFERRAL_ENABLE=1` on Render.

---

## 7. 500 on /api/demo-wallet/faucet ("Failed to faucet demo credits")

**Cause:** User must exist in `public.users`; the faucet insert fails if the user_id FK fails.

**Fix:** Add your user to staging (same as §6):

```bash
pnpm run db:add-user-to-staging <your-user-id>
```

---

## 8. Deposit worked but not showing in Recent Activity

**Cause:** Schema or cache. The wallet activity feed reads from `wallet_transactions`; demo faucet rows need `direction` for consistency.

**Fix:**
1. Run migrations on staging: `pnpm run db:migrate:staging` (or your migration command).
2. Redeploy backend so the demo faucet includes `direction: 'credit'` in new inserts.
3. After a new faucet, the activity feed invalidates and refetches; if still empty, pull-to-refresh or wait a few seconds.

---

## 8. Residual causes (code vs config)

| Symptom | Usually | Check |
|--------|----------|-------|
| 404 on settlement | Deploy / build | Render logs, redeploy |
| WebSocket fails | CORS or cold start | CORS merge fix deployed? |
| "Not authorized" | Supabase URLs | Supabase Auth → URL Configuration |
| Different data | Different DB | Staging uses staging Supabase |

The codebase is shared; drift comes from **Render env**, **Vercel env**, **Supabase project config**, or **stale deploys**.
