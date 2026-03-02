# 🔧 Phase 3: Backend Deployment

**Status:** Ready to Execute  
**Risk Level:** MEDIUM (new routes, feature-flagged, isolated from wallet routes)  
**Estimated Time:** 10-15 minutes

---

## 🎯 Objective

Deploy backend routes for badges and referrals system. Routes are **feature-flagged** and will return 404 until enabled in Phase 4. This ensures safe deployment without affecting existing functionality.

---

## ✅ Pre-Deployment Checklist

- [x] Phase 1 complete (recovery point created)
- [x] Phase 2 complete (database migrations successful)
- [ ] Backend code files ready (badges.ts, referrals.ts)
- [ ] Feature flags will be set to OFF in Render

---

## 📋 Files to Deploy

### New Route Files:
1. `server/src/routes/badges.ts` - OG badges API routes
2. `server/src/routes/referrals.ts` - Referrals API routes

### Modified Files:
3. `server/src/routes/users.ts` - Adds badge/referral fields to user responses
4. `server/src/index.ts` - Registers new routes

---

## 🚀 Deployment Steps

### Step 1: Verify Files Exist

```bash
# Check that route files exist
ls -la server/src/routes/badges.ts
ls -la server/src/routes/referrals.ts

# Check modified files
git status server/src/routes/users.ts server/src/index.ts
```

### Step 2: Commit Backend Changes

```bash
# Stage new route files
git add server/src/routes/badges.ts
git add server/src/routes/referrals.ts

# Stage modified files
git add server/src/routes/users.ts
git add server/src/index.ts

# Commit with descriptive message
git commit -m "feat(backend): add badges and referrals API routes (feature-flagged)

- Add badges.ts with OG badge routes (GET /api/badges/og/*)
- Add referrals.ts with referral routes (GET /api/referrals/*)
- Update users.ts to include badge/referral fields
- Register routes in index.ts
- All routes feature-flagged (return 404 when disabled)
- No changes to wallet/payment routes"
```

### Step 3: Push to Main

```bash
# Push to main (triggers Render auto-deploy)
git push origin main
```

### Step 4: Wait for Render Deployment

- Render will automatically detect the push
- Deployment typically takes 2-3 minutes
- Monitor Render dashboard for deployment status

### Step 5: Verify Routes Return 404 (Feature Flags OFF)

After deployment completes, test that routes are disabled:

```bash
# Test badge endpoint (should return 404)
curl https://api.fanclubz.app/api/badges/og/summary

# Expected response:
# {
#   "error": "Feature disabled",
#   "message": "OG badges system is not enabled",
#   "version": "2.0.x"
# }

# Test referral endpoint (should return 404)
curl https://api.fanclubz.app/api/referrals/stats

# Expected response:
# {
#   "error": "Feature disabled",
#   "message": "Referral system is not enabled",
#   "version": "2.0.x"
# }
```

**If routes return 404 with "Feature disabled" message → ✅ Success!**

---

## 🔒 Feature Flags Configuration (Render)

### Current State (Phase 3):
Routes are deployed but **disabled** by default. Feature flags should be:

```
BADGES_OG_ENABLE=0  (or not set)
REFERRAL_ENABLE=0  (or not set)
```

### How to Verify in Render:

1. Go to Render Dashboard → Your backend service
2. Navigate to: **Environment** → **Environment Variables**
3. Check that:
   - `BADGES_OG_ENABLE` is either **not set** or set to `0`
   - `REFERRAL_ENABLE` is either **not set** or set to `0`

**Important:** Do NOT enable these flags yet. That happens in Phase 4.

---

## ✅ Verification Checklist

After deployment:

- [ ] Git commit successful
- [ ] Push to main successful
- [ ] Render deployment completed (check dashboard)
- [ ] Badge endpoint returns 404 with "Feature disabled"
- [ ] Referral endpoint returns 404 with "Feature disabled"
- [ ] Existing wallet/payment endpoints still work (test one)
- [ ] No errors in Render logs

---

## 🚨 Troubleshooting

### Routes Return 500 Instead of 404
**Cause:** Routes may not be properly feature-flagged  
**Solution:** Check `server/src/routes/badges.ts` and `server/src/routes/referrals.ts` for `checkFeatureEnabled` middleware

### Routes Return 200 (Not Disabled)
**Cause:** Feature flags may be set to `1` in Render  
**Solution:** Verify in Render dashboard that `BADGES_OG_ENABLE=0` and `REFERRAL_ENABLE=0`

### Deployment Fails
**Cause:** Build errors or missing dependencies  
**Solution:** Check Render build logs for errors

### Existing Routes Broken
**Cause:** Unlikely, but possible if index.ts registration is wrong  
**Solution:** Check Render logs, verify wallet routes still work

---

## 📝 Deployment Log Template

```
Phase 3: Backend Deployment
Date: _______________
Time Started: _______________

[ ] Files verified (badges.ts, referrals.ts exist)
[ ] Changes committed
[ ] Pushed to main
[ ] Render deployment started at: _______
[ ] Render deployment completed at: _______
[ ] Badge endpoint tested - Returns 404: _______
[ ] Referral endpoint tested - Returns 404: _______
[ ] Wallet endpoint tested - Still works: _______

Time Completed: _______________
Status: ✅ Complete / ⚠️ Issues (describe below)
```

---

## ⚠️ Important Notes

1. **Feature flags OFF** - Routes are deployed but disabled
2. **No wallet impact** - Badge/referral routes are separate from wallet routes
3. **Safe to deploy** - Even if flags are accidentally ON, features won't work without frontend
4. **Can rollback** - If issues occur, can revert commit or disable flags

---

## ✅ Success Criteria

Phase 3 is successful when:
- [x] Backend code deployed to Render
- [x] Routes return 404 when feature flags are OFF
- [x] No errors in Render logs
- [x] Existing wallet/payment endpoints still work

---

## 🎯 Next Steps

After Phase 3 completion:
- ✅ Backend routes deployed (but disabled)
- ✅ Proceed to Phase 4: Frontend Deployment
- ✅ Then Phase 5: Enable Features

---

**Created:** January 28, 2025  
**Status:** Ready for Execution

