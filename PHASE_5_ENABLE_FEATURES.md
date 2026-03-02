# 🚀 Phase 5: Enable Features (Gradual Rollout)

**Status:** Ready to Execute  
**Risk Level:** MEDIUM (enabling features, but can disable instantly)  
**Estimated Time:** 20-30 minutes (with testing)

---

## 🎯 Objective

Gradually enable badges and referrals features in production. Enable backend first, test thoroughly, then enable frontend. This phased approach allows us to catch issues early and disable instantly if needed.

---

## ✅ Pre-Enable Checklist

- [x] Phase 1 complete (recovery point created)
- [x] Phase 2 complete (database migrations successful)
- [x] Phase 3 complete (backend routes deployed)
- [x] Phase 4 complete (frontend components deployed)
- [ ] Wallet/payment functionality verified working
- [ ] Ready to enable features

---

## 📋 Enable Strategy

### Step 1: Enable Backend Features (Test First)
- Set feature flags in Render
- Test API endpoints
- Verify routes return data (not 404)

### Step 2: Enable Frontend Features (After Backend Verified)
- Set feature flags in Vercel
- Test UI components
- Verify features appear and work correctly

### Step 3: Monitor & Verify
- Test all badge/referral functionality
- Verify wallet/payment still works
- Monitor for errors

---

## 🔧 Step 1: Enable Backend Features

### 1.1: Set Feature Flags in Render

1. Go to **Render Dashboard** → Your backend service
2. Navigate to: **Environment** → **Environment Variables**
3. **Add/Update** these variables:

```
BADGES_OG_ENABLE=1
BADGES_OG_COUNTS=25,100,500
REFERRAL_ENABLE=1
REFERRAL_MAX_SIGNUPS_PER_IP_DAY=10
REFERRAL_MAX_SIGNUPS_PER_DEVICE_DAY=5
ADMIN_API_KEY=your-secret-admin-key-here
```

**Important:** 
- If `ADMIN_API_KEY` doesn't exist, generate a strong random string
- Keep it secret - used for admin badge operations

4. **Save** the environment variables
5. **Redeploy** the backend service (Render will auto-redeploy)

### 1.2: Wait for Deployment

- Monitor Render dashboard for deployment completion
- Typically takes 2-3 minutes
- Check logs for any errors

### 1.3: Test Backend Endpoints

After deployment completes, test the endpoints:

```bash
# Test badge endpoint (should return data, not 404)
curl https://api.fanclubz.app/api/badges/og/summary \
  -H "x-admin-key: your-admin-key"

# Expected: JSON response with badge summary
# {
#   "data": {
#     "gold": { "holders": 0, "capacity": 25, "remaining": 25 },
#     "silver": { "holders": 0, "capacity": 100, "remaining": 100 },
#     "bronze": { "holders": 0, "capacity": 500, "remaining": 500 }
#   },
#   "message": "OG badge summary fetched",
#   "version": "2.0.x"
# }

# Test referral endpoint (should return data, not 404)
curl https://api.fanclubz.app/api/referrals/stats \
  -H "Authorization: Bearer YOUR_USER_TOKEN"

# Expected: JSON response with referral stats
# {
#   "data": { "activeReferrals": 0, "totalSignups": 0, ... },
#   "message": "Referral stats fetched",
#   "version": "2.0.x"
# }
```

**If endpoints return data (not 404) → ✅ Backend enabled successfully!**

### 1.4: Verify Wallet/Payment Still Works

**CRITICAL:** Test that wallet/payment functionality is unaffected:

```bash
# Test wallet endpoint (should still work)
curl https://api.fanclubz.app/api/wallet/summary \
  -H "Authorization: Bearer YOUR_USER_TOKEN"

# Expected: Normal wallet summary response
```

**If wallet endpoints still work → ✅ Safe to proceed!**

---

## 🎨 Step 2: Enable Frontend Features

### 2.1: Set Feature Flags in Vercel

1. Go to **Vercel Dashboard** → `fan-club-z` project
2. Navigate to: **Settings** → **Environment Variables**
3. **Add/Update** these variables:

```
VITE_BADGES_OG_ENABLE=1
VITE_REFERRALS_ENABLE=1
VITE_FRONTEND_URL=https://app.fanclubz.app
```

4. **Save** the environment variables
5. **Redeploy** the frontend (Vercel will auto-redeploy)

