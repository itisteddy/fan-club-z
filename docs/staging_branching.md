# Staging and main: branching strategy

Right now **staging deploys from `main`**: both Vercel (fanclubz-staging) and Render (fanclubz-backend-staging) use the `main` branch. Every merge to `main` deploys to both staging and production (each with its own env vars).

## Should staging be “off main”?

**Option A – Keep staging on `main` (current)**  
- **Pros:** One branch to maintain; staging and production always run the same code; simple.  
- **Cons:** You can’t test a change on staging without merging to `main` (so production gets it too unless you use separate production services that deploy from a different branch or tag).

**Option B – Staging from a dedicated branch (e.g. `staging` or `develop`)**  
- **Pros:** You merge to `staging` to update only staging; production stays on `main` until you merge `staging` → `main`.  
- **Cons:** Extra step (merge to `staging`, test, then merge to `main`); possible drift if people forget to merge back.

**Recommendation**

- If **production** also deploys from `main` (same repo, different Vercel/Render *projects* with prod env vars), then staging and production are already the same code; the only difference is env (Supabase, API URL, etc.). Keeping **staging on `main`** is fine and keeps things simple.
- If you want **staging to get changes before production**, then move staging off `main`:
  1. Create a long-lived branch, e.g. `staging`.
  2. In **Vercel** (fanclubz-staging): Settings → Git → Production Branch → set to `staging` (so the staging project deploys from `staging`).
  3. In **Render** (fanclubz-backend-staging): Settings → Branch → set to `staging`.
  4. Workflow: merge feature branches into `staging` → test on staging → merge `staging` into `main` when ready for production.

## If you switch staging to a `staging` branch

1. Create the branch and push:  
   `git checkout -b staging && git push -u origin staging`
2. In **Vercel** (fanclubz-staging): set Production Branch (or the branch that triggers deploys) to `staging`.
3. In **Render** (fanclubz-backend-staging): set Branch to `staging`.
4. Document in this file and in `docs/repo_workflow.md` that staging deploys from `staging` and production from `main`.

No code changes are required; only dashboard/UI config on Vercel and Render.
