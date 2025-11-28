# Deployment Architecture Documentation

**Last Updated:** January 2025  
**Critical:** This document explains the TWO SEPARATE Vercel deployments that must NEVER be confused.

---

## Overview

Fan Club Z has **TWO SEPARATE Vercel projects** that deploy from the same GitHub repository but produce different applications:

1. **Landing Page** (`fanclubz.app`) - Marketing/landing page
2. **Main App** (`app.fanclubz.app`) - Full application

Both projects deploy from the `main` branch but use different build configurations.

---

## Project 1: Landing Page (`landing-page`)

### Vercel Project Name
- **Project:** `landing-page`
- **Domain:** `fanclubz.app` (and `www.fanclubz.app`)

### Configuration

**Root Directory:** Empty (repo root) - **NOT** `client`

**Build Command:**
```bash
cd client && VITE_BUILD_TARGET=landing npm run build
```

**Install Command:**
```bash
npm install
```
(Runs from repo root)

**Output Directory:**
```
client/dist
```

### Critical Environment Variable

**MUST BE SET IN VERCEL DASHBOARD:**
- **Key:** `VITE_BUILD_TARGET`
- **Value:** `landing`
- **Scope:** Production, Preview, Development

**Why:** This environment variable controls which component renders:
```typescript
// client/src/main.tsx
const isLandingBuild = import.meta.env.VITE_BUILD_TARGET === 'landing';
const RootComponent = isLandingBuild ? LandingPage : App;
```

When `VITE_BUILD_TARGET=landing`, it renders `LandingPage` component.

### What Gets Deployed

- **Component:** `client/src/landing/LandingPage.tsx`
- **Purpose:** Marketing/landing page with hero, features, FAQ, footer
- **Routes:** Only the landing page (no app routes)

### Files That Affect Landing Page

- `client/src/landing/LandingPage.tsx` - Main landing page component
- `client/src/main.tsx` - Entry point (checks `VITE_BUILD_TARGET`)
- Any shared components used by `LandingPage`

### Deployment Trigger

- **Auto-deploys** when code is pushed to `main` branch
- **Manual deploy via CLI:**
  ```bash
  # Ensure project is linked
  vercel link --yes --project=landing-page --scope=teddys-projects-d67ab22a
  
  # Deploy to production
  vercel --prod --yes
  ```
- **Manual deploy via Dashboard:** Go to Vercel dashboard → landing-page project → Deployments → Redeploy

### Verification

After deployment, check:
1. Domain resolves to `fanclubz.app`
2. Page shows landing page (hero, features, FAQ)
3. "Get started" button redirects to `app.fanclubz.app`
4. No app routes are accessible

---

## Project 2: Main App (`fan-club-z`)

### Vercel Project Name
- **Project:** `fan-club-z`
- **Domain:** `app.fanclubz.app`

### Configuration

**Root Directory:** `client` (or empty, depending on setup)

**Build Command:**
```bash
npm run build
```
(Or `cd client && npm run build` if root is repo root)

**Install Command:**
```bash
npm install
```

**Output Directory:**
```
dist
```
(Or `client/dist` if root is repo root)

### Environment Variables

**DO NOT SET `VITE_BUILD_TARGET`** (or set it to anything other than `landing`)

When `VITE_BUILD_TARGET` is unset or not `landing`, it renders `App` component.

### What Gets Deployed

- **Component:** `client/src/App.tsx`
- **Purpose:** Full application with all routes
- **Routes:** `/discover`, `/wallet`, `/profile`, `/predictions`, `/docs/funding-guide`, etc.

### Files That Affect Main App

- `client/src/App.tsx` - Main app component with routing
- `client/src/pages/*` - All page components
- `client/src/components/*` - All shared components
- `client/src/main.tsx` - Entry point (checks `VITE_BUILD_TARGET`)

### Deployment Trigger

- **Auto-deploys** when code is pushed to `main` branch
- **Manual deploy via CLI:**
  ```bash
  # Ensure project is linked (usually links to fan-club-z automatically)
  vercel link --yes --project=fan-club-z --scope=teddys-projects-d67ab22a
  
  # Deploy to production
  vercel --prod --yes
  ```
- **Manual deploy via Dashboard:** Go to Vercel dashboard → fan-club-z project → Deployments → Redeploy

### Verification

After deployment, check:
1. Domain resolves to `app.fanclubz.app`
2. App shows full application (discover page, navigation, etc.)
3. All routes are accessible (`/wallet`, `/profile`, `/docs/funding-guide`, etc.)
4. Landing page is NOT accessible (redirects to `fanclubz.app`)

---

## How Changes Affect Each Project

### Changes to Landing Page Only

**Files Modified:**
- `client/src/landing/LandingPage.tsx`

