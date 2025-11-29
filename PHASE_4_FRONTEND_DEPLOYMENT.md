# 🎨 Phase 4: Frontend Deployment

**Status:** Ready to Execute  
**Risk Level:** LOW (feature-flagged, isolated components, no wallet/payment changes)  
**Estimated Time:** 10-15 minutes

---

## 🎯 Objective

Deploy frontend components for badges and referrals system. Components are **feature-flagged** and will not render until enabled in Phase 5. This ensures safe deployment without affecting existing UI.

---

## ✅ Pre-Deployment Checklist

- [x] Phase 1 complete (recovery point created)
- [x] Phase 2 complete (database migrations successful)
- [x] Phase 3 complete (backend routes deployed)
- [ ] Frontend component files ready
- [ ] Feature flags will be set to OFF in Vercel

---

## 📋 Files to Deploy

### New Component Directories:
1. `client/src/components/badges/` - OG badge components
2. `client/src/components/referral/` - Referral components
3. `client/src/components/profile/` - Profile badge/referral sections
4. `client/public/badges/` - Badge SVG assets

### New Files:
5. `client/src/components/comments/CommentAuthorChip.tsx` - Badge in comments
6. `client/src/hooks/useReferral.ts` - Referral hook
7. `client/src/lib/referral.ts` - Referral utilities
8. `client/src/pages/ReferralRedirectPage.tsx` - Referral redirect handler

### Modified Files:
9. `client/src/pages/ProfilePageV2.tsx` - Adds badge/referral sections
10. `client/src/pages/UnifiedLeaderboardPage.tsx` - Adds badges to leaderboard
11. `client/src/components/comments/CommentItem.tsx` - Uses CommentAuthorChip
12. `client/src/components/comments/index.ts` - Exports CommentAuthorChip
13. `client/src/App.tsx` - Adds referral redirect route
14. `client/src/store/authStore.ts` - May include badge/referral fields

---

## 🚀 Deployment Steps

### Step 1: Verify Files Exist

```bash
# Check component directories
ls -la client/src/components/badges/
ls -la client/src/components/referral/
ls -la client/src/components/profile/
ls -la client/public/badges/

# Check modified files
git status client/src/pages/ProfilePageV2.tsx
git status client/src/pages/UnifiedLeaderboardPage.tsx
```

### Step 2: Commit Frontend Changes

```bash
# Stage new component directories
git add client/src/components/badges/
git add client/src/components/referral/
git add client/src/components/profile/
git add client/public/badges/

# Stage new files
git add client/src/components/comments/CommentAuthorChip.tsx
git add client/src/hooks/useReferral.ts
git add client/src/lib/referral.ts
git add client/src/pages/ReferralRedirectPage.tsx

# Stage modified files
git add client/src/pages/ProfilePageV2.tsx
git add client/src/pages/UnifiedLeaderboardPage.tsx
git add client/src/components/comments/CommentItem.tsx
git add client/src/components/comments/index.ts
git add client/src/App.tsx
git add client/src/store/authStore.ts

# Commit with descriptive message
git commit -m "feat(frontend): add badges and referrals UI components (feature-flagged)

- Add badges components (OGBadge, OGBadgeEnhanced, ProfileBadgesSection)
- Add referral components (ReferralCard, ReferralShareModal, ProfileReferralSection)
- Add CommentAuthorChip with badge support
- Add useReferral hook and referral utilities
- Update ProfilePageV2 with badge/referral sections
- Update UnifiedLeaderboardPage with badge display
- Add referral redirect page handler
- All components feature-flagged (return null when disabled)
- No changes to wallet/payment components
- Safe for production deployment with flags OFF"
```

### Step 3: Push to Main

```bash
# Push to main (triggers Vercel auto-deploy)
git push origin main
```

### Step 4: Wait for Vercel Deployment

- Vercel will automatically detect the push
- Deployment typically takes 2-3 minutes
- Monitor Vercel dashboard for deployment status

### Step 5: Verify Features are Hidden (Feature Flags OFF)

After deployment completes:

1. **Open app in browser:** `https://app.fanclubz.app`
2. **Navigate to Profile page** - Badge/referral sections should NOT appear
3. **Navigate to Leaderboard** - Badges should NOT appear next to usernames
4. **Navigate to Comments** - Badges should NOT appear in author chips

**If features are hidden → ✅ Success!**

---

## 🔒 Feature Flags Configuration (Vercel)

### Current State (Phase 4):
Components are deployed but **disabled** by default. Feature flags should be:

```
VITE_BADGES_OG_ENABLE=0  (or not set)
VITE_REFERRALS_ENABLE=0  (or not set)
```

### How to Verify in Vercel:

1. Go to Vercel Dashboard → `fan-club-z` project
2. Navigate to: **Settings** → **Environment Variables**
3. Check that:
   - `VITE_BADGES_OG_ENABLE` is either **not set** or set to `0`
   - `VITE_REFERRALS_ENABLE` is either **not set** or set to `0`
   - `VITE_FRONTEND_URL` is set to `https://app.fanclubz.app`

**Important:** Do NOT enable these flags yet. That happens in Phase 5.

---

## ✅ Verification Checklist

After deployment:

- [ ] Git commit successful
- [ ] Push to main successful
- [ ] Vercel deployment completed (check dashboard)
- [ ] Profile page loads (no badge/referral sections visible)
- [ ] Leaderboard loads (no badges visible)
- [ ] Comments load (no badges in author chips)
- [ ] Wallet page still works (critical check)
- [ ] No console errors in browser
- [ ] No build errors in Vercel logs

---

## 🚨 Troubleshooting

### Features Appear (Should be Hidden)
**Cause:** Feature flags may be set to `1` in Vercel  
**Solution:** Verify in Vercel dashboard that flags are `0` or not set

### Build Fails
**Cause:** TypeScript errors or missing dependencies  
**Solution:** Check Vercel build logs for specific errors

### Wallet Page Broken
**Cause:** Unlikely, but possible if App.tsx routing is wrong  
**Solution:** Check Vercel logs, verify wallet routes still work

### Console Errors
**Cause:** Component imports or feature flag checks may be wrong  
**Solution:** Check browser console for specific error messages

---

## 📝 Deployment Log Template

```
Phase 4: Frontend Deployment
Date: _______________
Time Started: _______________

[ ] Files verified (all component directories exist)
[ ] Changes committed
[ ] Pushed to main
[ ] Vercel deployment started at: _______
[ ] Vercel deployment completed at: _______
[ ] Profile page tested - Features hidden: _______
[ ] Leaderboard tested - Features hidden: _______
[ ] Wallet page tested - Still works: _______

Time Completed: _______________
Status: ✅ Complete / ⚠️ Issues (describe below)
```

---

## ⚠️ Important Notes

1. **Feature flags OFF** - Components are deployed but disabled
2. **No wallet impact** - Badge/referral components don't touch wallet components
3. **Safe to deploy** - Even if flags are accidentally ON, features won't work without backend enabled
4. **Can rollback** - If issues occur, can revert commit or disable flags

---

## ✅ Success Criteria

Phase 4 is successful when:
- [x] Frontend code deployed to Vercel
- [x] Features are hidden when feature flags are OFF
- [x] No errors in Vercel logs
- [x] No errors in browser console
- [x] Existing wallet/payment pages still work

---

## 🎯 Next Steps

After Phase 4 completion:
- ✅ Frontend components deployed (but disabled)
- ✅ Proceed to Phase 5: Enable Features (Gradual Rollout)
- ✅ Test thoroughly before enabling

---

**Created:** January 28, 2025  
**Status:** Ready for Execution

