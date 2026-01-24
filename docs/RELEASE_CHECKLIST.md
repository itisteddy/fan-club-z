# Release Checklist - Web + iOS

**Last Updated:** 2026-01-23  
**Purpose:** Deterministic verification process to prevent "done but broken" scenarios

---

## Branches and Deployment Sources

### Production Web
- **Branch:** `release/web-stable`
- **Tag:** `web-stable-YYYY-MM-DD` (immutable snapshot)
- **Deployment:** Vercel + Render (both configured to deploy from `release/web-stable`)

### iOS Work
- **Branch:** `release/ios-store`
- **Deployment:** Local builds via Xcode (not deployed to web production)

---

## Environment Matrix

### Web Build
```bash
VITE_BUILD_TARGET=web
VITE_STORE_SAFE_MODE=false
```

### iOS Build
```bash
VITE_BUILD_TARGET=ios
VITE_STORE_SAFE_MODE=true
```

### Optional Flags
- `VITE_PWA_ENABLED=true` (web only, if PWA features desired)
- `VITE_FIAT_ENABLED=true/false` (feature flags)
- `VITE_CRYPTO_ENABLED=true/false` (feature flags)

---

## Web Verification (Must-Pass)

### Pre-Deployment
- [ ] Changes are on `release/web-stable` branch
- [ ] No iOS/Capacitor-specific code in the diff
- [ ] All tests pass (if applicable)
- [ ] Preview deployment works correctly

### Post-Deployment
- [ ] **Unauthed landing loads** - Homepage accessible without login
- [ ] **Login works and does not loop** - Google OAuth completes, redirects correctly
- [ ] **Predictions feed loads** - Public predictions visible, pagination works
- [ ] **Wallet loads** - Demo/crypto wallet displays correctly
- [ ] **Stakes flow works** - Can place bets, view stakes, settle predictions
- [ ] **Profile and transactions render** - User profile page loads, transaction history visible
- [ ] **No console errors for auth/session** - No auth-related errors in browser console

### Network Verification
- [ ] API calls succeed (no CORS errors)
- [ ] Socket.IO connects (if applicable)
- [ ] No 500 errors in network tab

---

## iOS Verification (Must-Pass)

### Pre-Login (Critical)
- [ ] **No preflight/CORS errors** - Network tab shows successful OPTIONS requests (204)
- [ ] **Public API calls work** - `/api/v2/predictions` or `/health` returns 200 (or proper 401)
- [ ] **Socket.IO handshake succeeds** - No "bad response from server" errors

### Login Flow (Critical)
- [ ] **Google OAuth completes** - User can sign in with Google
- [ ] **Returns to app** - Deep link callback (`fanclubz://auth/callback`) is received
- [ ] **Browser closes automatically** - OAuth browser sheet closes after callback
- [ ] **No login loop** - App does not repeatedly open auth flow
- [ ] **Session persists** - After background/foreground, user remains logged in
- [ ] **Cancel case works** - If user cancels auth, app returns to login screen without auto re-opening

### UI Verification
- [ ] **Header not covered by notch** - Safe area padding applied correctly
- [ ] **No PWA install banners/prompts** - No "Add to Home Screen" UI appears
- [ ] **Store-safe mode gating present** - Restricted features are hidden (if STORE_SAFE_MODE=true)

### Post-Login
- [ ] **Predictions load** - Feed displays correctly
- [ ] **Wallet displays** - Balance and transactions visible
- [ ] **Navigation works** - All app routes accessible

---

## Network Verification (Explicit)

### Pre-Login Endpoints (iOS)
These should be callable from iOS before authentication:

- `GET /api/v2/predictions?page=1&limit=20` - Public predictions
- `GET /health` - Health check
- `OPTIONS /api/v2/predictions` - Preflight (must return 204)

### Expected Behavior
1. **OPTIONS requests:**
   - Status: `204 No Content`
   - Headers include: `Access-Control-Allow-Origin: capacitor://app.fanclubz.app`
   - No 500 errors

2. **GET requests:**
   - Status: `200 OK` (public) or `401 Unauthorized` (protected)
   - **NOT** blocked by CORS
   - Headers include: `Access-Control-Allow-Origin: capacitor://app.fanclubz.app`

3. **Socket.IO:**
   - Connection succeeds (no "bad response")
   - Origin in handshake: `capacitor://app.fanclubz.app`

### How to Verify in iOS Simulator
1. Open Safari → Develop → Simulator → [Your App]
2. Check Network tab:
   - OPTIONS requests return 204 (not 500)
   - GET requests succeed or return normal 401 (not CORS blocked)
   - Socket connects successfully

---

## Rollback Procedure

### Quick Rollback (Emergency)
```bash
# Reset release/web-stable to stable tag
git checkout release/web-stable
git reset --hard web-stable-2026-01-23
git push origin release/web-stable --force

# Trigger redeployment in Vercel/Render
```

### Verify Rollback
1. Check deployment status in Vercel/Render dashboard
2. Verify latest deployment shows commit from stable tag
3. Smoke test production:
   - [ ] Web login works
   - [ ] Predictions load
   - [ ] Wallet displays correctly

### Revert Specific Commit
```bash
# On release/web-stable
git revert <COMMIT_SHA>
git push origin release/web-stable
```

---

## DEV Diagnostics

### Enable Runtime Debug Logging
```javascript
// In browser console (DEV only)
localStorage.setItem('DEBUG_RUNTIME', '1');
// Reload page
```

This will log:
- BUILD_TARGET
- IS_NATIVE
- STORE_SAFE_MODE
- Origin
- API Base URL
- Runtime mode and capabilities

### Disable Debug Logging
```javascript
localStorage.removeItem('DEBUG_RUNTIME');
```

---

## Common Issues & Fixes

### "iOS login loops"
- **Check:** Is `BUILD_TARGET === 'ios'` in console?
- **Check:** Is listener registered only once? (check main.tsx)
- **Check:** Does `fanclubz://auth/callback` match Supabase redirect URL?
- **Fix:** Ensure Phase 3 implementation is correct

### "Header covered by notch"
- **Check:** Does header have `pt-[env(safe-area-inset-top)]`?
- **Check:** Is height `calc(56px + env(safe-area-inset-top))`?
- **Fix:** Apply Phase 4 header changes

### "PWA install banner in iOS"
- **Check:** Is `BUILD_TARGET !== 'web'` check in PWAInstallManager?
- **Check:** Is service worker registration gated?
- **Fix:** Apply Phase 5 changes

### "CORS errors in iOS"
- **Check:** Does server allow `capacitor://app.fanclubz.app` origin?
- **Check:** Does OPTIONS return 204 (not 500)?
- **Fix:** Verify Phase 1 server CORS changes are deployed

---

## Pre-Release Checklist

Before merging to `release/web-stable`:

- [ ] All must-pass criteria above are verified
- [ ] Typecheck passes: `npm run typecheck`
- [ ] Build succeeds: `npm run build`
- [ ] No console errors in preview deployment
- [ ] iOS simulator tested (if iOS changes included)
- [ ] Web production smoke test passed

---

## Post-Release Checklist

After deployment:

- [ ] Monitor deployment logs for errors
- [ ] Verify production URL loads correctly
- [ ] Check error tracking (if applicable)
- [ ] Test critical user flows
- [ ] Monitor for 30 minutes for any issues

---

## Success Criteria

✅ **Web:** All existing functionality works, no regressions  
✅ **iOS:** Login works, no loops, session persists, UI correct  
✅ **Network:** No CORS errors, Socket.IO connects  
✅ **Rollback:** Clear path to revert if needed
