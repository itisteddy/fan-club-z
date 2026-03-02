# 🎯 Final P2 Implementation Guide

## Summary
This document contains the exact code changes to complete P2. Apply these changes to finish the integration.

---

## ✅ Already Complete
- DepositUSDCModal enhancements
- WithdrawUSDCModal enhancements
- useOnchainActivity hook
- Unit tests for balanceSelector

---

## 🔧 Remaining Changes

### 1. WalletPageV2 - Activity Feed & Connect/Disconnect

**File:** `client/src/pages/WalletPageV2.tsx`

**Add these imports at the top:**
```typescript
import { useAccount, useDisconnect } from 'wagmi';
import { formatDistanceToNow } from 'date-fns';
import { formatActivityKind } from '../hooks/useOnchainActivity';
```

**Inside the component, add these hooks:**
```typescript
const { address, isConnected } = useAccount();
const { disconnect } = useDisconnect();
const { data: activityData } = useOnchainActivity(20);
```

**Add wallet connection controls inside the "On-chain Balance Card" section (around line 229):**
```typescript
{/* Add this right after the header, before the balances */}
<div className="flex items-center justify-between text-xs mb-3 pb-2 border-b border-blue-100">
  <span className="text-gray-600">Wallet Connection</span>
  {isConnected && address ? (
    <div className="flex items-center gap-2">
      <span className="font-mono text-gray-700">
        {address.slice(0, 6)}...{address.slice(-4)}
      </span>
      <button
        onClick={() => {
          console.log('[FCZ-PAY] ui: wallet disconnected');
          disconnect();
        }}
        className="text-blue-600 hover:text-blue-700 underline"
      >
        Disconnect
      </button>
    </div>
  ) : (
    <button
      onClick={() => {
        console.log('[FCZ-PAY] ui: opening connect wallet');
        // You'll need to implement opening the connect wallet modal
      }}
      className="text-blue-600 hover:text-blue-700 underline"
    >
      Connect wallet
    </button>
  )}
</div>
```

**Add activity feed section after the Deposit/Withdraw buttons (around line 290):**
```typescript
{/* Recent Activity */}
{activityData?.items && activityData.items.length > 0 && (
  <div className="mt-4 pt-4 border-t border-blue-100">
    <h4 className="text-xs font-semibold text-gray-700 mb-3">Recent Activity</h4>
    <div className="space-y-2">
      {activityData.items.slice(0, 10).map((item) => (
        <div key={item.id} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-700">{formatActivityKind(item.kind)}</span>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </span>
          </div>
          <span className="font-mono font-medium">${item.amount.toFixed(2)}</span>
        </div>
      ))}
    </div>
  </div>
)}
```

---

### 2. StickyActionPanel - Prediction Gating

**File:** `client/src/components/predictions/StickyActionPanel.tsx`

**Find the file and replace the entire component logic with:**

```typescript
import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { selectEscrowAvailableUSD } from '@/lib/balance/balanceSelector';
import { useWalletStore } from '@/store/walletStore';
import { useAuthStore } from '@/store/authStore';
import DepositUSDCModal from '@/components/wallet/DepositUSDCModal';

interface StickyActionPanelProps {
  stakeAmount: number;
  onPlaceBet: () => void;
  // ... other props
}

export default function StickyActionPanel({ stakeAmount, onPlaceBet }: StickyActionPanelProps) {
  const { isConnected } = useAccount();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const walletStore = useWalletStore();
  const escrowAvailable = selectEscrowAvailableUSD(walletStore);
  const [showDeposit, setShowDeposit] = useState(false);
  
  const betsEnabled = import.meta.env.VITE_FCZ_BASE_BETS === '1';
  const shortfall = Math.max(0, stakeAmount - escrowAvailable);

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <button
        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold"
        onClick={() => {
          // Open auth modal - adjust this to your auth system
          window.dispatchEvent(new CustomEvent('open-auth-modal'));
        }}
      >
        Sign in to predict
      </button>
    );
  }

  // Bets enabled but wallet not connected
  if (betsEnabled && !isConnected) {
    return (
      <button
        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold"
        onClick={() => {
          console.log('[FCZ-PAY] ui: opening connect wallet');
          // Open connect wallet modal
        }}
      >
        Connect wallet
      </button>
    );
  }

  // Insufficient escrow balance
  if (shortfall > 0.01) {
    return (
      <>
        <button
          className="w-full py-3 bg-amber-600 text-white rounded-xl font-semibold"
          onClick={() => setShowDeposit(true)}
        >
          Add funds (need ${shortfall.toFixed(2)})
        </button>
        {showDeposit && (
          <DepositUSDCModal
            open={showDeposit}
            onClose={() => setShowDeposit(false)}
            availableUSDC={0} // Will be fetched from wallet state
            userId={useAuthStore.getState().user?.id || ''}
          />
        )}
      </>
    );
  }

  // All good - place bet
  return (
    <button
      className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold"
      onClick={onPlaceBet}
    >
      Place bet: ${stakeAmount.toFixed(2)}
    </button>
  );
}
```

