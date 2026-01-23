# Store-Safe Mode Implementation

## Overview

Store-safe mode is a build-time and runtime configuration that disables real-money flows (fiat deposits/withdrawals and crypto wallet connections) in native app builds, while keeping demo credits fully functional.

## Architecture

### Single Source of Truth

**File**: `client/src/config/runtime.ts`

This module provides:
- `Runtime.mode`: `'WEB' | 'STORE_SAFE' | 'INTERNAL_FULL'`
- `Runtime.capabilities`: `{ allowDemo, allowFiat, allowCrypto }`
- `Runtime.isNative`: boolean
- `Runtime.storeSafeMode`: boolean

### Mode Resolution Logic

```typescript
if (isNative && VITE_INTERNAL_FULL === 'true') {
  mode = 'INTERNAL_FULL'
} else if (isNative || VITE_STORE_SAFE_MODE === 'true') {
  mode = 'STORE_SAFE'
} else {
  mode = 'WEB'
}
```

### Capabilities Resolution

```typescript
capabilities = {
  allowDemo: true,  // Always enabled
  allowFiat: mode === 'INTERNAL_FULL' && VITE_FIAT_ENABLED === 'true',
  allowCrypto: mode === 'INTERNAL_FULL' && VITE_CRYPTO_ENABLED === 'true',
}
```

## Implementation Points

### UI Gating

**Files Modified**:
- `client/src/pages/UnifiedWalletPage.tsx`
- `client/src/pages/PredictionDetailsPageV2.tsx`

**Pattern**:
```typescript
import { Runtime } from '@/config/runtime';

const capabilities = Runtime.capabilities;
const effectiveFiatEnabled = isFiatEnabled && capabilities.allowFiat;
const effectiveCryptoEnabled = capabilities.allowCrypto;

// Conditionally render buttons/tabs
{effectiveFiatEnabled && (
  <button onClick={() => setMode('fiat')}>Fiat (NGN)</button>
)}
```

### Route Guards

**Status**: Pending (Phase 8A Step 3)

Route guards should prevent direct navigation to fiat/crypto routes when capabilities are disabled. Implementation should:
- Check `Runtime.capabilities` before rendering protected routes
- Show "Unavailable in this build" message
- Redirect to safe alternative (demo mode or wallet page)

### Handler Gating

**Pattern**:
```typescript
const handleDeposit = () => {
  if (isFiatMode) {
    if (!capabilities.allowFiat) {
      toast.error('Fiat deposits are unavailable in this build...');
      return;
    }
    // ... proceed with fiat deposit
  }
  // ... crypto deposit logic
};
```

## Environment Variables

### Build-Time (Vite)

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_STORE_SAFE_MODE` | `false` | Force store-safe mode (even on web) |
| `VITE_INTERNAL_FULL` | `false` | Enable full features in native builds |
| `VITE_FIAT_ENABLED` | `false` | Enable fiat (requires `INTERNAL_FULL`) |
| `VITE_CRYPTO_ENABLED` | `false` | Enable crypto (requires `INTERNAL_FULL`) |

### Usage Examples

**Store Build (Default)**:
```bash
# No env vars needed - defaults to STORE_SAFE
npm run build:client
npm run cap:sync
```

**Internal Full Build**:
```bash
VITE_INTERNAL_FULL=true VITE_FIAT_ENABLED=true VITE_CRYPTO_ENABLED=true npm run build:client
npm run cap:sync
```

## Compliance Notes

### App Store Guidelines

- **3.1.1**: No in-app purchases for real-money gaming credits without proper licensing
- **5.2.1**: Real-money gaming requires geo-restrictions and age verification
- **Demo mode**: Acceptable for review if clearly labeled and no real-money flows

### Play Store Guidelines

- Real-money gaming requires proper licensing and geo-restrictions
- Demo mode acceptable for review

### Current Status

- ✅ Store-safe mode implemented
- ✅ Demo credits fully functional
- ⚠️ Real-money features disabled in store builds
- ⚠️ Licensing/geo-restrictions pending (future work)

## Testing

### Verify Store-Safe Mode

1. Build native app (iOS/Android)
2. Open app and navigate to Wallet
3. Verify:
   - "Demo Mode" label appears
   - Only "Demo Credits" tab visible (if enabled)
   - No "Fiat (NGN)" or "Crypto (USDC)" tabs
   - Deposit/Withdraw buttons show "Unavailable" messages if accessed

### Verify Internal Full Mode

1. Set `VITE_INTERNAL_FULL=true` and rebuild
2. Verify all features match web behavior

### Verify Web Unchanged

1. Deploy web build (no env vars)
2. Verify all features work as before
3. No "unavailable" messages appear

## Future Work

- Route guards for protected routes
- Universal links / App links
- Push notifications
- In-app purchase integration (if needed)
