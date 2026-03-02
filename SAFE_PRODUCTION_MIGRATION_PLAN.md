# 🛡️ Safe Production Migration Plan: Badges & Referrals

**Date:** January 28, 2025  
**Purpose:** Migrate badges and referrals features to production without breaking wallet/payment functionality  
**Risk Level:** MEDIUM (new features, feature-flagged, isolated from core wallet logic)

---

## 📋 Pre-Migration Checklist

### ✅ Step 1: Create Recovery Point (CRITICAL)

**Before making ANY changes, save current production state:**

```bash
# 1. Create recovery branch from current main
git checkout main
git pull origin main
git checkout -b recovery/pre-badges-referrals-$(date +%Y%m%d-%H%M%S)

# 2. Create recovery tag
git tag -a fcz-pre-badges-referrals-$(date +%Y%m%d-%H%M%S) \
  -m "Recovery point before badges/referrals migration - wallet/payment stable"

# 3. Push recovery branch and tag
git push origin recovery/pre-badges-referrals-*
git push origin fcz-pre-badges-referrals-*
```

**Why:** This allows instant rollback if anything breaks.

---

## 🎯 Migration Strategy: Phased Approach

### Phase 1: Database Migrations (Low Risk)
**Risk:** LOW - Only adds new tables/columns, doesn't modify existing wallet/payment tables

### Phase 2: Backend Routes (Medium Risk)
**Risk:** MEDIUM - New routes only, feature-flagged, isolated from wallet routes

### Phase 3: Frontend Components (Low Risk)
**Risk:** LOW - Feature-flagged, only renders when enabled, doesn't touch wallet components

### Phase 4: Integration (Medium Risk)
**Risk:** MEDIUM - Integrates into existing pages but behind feature flags

---

## 🔒 Phase 1: Database Migrations (Do First)

### Safety Checks:
- ✅ All migrations are **additive only** (no ALTER/DROP on wallet/payment tables)
- ✅ Migrations use `IF NOT EXISTS` clauses
- ✅ Can be run in any order (no dependencies on wallet tables)

### Migration Order:

```sql
-- Run these in Supabase SQL Editor (one at a time, verify each):

-- 1. Referral system migrations (201-206)
server/migrations/201_users_referrals.sql
server/migrations/202_referral_clicks.sql
server/migrations/203_referral_attributions.sql
server/migrations/204_auth_logins.sql
server/migrations/205_referral_stats_mv.sql
server/migrations/206_referral_stats_mv_v2.sql

-- 2. Badge system migrations (301-303)
server/migrations/301_badges_og.sql
server/migrations/302_badges_admin_views.sql
server/migrations/303_badges_member_numbers.sql
```

### Verification After Migrations:

```sql
-- Check referral tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users_referrals', 'referral_clicks', 'referral_attributions', 'auth_logins', 'referral_stats_mv');

-- Check badge columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users' 
AND column_name IN ('og_badge', 'og_badge_assigned_at', 'og_badge_member_number', 'referral_code');

-- Should return 4 rows
```

**Rollback Plan:** If migrations fail, they can be safely ignored (feature flags will hide the features).

---

## 🔒 Phase 2: Backend Code Deployment

### Files to Deploy:
```
server/src/routes/badges.ts          # New route file
server/src/routes/referrals.ts       # New route file
server/src/routes/users.ts           # Modified (adds badge/referral fields)
server/src/index.ts                  # Modified (registers new routes)
```

### Safety Features:
- ✅ Routes are **feature-flagged** - return 404 if disabled
- ✅ Routes are **isolated** - no dependencies on wallet routes
- ✅ Routes use **separate database tables** - no wallet table modifications

### Deployment Steps:

```bash
# 1. Commit backend changes
git add server/src/routes/badges.ts
git add server/src/routes/referrals.ts
git add server/src/routes/users.ts
git add server/src/index.ts
git commit -m "feat(backend): add badges and referrals routes (feature-flagged)"

# 2. Push to main (triggers auto-deploy)
git push origin main

# 3. Wait for Render deployment (~2-3 minutes)
# 4. Verify routes return 404 when feature flags are OFF
curl https://api.fanclubz.app/api/badges/og/summary
# Should return 404 (feature disabled)

curl https://api.fanclubz.app/api/referrals/stats
# Should return 404 (feature disabled)
```

**Rollback Plan:** 
- Set `BADGES_OG_ENABLE=0` and `REFERRAL_ENABLE=0` in Render env vars
- Routes will return 404, effectively disabling features

---

## 🔒 Phase 3: Frontend Components Deployment

### Files to Deploy:
```
client/src/components/badges/          # New directory
client/src/components/referral/       # New directory  
client/src/components/profile/        # New components
client/src/components/comments/CommentAuthorChip.tsx  # New
client/src/pages/ProfilePageV2.tsx     # Modified (adds badge/referral sections)
client/src/pages/UnifiedLeaderboardPage.tsx  # Modified (adds badges)
client/src/hooks/useReferral.ts       # New hook
client/src/lib/referral.ts            # New utility
client/public/badges/                  # Badge SVG assets
```

### Safety Features:
- ✅ All components check `VITE_BADGES_OG_ENABLE` and `VITE_REFERRALS_ENABLE`
- ✅ Components return `null` if disabled (no rendering)
- ✅ **No modifications to wallet components** (WalletPageV2.tsx untouched)
- ✅ **No modifications to payment components** (DepositUSDCModal, WithdrawUSDCModal untouched)

### Deployment Steps:

