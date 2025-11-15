Last Known Stable Snapshot

- Branch: `recovery/fcz-latest-working`
- Tag: `fcz-recovered-20251114-2031`
- Commit: `d8bca6b5` (release: v2.0.76 - Production deploy with Android APK support)
- Date: 2025-11-14

Feature flags expected in local env (enable latest UI):

```
VITE_FCZ_UNIFIED_CARDS=1
VITE_FCZ_DISCOVER_V2=1
VITE_FCZ_PREDICTION_DETAILS_V2=1
VITE_FCZ_SHARED_CARDS=1
VITE_FCZ_AUTH_GATE=1
```

Runtime notes:
- Client dev: http://localhost:5173 (Vite)
- Server dev: http://localhost:3001 (Express) – health: `/health`
- Production build output: `client/dist` (see `vercel.json`)

Revert instructions:

```
git fetch --all --tags
git checkout recovery/fcz-latest-working
# or: git checkout tags/fcz-recovered-20251114-2031
```



