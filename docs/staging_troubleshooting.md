# Staging Troubleshooting

When staging shows errors that production doesn't, use this checklist. Most issues are **environment configuration**, not code.

---

## 1. "POST /api/v2/settlement/manual/merkle 404 (Not Found)"

**Cause:** Render staging backend is running old code or the deploy failed.

**Fix:**
1. Render Dashboard → fanclubz-backend-staging → **Logs** → check for build errors.
2. **Manual Deploy** → Deploy latest commit from `staging` (or your deploy branch).
3. Wait for deploy to finish, then run: `pnpm run parity-check`
4. If parity check still fails, verify the settlement route exists: `curl -X POST https://fanclubz-backend-staging.onrender.com/api/v2/settlement/manual/merkle -H "Content-Type: application/json" -d '{}'` — expect 400/401/403, **not** 404.

---

## 2. "WebSocket connection failed" / "WebSocket is closed before the connection is established"

**Causes:**
- **CORS:** Staging origin not in allowlist (now fixed by merging env with defaults).
- **Render cold start:** Free tier spins down; first WebSocket connect can fail. Retry after a few seconds.
- **Backend not running:** Check Render logs.

**Fix:**
1. Ensure Render staging has the latest code (CORS merge fix).
2. Redeploy backend.
3. If still failing, check Render env: `CORS_ALLOWLIST` should include `https://fanclubz-staging.vercel.app` (or leave unset to use defaults).

---

## 3. "The source https://fanclubz-staging.vercel.app has not been authorized yet"

**Cause:** Supabase (Auth) does not allow the staging frontend origin. This is **Supabase project config**, not backend.

**Fix:**
1. Supabase Dashboard → your **staging** project → **Authentication** → **URL Configuration**
2. Add to **Site URL** (or use as additional): `https://fanclubz-staging.vercel.app`
3. Add to **Redirect URLs**: `https://fanclubz-staging.vercel.app/**`, `https://fanclubz-staging.vercel.app`
4. Save and retry.

---

## 4. Quick verification

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

## 5. Residual causes (code vs config)

| Symptom | Usually | Check |
|--------|----------|-------|
| 404 on settlement | Deploy / build | Render logs, redeploy |
| WebSocket fails | CORS or cold start | CORS merge fix deployed? |
| "Not authorized" | Supabase URLs | Supabase Auth → URL Configuration |
| Different data | Different DB | Staging uses staging Supabase |

The codebase is shared; drift comes from **Render env**, **Vercel env**, **Supabase project config**, or **stale deploys**.
