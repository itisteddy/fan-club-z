# iOS Build Guide

**Last Updated:** 2026-01-23  
**Phase 7A:** iOS build target isolation

---

## Overview

This guide explains how to build the app for different targets (web vs iOS) using Vite's mode system. This ensures iOS App Store work is isolated from web production.

---

## Build Targets

### Web Build
- **Target:** Production web deployment (Vercel, Render)
- **Mode:** `web`
- **Flags:** `VITE_BUILD_TARGET=web`, `VITE_STORE_SAFE_MODE=false`

### iOS Build
- **Target:** iOS App Store (Capacitor)
- **Mode:** `ios`
- **Flags:** `VITE_BUILD_TARGET=ios`, `VITE_STORE_SAFE_MODE=true`

---

## Environment Files

### `.env.web`
Loaded when running `npm run build:web` or `npm run dev:web`

```bash
VITE_BUILD_TARGET=web
VITE_STORE_SAFE_MODE=false
```

### `.env.ios`
Loaded when running `npm run build:ios` or `npm run dev:ios`

```bash
VITE_BUILD_TARGET=ios
VITE_STORE_SAFE_MODE=true
```

**Important:** These files contain **only build target flags**. Secrets (API keys, Supabase URLs, etc.) should remain in `.env.local` or deployment environment variables.

---

## Build Commands

### Web Development
```bash
cd client
npm run dev:web
```
- Opens at `http://localhost:5173`
- Uses `.env.web` configuration
- BUILD_TARGET = 'web'

### Web Production Build
```bash
cd client
npm run build:web
```
- Outputs to `client/dist/`
- Uses `.env.web` configuration
- **This is what deploys to production web**

### iOS Development
```bash
cd client
npm run dev:ios
```
- Opens at `http://localhost:5173`
- Uses `.env.ios` configuration
- BUILD_TARGET = 'ios'
- Useful for testing iOS-specific behavior locally

### iOS Production Build
```bash
cd client
npm run build:ios
```
- Outputs to `client/dist/`
- Uses `.env.ios` configuration
- BUILD_TARGET = 'ios'
- STORE_SAFE_MODE = true

### iOS Build + Sync to Capacitor
```bash
cd client
npm run cap:ios:ios
```
- Runs `build:ios` then `npx cap sync ios`
- Syncs built output to iOS native project
- Ready for Xcode

### Web Build + Sync (for testing)
```bash
cd client
npm run cap:ios:web
```
- Runs `build:web` then `npx cap sync ios`
- Useful if you want to test web build in iOS simulator
- **Note:** This will not have iOS-specific features enabled

---

## Capacitor Configuration

The Capacitor config (`client/capacitor.config.ts`) points to:
- **webDir:** `dist` (the build output directory)

This means:
- `npm run build:web` → `dist/` → Capacitor sync → iOS uses web build
- `npm run build:ios` → `dist/` → Capacitor sync → iOS uses iOS build

**Important:** Always run `npm run cap:ios:ios` (not `cap:ios:web`) when building for iOS App Store.

---

## Verification

### Check Which Build Target is Active

**In Development:**
1. Open browser console
2. Run: `localStorage.setItem('DEBUG_RUNTIME', '1')`
3. Reload page
4. Check console for `[Runtime Debug]` output showing BUILD_TARGET

**In Code:**
```typescript
import { BUILD_TARGET } from '@/config/runtime';
console.log('Current build target:', BUILD_TARGET);
```

### Verify iOS Build
1. Run `npm run build:ios`
2. Check `dist/` output
3. Run `npm run cap:ios:ios`
4. Open Xcode: `npm run ios:open`
5. In iOS simulator, check console for BUILD_TARGET='ios'

---

## Critical Warnings

### ⚠️ Never Deploy Web Production Using iOS Mode

**WRONG:**
```bash
npm run build:ios  # ❌ This will break web production
# Then deploying dist/ to web
```

**CORRECT:**
```bash
npm run build:web  # ✅ Always use web mode for production web
# Then deploying dist/ to web
```

### ⚠️ Production Web Deployment

Production web **MUST** use:
- `npm run build:web` (or equivalent)
- `VITE_BUILD_TARGET=web`
- `VITE_STORE_SAFE_MODE=false`

This is enforced by:
- Vercel/Render deploying from `release/web-stable` branch
- CI/CD should use `build:web` script

---

## Workflow Examples

### Building for iOS App Store
```bash
# 1. Build iOS target
cd client
npm run build:ios

# 2. Sync to Capacitor
npm run cap:ios:ios

# 3. Open in Xcode
npm run ios:open

# 4. In Xcode: Archive → Distribute → App Store Connect
```

### Building for Web Production
```bash
# 1. Ensure you're on release/web-stable branch
git checkout release/web-stable

# 2. Build web target
cd client
npm run build:web

# 3. Deploy dist/ to Vercel/Render
# (Deployment platform will handle this automatically)
```

### Testing iOS Behavior Locally (Web Browser)
```bash
# 1. Run iOS mode dev server
cd client
npm run dev:ios

# 2. Open http://localhost:5173
# 3. Check console: BUILD_TARGET should be 'ios'
# 4. Test iOS-specific features (though some require actual native build)
```

---

## Troubleshooting

### "BUILD_TARGET is 'web' in iOS simulator"
- **Check:** Did you run `npm run build:ios` before syncing?
- **Fix:** Run `npm run cap:ios:ios` (not `cap:ios:web`)

### "Store-safe restrictions apply to web"
- **Check:** Is `.env.web` being loaded?
- **Check:** Is `VITE_STORE_SAFE_MODE=false` in `.env.web`?
- **Fix:** Verify build command uses `--mode web`

### "iOS build doesn't have iOS features"
- **Check:** Did you sync after building?
- **Fix:** Run `npm run cap:ios:ios` after `npm run build:ios`

---

## Next Steps

After Phase 7A:
1. Test web build: `npm run build:web` → verify behavior unchanged
2. Test iOS build: `npm run build:ios` → verify BUILD_TARGET='ios' in console
3. Proceed to Phase 7B (Store Safe Mode policy matrix)
