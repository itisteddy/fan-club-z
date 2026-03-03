# Release workflow: branch-based promotion

Production and staging are separated by branch. Staging is validated before code is promoted to production.

---

## Branches

| Branch   | Deploys to        | Purpose                          |
|----------|-------------------|----------------------------------|
| `main`   | **Production**    | Live app (Vercel + Render prod) |
| `staging`| **Staging**       | Pre-prod (Vercel + Render staging) |

- **Production** deploys **only** from `main`.
- **Staging** deploys **only** from `staging`.
- **Promotion** = merge `staging` → `main` after checks.

---

## Promotion steps (staging → main)

1. **Work on staging**
   - Merge feature/fix branches into `staging` (or commit directly to `staging`).
   - Staging frontend and backend auto-deploy from `staging` (once configured on Vercel/Render).

2. **Run required checks**
   - Staging smoke test: `./scripts/staging-smoke-test.sh` (or `bash scripts/staging-smoke-test.sh`).
   - Manual checks: see **`docs/promotion_checklist.md`** (health, core flows, migrations, env).

3. **Promote to production**
   - When all checks pass:
     ```bash
     git fetch origin
     git checkout main
     git pull origin main
     git merge staging -m "chore: promote staging to main"
     git push origin main
     ```
   - Production (Vercel + Render prod) will deploy from the updated `main`.

4. **Optional: sync staging with main**
   - To avoid long-lived divergence, after a successful prod release you can refresh `staging` from `main`:
     ```bash
     git checkout staging
     git pull origin main
     git push origin staging
     ```
   - Or keep `staging` ahead and only merge into `main` when promoting.

---

## Required checks before promotion

- [ ] **Staging smoke test** passes: `./scripts/staging-smoke-test.sh`
- [ ] **Promotion checklist** completed: `docs/promotion_checklist.md`
- [ ] No pending migrations that would break prod (run on prod after deploy if needed)
- [ ] Staging env vars and prod env vars verified (no prod secrets on staging, correct prod secrets on prod)

---

## Exact commands reference

### One-time: create and push `staging` branch

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b staging
git push -u origin staging
```

### One-time: point staging deployments to `staging` branch

- **Vercel** (staging project): **Settings → Git → Production Branch** → set to `staging`.
- **Render** (fanclubz-backend-staging): **Settings → Branch** → set to `staging`.

(Do **not** change production Vercel/Render to use `staging`; production must stay on `main`.)

### Each promotion (after validation on staging)

```bash
git fetch origin
git checkout main
git pull origin main
git merge staging -m "chore: promote staging to main"
git push origin main
```

### Optional: update staging from main (after a release)

```bash
git checkout staging
git merge main -m "chore: sync staging with main after release"
git push origin staging
```
