# Store Submission Checklist - Fan Club Z

## Overview

This document outlines the build configuration, versioning strategy, and store-safe mode behavior for native iOS and Android builds.

## Bundle IDs

- **iOS**: `com.fanclubz.app`
- **Android**: `com.fanclubz.app`

## Build Modes

### STORE_SAFE (Default for App Store / Play Store)

- **Demo credits**: ✅ Fully functional
- **Fiat deposits/withdrawals**: ❌ Hidden/disabled
- **Crypto wallet connect**: ❌ Hidden/disabled
- **On-chain staking**: ❌ Hidden/disabled
- **Social features**: ✅ Enabled (discovery, comments, rankings)

**Rationale**: App Store real-money gaming requires licenses, geo-restrictions, and age gates. Store builds run in demo-only mode until compliance is complete.

### INTERNAL_FULL (Internal Testing Only)

- **Demo credits**: ✅ Fully functional
- **Fiat deposits/withdrawals**: ✅ Enabled (if `VITE_FIAT_ENABLED=true`)
- **Crypto wallet connect**: ✅ Enabled (if `VITE_CRYPTO_ENABLED=true`)
- **On-chain staking**: ✅ Enabled

**Usage**: For internal builds only. Never submit to stores until licensing/geo/age gates are complete.

**Activation**: Set `VITE_INTERNAL_FULL=true` in build environment.

### WEB (Default for Web Deployments)

- All features enabled (no restrictions)

## Versioning Strategy

- Follow semantic versioning: `MAJOR.MINOR.PATCH`
- Current version: See `package.json` (`version` field)
- Native builds should match web version for consistency

## Build Commands

### Prerequisites

```bash
# Install dependencies
npm install

# Build web assets
npm run build:client
# or
cd client && npm run build
```

### Capacitor Sync

```bash
# Sync to both platforms
npm run cap:sync
# or
cd client && npm run cap:sync

# Sync to iOS only
cd client && npm run cap:sync:ios

# Sync to Android only
cd client && npm run cap:sync:android
```

### Open Native Projects

```bash
# Open iOS project in Xcode
cd client && npm run ios:open

# Open Android project in Android Studio
cd client && npm run android:open
```

### Build Process

1. **Build web assets**: `npm run build:client`
2. **Sync Capacitor**: `npm run cap:sync` (or platform-specific)
3. **Open native IDE**: `npm run ios:open` or `npm run android:open`
4. **Build in Xcode/Android Studio**: Use native IDE build/run

## Environment Variables

### Store-Safe Mode Control

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_STORE_SAFE_MODE` | `true` (native) | Force store-safe mode even on web |
| `VITE_INTERNAL_FULL` | `false` | Enable full features in native builds (internal only) |
| `VITE_FIAT_ENABLED` | `false` | Enable fiat features (requires `INTERNAL_FULL`) |
| `VITE_CRYPTO_ENABLED` | `false` | Enable crypto features (requires `INTERNAL_FULL`) |

### Runtime Detection

The app automatically detects:
- **Native platform**: Uses `Capacitor.isNativePlatform()`
- **Mode resolution**:
  - Native + `VITE_INTERNAL_FULL=true` → `INTERNAL_FULL`
  - Native (default) → `STORE_SAFE`
  - Web → `WEB`

## What is Disabled in STORE_SAFE Mode

### UI Elements Hidden/Disabled

1. **Wallet Page**:
   - Fiat (NGN) tab button
   - Crypto (USDC) tab button
   - Deposit NGN button
   - Withdraw NGN button
   - Crypto deposit/withdraw modals
   - Wallet connect prompts

2. **Prediction Details Page**:
   - Fiat (NGN) funding mode button
   - Crypto (USDC) funding mode button
   - Deposit prompts for fiat/crypto

3. **Route Guards**:
   - Direct navigation to fiat/crypto routes shows "Unavailable" message
   - Redirects to demo mode or wallet page

### What Remains Functional

- ✅ Demo credits faucet (24h cooldown)
- ✅ Demo staking on predictions
- ✅ Demo payouts and settlement
- ✅ Social features (discovery, comments, likes)
- ✅ Rankings and leaderboards
- ✅ Profile pages
- ✅ Prediction creation (demo stakes only)

## Reviewer Notes Template

When submitting to App Store / Play Store, include these notes:

```
Demo Mode Only - No Real Money Transactions

This build is in demo mode for store review. All monetary features are disabled:

- Demo credits are provided via in-app faucet (24h cooldown)
- No real-money deposits or withdrawals are possible
- No cryptocurrency wallet connections are available
- All staking uses demo credits only

To test:
1. Sign in (or create account)
2. Navigate to Wallet
3. Tap "Get Demo Credits" (if cooldown expired)
4. Navigate to any prediction
5. Select an option and stake using demo credits

No special credentials required. All features work with standard account creation.
```

## Testing Checklist

### Before Store Submission

- [ ] Build runs on iOS Simulator
- [ ] Build runs on Android Emulator
- [ ] Store-safe mode active (verify "Demo Mode" label in Wallet)
- [ ] Fiat deposit/withdraw buttons hidden
- [ ] Crypto connect buttons hidden
- [ ] Demo credits functional
- [ ] Demo staking works end-to-end
- [ ] Deep links open correct prediction pages
- [ ] No console errors related to disabled features
- [ ] Web build unchanged (all features still work)

### Internal Full Build Testing

- [ ] `VITE_INTERNAL_FULL=true` enables fiat/crypto
- [ ] Fiat deposits work (Paystack integration)
- [ ] Crypto wallet connect works
- [ ] On-chain staking works
- [ ] All features match web behavior

## Troubleshooting

### "Features unavailable" messages appear on web

- Check `VITE_STORE_SAFE_MODE` is not set to `true`
- Verify `Runtime.mode === 'WEB'` in browser console

### Native build shows full features when it shouldn't

- Verify `VITE_INTERNAL_FULL` is not set
- Check `Runtime.mode === 'STORE_SAFE'` in native app
- Ensure Capacitor sync ran after build

### Deep links not working

- Verify React Router handles direct path loads
- Check `App.tsx` route definitions include `/prediction/:id`
- Test with full URL: `app.fanclubz.app/prediction/{id}`

## Future Enhancements (Phase 8C)

- Universal links / App links setup
- Push notifications
- Native sharing
- In-app purchase integration (if needed for compliance)
