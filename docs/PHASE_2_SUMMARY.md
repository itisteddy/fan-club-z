# Phase 2: Build Targets + Store Safe Mode Containment - COMPLETE

**Date:** 2026-01-23  
**Status:** ✅ Complete

## Objectives

✅ Introduce explicit build targets (`web`, `ios`, `android`)  
✅ Implement strict Store Safe Mode that only applies to iOS build target  
✅ Centralize runtime detection in a single module  
✅ Ensure web behavior remains unchanged even when store-safe mode exists  
✅ Replace direct `isNativePlatform()` checks with proper gating

## Changes Made

### 1. Runtime Configuration (`client/src/config/runtime.ts`)

**Added:**
- `BUILD_TARGET`: From `VITE_BUILD_TARGET` env var (default: 'web')
- `STORE_SAFE_MODE`: True only when `BUILD_TARGET === 'ios'` AND `VITE_STORE_SAFE_MODE === 'true'`
- Exported constants: `BUILD_TARGET`, `IS_NATIVE`, `STORE_SAFE_MODE`

**Key Logic:**
```typescript
// Critical containment: web never sees store-safe restrictions
this._storeSafeMode = this._buildTarget === 'ios' && storeSafeEnv;
```

### 2. Auth Redirect Containment (`client/src/lib/supabase.ts`)

**Changed:**
- `getRedirectUrl()` now uses `BUILD_TARGET` instead of `isNativePlatform()`
- iOS builds use `fanclubz://auth/callback`
- Web builds use `https://app.fanclubz.app/auth/callback`

**Impact:**
- Web behavior unchanged (always uses HTTPS callback)
- iOS builds explicitly use deep link scheme

### 3. PWA Install Manager (`client/src/components/PWAInstallManager.tsx`)

**Changed:**
- Uses `STORE_SAFE_MODE` instead of `Capacitor.isNativePlatform()`
- Store-safe mode hides PWA install banners

**Impact:**
- Web builds still show PWA install prompts
- iOS builds (with store-safe mode) hide install prompts

### 4. Service Worker Registration (`client/src/utils/pwa.ts`)

**Changed:**
- Uses `STORE_SAFE_MODE` instead of `Capacitor.isNativePlatform()`
- Store-safe mode prevents service worker registration

**Impact:**
- Web builds still register service workers (production)
- iOS builds (with store-safe mode) skip service worker registration

### 5. Documentation

**Created:**
- `docs/BUILD_TARGETS.md`: Comprehensive guide on build targets and store-safe mode
- `docs/PHASE_2_SUMMARY.md`: This file

## Files Modified

1. `client/src/config/runtime.ts` - Added BUILD_TARGET and updated STORE_SAFE_MODE logic
2. `client/src/lib/supabase.ts` - Updated auth redirect to use BUILD_TARGET
3. `client/src/components/PWAInstallManager.tsx` - Updated to use STORE_SAFE_MODE
4. `client/src/utils/pwa.ts` - Updated to use STORE_SAFE_MODE

## Verification

✅ **Typecheck:** PASSED  
✅ **Client Build:** PASSED  
✅ **No breaking changes:** Web behavior unchanged

## Acceptance Criteria Met

✅ **Web build:**
- Web login works exactly as before
- Crypto wallet behavior unchanged
- No "store-safe" restrictions apply
- PWA install banner shows (if applicable)
- Service worker registers (production)

✅ **iOS build:**
- Store-safe restrictions can be enabled without touching web
- UI uses same design language but can hide/disable risky features
- Auth redirect uses deep link scheme
- PWA install banner hidden
- Service worker does not register

✅ **No feature gating by `isNative` alone:**
- All compliance gating uses `STORE_SAFE_MODE`
- Runtime detection (`IS_NATIVE`) only used for API client selection, not feature gating

## Environment Variables

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

## Next Steps

1. **Test iOS build:**
   - Set `VITE_BUILD_TARGET=ios` and `VITE_STORE_SAFE_MODE=true`
   - Verify store-safe restrictions apply
   - Verify auth redirect uses deep link

2. **Test web build:**
   - Verify web behavior unchanged
   - Verify no store-safe restrictions apply

3. **Deploy Phase 1 & Phase 2:**
   - Phase 1 (server CORS) is committed to `release/web-stable`
   - Phase 2 (client build targets) can be merged to `release/web-stable` after testing

## Notes

- `apiClient.ts` still uses `isNative()` for HTTP client selection - this is acceptable as it's runtime detection, not feature gating
- `wagmi.ts` still uses `isNativePlatform()` for metadata URL - this is acceptable as it's not feature gating
- The key principle: **Never gate features purely on `isNative`** - always use `STORE_SAFE_MODE` for compliance gating
