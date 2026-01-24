# Release Workflow & Branch Strategy

**Last Updated:** 2025-01-23

## Overview

This document defines the branch strategy and release workflow to ensure **web production stability** while allowing iOS/App Store work to proceed safely in isolation.

## Branch Definitions

### `main`
- **Purpose:** Development integration branch
- **Contains:** Latest work including iOS/App Store changes
- **Deployment:** Never deploy directly to production web
- **Use:** Feature development, testing, integration

### `release/web-stable`
- **Purpose:** Production web deployment branch
- **Contains:** Only web-safe, production-tested changes
- **Deployment:** **This is the ONLY branch that deploys to production web**
- **Policy:** 
  - Only merge changes that have been verified safe for web production
  - Never merge iOS-specific changes directly
  - If an iOS fix benefits web, cherry-pick it with explicit review

### `release/ios-store`
- **Purpose:** iOS App Store compliance and native app work
- **Contains:** All iOS/Android/Capacitor changes, store-safe mode, native-only features
- **Deployment:** Can deploy to preview/test environments, **NEVER to production web**
- **Policy:**
  - All iOS work happens here
  - Can include breaking changes for native builds
  - Must not affect web behavior when merged back

## Deployment Rules

### Production Web Deployment

**CRITICAL:** Production web **MUST** deploy from `release/web-stable` only.

#### Vercel Configuration
1. Go to Vercel Dashboard → Project Settings → Git
2. Set **Production Branch** = `release/web-stable`
3. Verify that automatic deployments are enabled for this branch only
4. Preview deployments from other branches are fine, but production must be locked

#### Render Configuration
1. Go to Render Dashboard → Service Settings → Build & Deploy
2. Set **Branch** = `release/web-stable`
3. Ensure auto-deploy is enabled only for this branch

#### Manual Deployment
```bash
# Deploy from stable branch
git checkout release/web-stable
git pull origin release/web-stable
# Then trigger deployment via your platform
```

### iOS Build Deployment

iOS builds are created from `release/ios-store` branch:

```bash
# Build iOS app
git checkout release/ios-store
npm run build
npx cap sync ios
# Open in Xcode and build/archive
```

## Merge Policy

### From `main` → `release/web-stable`

**Rules:**
- Only merge changes that are **web-safe** and **production-ready**
- Require explicit review for any change that touches:
  - Authentication flows
  - Payment/wallet logic
  - API routes
  - Database migrations
- **Never merge iOS-specific changes** (Capacitor config, native-only features)

**Process:**
```bash
# Create PR: main → release/web-stable
# Review checklist:
# [ ] No iOS/Capacitor-specific changes
# [ ] No breaking changes to web auth/payment flows
# [ ] Tested in preview environment
# [ ] No new dependencies that break web builds
```

### From `release/ios-store` → `release/web-stable`

**Rules:**
- **Generally: DO NOT merge directly**
- If an iOS fix also benefits web (e.g., a bug fix in shared code):
  1. Create a PR with explicit justification
  2. Cherry-pick only the web-safe parts
  3. Remove any iOS-specific code paths
  4. Require explicit review

### From `main` → `release/ios-store`

**Rules:**
- All iOS work merges here
- Can include breaking changes for native builds
- Must ensure web behavior is not affected (use build targets/runtime flags)

**Process:**
```bash
# Create PR: main → release/ios-store
# Or merge directly if working on ios-store branch
```

## Rollback Procedure

### Emergency Web Production Rollback

If production web breaks, rollback immediately:

#### Option 1: Redeploy Previous Stable Tag
```bash
# Find the stable tag
git tag -l "web-stable-*"

# Checkout the tag
git checkout web-stable-YYYY-MM-DD

# Force push to release/web-stable (if needed)
git checkout release/web-stable
git reset --hard web-stable-YYYY-MM-DD
git push origin release/web-stable --force

# Trigger redeployment in Vercel/Render
```

#### Option 2: Revert Last Commit
```bash
# On release/web-stable
git revert HEAD
git push origin release/web-stable
```