**Deployment:**
- ✅ Landing page project auto-deploys
- ✅ Main app project auto-deploys (but change doesn't affect it)

**Example:**
- Adding FAQ item to landing page
- Adding footer link to landing page

### Changes to Main App Only

**Files Modified:**
- `client/src/App.tsx`
- `client/src/pages/*` (except `LandingPage.tsx`)
- `client/src/components/*` (shared components)

**Deployment:**
- ✅ Main app project auto-deploys
- ✅ Landing page project auto-deploys (but change doesn't affect it)

**Example:**
- Adding new route (`/docs/funding-guide`)
- Adding new page component
- Modifying wallet pages

### Changes to Shared Files

**Files Modified:**
- `client/src/main.tsx`
- `client/src/components/*` (used by both)
- `client/package.json`
- `client/vite.config.ts`

**Deployment:**
- ✅ Both projects auto-deploy
- ⚠️ Must verify both projects still work correctly

**Example:**
- Updating dependencies
- Modifying build configuration
- Changing shared components

---

## Common Mistakes and How to Avoid Them

### ❌ Mistake 1: Deploying Landing Page Changes to Main App Project

**Symptom:**
- Changes to `LandingPage.tsx` don't appear on `fanclubz.app`
- Changes appear on `app.fanclubz.app` instead (wrong!)

**Cause:**
- Deployed to wrong Vercel project
- Or `VITE_BUILD_TARGET` not set correctly in landing-page project

**Fix:**
1. Verify `landing-page` project has `VITE_BUILD_TARGET=landing` set
2. Check deployment logs in Vercel dashboard
3. Ensure deployment is from `landing-page` project, not `fan-club-z`

### ❌ Mistake 2: Deploying Main App Changes to Landing Page Project

**Symptom:**
- New routes don't work on `app.fanclubz.app`
- Landing page shows app routes (wrong!)

**Cause:**
- Deployed to wrong Vercel project
- Or `VITE_BUILD_TARGET` set incorrectly in main app project

**Fix:**
1. Verify `fan-club-z` project does NOT have `VITE_BUILD_TARGET=landing`
2. Check deployment logs in Vercel dashboard
3. Ensure deployment is from `fan-club-z` project, not `landing-page`

### ❌ Mistake 3: Setting Root Directory to `client` for Landing Page

**Symptom:**
- Build fails with "module not found" errors
- Workspace dependencies not resolved

**Cause:**
- Root directory set to `client` breaks workspace structure

**Fix:**
- Set root directory to empty (repo root) for landing-page project

### ❌ Mistake 4: Not Setting `VITE_BUILD_TARGET` as Environment Variable

**Symptom:**
- Landing page builds main app instead
- Main app builds landing page instead

**Cause:**
- Environment variable only set in build command, not in Vercel dashboard
- Vite needs environment variables at build time

**Fix:**
- **ALWAYS** set `VITE_BUILD_TARGET=landing` as environment variable in Vercel dashboard for landing-page project
- **NEVER** set `VITE_BUILD_TARGET=landing` for fan-club-z project

---

## Deployment Checklist

### Before Deploying Landing Page Changes

- [ ] Verify changes are in `client/src/landing/LandingPage.tsx` or shared components
- [ ] Check that `landing-page` Vercel project has `VITE_BUILD_TARGET=landing` set
- [ ] Verify root directory is empty (repo root) for landing-page project
- [ ] Push to `main` branch (auto-deploys)
- [ ] Check deployment logs in `landing-page` project
- [ ] Verify `fanclubz.app` shows updated landing page
- [ ] Verify `app.fanclubz.app` still shows main app (not affected)

### Before Deploying Main App Changes

- [ ] Verify changes are in `client/src/App.tsx` or `client/src/pages/*`
- [ ] Check that `fan-club-z` Vercel project does NOT have `VITE_BUILD_TARGET=landing`
- [ ] Push to `main` branch (auto-deploys)
- [ ] Check deployment logs in `fan-club-z` project
- [ ] Verify `app.fanclubz.app` shows updated main app
- [ ] Verify `fanclubz.app` still shows landing page (not affected)

### Before Deploying Shared Changes

- [ ] Verify changes affect both projects (e.g., `main.tsx`, shared components)
- [ ] Check both Vercel projects have correct `VITE_BUILD_TARGET` settings
- [ ] Push to `main` branch (both auto-deploy)
- [ ] Check deployment logs in BOTH projects
- [ ] Verify `fanclubz.app` still works (landing page)
- [ ] Verify `app.fanclubz.app` still works (main app)

---

## Recent Example: Funding Guide Deployment

### Changes Made

1. **Landing Page Changes:**
   - `client/src/landing/LandingPage.tsx`: Added FAQ item "How do I fund my wallet?" and footer "Docs" link

2. **Main App Changes:**
   - `client/src/pages/FundingGuidePage.tsx`: New page component
   - `client/src/App.tsx`: Added route `/docs/funding-guide`
   - `client/src/pages/UnifiedWalletPage.tsx`: Added links to funding guide
   - `client/src/pages/WalletPageV2.tsx`: Added links to funding guide

### Deployment Process

1. **Committed to `main` branch:**
   ```bash
   git add client/src/pages/FundingGuidePage.tsx
   git add client/src/App.tsx
   git add client/src/landing/LandingPage.tsx
   git add client/src/pages/UnifiedWalletPage.tsx
   git add client/src/pages/WalletPageV2.tsx
   git commit -m "FEAT: Add comprehensive Wallet Funding Guide documentation"
   git push
   ```

2. **Both Projects Auto-Deployed:**
   - `landing-page` project: Deployed updated `LandingPage.tsx` with FAQ and footer links
   - `fan-club-z` project: Deployed updated `App.tsx` and new `FundingGuidePage.tsx`

3. **Verification:**
   - ✅ `fanclubz.app`: Shows new FAQ item and footer "Docs" link
   - ✅ `app.fanclubz.app`: Shows new `/docs/funding-guide` route and links in wallet pages

### Result

- **Landing page** (`fanclubz.app`): Users can access funding guide from FAQ or footer
- **Main app** (`app.fanclubz.app`): Users can access funding guide from wallet pages or directly via `/docs/funding-guide`

---

## Quick Reference

### Landing Page Project
- **Vercel Project:** `landing-page`
- **Domain:** `fanclubz.app`
- **Root Directory:** Empty (repo root)
- **Build Command:** `cd client && VITE_BUILD_TARGET=landing npm run build`
- **Output Directory:** `client/dist`
- **Environment Variable:** `VITE_BUILD_TARGET=landing` (REQUIRED)
- **Component:** `LandingPage`

### Main App Project
- **Vercel Project:** `fan-club-z`
- **Domain:** `app.fanclubz.app`
- **Root Directory:** `client` (or empty)
- **Build Command:** `npm run build` (or `cd client && npm run build`)
- **Output Directory:** `dist` (or `client/dist`)
- **Environment Variable:** `VITE_BUILD_TARGET` NOT SET (or set to anything other than `landing`)
- **Component:** `App`

---

## Troubleshooting

### Landing Page Shows Main App

**Check:**
1. Is `VITE_BUILD_TARGET=landing` set in Vercel dashboard for `landing-page` project?
2. Are you viewing `fanclubz.app` (not `app.fanclubz.app`)?
3. Check deployment logs - does build command include `VITE_BUILD_TARGET=landing`?

### Main App Shows Landing Page

**Check:**
1. Is `VITE_BUILD_TARGET` NOT set (or not `landing`) in Vercel dashboard for `fan-club-z` project?
2. Are you viewing `app.fanclubz.app` (not `fanclubz.app`)?
3. Check deployment logs - does build command NOT include `VITE_BUILD_TARGET=landing`?

### Build Fails

**Check:**
1. Root directory correct? (Empty for landing-page, `client` for fan-club-z)
2. Build command correct? (Includes `cd client &&` for landing-page)
3. Environment variables set correctly?
4. Dependencies installed? (`npm install` runs successfully)

---

## Automated Deployment Procedure

When user requests "push to production for landing page and main app", follow this procedure:

### Step 1: Commit and Push Code
```bash
git add <changed-files>
git commit -m "Description of changes"
git push
```

### Step 2: Main App Auto-Deploys
- ✅ Main app (`fan-club-z`) **automatically deploys** when code is pushed to `main`
- ✅ No manual action needed
- ✅ Verify deployment in Vercel dashboard: `fan-club-z` project

### Step 3: Landing Page Manual Deploy (Required)
The landing page does NOT auto-deploy reliably. **Always manually trigger:**

```bash
# Link to landing-page project (if not already linked)
vercel link --yes --project=landing-page --scope=teddys-projects-d67ab22a

# Deploy to production
vercel --prod --yes
```

### Step 4: Verify Both Deployments
1. **Landing Page:** Check `https://fanclubz.app` for changes
2. **Main App:** Check `https://app.fanclubz.app` for changes
3. **Both:** Check Vercel dashboard for deployment status

### Important Notes
- **Main app** auto-deploys from git push ✅
- **Landing page** requires manual CLI deployment ⚠️
- Always deploy **both** projects when changes affect either
- If only landing page changes: Still deploy both (main app won't be affected)
- If only main app changes: Still deploy both (landing page won't be affected)

---

## Summary

**CRITICAL RULES:**

1. **TWO SEPARATE PROJECTS:** `landing-page` and `fan-club-z` are DIFFERENT Vercel projects
2. **SAME REPOSITORY:** Both deploy from same `main` branch
3. **DIFFERENT BUILD TARGETS:** Controlled by `VITE_BUILD_TARGET` environment variable
4. **DIFFERENT DOMAINS:** `fanclubz.app` (landing) vs `app.fanclubz.app` (main app)
5. **NEVER CONFUSE THEM:** Always verify which project you're deploying to
6. **ALWAYS DEPLOY BOTH:** When user requests production push, deploy both projects

**When in doubt:**
- Check Vercel dashboard for project name
- Verify `VITE_BUILD_TARGET` environment variable
- Check deployment logs
- Test both domains after deployment
- Use Vercel CLI to manually deploy landing page if auto-deploy fails

---

**Last Updated:** January 2025  
**Maintained By:** Development Team  
**Related Docs:** `LANDING_PAGE_DEPLOYMENT.md`, `PRODUCTION_CHALLENGES_AND_SOLUTIONS.md`

