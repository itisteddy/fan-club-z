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
6. **Root Directory:** (leave default or `client` if monorepo root is repo root).
7. **Build Command:** `pnpm build` or `cd client && pnpm build`.
8. **Output Directory:** `client/dist` or `dist` (per your build).
9. Deploy from `staging` branch or `main` with staging env vars.

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
