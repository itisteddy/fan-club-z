# Phase 5: Critical Fixes Required Before Enablement

**Date:** November 28, 2025  
**Status:** Code fixes complete. Remaining: env (Render + Vercel) + QA.

---

## 🚨 Issues Identified

### 1. **ADMIN_API_KEY** - Security Issue
**Problem:** Currently set to placeholder `your-secret-key-here` in Render  
**Impact:** Badge admin endpoints won't work, security vulnerability  
**Fix:** Generate secure random key

**New secure key:**
```
ADMIN_API_KEY=d394d9f33e91823fc61979c73cd36f04c8fdd513fd5e704b6f6516437a5f1d31
```

**Action Required:**
1. Go to Render Dashboard → Environment Variables
2. Update `ADMIN_API_KEY` to the new secure key above
3. Redeploy backend

---

### 2. **Frontend Feature Flags Missing** - Features Won't Show
**Problem:** `VITE_BADGES_OG_ENABLE` and `VITE_REFERRALS_ENABLE` not set in Vercel  
**Impact:** Features are deployed but hidden (feature flags OFF)  
**Fix:** Add environment variables to Vercel

**Action Required:**
1. Go to Vercel Dashboard → `fan-club-z` project → Settings → Environment Variables
2. Add these variables:
   ```
   VITE_BADGES_OG_ENABLE=1
   VITE_REFERRALS_ENABLE=1
   ```
3. Redeploy frontend

---

### 3. **Referral Tracking Broken** - Code Not Persisted
**Problem:** When user taps referral link (`/r/CODE`), the code is captured but user is redirected to default page without any indication of who referred them. The referral code needs to be persisted and attributed when the user signs up.

**Current Flow:**
1. User clicks `https://app.fanclubz.app/r/ABC123`
2. `ReferralRedirectPage` captures code, stores in localStorage
3. User redirected to `/` (discover page)
4. ❌ **Problem:** No visual indication, code might be lost on signup

**Fix Required:**
- Ensure referral code persists through signup flow
- Backend `/api/referrals/attribution` endpoint needs to be called on signup
- Add visual feedback showing "You were referred by [username]"

**Files to Fix:**
- `client/src/pages/ReferralRedirectPage.tsx` - Add better persistence
- `client/src/lib/referral.ts` - Ensure code survives page reloads
- Backend signup flow - Attribute referral on user creation

---

### 4. **Leaderboard UI Text** — ✅ Done
**File:** `client/src/pages/UnifiedLeaderboardPage.tsx` — referrals tab shows "active referrals" (no "active · X total").

---

## 🔧 Implementation Status

- [x] Generate secure ADMIN_API_KEY
- [ ] Update ADMIN_API_KEY in Render
- [ ] Add frontend feature flags to Vercel
- [x] Fix referral tracking persistence (attribution on signup + post-signup toast "You were referred by @username")
- [x] Fix leaderboard UI text (already shows "active referrals")
- [ ] Test all fixes

---

## 📝 Testing Checklist (After Fixes)

### Backend:
- [ ] Badge endpoint works with new ADMIN_API_KEY
- [ ] Referral attribution endpoint works

### Frontend:
- [ ] Badges visible on profiles (if user has badge)
- [ ] Referral section visible on own profile
- [ ] Leaderboard shows badges next to usernames
- [ ] Leaderboard referrals tab shows clean "active referrals" text

### Referral Flow:
- [ ] User clicks referral link `/r/CODE`
- [ ] Code is stored in localStorage
- [ ] User sees "Invited by [friend]" message
- [ ] User signs up
- [ ] Referral is attributed correctly in database
- [ ] Referrer sees new referral in their stats

---

## 🚀 Next Steps (manual)

1. **Update Render:** Set `ADMIN_API_KEY` to the secure value above; add `BADGES_OG_ENABLE=1`, `REFERRAL_ENABLE=1` (see `PHASE_5_ENABLE_FEATURES.md`); redeploy.
2. **Update Vercel:** Add `VITE_BADGES_OG_ENABLE=1`, `VITE_REFERRALS_ENABLE=1`; redeploy.
3. **Test:** Badge + referral flows per checklist above; verify wallet unchanged.

---

**Created:** November 28, 2025  
**Last Updated:** Phase 5 code fixes complete; remaining work is env + QA.