#### Option 3: Reset to Known Good Commit
```bash
# Find the last known good commit SHA
git log release/web-stable --oneline

# Reset to that commit
git checkout release/web-stable
git reset --hard <GOOD_COMMIT_SHA>
git push origin release/web-stable --force
```

### Verification After Rollback

1. **Check deployment status:**
   - Vercel: Dashboard → Deployments → verify latest is from rollback commit
   - Render: Dashboard → verify service is running from rollback commit

2. **Smoke test production:**
   - [ ] Web login works
   - [ ] Predictions load
   - [ ] Wallet displays correctly
   - [ ] Stakes can be placed
   - [ ] Profile page loads

3. **Monitor error logs:**
   - Check for any new errors in production logs
   - Verify no CORS/auth failures

## Creating Stable Baselines

### When to Create a New Stable Tag

Create a new `web-stable-YYYY-MM-DD` tag when:
- A major feature is successfully deployed to production
- After a critical bug fix is verified in production
- Before starting risky changes (iOS work, major refactors)

### How to Create a Stable Tag

```bash
# 1. Ensure you're on the commit you want to tag
git checkout release/web-stable
git pull origin release/web-stable

# 2. Verify this is the correct commit (check production is running this)
git log --oneline -1

# 3. Create the tag
TAG_DATE=$(date +%Y-%m-%d)
git tag -a "web-stable-${TAG_DATE}" -m "Stable web production baseline - ${TAG_DATE}"

# 4. Push the tag
git push origin "web-stable-${TAG_DATE}"
```

## Branch Protection Mindset

Even if GitHub branch protection rules are not yet configured, follow these principles:

### `release/web-stable` Protection
- **Never force-push** (except during emergency rollback)
- **Require PR review** for all merges
- **Require passing CI** (if configured)
- **No direct commits** (always via PR)

### `release/ios-store` Protection
- Can be more flexible for rapid iOS iteration
- Still require review for changes that touch shared code
- Ensure iOS changes don't leak into web builds

## Finding the Production Commit

### From Vercel
1. Go to Vercel Dashboard → Your Project
2. Click "Deployments" tab
3. Find the production deployment (marked with "Production" badge)
4. Click on it to see the commit SHA
5. Copy the commit SHA

### From Render
1. Go to Render Dashboard → Your Service
2. Click "Events" or "Deployments" tab
3. Find the latest production deployment
4. Click to see commit SHA
5. Copy the commit SHA

### Using the Commit SHA
```bash
# Verify the commit
git show <COMMIT_SHA> --oneline

# Create stable tag from it
git tag -a "web-stable-YYYY-MM-DD" <COMMIT_SHA> -m "Stable baseline from production"
git push origin "web-stable-YYYY-MM-DD"
```

## Verification Checklist

Before deploying to production web, verify:

### Pre-Deployment
- [ ] Changes are on `release/web-stable` branch
- [ ] No iOS/Capacitor-specific code in the diff
- [ ] All tests pass (if applicable)
- [ ] Preview deployment works correctly

### Post-Deployment
- [ ] Web login works
- [ ] Predictions feed loads
- [ ] Wallet displays correctly
- [ ] Stakes can be placed
- [ ] Profile page loads
- [ ] No console errors in production
- [ ] No CORS/auth failures in logs

## Troubleshooting

### "Production broke after merge"
1. **Immediately rollback** using the procedure above
2. Identify the breaking commit
3. Revert or fix in a new PR
4. Test thoroughly before re-deploying

### "iOS changes leaked into web"
1. Check if changes are behind build target flags
2. If not, revert the merge
3. Re-apply iOS changes with proper gating (see Phase 2)

### "Can't find the production commit"
- Use the most recent stable tag
- Or use the commit before iOS work started (check git log for "Phase 8" or "iOS" commits)

## Next Steps

After establishing this workflow:
1. Configure branch protection in GitHub (if using GitHub)
2. Set up CI/CD to enforce branch rules
3. Document iOS build process separately
4. Create automated rollback scripts (optional)
