# FanClubZ Environments

Prod vs staging URLs and variable names.

## Branch Setup (Phase 0)

To keep staging changes from touching prod:

1. **Create staging branch** from current prod `main` (if not exists):
   ```bash
   git checkout main && git pull && git checkout -b staging && git push -u origin staging
   ```

2. **Vercel**: Set staging project/preview to deploy from `staging` branch. Production from `main`.

3. **Render**: Create separate staging service (or use same service with branch override). Set staging service to deploy from `staging` branch. Production from `main`.

4. **Result**: Production stays on `main`. Staging on `staging`. Fix staging without risking prod.

## URLs

| Service   | Production                         | Staging                                  |
|-----------|------------------------------------|------------------------------------------|
| Frontend  | https://app.fanclubz.app           | https://fanclubz-staging.vercel.app      |
| Backend   | https://fan-club-z.onrender.com    | https://fanclubz-backend-staging.onrender.com |
| Supabase  | (prod project)                     | (staging project)                        |

## Environment Variables

### Backend (Render)

| Variable              | Prod                    | Staging                 |
|-----------------------|-------------------------|-------------------------|
| `APP_ENV`             | `production`            | `staging`               |
| `CORS_ALLOWLIST`      | prod frontend origins   | staging frontend origin |
| `VITE_SUPABASE_URL`   | prod Supabase URL       | staging Supabase URL    |
| `SUPABASE_SERVICE_ROLE_KEY` | prod key          | staging key             |
| `DATABASE_URL`        | prod Postgres (if used) | staging Postgres        |

### Frontend (Vercel)

| Variable              | Prod                    | Staging                 |
|-----------------------|-------------------------|-------------------------|
| `VITE_APP_ENV`        | `production`            | `staging`               |
| `VITE_API_URL`        | prod backend URL        | staging backend URL     |
| `VITE_SUPABASE_URL`   | prod Supabase URL       | staging Supabase URL    |
| `VITE_SUPABASE_ANON_KEY` | prod anon key        | staging anon key        |

## Branches

- **main** → Production (Vercel prod, Render prod)
- **staging** → Staging (Vercel staging, Render staging)

Configure Vercel and Render so staging deploys from `staging` branch and production from `main`.
