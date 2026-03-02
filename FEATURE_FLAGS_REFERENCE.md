# 🚩 Feature Flags Reference: Badges & Referrals

**Last Updated:** January 28, 2025  
**Purpose:** Complete reference for all feature flags needed for badges and referrals system

---

## 📋 Required Feature Flags

### Client-Side (Vercel Environment Variables)

#### 1. `VITE_BADGES_OG_ENABLE`
- **Type:** String (`'1'` or `'0'`)
- **Default:** `'0'` (disabled)
- **Purpose:** Enables/disables OG badges feature in frontend
- **Where Used:**
  - `client/src/components/badges/OGBadge.tsx`
  - `client/src/components/badges/OGBadgeEnhanced.tsx`
  - `client/src/components/profile/ProfileBadgesSection.tsx`
  - `client/src/components/comments/CommentAuthorChip.tsx`
- **Behavior:**
  - `'1'`: Badges render and display
  - `'0'`: Badges return `null` (hidden)
- **Production Value:** `'0'` initially, set to `'1'` after Phase 4

#### 2. `VITE_REFERRALS_ENABLE`
- **Type:** String (`'1'` or `'0'`)
- **Default:** `'0'` (disabled)
- **Purpose:** Enables/disables referrals feature in frontend
- **Where Used:**
  - `client/src/lib/referral.ts`
  - `client/src/hooks/useReferral.ts`
  - `client/src/components/referral/ReferralCard.tsx`
  - `client/src/components/referral/ReferralShareModal.tsx`
  - `client/src/components/profile/ProfileReferralSection.tsx`
  - `client/src/pages/ReferralRedirectPage.tsx`
- **Behavior:**
  - `'1'`: Referral UI renders and functions
  - `'0'`: Referral UI returns `null` (hidden)
- **Production Value:** `'0'` initially, set to `'1'` after Phase 4

#### 3. `VITE_FRONTEND_URL`
- **Type:** String (URL)
- **Required:** Yes (when referrals enabled)
- **Purpose:** Base URL for generating referral links
- **Example Values:**
  - Development: `http://localhost:5174`
  - Production: `https://app.fanclubz.app`
- **Where Used:**
  - `client/src/lib/referral.ts` - Constructs referral links
  - `client/src/hooks/useReferral.ts` - Generates shareable URLs
- **Production Value:** `https://app.fanclubz.app`

---

### Server-Side (Render Environment Variables)

#### 1. `BADGES_OG_ENABLE`
- **Type:** String (`'1'` or `'0'`)
- **Default:** `'0'` (disabled)
- **Purpose:** Enables/disables OG badges API routes
- **Where Used:**
  - `server/src/routes/badges.ts` - All badge routes check this flag
- **Behavior:**
  - `'1'`: Routes return badge data
  - `'0'`: Routes return `404` with "Feature disabled" message
- **Production Value:** `'0'` initially, set to `'1'` after Phase 4

#### 2. `BADGES_OG_COUNTS`
- **Type:** String (comma-separated numbers)
- **Default:** `'25,100,500'`
- **Purpose:** Defines badge tier thresholds
- **Format:** `GOLD_COUNT,SILVER_COUNT,BRONZE_COUNT`
- **Example:** `'25,100,500'` means:
  - Gold: First 25 users
  - Silver: Next 100 users (26-125)
  - Bronze: Next 500 users (126-625)
- **Where Used:**
  - `server/src/routes/badges.ts` - Badge assignment logic
- **Production Value:** `'25,100,500'` (can be adjusted)

#### 3. `REFERRAL_ENABLE`
- **Type:** String (`'1'` or `'0'`)
- **Default:** `'0'` (disabled)
- **Purpose:** Enables/disables referrals API routes
- **Where Used:**
  - `server/src/routes/referrals.ts` - All referral routes check this flag
- **Behavior:**
  - `'1'`: Routes return referral data
  - `'0'`: Routes return `404` with "Feature disabled" message
- **Production Value:** `'0'` initially, set to `'1'` after Phase 4

#### 4. `REFERRAL_MAX_SIGNUPS_PER_IP_DAY`
- **Type:** String (number)
- **Default:** `'10'`
- **Purpose:** Rate limiting - max signups per IP per day
- **Where Used:**
  - `server/src/routes/referrals.ts` - Attribution rate limiting
- **Production Value:** `'10'` (can be adjusted)

#### 5. `REFERRAL_MAX_SIGNUPS_PER_DEVICE_DAY`
- **Type:** String (number)
- **Default:** `'5'`
- **Purpose:** Rate limiting - max signups per device per day
- **Where Used:**
  - `server/src/routes/referrals.ts` - Attribution rate limiting