### 2.2: Wait for Deployment

- Monitor Vercel dashboard for deployment completion
- Typically takes 2-3 minutes
- Check build logs for any errors

### 2.3: Test Frontend Features

After deployment completes, test in browser:

1. **Open app:** `https://app.fanclubz.app`
2. **Profile Page:**
   - Navigate to your profile
   - Should see "Achievements" section (if you have a badge)
   - Should see "Invite Friends" section (referral section)
   - Verify referral link displays
   - Test copy link button
   - Test share button

3. **Leaderboard:**
   - Navigate to leaderboard
   - Should see badges next to usernames (if users have badges)
   - Verify badges display correctly

4. **Comments:**
   - Navigate to a prediction with comments
   - Should see badges in comment author chips (if users have badges)
   - Verify badges display correctly

5. **Wallet Page (CRITICAL):**
   - Navigate to wallet page
   - Verify balance displays correctly
   - Verify deposit/withdraw still work
   - **This is the most important check!**

**If features appear and work → ✅ Frontend enabled successfully!**

---

## ✅ Step 3: Comprehensive Testing

### Badge Functionality:
- [ ] Badges display on profile page
- [ ] Badge tooltips show member numbers
- [ ] Badges display in leaderboard
- [ ] Badges display in comment chips
- [ ] Badge hover effects work

### Referral Functionality:
- [ ] Referral section shows on own profile
- [ ] Referral link displays correctly
- [ ] Copy link button works
- [ ] Share button works (native share on mobile)
- [ ] Referral stats display correctly
- [ ] Referral redirect page works (`/r/code`)

### Wallet/Payment (CRITICAL):
- [ ] Wallet page loads correctly
- [ ] Balance displays correctly
- [ ] Deposit modal works
- [ ] Withdraw modal works
- [ ] Transaction history displays
- [ ] Staking/prediction entry works
- [ ] Escrow locks work correctly

---

## 🚨 Emergency Disable Procedure

If ANY issues occur, **instantly disable** features:

### Quick Disable (5 minutes):

**Render (Backend):**
1. Go to Render Dashboard → Environment Variables
2. Set `BADGES_OG_ENABLE=0` and `REFERRAL_ENABLE=0`
3. Redeploy

**Vercel (Frontend):**
1. Go to Vercel Dashboard → Environment Variables
2. Set `VITE_BADGES_OG_ENABLE=0` and `VITE_REFERRALS_ENABLE=0`
3. Redeploy

Features will be disabled within 2-3 minutes.

---

## 📝 Enablement Log Template

```
Phase 5: Enable Features
Date: _______________
Time Started: _______________

Backend Enablement:
[ ] Feature flags set in Render
[ ] Backend redeployed
[ ] Badge endpoint tested - Returns data: _______
[ ] Referral endpoint tested - Returns data: _______
[ ] Wallet endpoint tested - Still works: _______

Frontend Enablement:
[ ] Feature flags set in Vercel
[ ] Frontend redeployed
[ ] Profile page tested - Features visible: _______
[ ] Leaderboard tested - Badges visible: _______
[ ] Comments tested - Badges visible: _______
[ ] Wallet page tested - Still works: _______

Comprehensive Testing:
[ ] All badge functionality works
[ ] All referral functionality works
[ ] Wallet/payment functionality intact

Time Completed: _______________
Status: ✅ Complete / ⚠️ Issues (describe below)
```

---

## ⚠️ Important Notes

1. **Gradual rollout** - Enable backend first, test, then frontend
2. **Can disable instantly** - Feature flags allow instant disable
3. **Monitor closely** - Watch for errors in first hour
4. **Test wallet first** - Most critical functionality
5. **Rollback available** - Can revert to recovery branch if needed

---

## ✅ Success Criteria

Phase 5 is successful when:
- [x] Backend features enabled and working
- [x] Frontend features enabled and working
- [x] All badge functionality works
- [x] All referral functionality works
- [x] Wallet/payment functionality intact
- [x] No errors in logs
- [x] No console errors

---

## 🎯 Post-Enablement

After successful enablement:
- ✅ Features are live in production
- ✅ Monitor for 24-48 hours
- ✅ Collect user feedback
- ✅ Watch for any issues
- ✅ Document any learnings

---

**Created:** January 28, 2025  
**Status:** Ready for Execution

