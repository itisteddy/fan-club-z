# Deployment Targeting

**Parity tooling and staging changes MUST deploy only to staging.** Production deploys from `main` only.

## Verify Branch Configuration

### Render

| Service | Branch | URL |
|---------|--------|-----|
| **Production** | `main` | https://fan-club-z.onrender.com |
| **Staging** | `staging` | https://fanclubz-backend-staging.onrender.com |

**If Render staging deploys from `main`:** Change it.

1. Render Dashboard → **fanclubz-backend-staging** → **Settings**
2. **Build & Deploy** → **Branch**: set to `staging`
3. Save. Trigger **Manual Deploy** if needed.

### Vercel

| Project/Env | Branch | URL |
|-------------|--------|-----|
| **Production** | `main` | https://app.fanclubz.app |
| **Staging** (preview or separate project) | `staging` | https://fanclubz-staging.vercel.app |

**If Vercel staging deploys from `main`:** Change it.

1. Vercel Dashboard → Project → **Settings** → **Git**
2. **Production Branch**: `main`
3. For staging: either
   - Create a **Preview** deployment for `staging` branch and assign a custom domain (e.g. fanclubz-staging.vercel.app), or
   - Create a separate Vercel project that deploys from `staging`
4. Ensure staging project/env uses `staging` branch.

## Redeploy Staging (Not Prod)

After code changes to parity tooling or staging fixes:

1. Push to `staging` branch only. Do not merge to `main`.
2. Render staging and Vercel staging auto-deploy from `staging`.
3. Verify:
   - Backend: `curl https://fanclubz-backend-staging.onrender.com/health/deep`
   - Frontend: open https://fanclubz-staging.vercel.app, check console for build stamp.

## Documented Deployments

| Date | Backend staging | Frontend staging | Outputs |
|------|-----------------|-----------------|---------|
| 2026-03-11 | https://fanclubz-backend-staging.onrender.com | https://fanclubz-staging.vercel.app | See below |

### /health (2026-03-11)

```json
{"ok":true,"env":"staging","gitSha":"87ffbb001bc7a24da35b50d53b1494fd3b710b03","service":"backend","time":"2026-03-11T22:33:44.349Z","version":"2.0.78"}
```

### /health/deep (2026-03-11)

See `docs/staging_health_deep_output.md`. All checks green.

### /debug/config (2026-03-11)

```json
{"env":"staging","gitSha":"87ffbb001bc7a24da35b50d53b1494fd3b710b03","dbHost":"aws-1-eu-west-1.pooler.supabase.com","dbName":"postgres","corsAllowlistCount":13,"corsAllowlistSample":["https://fanclubz.app","https://app.fanclubz.app"],"supabaseUrlHost":"rzihzwvgpvozekicrdqr.supabase.co"}
```

(Sanitized: hostnames only, no keys.)