```bash
# 1. Commit frontend changes
git add client/src/components/badges/
git add client/src/components/referral/
git add client/src/components/profile/
git add client/src/components/comments/CommentAuthorChip.tsx
git add client/src/pages/ProfilePageV2.tsx
git add client/src/pages/UnifiedLeaderboardPage.tsx
git add client/src/hooks/useReferral.ts
git add client/src/lib/referral.ts
git add client/public/badges/
git commit -m "feat(frontend): add badges and referrals UI components (feature-flagged)"

# 2. Push to main (triggers Vercel auto-deploy)
git push origin main

# 3. Wait for Vercel deployment (~2-3 minutes)
# 4. Verify features are hidden (feature flags OFF in production)
```

**Rollback Plan:**
- Set `VITE_BADGES_OG_ENABLE=0` and `VITE_REFERRALS_ENABLE=0` in Vercel env vars
- Redeploy - features will be completely hidden

---

## 🔒 Phase 4: Enable Features (Gradual Rollout)

### Step 1: Enable Backend Features (Test First)

**In Render Dashboard:**
1. Go to Environment Variables
2. Add/Update:
   ```
   BADGES_OG_ENABLE=1
   BADGES_OG_COUNTS=25,100,500
   REFERRAL_ENABLE=1
   REFERRAL_MAX_SIGNUPS_PER_IP_DAY=10
   REFERRAL_MAX_SIGNUPS_PER_DEVICE_DAY=5
   ```
3. Redeploy backend
4. **Test API endpoints:**
   ```bash
   curl https://api.fanclubz.app/api/badges/og/summary \
     -H "Authorization: Bearer YOUR_TOKEN"
   # Should return badge summary (not 404)
   
   curl https://api.fanclubz.app/api/referrals/stats \
     -H "Authorization: Bearer YOUR_TOKEN"
   # Should return referral stats (not 404)
   ```

### Step 2: Enable Frontend Features (After Backend Verified)

**In Vercel Dashboard (fan-club-z project):**
1. Go to Settings → Environment Variables
2. Add/Update:
   ```
   VITE_BADGES_OG_ENABLE=1
   VITE_REFERRALS_ENABLE=1
   VITE_FRONTEND_URL=https://app.fanclubz.app
   ```
3. Redeploy frontend
4. **Test UI:**
   - Navigate to profile page - should see badges/referrals sections
   - Navigate to leaderboard - should see badges next to usernames
   - Navigate to comments - should see badges in author chips

### Step 3: Monitor for Issues

**Watch for:**
- ❌ Wallet balance display issues
- ❌ Payment/deposit/withdraw errors
- ❌ Escrow lock issues
- ❌ Transaction processing errors

**If ANY wallet/payment issues occur:**
1. **IMMEDIATELY** disable feature flags
2. Revert to recovery branch if needed

---

## 🚨 Emergency Rollback Procedure

### Quick Disable (5 minutes):
```bash
# 1. Disable in Render (backend)
# Set BADGES_OG_ENABLE=0 and REFERRAL_ENABLE=0
# Redeploy

# 2. Disable in Vercel (frontend)
# Set VITE_BADGES_OG_ENABLE=0 and VITE_REFERRALS_ENABLE=0
# Redeploy
```

### Full Rollback (15 minutes):
```bash
# 1. Checkout recovery branch
git checkout recovery/pre-badges-referrals-*

# 2. Deploy backend
cd server
vercel link --yes --project=fan-club-z --scope=teddys-projects-d67ab22a
# Or redeploy via Render dashboard

# 3. Deploy frontend
cd client
vercel link --yes --project=fan-club-z --scope=teddys-projects-d67ab22a
vercel --prod --yes
```

---

## ✅ Post-Migration Verification Checklist

### Wallet Functionality (CRITICAL - Test All):
- [ ] Wallet page loads correctly
- [ ] Available balance displays correctly
- [ ] Deposit modal opens and works
- [ ] Withdraw modal opens and works
- [ ] Transaction history displays correctly
- [ ] Balance updates after deposit
- [ ] Balance updates after withdraw
- [ ] Escrow locks work correctly
- [ ] Staking/prediction entry works

### Payment Functionality (CRITICAL - Test All):
- [ ] USDC deposit flow works
- [ ] USDC withdraw flow works
- [ ] WalletConnect connection works
- [ ] On-chain transactions process correctly
- [ ] Transaction status updates correctly

### Badges & Referrals (New Features):
- [ ] Badges display on profile page
- [ ] Badge tooltips show member numbers
- [ ] Referral section shows on own profile
- [ ] Referral link copies correctly
- [ ] Referral stats display correctly
- [ ] Badges appear in leaderboard
- [ ] Badges appear in comment chips

---

## 📊 Risk Assessment

### Low Risk Areas:
- ✅ Database migrations (additive only)
- ✅ Frontend components (feature-flagged, isolated)
- ✅ Badge/referral routes (separate from wallet routes)

### Medium Risk Areas:
- ⚠️ Profile page integration (modifies existing page)
- ⚠️ Leaderboard integration (modifies existing page)
- ⚠️ Comment chips (modifies existing component)

### High Risk Areas:
- ❌ **NONE** - Wallet/payment code is untouched

---

## 🎯 Success Criteria

Migration is successful if:
1. ✅ All wallet functionality works identically to before
2. ✅ All payment functionality works identically to before
3. ✅ Badges and referrals features work when enabled
4. ✅ Features can be disabled instantly via feature flags
5. ✅ No performance degradation
6. ✅ No new errors in logs

---

## 📝 Notes

- **Feature flags are your safety net** - keep them OFF until ready
- **Database migrations are safe** - they only add, never modify wallet tables
- **Backend routes are isolated** - they don't touch wallet routes
- **Frontend components are isolated** - they don't touch wallet components
- **Profile/Leaderboard changes are minimal** - just adding sections, not modifying core logic

---

**Created:** January 28, 2025  
**Last Updated:** January 28, 2025  
**Status:** Ready for execution

