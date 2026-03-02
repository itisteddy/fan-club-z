# Align Vercel and Render Deployments

## Quick Command to Deploy Latest Commit to Vercel

When you push backend changes and want to ensure Vercel landing-page is on the same commit as Render:

```bash
# From repo root
vercel link --yes --project=landing-page --scope=teddys-projects-d67ab22a
vercel --prod --yes
```

## Verify Alignment

**Render (Backend):**
- Go to: https://dashboard.render.com → `fan-club-z` service
- Check "Events" tab → Latest deployment shows commit hash

**Vercel (Landing Page):**
- Go to: https://vercel.com/teddys-projects-d67ab22a/landing-page/deployments
- Check latest deployment → Commit hash should match Render

**Both should show the same commit hash from `main` branch.**

## Why Manual Deploy?

The `landing-page` Vercel project does NOT auto-deploy reliably from git pushes. Always manually trigger after backend changes to ensure:
- Admin portal routes work correctly
- Redirects to app domain work
- Both frontend and backend are on the same commit

## Current Status

- **Latest commit:** `78970654` (Fix Render build)
- **Render:** ✅ Live on `78970654`
- **Vercel landing-page:** ✅ Deploying `78970654` (just triggered)
