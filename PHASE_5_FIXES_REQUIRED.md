# Phase 5: Critical Fixes Required Before Enablement

**Date:** November 28, 2025  
**Status:** Fixes in progress

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

### 4. **Leaderboard UI Text** - Confusing Display
**Problem:** Referrals tab shows "active · 0 total" which is redundant  
**Impact:** Confusing UX, main number should be active referrals only  
**Fix:** Remove "active · X total" text, show only active count

**File:** `client/src/pages/UnifiedLeaderboardPage.tsx` (line 301)

**Current:**
```tsx
<div className="text-xs text-gray-500">
  active · {entry.totalSignups} total
</div>
```

**Fixed:**
```tsx
<div className="text-xs text-gray-500">
  active referrals
</div>
```

---

## 🔧 Implementation Status

- [x] Generate secure ADMIN_API_KEY
- [ ] Update ADMIN_API_KEY in Render
- [ ] Add frontend feature flags to Vercel
- [ ] Fix referral tracking persistence
- [ ] Fix leaderboard UI text
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

## 🚀 Next Steps

1. **Implement code fixes** (leaderboard UI, referral tracking)
2. **Update Render environment** (ADMIN_API_KEY)
3. **Update Vercel environment** (feature flags)
4. **Deploy fixes**
5. **Test thoroughly**
6. **Enable features**

---

**Created:** November 28, 2025  
**Last Updated:** November 28, 2025

