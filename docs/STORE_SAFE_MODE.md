# Store Safe Mode - App Store Compliance

**Last Updated:** 2026-01-23  
**Phase 7B:** Store Safe Mode policy matrix

---

## What is Store Safe Mode?

**Store Safe Mode** is a compliance mode designed specifically for iOS App Store builds. It ensures the app meets Apple's App Review Guidelines by restricting features that could be flagged during review (real-money transactions, gambling-like flows, crypto wallet features).

---

## When is Store Safe Mode Active?

Store Safe Mode is **ONLY** active when **ALL** of these conditions are met:

```
STORE_SAFE_MODE = (BUILD_TARGET === 'ios') && (VITE_STORE_SAFE_MODE === 'true')
```

This ensures:
- ✅ Web builds are **never** affected by store-safe restrictions
- ✅ iOS builds can be tested with store-safe OFF for internal testing
- ✅ iOS App Store builds have store-safe ON for review compliance

---

## Why Does Store Safe Mode Exist?

Apple's App Review Guidelines have strict rules about:
- Real-money gambling and betting (Guidelines 4.7, 5.3)
- Financial transactions and payments (Guideline 3.1)
- Crypto transactions (Guidelines 2.4, 5.3)

Rather than navigate complex licensing, geo-gating, and financial compliance, Store Safe Mode provides a **demo-only experience** that:
- Showcases the prediction platform's features
- Avoids real-money transaction flows
- Passes Apple review more reliably

---

## Features Disabled in Store Safe Mode

### Crypto Wallet Features
- ❌ Connect crypto wallet (MetaMask, WalletConnect, etc.)
- ❌ Crypto deposits (USDC to escrow)
- ❌ Crypto withdrawals (escrow to wallet)
- ✅ Demo credits (always available)

### Fiat Payment Features
- ❌ Fiat deposits (Paystack, bank transfers)
- ❌ Fiat withdrawals
- ✅ Demo credits (always available)

### Language and Copy
- Neutral wording: "Stakes", "Predictions", "Demo Credits"
- Avoid: "Bet", "Gamble", "Real money"

---

## Features Allowed in Store Safe Mode

- ✅ Viewing predictions
- ✅ Creating predictions
- ✅ Demo credits staking
- ✅ Comments and social features
- ✅ Notifications
- ✅ Profile and leaderboards
- ✅ All browsing and discovery features

---

## How to Enable/Disable

### For iOS App Store Build (Store Safe ON)
```bash
# In .env.ios or build command
VITE_BUILD_TARGET=ios
VITE_STORE_SAFE_MODE=true

# Build
npm run build:ios
```

### For iOS Internal Testing (Store Safe OFF)
```bash
# Temporary override
VITE_BUILD_TARGET=ios
VITE_STORE_SAFE_MODE=false

# Build
npm run build:ios
```

### For Web Production (Never Store Safe)
```bash
# In .env.web
VITE_BUILD_TARGET=web
VITE_STORE_SAFE_MODE=false

# Build
npm run build:web
```

---

## Implementation Details

### Policy Module (`client/src/lib/storeSafePolicy.ts`)

All store-safe gating flows through a single policy module:

```typescript
import { policy, guardFeature } from '@/lib/storeSafePolicy';

// Check if crypto wallet is allowed
if (policy.allowCryptoWalletConnect) {
  // Show connect wallet UI
}

// Guard a feature with callback
const allowed = guardFeature('crypto-wallet', () => {
  toast.error('Crypto wallet features are not available in demo mode');
});
```

### UI Gating Locations

1. **UnifiedWalletPage.tsx**
   - Crypto wallet connect gated by `policy.allowCryptoWalletConnect`
   - Fiat deposit/withdraw gated by `policy.allowFiatPayments`

2. **WalletPageV2.tsx**
   - Same gating as UnifiedWalletPage

3. **PWAInstallManager.tsx**
   - PWA install UI disabled in store-safe mode

4. **Service Worker (pwa.ts)**
   - Service worker registration disabled in store-safe mode

---

## Verification

### Web Build (BUILD_TARGET=web)
- [ ] Wallet connect works
- [ ] Crypto deposits/withdrawals work
- [ ] Fiat payments work (if enabled)
- [ ] No features hidden or disabled
- [ ] Copy unchanged

### iOS Build (STORE_SAFE_MODE=true)
- [ ] Crypto wallet connect unavailable
- [ ] Fiat deposit/withdraw unavailable
- [ ] Demo mode message shown
- [ ] Switch to demo mode button works
- [ ] No broken links or empty screens

### iOS Build (STORE_SAFE_MODE=false)
- [ ] Same as web (internal testing mode)

---

## User Experience in Store Safe Mode

### Wallet Page
- Crypto mode shows: "Demo Mode" with explanation and "Switch to Demo Mode" button
- Fiat mode buttons hidden/disabled (if fiat mode is accessible)
- Demo mode works normally

### No Dead Ends
- Direct navigation to blocked routes doesn't crash
- User always sees clear messaging
- Fallback to demo mode is obvious

---

## Demo Mode Indicator

A subtle indicator appears in Settings/About when store-safe mode is active:

```
Demo Mode
Real-money funding is disabled in this build. Use demo credits to explore predictions.
```

This is **NOT** a banner or intrusive UI element. It's informational only.

---

## Troubleshooting

### "Store-safe restrictions apply to web"
- **Check:** `BUILD_TARGET === 'web'` in console
- **Check:** `.env.web` has `VITE_STORE_SAFE_MODE=false`
- **Fix:** Ensure web build uses `npm run build:web` (not `build:ios`)

### "iOS build still shows crypto wallet"
- **Check:** `VITE_STORE_SAFE_MODE=true` in `.env.ios`
- **Check:** Build used `npm run build:ios`
- **Fix:** Verify storeSafePolicy is being imported and used

### "User stuck on empty wallet page"
- **Check:** Demo mode is available and enabled
- **Fix:** Ensure demo mode tab/button is visible and functional

---

## Apple Review Considerations

When submitting to App Store:
- **Explain in Review Notes:** "This build operates in demo mode only. No real-money transactions are possible."
- **Provide demo account:** If review requires login, provide credentials
- **Consistent with privacy manifest:** Ensure payment/transaction data types match manifest (if any)

---

## Future Enhancements

If you decide to support real-money transactions in iOS:
- Implement proper geo-gating (restrict to allowed jurisdictions)
- Add gambling license verification (if required)
- Update privacy manifest for financial data
- Implement age verification
- Add responsible gaming features

For now, demo-only is the safest path to approval.
