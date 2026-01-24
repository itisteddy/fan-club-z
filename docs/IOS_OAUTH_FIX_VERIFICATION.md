# iOS OAuth Cross-Contamination Fix - Verification Guide

**Status:** ✅ Implemented (Requires Testing)  
**Date:** 2026-01-24  
**Commit:** `48c8cea0`

---

## Summary of Root Causes & Fixes

### Root Cause #1: Cross-Build Storage Contamination
**Problem:** `capacitor.config.ts` set `hostname: 'app.fanclubz.app'`, causing iOS WKWebView to share storage/cache with web domain.

**Result:** iOS app loaded **cached web bundle** instead of fresh iOS build, including:
- PWA "Add to Home Screen" banner
- Web AUTH redirect (https://) instead of deep link (fanclubz://)
- Service worker from web visits

**Fix Applied:**
- Removed `hostname: 'app.fanclubz.app'` from `capacitor.config.ts`
- iOS now uses `capacitor://localhost` (bundled assets, isolated storage)
- Added defensive cache cleanup on iOS first boot (`main.tsx` lines 25-49)

---

### Root Cause #2: BUILD_TARGET Fragility
**Problem:** BUILD_TARGET relied on gitignored `.env.ios`/`.env.web` files that didn't exist or could get out of sync.

**Fix Applied:**
- Updated `vite.config.ts` to inject BUILD_TARGET via `define` at build time
- Mode `ios` → `VITE_BUILD_TARGET='ios'`, `VITE_STORE_SAFE_MODE='true'`
- Mode `web` → `VITE_BUILD_TARGET='web'`, `VITE_STORE_SAFE_MODE='false'`
- No gitignored files required (`.env.*` files can override but not needed)

---

### Root Cause #3: OAuth Handler Was Correct, But Never Ran
**Problem:** iOS loaded cached web bundle, so the OAuth listener in `main.tsx` (lines 51-62) never executed.

**Fix Applied:**
- No code changes needed for OAuth handler (already correct)
- Fixed root causes #1 and #2 so iOS bundle loads correctly
- Handler will now run on iOS and process `fanclubz://auth/callback`

---

## Files Changed

| File | Change | Why |
|------|--------|-----|
| `client/capacitor.config.ts` | Removed `hostname: 'app.fanclubz.app'` | Prevents storage/cache sharing with web |
| `client/src/main.tsx` | Added iOS cache cleanup on first boot | Clears any web SW/caches |
| `client/vite.config.ts` | Added BUILD_TARGET injection in `define` | Makes BUILD_TARGET deterministic |

---

## Build Commands (Step-by-Step)

### For iOS Testing:
```bash
cd client

# 1. Build iOS bundle
npm run build:ios

# 2. Sync to Capacitor
npx cap sync ios

# 3. Open Xcode
npx cap open ios
```

### For Web Testing:
```bash
cd client

# 1. Build web bundle
npm run build:web

# 2. Preview locally
npm run preview
```

---

## Verification Checklist

### ⚠️ CRITICAL: Delete and Reinstall iOS App First
**Before testing, you MUST delete the app from simulator** to clear old cached bundles:

1. In iOS Simulator: Long-press Fan Club Z app icon → Delete App
2. Rebuild from Xcode (`Cmd+R`)

If you don't delete first, you'll still see the old cached web bundle.

---

### ✅ Phase A: Cross-Build Contamination Eliminated

**In iOS Simulator (after delete + rebuild):**

1. **Open Safari Web Inspector** (Safari → Develop → Simulator → localhost)

2. **Check Console for Cache Cleanup:**
   ```
   [Bootstrap] iOS first boot: clearing web domain caches
   [Bootstrap] ✅ Cache cleanup complete
   ```

3. **Check BUILD_TARGET:**
   ```
   getRedirectUrl called: { buildTarget: "ios", isIOSBuild: true }
   ```
   **NOT:** `{ buildTarget: "web", isIOSBuild: false }` ❌

4. **PWA Banner MUST NOT Appear:**
   - ✅ Expected: No "Add to Home Screen" banner
   - ❌ Failure: Banner still shows → old bundle cached, delete app and retry

5. **Service Worker MUST NOT Register:**
   ```
   [PWA] Skipping service worker registration (BUILD_TARGET=ios, IS_NATIVE=true, STORE_SAFE_MODE=true)
   ```

---

### ✅ Phase B: Native OAuth Works

**In iOS Simulator:**

1. **Tap "Sign In" or "Continue with Google"**

2. **Expected Console Logs (in order):**
   ```
   🔧 getRedirectUrl called: { buildTarget: "ios", isIOSBuild: true, next: "/predictions" }
   🔧 Auth redirect URL (iOS deep link): "fanclubz://auth/callback"
   [Browser] Opening URL...
   ```

3. **Complete Google Sign-In** (in the modal)

4. **Expected Callback Logs:**
   ```
   [Bootstrap] appUrlOpen received: fanclubz://auth/callback?code=...&state=...
   ═══════════════════════════════════════
   [NativeOAuth] 🔐 Auth callback detected
   [NativeOAuth] URL: fanclubz://auth/callback?code=...
   [NativeOAuth] Type: deep-link
   ═══════════════════════════════════════
   [NativeOAuth] ✅ Browser closed
   [NativeOAuth] Processing deep link callback...
   [NativeOAuth] Extracted: { code: 'present', state: 'present' }
   [NativeOAuth] Exchanging code for session...
   [NativeOAuth] ✅ Session established: user@email.com
   [NativeOAuth] Navigating to callback route: /auth/callback?code=...
   ```

5. **Expected UX:**
   - ✅ Modal closes automatically
   - ✅ App shows authenticated state (profile/wallet show user data)
   - ✅ No login loop
   - ✅ No "stuck on signing in" state

6. **Session Persistence:**
   - Close app (swipe up, force quit)
   - Reopen app
   - ✅ Expected: Still logged in (no re-login required)

---

### ✅ Phase C: BUILD_TARGET Deterministic

**Verify Build Outputs:**

```bash
# iOS build
npm run build:ios
# Check console during build for mode: ios

# Web build
npm run build:web
# Check console during build for mode: web
```

**In iOS Console:**
```javascript
// After app loads, run in Safari Web Inspector Console:
import('./config/runtime').then(m => console.log(m.BUILD_TARGET))
// Expected: "ios"
```

**In Web Browser (after npm run preview):**
```javascript
// In browser console:
import('./config/runtime').then(m => console.log(m.BUILD_TARGET))
// Expected: "web"
```

---

### ✅ Phase D: Header Safe Area (Already Complete)

**In iOS Simulator (iPhone 15 Pro or similar with notch):**

1. **Check Header Position:**
   - ✅ Expected: Header content fully visible below notch/dynamic island
   - ✅ Expected: No overlap with system status bar
   - ❌ Failure: Content hidden under notch

2. **Verify CSS:**
   - Open Web Inspector → Elements → Find `<header>`
   - Check computed styles:
     ```
     height: calc(56px + env(safe-area-inset-top))
     padding-top: env(safe-area-inset-top)
     ```

---

## Web Regression Check

**CRITICAL:** Verify web production is unaffected.

### In Web Browser (npm run preview):

1. **Check BUILD_TARGET:**
   ```
   getRedirectUrl called: { buildTarget: "web", isIOSBuild: false }
   ```

2. **OAuth Uses HTTPS:**
   ```
   🔧 Auth redirect URL (production web): https://app.fanclubz.app/auth/callback
   ```

3. **Login Flow:**
   - Tap "Continue with Google"
   - Completes auth in new tab/popup
   - Redirects back to app
   - ✅ Logged in successfully

4. **PWA Features (if enabled):**
   - "Add to Home Screen" banner appears (if PWA enabled)
   - Service worker registers

5. **No Store-Safe Restrictions:**
   - Crypto wallet connect works
   - Fiat payments work (if enabled)

---

## Troubleshooting

### Problem: Banner Still Shows in iOS

**Diagnosis:** Old cached web bundle still loading.

**Fix:**
1. Delete app from simulator completely
2. Clean build folder: `cd client && npm run clean && npm run build:ios`
3. Re-sync: `npx cap sync ios`
4. Rebuild in Xcode

### Problem: `buildTarget: "web"` in iOS Console

**Diagnosis:** BUILD_TARGET not injected correctly at build time.

**Fix:**
1. Check `vite.config.ts` has updated `define` section
2. Rebuild: `npm run build:ios` (verify console shows `mode: ios`)
3. Sync: `npx cap sync ios`

### Problem: OAuth Modal Doesn't Close

**Diagnosis:** appUrlOpen listener not registered or callback URL mismatch.

**Fix:**
1. Check console for: `[Bootstrap] ✅ Native OAuth listener registered (BUILD_TARGET=ios)`
2. Check callback URL matches: `fanclubz://auth/callback` (not https://)
3. Verify Info.plist has `fanclubz` URL scheme registered

### Problem: Web Login Broken

**Diagnosis:** Cross-build changes affected web.

**Fix:**
1. Verify web build: `npm run build:web`
2. Check BUILD_TARGET in browser console: should be `"web"`
3. Check auth redirect URL: should be `https://app.fanclubz.app/auth/callback`

---

## Expected Console Output (iOS Success)

```
// App Start
[Bootstrap] iOS first boot: clearing web domain caches
[Bootstrap] Unregistering SW: https://app.fanclubz.app/
[Bootstrap] Deleting cache: workbox-precache-v2
[Bootstrap] ✅ Cache cleanup complete
[Bootstrap] ✅ Native OAuth listener registered (BUILD_TARGET=ios)

[PWA] Skipping service worker registration (BUILD_TARGET=ios, IS_NATIVE=true, STORE_SAFE_MODE=true)

✔ Return URL stored successfully
Captured return URL: "/predictions"

// OAuth Start
🔧 getRedirectUrl called: { buildTarget: "ios", isIOSBuild: true, next: "/predictions" }
🔧 Auth redirect URL (iOS deep link): "fanclubz://auth/callback"

// OAuth Callback
[Bootstrap] appUrlOpen received: fanclubz://auth/callback?code=...&state=...
═══════════════════════════════════════
[NativeOAuth] 🔐 Auth callback detected
[NativeOAuth] URL: fanclubz://auth/callback?code=...
[NativeOAuth] Type: deep-link
═══════════════════════════════════════
[NativeOAuth] ✅ Browser closed
[NativeOAuth] Processing deep link callback...
[NativeOAuth] Extracted: { code: 'present', state: 'present' }
[NativeOAuth] Exchanging code for session...
[NativeOAuth] ✅ Session established: user@example.com
[NativeOAuth] Navigating to callback route: /auth/callback?code=...
```

---

## Sign-Off Checklist

Before marking this as complete, verify:

- [ ] iOS app deleted and rebuilt from clean state
- [ ] Console shows `buildTarget: "ios"` (not "web")
- [ ] No PWA banner in iOS
- [ ] OAuth completes without loop
- [ ] Browser modal closes automatically
- [ ] Session persists after app restart
- [ ] Header not hidden by notch
- [ ] Web login still works (regression check)
- [ ] Web shows `buildTarget: "web"`

---

## Next Steps

Once verified:
1. Update `docs/RELEASE_CHECKLIST.md` with iOS OAuth verification
2. Test on physical device (not just simulator)
3. Submit to TestFlight for internal testing
4. Follow `docs/IOS_RELEASE.md` for App Store submission
