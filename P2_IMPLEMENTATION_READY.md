# 🎯 P2 Implementation - Ready to Execute

## ✅ Status: P1 Verified & Working

Based on your screenshots:
- ✅ Database shows 10 USDC deposit
- ✅ Wallet transactions logged correctly  
- ✅ Crypto address registered
- ✅ Event log has deposit entry
- ⏳ Server restarting (for health endpoints)

## 📋 Implementation Tasks

### ✅ Already Complete
1. `useOnchainActivity` hook created with 10s polling
2. WalletPageV2 imports fixed
3. Balance selectors verified

### 🚧 To Implement Now

#### 1. WalletPageV2 - Connect/Disconnect + Activity
**File:** `client/src/pages/WalletPageV2.tsx`

**Changes needed:**
- Add wagmi hooks for wallet connection state
- Add connect/disconnect controls inside balance card (not header)
- Display activity feed using `useOnchainActivity`
- Ensure all demo balances replaced with selectors

**Key additions:**
```typescript
import { useAccount, useDisconnect } from 'wagmi';
import { formatActivityKind, getActivityIcon } from '../hooks/useOnchainActivity';
import { formatDistanceToNow } from 'date-fns';

// Inside component:
const { address, isConnected } = useAccount();
const { disconnect } = useDisconnect();
const { data: activityData } = useOnchainActivity(20);
```

#### 2. DepositUSDCModal - Auto Chain-Switch + Wait Receipt
**File:** `client/src/components/wallet/DepositUSDCModal.tsx`

**Changes needed:**
- Import and use `useSwitchToBase` before transactions
- Use `waitForTransactionReceipt` from wagmi
- Invalidate queries after success
- Better error handling
- ESC/click-outside close
- Safe-area bottom padding

#### 3. WithdrawUSDCModal - Validate + Wait Receipt  
**File:** `client/src/components/wallet/WithdrawUSDCModal.tsx`

**Changes needed:**
- Validate amount ≤ `escrowAvailable`
- Use `waitForTransactionReceipt`
- Invalidate queries after success
- ESC/click-outside close
- Safe-area bottom padding

#### 4. StickyActionPanel - Prediction Gating
**File:** `client/src/components/predictions/StickyActionPanel.tsx`

**Changes needed:**
- Import `selectEscrowAvailableUSD`
- Check auth state, wallet connection, escrow balance
- Show appropriate CTA based on state
- Open DepositUSDCModal when insufficient funds
- Bind stake input max to `escrowAvailable`

#### 5. Remove Demo Balances
**Files:** Multiple

**Changes needed:**
- Grep for old demo balance imports
- Replace with real selectors
- Ensure no fake balances displayed

#### 6. Unit Tests
**File:** `client/src/lib/balance/__tests__/balanceSelector.test.ts` (NEW)

**Test cases:**
- Escrow 100, reserved 30 → available 70
- Escrow 0, reserved 0 → available 0  
- Escrow 50, reserved 60 → available 0 (never negative)

## 📝 Key Code Snippets

### Activity Feed Component
```typescript
{onchainActivity?.items && onchainActivity.items.length > 0 && (
  <div className="mt-4 pt-4 border-t border-gray-200">
    <h4 className="text-xs font-semibold text-gray-700 mb-3">Recent Activity</h4>
    <div className="space-y-2">
      {onchainActivity.items.slice(0, 10).map((item) => (
        <div key={item.id} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="text-gray-500">
              {formatActivityKind(item.kind)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-medium">${item.amount.toFixed(2)}</span>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

### Connect/Disconnect Controls
```typescript
{/* Wallet connection status - inside balance card */}
<div className="flex items-center justify-between text-xs mb-2">
  <span className="text-gray-600">Wallet Status</span>
  {isConnected && address ? (
    <div className="flex items-center gap-2">
      <span className="font-mono text-gray-700">
        {address.slice(0, 6)}...{address.slice(-4)}
      </span>
      <button
        onClick={() => {
          disconnect();
          console.log('[FCZ-PAY] ui: wallet disconnected');
        }}
        className="text-blue-600 hover:text-blue-700"
      >
        Disconnect
      </button>
    </div>
  ) : (
    <button
      onClick={() => {
        // Open connect modal
        console.log('[FCZ-PAY] ui: opening connect wallet');
      }}
      className="text-blue-600 hover:text-blue-700"
    >
      Connect wallet
    </button>
  )}
</div>
```

### Modal Receipt Waiting
```typescript
// After writeContract
const hash = await writeContract(config, { ... });

// Wait for receipt
const receipt = await waitForTransactionReceipt(config, { hash });

console.log('[FCZ-PAY] ui: deposit success', hash);

// Invalidate queries
queryClient.invalidateQueries({ queryKey: ['wallet'] });
queryClient.invalidateQueries({ queryKey: ['onchain-activity'] });
queryClient.invalidateQueries({ queryKey: ['escrow-balance'] });
```

## 🎯 Implementation Priority

1. **HIGH**: DepositUSDCModal improvements (most critical for user flow)
2. **HIGH**: WalletPageV2 activity feed + connect/disconnect
3. **MEDIUM**: WithdrawUSDCModal improvements
4. **MEDIUM**: StickyActionPanel gating
5. **LOW**: Remove demo balances
6. **LOW**: Unit tests

## ⚠️ Important Notes

- **DO NOT** modify global header or navigation
- **DO NOT** change routing
- Keep all changes minimal and localized
- Respect feature flags
- Add `[FCZ-PAY] ui:` prefix to all console logs
- Test with flags ON and OFF

## 📊 Files to Touch

1. `client/src/pages/WalletPageV2.tsx` - Activity feed + connect/disconnect
2. `client/src/components/wallet/DepositUSDCModal.tsx` - Receipt waiting
3. `client/src/components/wallet/WithdrawUSDCModal.tsx` - Receipt waiting + validation
4. `client/src/components/predictions/StickyActionPanel.tsx` - Gating logic
5. `client/src/lib/balance/__tests__/balanceSelector.test.ts` - NEW tests

## ✅ Ready to Proceed

All prerequisites are met:
- ✅ P1 working (10 USDC confirmed)
- ✅ useOnchainActivity hook created
- ✅ Balance selectors verified
- ✅ Server restarted

**Awaiting your confirmation to proceed with implementation!** 🚀