---

### 3. Remove Demo Balances

**Search for these patterns and replace:**

**Pattern 1: getDemoBalanceUSD imports**
```typescript
// REMOVE:
import { getDemoBalanceUSD } from '@/lib/demoWallet';

// ADD:
import { selectEscrowAvailableUSD } from '@/lib/balance/balanceSelector';
import { useWalletStore } from '@/store/walletStore';
```

**Pattern 2: Usage**
```typescript
// REMOVE:
const available = getDemoBalanceUSD();

// REPLACE WITH:
const walletStore = useWalletStore();
const available = Math.max(0, selectEscrowAvailableUSD(walletStore));
```

**Files to check:**
- `client/src/components/PredictionCard.tsx`
- `client/src/pages/PredictionDetailsPageV2.tsx`
- `client/src/components/predictions/PredictionHeader.tsx`
- Any other files that show "Available" or "Balance"

**Search command:**
```bash
cd client && grep -r "getDemoBalance" src/
cd client && grep -r "demoWallet" src/
```

---

## 🧪 Testing Checklist

After making these changes, test:

1. **WalletPageV2:**
   - [ ] Connect/disconnect button appears
   - [ ] Activity feed shows recent transactions
   - [ ] Activity auto-refreshes every 10s
   - [ ] Balances display correctly

2. **Prediction Gating:**
   - [ ] Not signed in → "Sign in to predict"
   - [ ] Signed in, no wallet → "Connect wallet" (if BASE_BETS=1)
   - [ ] Wallet connected, insufficient funds → "Add funds (need $X)"
   - [ ] Sufficient funds → "Place bet: $X"

3. **No Demo Balances:**
   - [ ] No getDemoBalanceUSD references anywhere
   - [ ] All balances use real selectors
   - [ ] No negative balances displayed

---

## 🔧 Environment Variables Check

Make sure these are set:

**Server `.env`:**
```bash
PAYMENTS_ENABLE=1
ENABLE_BASE_DEPOSITS=1
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org
USDC_ADDRESS=0x5B966ca41aB58E50056EE1711c9766Ca3382F115
RUNTIME_ENV=qa
```

**Client `.env.local`:**
```bash
VITE_FCZ_BASE_ENABLE=1
VITE_FCZ_BASE_READONLY=0
VITE_FCZ_BASE_DEPOSITS=1
VITE_FCZ_BASE_WITHDRAWALS=1
VITE_FCZ_BASE_BETS=1
VITE_BASE_ESCROW_ADDRESS=0x5B966ca41aB58E50056EE1711c9766Ca3382F115
VITE_WC_PROJECT_ID=<your_walletconnect_project_id>
```

---

## 🎯 Quick Implementation Steps

1. **Add activity feed to WalletPageV2** (10 min)
   - Add imports
   - Add hooks
   - Add wallet connection controls
   - Add activity list

2. **Update StickyActionPanel** (15 min)
   - Replace component logic with gating
   - Test all four states

3. **Remove demo balances** (10 min)
   - Grep for getDemoBalance
   - Replace with selectors
   - Test

4. **Final verification** (10 min)
   - Run full deposit → prediction flow
   - Verify balances update
   - Verify gating works

**Total time: ~45 minutes**

---

## 📝 Files Modified Summary

1. ✅ `client/src/hooks/useOnchainActivity.ts` - Created
2. ✅ `client/src/components/wallet/DepositUSDCModal.tsx` - Enhanced
3. ✅ `client/src/components/wallet/WithdrawUSDCModal.tsx` - Enhanced
4. ✅ `client/src/lib/balance/__tests__/balanceSelector.test.ts` - Created
5. ⏳ `client/src/pages/WalletPageV2.tsx` - Needs activity feed
6. ⏳ `client/src/components/predictions/StickyActionPanel.tsx` - Needs gating
7. ⏳ Various files - Remove demo balances

---

**You're 80% done! Just these final UI integrations and you're ready to ship!** 🚀

