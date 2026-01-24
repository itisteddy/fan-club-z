# Build Targets & Store Safe Mode

**Last Updated:** 2026-01-23  
**Phase 2:** Build targets + Store Safe Mode containment

## Overview

This document explains the build target system and store-safe mode, which ensures iOS/App Store work never affects web production.

## Build Targets

### Supported Targets

- **`web`** (default): Web deployment (Vercel, production web)
- **`ios`**: iOS Capacitor build (App Store)
- **`android`**: Android Capacitor build (future)

### How to Set Build Target

Set the `VITE_BUILD_TARGET` environment variable:

```bash
# Web build
VITE_BUILD_TARGET=web

# iOS build
VITE_BUILD_TARGET=ios

# Android build
VITE_BUILD_TARGET=android
```

## Store Safe Mode

**Store Safe Mode** (`STORE_SAFE_MODE`) is a strict compliance mode that:
- Disables features that violate App Store policies
- Hides PWA install prompts/banners
- Prevents service worker registration
- Restricts certain payment/wallet features

### Critical Rule

**Store Safe Mode is ONLY enabled when:**
```
STORE_SAFE_MODE = (BUILD_TARGET === 'ios') && (VITE_STORE_SAFE_MODE === 'true')
```

This ensures:
- ✅ Web builds are **never** affected by store-safe restrictions
- ✅ iOS builds can enable store-safe mode via env var
- ✅ Runtime `isNative` detection alone cannot trigger store-safe mode

### Why This Matters

**Before Phase 2:**
- Code checked `Capacitor.isNativePlatform()` directly
- This could accidentally disable features in web builds running in mobile browsers
- No clear separation between "native app" and "store-safe compliance"

**After Phase 2:**
- All compliance gating uses `STORE_SAFE_MODE` (not `isNative` alone)
- Web behavior is guaranteed unchanged
- iOS work is properly contained

## Runtime Configuration

Access build target and store-safe mode via `@/config/runtime`:

```typescript
import { BUILD_TARGET, STORE_SAFE_MODE, IS_NATIVE, Runtime } from '@/config/runtime';

// Build target
if (BUILD_TARGET === 'ios') {
  // iOS-specific code
}

// Store-safe mode (compliance gating)
if (STORE_SAFE_MODE) {
  // Hide/store-restrict features
}

// Runtime native detection (for API client, etc.)
if (IS_NATIVE) {
  // Use CapacitorHttp instead of fetch
}
```

## Environment Files

### `.env.web.example`
```bash
VITE_BUILD_TARGET=web
VITE_STORE_SAFE_MODE=false
```

### `.env.ios.example`
```bash
VITE_BUILD_TARGET=ios
VITE_STORE_SAFE_MODE=true
```

## Usage Guidelines

### ✅ DO: Use BUILD_TARGET for build-specific behavior

```typescript
// Auth redirect URL selection
if (BUILD_TARGET === 'ios') {
  redirectTo = 'fanclubz://auth/callback';
} else {
  redirectTo = 'https://app.fanclubz.app/auth/callback';
}
```

### ✅ DO: Use STORE_SAFE_MODE for compliance gating

```typescript
// Hide PWA install banner
if (STORE_SAFE_MODE) {
  return null; // Don't show install prompt
}

// Disable service worker
if (STORE_SAFE_MODE) {
  return; // Skip SW registration
}
```

### ✅ DO: Use IS_NATIVE for runtime detection (API client, etc.)

```typescript
// API client selection
if (IS_NATIVE) {
  // Use CapacitorHttp (bypasses CORS)
} else {
  // Use fetch
}
```

### ❌ DON'T: Gate features purely on `isNative`

```typescript
// ❌ BAD: This can leak into web builds
if (Capacitor.isNativePlatform()) {
  disableCryptoWallet();
}

// ✅ GOOD: Use STORE_SAFE_MODE
if (STORE_SAFE_MODE) {
  disableCryptoWallet();
}
```

## Build Commands

### Web Build
```bash
# Development
npm run dev

# Production
npm run build
```

### iOS Build
```bash
# Set environment
export VITE_BUILD_TARGET=ios
export VITE_STORE_SAFE_MODE=true

# Build
npm run build

# Sync to iOS
npx cap sync ios

# Open in Xcode
npx cap open ios
```

### Android Build (Future)
```bash
# Set environment
export VITE_BUILD_TARGET=android
export VITE_STORE_SAFE_MODE=true

# Build
npm run build

# Sync to Android
npx cap sync android
```

## Verification

### Web Build Verification
- [ ] `BUILD_TARGET === 'web'`
- [ ] `STORE_SAFE_MODE === false`
- [ ] PWA install banner shows (if applicable)
- [ ] Service worker registers (production)
- [ ] Crypto wallet works
- [ ] Auth redirect uses HTTPS

### iOS Build Verification
- [ ] `BUILD_TARGET === 'ios'`
- [ ] `STORE_SAFE_MODE === true` (when env var set)
- [ ] PWA install banner hidden
- [ ] Service worker does NOT register
- [ ] Auth redirect uses `fanclubz://` deep link
- [ ] Store-safe restrictions apply

## Migration Notes

### Files Updated in Phase 2

1. **`client/src/config/runtime.ts`**
   - Added `BUILD_TARGET` support
   - Updated `STORE_SAFE_MODE` logic (only true when BUILD_TARGET === 'ios' AND env flag)
   - Exported `BUILD_TARGET`, `IS_NATIVE`, `STORE_SAFE_MODE` constants

2. **`client/src/lib/supabase.ts`**
   - Updated `getRedirectUrl()` to use `BUILD_TARGET` instead of `isNativePlatform()`

3. **`client/src/components/PWAInstallManager.tsx`**
   - Updated to use `STORE_SAFE_MODE` instead of `Capacitor.isNativePlatform()`

4. **`client/src/utils/pwa.ts`**
   - Updated service worker registration to use `STORE_SAFE_MODE`

### Files That Still Use `isNativePlatform()`

These are acceptable because they're not gating features:

- **`client/src/lib/apiClient.ts`**: Uses `isNative()` to select HTTP client (CapacitorHttp vs fetch) - this is runtime detection, not feature gating
- **`client/src/lib/wagmi.ts`**: Uses `isNativePlatform()` to determine metadata URL - not feature gating

## Troubleshooting

### "Store-safe restrictions apply to web"
- Check that `VITE_BUILD_TARGET=web` is set
- Verify `VITE_STORE_SAFE_MODE` is not `true` for web builds
- Check that code uses `STORE_SAFE_MODE` (not `isNative`) for compliance gating

### "iOS build doesn't apply store-safe restrictions"
- Verify `VITE_BUILD_TARGET=ios` is set
- Verify `VITE_STORE_SAFE_MODE=true` is set
- Check that code uses `STORE_SAFE_MODE` for compliance checks

### "Auth redirect wrong in iOS"
- Verify `BUILD_TARGET === 'ios'` in runtime
- Check that `getRedirectUrl()` uses `BUILD_TARGET` (not `isNativePlatform()`)
