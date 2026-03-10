# Staging Troubleshooting

When staging shows errors that production doesn't, use this checklist. Most issues are **environment configuration**, not code.

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
- **CORS:** Staging origin not in allowlist (now fixed by merging env with defaults).
- **Render cold start:** Free tier spins down; first WebSocket connect can fail. Retry after a few seconds.
- **Backend not running:** Check Render logs.

**Fix:**
1. Ensure Render staging has the latest code (CORS merge fix).
2. Redeploy backend.
3. If still failing, check Render env: `CORS_ALLOWLIST` should include `https://fanclubz-staging.vercel.app` (or leave unset to use defaults).

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

## 6. 404 on /api/referrals/my-stats or /api/v2/users/.../public-profile

**Cause:** Backend routes exist; 404 usually means:
- `REFERRAL_ENABLE` is not `1` on Render (referrals return 404 when disabled)
- User not in staging DB (e.g. only 139 users were ported; your user may not be among them)

**Fix:**
1. Render → Environment → set `REFERRAL_ENABLE=1`
2. Re-run `pnpm run db:port-prod-to-staging` to sync more users from prod
3. Redeploy backend

---

## 7. 500 on /api/demo-wallet/faucet ("Failed to faucet demo credits")

**Cause:** User must exist in `public.users`; wallet_transactions insert can fail if user_id FK fails or schema mismatch.

**Fix:**
1. Ensure user exists: run `db:port-prod-to-staging` so staging has the user
2. Redeploy backend (direction column removed from faucet insert for schema compatibility)

---

## 8. Residual causes (code vs config)

| Symptom | Usually | Check |
|--------|----------|-------|
| 404 on settlement | Deploy / build | Render logs, redeploy |
| WebSocket fails | CORS or cold start | CORS merge fix deployed? |
| "Not authorized" | Supabase URLs | Supabase Auth → URL Configuration |
| Different data | Different DB | Staging uses staging Supabase |

The codebase is shared; drift comes from **Render env**, **Vercel env**, **Supabase project config**, or **stale deploys**.