- **Production Value:** `'5'` (can be adjusted)

#### 6. `ADMIN_API_KEY`
- **Type:** String (secret)
- **Required:** Yes (for badge admin operations)
- **Purpose:** Authentication key for admin badge operations
- **Where Used:**
  - `server/src/routes/badges.ts` - Admin routes (backfill, assign, remove)
- **Security:** Keep secret, use strong random string
- **Production Value:** Generate strong random key

---

## 🔧 Setting Feature Flags

### Vercel (Frontend)

1. Go to Vercel Dashboard → `fan-club-z` project
2. Settings → Environment Variables
3. Add/Update:
   ```
   VITE_BADGES_OG_ENABLE=0
   VITE_REFERRALS_ENABLE=0
   VITE_FRONTEND_URL=https://app.fanclubz.app
   ```
4. **Important:** After adding, redeploy for changes to take effect

### Render (Backend)

1. Go to Render Dashboard → Your backend service
2. Environment → Environment Variables
3. Add/Update:
   ```
   BADGES_OG_ENABLE=0
   BADGES_OG_COUNTS=25,100,500
   REFERRAL_ENABLE=0
   REFERRAL_MAX_SIGNUPS_PER_IP_DAY=10
   REFERRAL_MAX_SIGNUPS_PER_DEVICE_DAY=5
   ADMIN_API_KEY=your-secret-admin-key-here
   ```
4. **Important:** After adding, redeploy for changes to take effect

---

## 🚦 Feature Flag States

### Phase 1-3: Features Disabled (Safe Deployment)
```
Client (Vercel):
  VITE_BADGES_OG_ENABLE=0
  VITE_REFERRALS_ENABLE=0
  VITE_FRONTEND_URL=https://app.fanclubz.app

Server (Render):
  BADGES_OG_ENABLE=0
  REFERRAL_ENABLE=0
  BADGES_OG_COUNTS=25,100,500
  REFERRAL_MAX_SIGNUPS_PER_IP_DAY=10
  REFERRAL_MAX_SIGNUPS_PER_DEVICE_DAY=5
  ADMIN_API_KEY=your-secret-key
```

**Result:** Features are deployed but hidden/disabled. Safe to deploy.

### Phase 4: Features Enabled (After Testing)
```
Client (Vercel):
  VITE_BADGES_OG_ENABLE=1
  VITE_REFERRALS_ENABLE=1
  VITE_FRONTEND_URL=https://app.fanclubz.app

Server (Render):
  BADGES_OG_ENABLE=1
  REFERRAL_ENABLE=1
  BADGES_OG_COUNTS=25,100,500
  REFERRAL_MAX_SIGNUPS_PER_IP_DAY=10
  REFERRAL_MAX_SIGNUPS_PER_DEVICE_DAY=5
  ADMIN_API_KEY=your-secret-key
```

**Result:** Features are live and functional.

---

## 🚨 Emergency Disable

If issues occur, **instantly disable** by setting flags to `0`:

**Vercel:**
```
VITE_BADGES_OG_ENABLE=0
VITE_REFERRALS_ENABLE=0
```
Then redeploy.

**Render:**
```
BADGES_OG_ENABLE=0
REFERRAL_ENABLE=0
```
Then redeploy.

Features will be hidden/disabled within 2-3 minutes.

---

## ✅ Verification

### Check if Features are Enabled

**Client:**
```javascript
// In browser console
console.log('Badges:', import.meta.env.VITE_BADGES_OG_ENABLE);
console.log('Referrals:', import.meta.env.VITE_REFERRALS_ENABLE);
```

**Server:**
```bash
# Test badge endpoint
curl https://api.fanclubz.app/api/badges/og/summary
# If disabled: Returns 404 with "Feature disabled"
# If enabled: Returns badge summary (requires auth)

# Test referral endpoint
curl https://api.fanclubz.app/api/referrals/stats
# If disabled: Returns 404 with "Feature disabled"
# If enabled: Returns referral stats (requires auth)
```

---

## 📝 Notes

- **All flags default to disabled (`0`)** - Features are opt-in
- **Flags are checked at runtime** - No code changes needed to enable/disable
- **Flags are environment-specific** - Can have different values in dev/staging/prod
- **Flags are case-sensitive** - Must be exactly `'1'` or `'0'` (string)
- **Redeploy required** - Changes take effect after redeployment

---

**Related Documents:**
- `SAFE_PRODUCTION_MIGRATION_PLAN.md` - Migration strategy
- `QUICK_MIGRATION_CHECKLIST.md` - Step-by-step checklist

