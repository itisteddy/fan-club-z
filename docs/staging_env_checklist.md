# Staging environment variables (mirror production)

Use this checklist so staging has the **same set** of env vars as production, with **staging values** (separate Supabase, separate JWT, etc.). Missing vars on Render or Vercel often cause 500/503 and “Comments are temporarily unavailable.”

---

## Backend (Render – staging service)

In **Render Dashboard → fanclubz-backend-staging → Environment**, set **every** variable below. Use **staging** Supabase project values only.

| Variable | Production (example) | Staging (set these) |
|----------|----------------------|----------------------|
| `APP_ENV` | `production` | `staging` |
| `NODE_ENV` | `production` | `production` (Render default) |
| `VITE_SUPABASE_URL` | Prod Supabase URL | **Staging** Supabase URL (e.g. `https://xxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Prod anon key | **Staging** anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Prod service role key | **Staging** service role key |
| `JWT_SECRET` | Prod JWT secret (≥32 chars) | **New** staging-only secret (≥32 chars), different from prod |
| `CORS_ALLOWLIST` | Prod origins | `https://fanclubz-staging.vercel.app,http://localhost:5173,http://localhost:5174` |

Optional but recommended (match prod if you use them):

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Only needed for migration scripts; backend uses Supabase client (URL + keys above). |
| `ADMIN_USER_IDS` | Comma-separated UUIDs for admin actions. |
| `ADMIN_API_KEY` | If you use admin API key. |
| `ENABLE_SOCIAL_FEATURES` | Set to `true` for comments/social. |
| `ENABLE_WEBSOCKET` | Set to `true` if you use real-time. |

After changing env vars, **redeploy** the Render service.

---

## Frontend (Vercel – staging project)

In **Vercel Dashboard → fanclubz-staging (or your staging project) → Settings → Environment Variables**, set for **Production** and **Preview**:

| Variable | Production (example) | Staging (set these) |
|----------|----------------------|----------------------|
| `VITE_APP_ENV` | `production` | `staging` |
| `VITE_API_BASE_URL` | Prod backend URL | `https://fanclubz-backend-staging.onrender.com` |
| `VITE_SUPABASE_URL` | Prod Supabase URL | **Staging** Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | Prod anon key | **Staging** anon key |
| `VITE_FRONTEND_URL` | `https://app.fanclubz.app` | `https://fanclubz-staging.vercel.app` |

After changing env vars, **redeploy** the Vercel project.

---

## Quick check

1. **Backend:** `curl https://fanclubz-backend-staging.onrender.com/health` → must include `"env":"staging"`.
2. **Frontend:** Open staging URL; in Network tab, API calls must go to `fanclubz-backend-staging.onrender.com`, not prod.
3. **Comments:** Post a comment on a prediction; if you see 503, check Render logs and that all backend vars above are set (and that migration 341 has been run on staging DB for comments).
