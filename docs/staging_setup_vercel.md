# Staging Vercel Frontend Setup

## Approach

Use either:

- **Option A:** Separate Vercel project `fanclubz-staging` (recommended)
- **Option B:** Vercel **Preview** environment with staging env vars

---

## Option A: Separate Staging Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard).
2. **Add New → Project**.
3. Import same Git repo.
4. Name: `fanclubz-staging`.
5. **Framework Preset:** Vite.
6. **Root Directory:** `client` (so the project root for the build is the client app).
7. **Install Command:** Leave default so Vercel uses `pnpm install` when it sees `pnpm-lock.yaml`, or set to `cd .. && pnpm install` if building from `client/`. Do not use `npm install` — the repo is pnpm and npm will hit peer dependency conflicts.
8. **Build Command:** `pnpm run build` (runs from `client/`; `client/vercel.json` can set this).
9. **Output Directory:** `dist`.
10. Deploy from `staging` branch or `main` with staging env vars.

### Environment Variables (Staging project)

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_APP_ENV` | `staging` | Production, Preview |
| `VITE_API_BASE_URL` | `https://fanclubz-backend-staging.onrender.com` | Production, Preview |
| `VITE_SUPABASE_URL` | Staging Supabase URL | Production, Preview |
| `VITE_SUPABASE_ANON_KEY` | Staging anon key | Production, Preview |
| `VITE_FRONTEND_URL` | `https://fanclubz-staging.vercel.app` | Production, Preview |

---

## Option B: Preview Environment

1. Use existing Vercel project.
2. In **Settings → Environment Variables**, add variables with **Preview** selected.
3. Set same staging values as above for Preview.
4. Production vars remain production-only.
5. Preview deployments (PRs, non-main branches) will use Preview env vars.

---

## Custom Domain (Optional)

If using `staging.fanclubz.app`:

1. In Vercel project → **Settings → Domains**.
2. Add `staging.fanclubz.app`.
3. Configure DNS per Vercel instructions.
4. Ensure this domain is in:
   - Supabase Auth redirect URLs
   - Render `CORS_ALLOWLIST`

---

## Fix: npm ERESOLVE / peer dependency errors

If the build runs **npm** (e.g. log shows `Running "install" command: cd .. && npm install && cd client && npm install`), you get `ERESOLVE unable to resolve dependency tree`. The repo is **pnpm-only**; npm must not be used.

**Root cause:** The repo root `package.json` had a `preinstall` script that ran `npm`; when any install runs, that triggered npm and broke the build. That script has been removed. The repo also now sets `"packageManager": "pnpm@9.14.2"` so Vercel uses pnpm.

**Do this once:**

1. **Commit and push** the latest `package.json` and `vercel.json` (no preinstall, packageManager set, vercel.json with pnpm install/build).
2. In **Project Settings → Build and Deployment**, **turn OFF** the override for **Install Command**. That way Vercel uses the install command from the repo’s `vercel.json` (`cd .. && pnpm install`), not a cached/dashboard value. Leave **Build Command** and **Output Directory** overrides off too if you want the repo to control them.
3. **Redeploy** (trigger a new deployment from the latest commit).

If the build still runs npm, set **Install Command** override to exactly `cd .. && pnpm install` (Override ON), save, and redeploy. Do **not** use any command containing `npm install`.

---

## Verification

After deploy:

1. Open staging frontend URL.
2. Sign in (should use staging Supabase).
3. Verify data loads from staging backend (e.g. predictions, wallet).
4. Confirm no production data is shown.

---

## Checklist

- [ ] Staging project or Preview env vars configured
- [ ] `VITE_API_BASE_URL` points to staging Render backend
- [ ] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` point to staging Supabase
- [ ] Staging domain added to Supabase Auth redirect URLs
- [ ] Staging domain added to Render CORS_ALLOWLIST
- [ ] Smoke test: auth, data load, staking flow
