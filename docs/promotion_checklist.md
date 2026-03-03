# Promotion checklist (staging → main)

Use this before merging `staging` into `main`. Ensures production is not broken by the promotion.

---

## 1. Staging health and smoke test

- [ ] **Backend /health OK**  
  `curl -s https://fanclubz-backend-staging.onrender.com/health` returns HTTP 200 and body includes `"env":"staging"`.

- [ ] **Smoke script passes**  
  Run: `./scripts/staging-smoke-test.sh`  
  (or `bash scripts/staging-smoke-test.sh`). Exit code must be 0.

- [ ] **Optional: deep health**  
  If your backend exposes `/health/deep` or `/api/health/*`, hit it and confirm 200 where expected.

---

## 2. Core flows on staging

- [ ] **Auth:** Sign in (e.g. Google) and sign out; no "Database error saving new user".
- [ ] **Discover:** Predictions list loads (no 500 on `/api/v2/predictions`).
- [ ] **Wallet:** Wallet/demo credits page loads; faucet or balance fetch does not 500.
- [ ] **Comments:** Post a comment on a prediction; no 503 "Comments are temporarily unavailable".
- [ ] **Profile:** Profile page loads (no 500 on achievements/public-profile).

Use **`docs/staging_smoke_tests.md`** for a full manual test list.

---

## 3. Migrations and schema

- [ ] **No pending migrations** that would break production.  
  If new migrations exist, they are either already applied on prod or are safe to run after deploy (e.g. additive only).

- [ ] **Staging DB** has required tables/columns (e.g. from `server/migrations/`).  
  If staging was recently reset, run the migration suite against staging and re-run smoke tests.

---

## 4. Environment and config

- [ ] **Staging** uses staging-only env vars (staging Supabase, staging JWT, staging CORS).  
  See **`docs/staging_env_checklist.md`**.

- [ ] **Production** (after merge) will use production env vars only.  
  No staging URLs or staging keys on production Vercel/Render.

- [ ] **Vercel (staging)** deploys from branch `staging`; **Render (staging)** deploys from branch `staging`.  
  **Vercel (prod)** and **Render (prod)** deploy from branch `main` only.

---

## 5. Promote

When all items above are checked:

```bash
git fetch origin
git checkout main
git pull origin main
git merge staging -m "chore: promote staging to main"
git push origin main
```

Then verify production health and a quick auth/Discover check on production.
