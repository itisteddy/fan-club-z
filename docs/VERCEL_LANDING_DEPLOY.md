# Landing page deploys from main (no change → change)

The **landing-page** Vercel project only gets new deployments when the CD workflow runs the **Deploy Landing Page** job. That job runs **only when** the secret `VERCEL_LANDING_PROJECT_ID` is set.

## Why you see “no change”

- Pushes to `main` deploy the **main app** (fan-club-z) only.
- The **landing page** (landing-page) is a separate Vercel project and is deployed by CD only if the secret below is set. If it isn’t set, the landing deploy job is skipped and the landing page gets no new deployment.

## Make the landing page update on every main deploy

### 1. Get the landing-page project ID

1. Open [Vercel](https://vercel.com) → **landing-page** project.
2. Go to **Settings** → **General**.
3. Copy **Project ID** (e.g. `prj_xxxxx` or similar).

### 2. Add the secret in GitHub

1. Repo → **Settings** → **Secrets and variables** → **Actions**.
2. **New repository secret**:
   - Name: `VERCEL_LANDING_PROJECT_ID`
   - Value: the Project ID from step 1.
3. Save.

### 3. Trigger a deploy

- **Option A:** Push a commit to `main` (CD runs and deploys both app and landing).
- **Option B:** **Actions** → **CD** → **Run workflow** → run from `main` (re-runs CD; landing deploy runs if the secret is set).

After this, every successful CD run on `main` will deploy both:

- **fan-club-z** (main app → app.fanclubz.app)
- **landing-page** (landing → fanclubz.app / www.fanclubz.app)

### 4. Vercel landing-page project settings

In the **landing-page** Vercel project, ensure:

- **Environment variable:** `VITE_BUILD_TARGET` = `landing` (so it builds the landing bundle).
- **Build command / root:** Same as your main app (e.g. build from `client` or repo root per your setup).

Once `VERCEL_LANDING_PROJECT_ID` is set and CD runs, you should see a new deployment on the **landing-page** project and “change” on the landing site.
