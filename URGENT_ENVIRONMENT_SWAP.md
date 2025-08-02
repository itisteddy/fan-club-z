# 🚨 URGENT: Safe Environment Swap Guide

## Current Problem
- **Production**: Running test/dev code (fan-club-x6l88chd)
- **Development**: Running production code (fan-club-z-*)

## ✅ Safe Swap Strategy

### Step 1: Create Backup Branch (CRITICAL FIRST STEP)
```bash
# Save current state before any changes
git checkout main
git checkout -b backup-before-swap-$(date +%Y%m%d-%H%M%S)
git push origin backup-before-swap-$(date +%Y%m%d-%H%M%S)

# Save development state too
git checkout development
git checkout -b backup-dev-before-swap-$(date +%Y%m%d-%H%M%S)
git push origin backup-dev-before-swap-$(date +%Y%m%d-%H%M%S)
```

### Step 2: Verify Current Environment Settings in Vercel Dashboard

**Go to Vercel Dashboard:**
1. https://vercel.com/teddys-projects-d67ab22a/fan-club-z-dev
2. **Settings** → **Environment Variables**
3. **Screenshot current settings** for backup

**Current Expected Config:**
- **Production** (main branch): Should have `VITE_ENVIRONMENT=production`
- **Development** (development branch): Should have `VITE_ENVIRONMENT=development`

### Step 3: Safe Branch Content Swap

#### Method A: Swap Branch Content (Recommended)
```bash
# Create temporary branches for the swap
git checkout main
git checkout -b temp-main-content

git checkout development  
git checkout -b temp-dev-content

# Now perform the swap
git checkout main
git reset --hard temp-dev-content
git checkout development
git reset --hard temp-main-content

# Verify the swap worked
git log --oneline -5  # Check both branches
```

#### Method B: Environment Variable Fix (If branches are correct)
If the code is in the right branches but environments are wrong:

1. **In Vercel Dashboard:**
   - Go to **fan-club-z-dev** project
   - **Settings** → **Environment Variables**
   - **Production Environment**: Ensure `VITE_ENVIRONMENT=production`
   - **Preview Environment**: Ensure `VITE_ENVIRONMENT=development`

### Step 4: Force Redeploy Both Environments
```bash
# After branch swap, force redeploy
git checkout main
git commit --allow-empty -m "fix: force production redeploy after environment swap"
git push origin main

git checkout development
git commit --allow-empty -m "fix: force development redeploy after environment swap"
git push origin development
```

### Step 5: Verification Steps

**Check these URLs after deployment:**
- **Production**: Should show production features, no debug info
- **Development**: Should show debug info, test features

**Verify in Browser Console:**
```javascript
// Should show in production: "production"
console.log(import.meta.env.VITE_ENVIRONMENT)

// Should show in development: "development"  
console.log(import.meta.env.VITE_DEBUG)
```

### Step 6: Update Domain Configurations

**Current Domain Mappings (verify these are correct):**
- `app.fanclubz.app` → Production environment (main branch)
- `dev.fanclubz.app` → Development environment (development branch)

## ⚠️ CRITICAL SAFETY MEASURES

### Before Making ANY Changes:
1. **Backup current deployments** - screenshot all Vercel settings
2. **Document current URLs** - note which URL has which version
3. **Test current functionality** - ensure you know what "production" vs "dev" features look like
4. **Have rollback plan ready**

### Rollback Plan (If Something Goes Wrong):
```bash
# Restore from backup branches
git checkout main
git reset --hard backup-before-swap-YYYYMMDD-HHMMSS

git checkout development  
git reset --hard backup-dev-before-swap-YYYYMMDD-HHMMSS

# Force redeploy
git push origin main --force-with-lease
git push origin development --force-with-lease
```

## 🎯 Expected Final State

**After successful swap:**
- **Production** (`app.fanclubz.app`): Clean production code, no debug
- **Development** (`dev.fanclubz.app`): Development features, debug enabled

## ✅ Verification Checklist

- [ ] Backup branches created and pushed
- [ ] Current state documented with screenshots
- [ ] Environment variables verified in Vercel
- [ ] Branch content swapped (if needed)
- [ ] Forced redeployment completed
- [ ] Production URL shows correct version
- [ ] Development URL shows correct version
- [ ] No broken functionality
- [ ] SSL certificates working on both domains

---

**⚠️ STOP**: Don't proceed without creating backups first!
**📞 Need Help?**: Test each step in staging first if possible
