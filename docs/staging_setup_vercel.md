# Staging Vercel Setup

Configure Vercel frontend for staging deployment.

## 1. Branch

- **Production**: Deploy from `main`
- **Staging**: Deploy from `staging`

In Vercel → Project → Settings → Git:

- **Production Branch**: `main`
- **Preview Branch**: `staging` (or create a separate staging deployment)

For a dedicated staging URL, use a Vercel project or environment variable to point `staging` branch to a staging domain.

## 2. Environment Variables

Set in Vercel → Settings → Environment Variables:

For **Preview** (staging) environment:

| Variable              | Required | Example |
|-----------------------|----------|---------|
| `VITE_APP_ENV`        | Yes      | `staging` |
| `VITE_API_URL`        | Yes      | `https://fanclubz-backend-staging.onrender.com` |
| `VITE_SUPABASE_URL`   | Yes      | `https://[STAGING_PROJECT_REF].supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Yes   | (staging Supabase anon key) |

Vercel sets `VERCEL_GIT_COMMIT_SHA` at build time.

## 3. Verify

After deploy, open browser console on staging URL. You should see:

```
FanClubZ build: <sha> env:staging api:fanclubz-backend-staging.onrender.com supabase:<staging-supabase-host>
```

## 4. Build Stamp

The build stamp is logged once on app load. It includes:

- `VITE_GIT_SHA` – commit at build time
- `VITE_APP_ENV` – staging / production
- API host (hostname only)
- Supabase host (hostname only)

No secrets are exposed.
