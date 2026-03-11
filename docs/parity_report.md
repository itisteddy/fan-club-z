# Staging ↔ Prod Parity Report

Generated from CLI fetches. **Do not touch production.** All fixes on `staging` branch only.

## Data sources (saved under `/tmp/fanclubz-parity/`)

- **Staging:** `curl -sS https://fanclubz-backend-staging.onrender.com/health` → `staging_health.json`
- **Staging:** `curl -sS https://fanclubz-backend-staging.onrender.com/debug/config` → `staging_debug_config.json`
- **Prod:** `curl -sS https://fan-club-z.onrender.com/health` → `prod_health.json`
- **Prod:** `curl -sS https://fan-club-z.onrender.com/debug/config` → `prod_debug_config.json` (404; prod has no parity tooling)

---

## Diff summary

| Field | Staging | Prod | Parity |
|-------|---------|------|--------|
| **gitSha** | `59fcee4c...` | (no gitSha in prod /health) | N/A – prod uses old health shape |
| **apiHost** | `fan-club-z.onrender.com` | — | **FAIL** – staging must not report prod host; set `API_URL` on Render staging |
| **corsAllowlistSample** | `["https://fanclubz.app","https://app.fanclubz.app"]` | — | **WARN** – staging frontend `https://fanclubz-staging.vercel.app` must be in allowlist (check full list) |
| **supabaseUrlHost** | `rzihzwvgpvozekicrdqr.supabase.co` | — | OK – staging project |
| **dbHost** | `aws-1-eu-west-1.pooler.supabase.com` | — | OK – staging DB pooler |

---

## Required fixes (staging only)

1. **apiHost:** Backend now prefers `Host` header in `/debug/config`, so staging reports its own host. Optionally set on Render staging: `API_URL=https://fanclubz-backend-staging.onrender.com`.
2. **CORS:** Ensure `CORS_ALLOWLIST` on Render staging includes `https://fanclubz-staging.vercel.app` (server defaults already include it).
3. **Auth/JWT:** Backend uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (and service role) from env; when `APP_ENV=staging`, set these to **staging** Supabase project so token verification uses staging issuer. Use `GET /health/auth` with `Authorization: Bearer <token>` to confirm.
4. **WebSocket:** Frontend derives WS from same base as API; when hostname contains `staging` (e.g. fanclubz-staging.vercel.app) it uses staging backend. Set `VITE_API_URL` or `VITE_API_BASE_URL` on Vercel staging to staging backend URL so build stamp and any fallback use it.

---

## App smoke checks (staging)

Fixture userId: `bc1866ca-71c5-4029-886d-4eace081f5c4`

| Route | Status | requestId / notes |
|-------|--------|-------------------|
| GET /api/demo-wallet/summary?userId=... | 200 | (no requestId in body; X-Request-Id in headers when requested) |
| POST /api/demo-wallet/faucet (body: `{ "userId": "..." }`) | 400 without body (expected) | — |
| GET /api/v2/users/.../public-profile | 200 | — |
| GET /api/v2/activity/user/...?limit=5 | 200 | — |

All smoke checks passed. No 500s. Staging UI should load wallet/profile without 500s for this user.

---

## Root cause summary

- **apiHost:** Staging was reporting prod host because `/debug/config` used `config.api.url`, which defaulted to prod when `API_URL` was unset. **Fix:** Prefer `Host` header in `/debug/config` so the server reports the host it was hit on.
- **Auth/JWT:** Backend uses `supabaseAnon.auth.getUser(token)` with `VITE_SUPABASE_URL` and anon key from env. Staging must have these set to the **staging** Supabase project so tokens issued by staging Auth are valid. **Diagnostic:** `GET /health/auth` with `Authorization: Bearer <token>` returns `ok` + sanitized `reason`.
- **WebSocket:** Frontend uses `getSocketUrl()` from `getEnvironmentConfig()`. When hostname contains `staging` (e.g. fanclubz-staging.vercel.app), it uses `https://fanclubz-backend-staging.onrender.com`; no prod WS. Build stamp now logs `api` and `ws` (same) and `supabase` hosts.

---

## Last updated

2026-03-11 (after parity data fetch, smoke checks, and wiring fixes).
