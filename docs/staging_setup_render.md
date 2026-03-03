# Staging Render Backend Setup

## Prerequisites

- Render account
- Production backend service already deployed
- Staging Supabase project created (see `staging_setup_supabase.md`)

---

## 1. Create Staging Service

1. Go to [Render Dashboard](https://dashboard.render.com).
2. **New → Background Worker** or **Web Service** (same type as prod).
3. Connect same Git repo; use a branch like `staging` or `develop`, or same `main` with different env vars.
4. Name: `fanclubz-backend-staging`.
5. Region: Same as staging Supabase for low latency.

---

## 2. Build & Start Commands (server only — avoid building client)

So the staging backend only builds the server (faster, no client dependency issues):

- **Root Directory:** `server`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start` (or `node dist/index.js`)

From `server/`, `npm run build` runs `build:shared` then `build:server` (TypeScript). No client or Vite build.

---

## 3. Environment Variables

Set in Render **Environment** tab. **Do not** use production keys.

| Variable | Value | Notes |
|----------|-------|-------|
| `APP_ENV` | `staging` | Required |
| `NODE_ENV` | `production` | Render runs as production |
| `VITE_SUPABASE_URL` | Staging Supabase URL | |
| `VITE_SUPABASE_ANON_KEY` | Staging anon key | |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging service role key | |
| `JWT_SECRET` | Strong staging-only secret | Min 32 chars; different from prod |
| `CORS_ALLOWLIST` | See below | Comma-separated, no spaces |

### CORS_ALLOWLIST

```
https://staging.fanclubz.app,https://fanclubz-staging.vercel.app,http://localhost:3000,http://localhost:5173,http://localhost:5174
```

Adjust domains to match your staging frontend and local dev ports.

---

## 4. Health Endpoint

After deploy, verify:

```bash
curl https://fanclubz-backend-staging.onrender.com/health
```

Expected response includes `"env": "staging"`.

---

## 5. Deploy

Trigger deploy. Check logs for startup errors. Ensure no production keys are used.

---

## Checklist

- [ ] Staging service created on Render
- [ ] Build/start commands correct
- [ ] All env vars set (staging Supabase, staging JWT, CORS_ALLOWLIST)
- [ ] No production keys in env
- [ ] Health endpoint returns `env: "staging"`
