# Mobile Auth & CORS Configuration Guide

This document describes the mobile app authentication flow, CORS configuration, and testing procedures for iOS/Android Capacitor builds.

## Overview

Phase 8B implements:
- **Backend CORS fixes**: Proper OPTIONS preflight handling and Socket.IO CORS
- **CapacitorHttp API client**: Bypasses CORS entirely on native platforms
- **Native OAuth flow**: Deep link callbacks with proper browser closing
- **Store-safe mode**: Disabled service workers and PWA banners in native builds

## Redirect URL Configuration

### Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication → URL Configuration**
4. Under **Redirect URLs**, ensure these are added:
   ```
   https://app.fanclubz.app/auth/callback
   fanclubz://auth/callback
   fanclubz://auth/callback/*
   fanclubz://*
   ```

### Deep Link Scheme

The app uses the custom URL scheme `fanclubz://` for native OAuth callbacks. This is configured in:
- **iOS**: `client/ios/App/App/Info.plist` → `CFBundleURLSchemes = ["fanclubz"]`
- **Android**: `client/android/app/src/main/AndroidManifest.xml` → URL intent filter

## How It Works

### Web Flow (unchanged)
1. User clicks "Continue with Google"
2. Redirects to `https://app.fanclubz.app/auth/callback`
3. Session established via standard OAuth callback

### Native Flow (iOS/Android)
1. User clicks "Continue with Google"
2. `AuthInProgressOverlay` appears (full-screen overlay)
3. `Browser.open()` opens OAuth URL with `redirect_to=fanclubz://auth/callback`
4. User completes OAuth in system browser
5. Browser redirects to `fanclubz://auth/callback?code=...&state=...`
6. `App.addListener('appUrlOpen')` captures the deep link
7. `Browser.close()` automatically closes the browser sheet
8. `supabase.auth.exchangeCodeForSession(code)` completes PKCE flow
9. App navigates to `/auth/callback` for final session handling
10. `AuthInProgressOverlay` automatically hides

## API Client Architecture

### CapacitorHttp (Native)
- Uses `@capacitor/core` `CapacitorHttp` on native platforms
- **Bypasses CORS entirely** - no preflight requests
- Automatically handles JSON serialization/parsing
- Falls back to `fetch` on web

### Fetch (Web)
- Standard `fetch` API
- CORS handled by backend
- Content-Type headers optimized to reduce preflights

### Usage
All API calls automatically use the correct client:
```typescript
import { apiClient } from '@/lib/api';

// Automatically uses CapacitorHttp on native, fetch on web
const predictions = await apiClient.get('/predictions');
```

## Backend CORS Configuration

### Allowed Origins
- `https://app.fanclubz.app`
- `https://fanclubz.app`
- `capacitor://localhost`
- `capacitor://app.fanclubz.app`
- `ionic://localhost`
- `http://localhost` (dev)
- `http://localhost:5173` (dev)
- `http://localhost:5174` (dev)
- `http://localhost:3000` (dev)

### OPTIONS Preflight
- Always returns `204 No Content` with proper CORS headers
- Handles unknown origins gracefully (prevents 500 errors)
- Matches exact CORS middleware logic

### Socket.IO CORS
- Uses same origin allowlist as main CORS
- Supports `capacitor://` and `ionic://` schemes
- Allows no-origin requests (native apps)

## Store-Safe Mode

### Service Worker
- **Disabled in native builds** - service workers don't work in WebViews
- Automatically unregisters any existing SW on native launch
- Only registers in production web builds

### PWA Install Banner
- **Hidden in native builds** - `PWAInstallManager` returns `null` if `Capacitor.isNativePlatform()`
- Only shows on web/PWA

## Testing Steps

### iOS Simulator

1. **Build and Run**:
   ```bash
   cd client
   npm run build
   npx cap sync ios
   npx cap open ios
   ```
   In Xcode: Press ⌘R to build and run

2. **Test Pre-Login API Calls**:
   - Launch app (should be signed out)
   - Open Safari Web Inspector: **Develop → Simulator → [Your App]**
   - Check Console tab for errors
   - Verify predictions feed loads (or shows "Sign in required" without CORS errors)

3. **Test OAuth Flow**:
   - Tap "Continue with Google"
   - Verify `AuthInProgressOverlay` appears
   - Complete OAuth in browser
   - Verify browser closes automatically
   - Verify user is signed in
   - Verify overlay disappears

4. **Test Socket.IO**:
   - After sign-in, check Console for Socket.IO connection
   - Should see `[RT] client connected` in server logs
   - No CORS errors in Console

5. **Test API Calls After Login**:
   - Navigate to predictions, wallet, etc.
   - Check Network tab in Web Inspector
   - All requests should succeed (200/401, not CORS errors)

### Android Emulator

1. **Build and Run**:
   ```bash
   cd client
   npm run build
   npx cap sync android
   npx cap open android
   ```
   In Android Studio: Click Run

2. **Test Steps**: Same as iOS (use Chrome DevTools instead of Safari)

### Web (Regression Test)

1. **Verify Web Still Works**:
   - Open `https://app.fanclubz.app` in browser
   - Sign in with Google
   - Verify OAuth redirects to HTTPS callback (not deep link)
   - Verify all features work as before

## Debugging

### Check Redirect URL
In Safari Web Inspector Console, look for:
```
🔐 Final OAuth redirect URL: fanclubz://auth/callback
🔐 Browser.open URL: https://auth.fanclubz.app/...?redirect_to=fanclubz%3A%2F%2Fauth%2Fcallback...
```

### Check Native Platform Detection
```
📱 isNativePlatform check: { capacitorNative: true, platform: "ios", result: true }
```

### Check API Client
- Native: Look for `[CapacitorHttp]` in console logs
- Web: Look for `[fetch]` in console logs

### Common Issues

1. **"Preflight response is not successful. Status code: 500"**
   - Check backend logs for CORS errors
   - Verify `capacitor://app.fanclubz.app` is in allowed origins
   - Verify OPTIONS handler is before CORS middleware

2. **"Browser doesn't close after OAuth"**
   - Verify `fanclubz://auth/callback` is in Supabase redirect URLs
   - Check `Info.plist` has `CFBundleURLSchemes = ["fanclubz"]`
   - Verify `appUrlOpen` listener is registered

3. **"Service worker still registering in native"**
   - Check `client/src/utils/pwa.ts` - should check `Capacitor.isNativePlatform()`
   - Verify build was synced: `npx cap sync ios`

4. **"PWA banner still showing in native"**
   - Check `client/src/components/PWAInstallManager.tsx` - should return `null` if native

## Environment Variables

No new environment variables required. The app automatically detects native vs web using `Capacitor.isNativePlatform()`.

## Files Modified

### Server
- `server/src/index.ts` - CORS and OPTIONS handler
- `server/src/services/realtime.ts` - Socket.IO CORS

### Client
- `client/src/lib/apiClient.ts` - New CapacitorHttp wrapper
- `client/src/lib/api.ts` - Re-exports from apiClient
- `client/src/lib/supabase.ts` - OAuth deep link handling
- `client/src/utils/pwa.ts` - Disable SW in native
- `client/src/components/PWAInstallManager.tsx` - Hide banner in native
- `client/src/components/AuthInProgressOverlay.tsx` - New overlay component
- `client/src/App.tsx` - Overlay integration

## Next Steps

- [ ] Test on physical iOS device
- [ ] Test on physical Android device
- [ ] Verify App Store submission readiness (store-safe mode)
- [ ] Monitor production logs for CORS issues
