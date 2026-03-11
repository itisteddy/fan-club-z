# Staging Render Setup

Configure Render backend for staging deployment.

## 1. Branch

- **Production**: Deploy from `main`
- **Staging**: Deploy from `staging`

In Render → Service → Settings → Build & Deploy:

- **Branch**: `staging` (for staging service)
- **Branch**: `main` (for production service)

## 2. Environment Variables

Set in Render → Environment:

| Variable              | Required | Example |
|-----------------------|----------|---------|
| `APP_ENV`             | Yes      | `staging` |
| `NODE_ENV`            | Yes      | `production` |
| `CORS_ALLOWLIST`      | Yes      | `https://fanclubz-staging.vercel.app` |
| `VITE_SUPABASE_URL`   | Yes      | `https://[PROJECT_REF].supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | (from Supabase) |
| `DATABASE_URL`        | If using direct Postgres | (from Supabase) |
| `JWT_SECRET`          | Yes      | (min 32 chars) |

Render automatically sets `RENDER_GIT_COMMIT` for deploy commit.

## 3. Verify

After deploy:

```bash
curl https://fanclubz-backend-staging.onrender.com/health
```

Expected:

```json
{
  "ok": true,
  "env": "staging",
  "gitSha": "...",
  "service": "backend",
  "time": "..."
}
```

Deep health:

```bash
curl https://fanclubz-backend-staging.onrender.com/health/deep
```

All `checks` should have `ok: true`. If any table check fails, apply migrations.
