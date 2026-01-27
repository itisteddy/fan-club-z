# Feature Sync Strategy: Mobile Apps ↔ Web App

## Architecture Overview

Fan Club Z uses **Capacitor** to run a **single web codebase** across:
- **Web** (production: `app.fanclubz.app`)
- **iOS** (native app via Capacitor)
- **Android** (native app via Capacitor)

This means **the same React/TypeScript code** runs on all platforms, ensuring feature parity by default.

## How Feature Sync Works

### 1. Shared Codebase (Primary Sync Mechanism)

**Location**: `client/src/`

All business logic, UI components, API calls, and state management live in the shared `client/` directory:

```
client/src/
├── pages/              # All pages (Discover, Wallet, Profile, etc.)
├── components/         # All UI components
├── hooks/              # React hooks (useWalletActivity, useEscrowSnapshot, etc.)
├── lib/                # Utilities (supabase, apiClient, etc.)
├── store/              # Zustand stores (authStore, predictionStore, etc.)
└── config/             # Build/runtime config (buildTarget, walletVariant, etc.)
```

**What this means:**
- ✅ New feature added to `client/src/pages/DiscoverPage.tsx` → **automatically available on web + iOS + Android**
- ✅ Bug fix in `client/src/lib/apiClient.ts` → **fixes all platforms at once**
- ✅ UI change in `client/src/components/...` → **appears everywhere**

### 2. Platform-Specific Gating (When Needed)

Sometimes you need **different behavior** per platform. Use **runtime detection**, not build-time assumptions:

**Example: Wallet variant resolver** (`client/src/config/walletVariant.ts`):

```typescript
export function resolveWalletVariant(): WalletVariant {
  const isNative = Capacitor.isNativePlatform() === true;
  const platform = Capacitor.getPlatform();

  if (isNative && platform === 'ios') {
    return {
      supportsDemo: true,
      supportsCrypto: false,  // iOS store-safe: demo only
      defaultTab: 'demo',
    };
  }

  // Web: full feature set
  return {
    supportsDemo: demoEnabled,
    supportsCrypto: true,
    defaultTab: demoEnabled ? 'demo' : 'crypto',
  };
}
```

**Key principle**: Use `Capacitor.isNativePlatform()` and `Capacitor.getPlatform()` to detect runtime, not `BUILD_TARGET` env vars (which can be wrong if an iOS build is accidentally deployed to web).

### 3. Build Targets (For Deployment Isolation)

**Purpose**: Ensure iOS builds don't accidentally break web production.

**Files**:
- `client/.env.web` → `VITE_BUILD_TARGET=web`
- `client/.env.ios` → `VITE_BUILD_TARGET=ios`
- `client/.env.android` → `VITE_BUILD_TARGET=android`

**Build commands**:
```bash
npm run build:web    # → dist/ (for Vercel)
npm run build:ios    # → dist/ (for Capacitor iOS)
npm run build:android # → dist/ (for Capacitor Android)
```

**What this does**:
- Sets `BUILD_TARGET` constant at compile time
- Allows gating features like PWA install prompts (web only)
- **Does NOT** change business logic (that's handled by runtime detection)

### 4. Native-Only Features (Capacitor Plugins)

**When to use**: Features that require native device APIs.

**Examples**:
- Deep linking (`@capacitor/app` → `App.addListener('appUrlOpen')`)
- Native browser (`@capacitor/browser` → `Browser.open()`)
- OAuth2 (`@byteowls/capacitor-oauth2`)

**Pattern**: Gate with runtime detection:

```typescript
import { Capacitor } from '@capacitor/core';
import { isNativeIOSRuntime } from '@/config/native';

if (isNativeIOSRuntime()) {
  // Native-only code (e.g., deep link handler)
  CapacitorApp.addListener('appUrlOpen', ...);
}
```

**What this means**:
- ✅ Native code **never runs on web** (fail-safe)
- ✅ Web code **never tries to use native APIs** (no crashes)
- ✅ Same codebase, different execution paths

## Feature Sync Workflow

### Adding a New Feature

1. **Implement in shared codebase** (`client/src/`)
   - Example: Add a new "Leaderboard" page → `client/src/pages/LeaderboardPage.tsx`
   - Add route in `client/src/App.tsx`

2. **Test on web first** (fastest iteration):
   ```bash
   cd client
   npm run dev:web
   # Test at http://localhost:5174
   ```

3. **Test on iOS**:
   ```bash
   cd client
   npm run build:ios
   npx cap sync ios
   npm run ios:open
   # Test in Xcode simulator
   ```

4. **If platform-specific behavior needed**:
   - Use `resolveWalletVariant()` pattern
   - Gate with `isNativeIOSRuntime()` / `isNativeRuntime()`
   - **Never** use `BUILD_TARGET === 'ios'` alone (can break if wrong build deployed to web)

### Fixing a Bug

1. **Fix in shared code** → automatically fixes all platforms
2. **If bug is platform-specific**:
   - Add runtime detection
   - Gate the fix behind the correct platform check
   - Test on both web and iOS

### Deploying Updates

**Web**:
```bash
# Vercel auto-deploys from main branch
# Uses: npm run build:web
```

**iOS**:
```bash
cd client
npm run build:ios
npx cap sync ios
# Open Xcode → Archive → Distribute to App Store Connect
```

**Android**:
```bash
cd client
npm run build:android
npx cap sync android
# Open Android Studio → Build → Generate Signed Bundle
```

## Common Pitfalls (How to Avoid Breaking Sync)

### ❌ Don't: Create separate iOS/Android code paths

```typescript
// BAD: Separate files
// client/src/pages/WalletPage.tsx (web)
// client/src/pages/WalletPageIOS.tsx (iOS)
// client/src/pages/WalletPageAndroid.tsx (Android)
```

### ✅ Do: Use runtime gating in shared code

```typescript
// GOOD: Single file with runtime detection
// client/src/pages/UnifiedWalletPage.tsx
const walletVariant = resolveWalletVariant();
if (walletVariant.supportsCrypto && isConnected) {
  // Show crypto UI
}
```

### ❌ Don't: Rely only on BUILD_TARGET for critical behavior

```typescript
// BAD: Can break if iOS build deployed to web
if (BUILD_TARGET === 'ios') {
  useDeepLink();
}
```

### ✅ Do: Use runtime detection + BUILD_TARGET for fail-safe

```typescript
// GOOD: Runtime is authoritative, BUILD_TARGET is a hint
if (shouldUseIOSDeepLinks()) {  // Checks: BUILD_TARGET === 'ios' AND isNativeIOSRuntime()
  useDeepLink();
}
```

## Verification Checklist

Before deploying a feature to production:

- [ ] **Web**: Feature works at `app.fanclubz.app`
- [ ] **iOS**: Feature works in Xcode simulator
- [ ] **Shared code**: No platform-specific files created (unless absolutely necessary)
- [ ] **Runtime gating**: Platform differences use `Capacitor.isNativePlatform()` not `BUILD_TARGET` alone
- [ ] **Build targets**: Correct `.env.*` file used for each build
- [ ] **No regressions**: Existing features still work on all platforms

## Summary

**Feature sync is automatic** because:
1. **Single codebase** (`client/src/`) runs everywhere
2. **Platform differences** handled via runtime detection (not separate code paths)
3. **Build targets** only control deployment, not business logic

**To maintain sync:**
- ✅ Always implement features in shared `client/src/`
- ✅ Use runtime detection (`Capacitor.isNativePlatform()`) for platform differences
- ✅ Test on web first, then iOS/Android
- ✅ Avoid creating separate iOS/Android code paths
