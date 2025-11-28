# Production Challenges and Solutions Documentation

**Last Updated:** January 2025  
**Stable Production State:** Settlement TX `0xcf1e6ccbedeb391dd07dce2f9fd86c7b00186e3f425664b205b7098104304652`  
**Recovery Branch:** `recovery/fcz-stable-production-*`  
**Recovery Tag:** `fcz-stable-production-*`

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Critical Challenges and Solutions](#critical-challenges-and-solutions)
3. [On-Chain Settlement Architecture](#on-chain-settlement-architecture)
4. [Balance Reconciliation System](#balance-reconciliation-system)
5. [Transaction Logging and Activity Feed](#transaction-logging-and-activity-feed)
6. [Image Stability System](#image-stability-system)
7. [Authentication and Session Management](#authentication-and-session-management)
8. [Deployment and Environment Configuration](#deployment-and-environment-configuration)
9. [Performance Optimizations](#performance-optimizations)
10. [Lessons Learned for Mainnet Migration](#lessons-learned-for-mainnet-migration)

---

## Architecture Overview

### Technology Stack
- **Frontend:** React + Vite, deployed on Vercel (`app.fanclubz.app`)
- **Backend:** Node.js + Express, deployed on Render (`fan-club-z.onrender.com`)
- **Database:** PostgreSQL via Supabase (`auth.fanclubz.app`)
- **Blockchain:** Base Sepolia (Testnet) → Base Mainnet (Future)
- **Smart Contracts:**
  - USDC Token: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Base Sepolia)
  - Escrow Contract: `0x7B657F5140635241aec55f547d10F31cBDdF3105` (Base Sepolia)

### Core Flow
1. **Deposit:** User deposits USDC → Escrow contract
2. **Stake:** User stakes on predictions → Creates escrow locks (off-chain tracking)
3. **Settlement:** Admin settles prediction → Computes Merkle tree → Posts root on-chain
4. **Claim:** Winners claim payouts → On-chain Merkle proof verification
5. **Withdraw:** User withdraws available balance → Escrow contract

---

## Critical Challenges and Solutions

### Challenge 1: Available Balance Stuck at $0.00 After Settlement

**Problem:**
- After predictions were settled and users claimed winnings, available balance remained at $0.00
- Users couldn't stake despite having funds in escrow
- Root cause: `fetchEscrowFromLocks` was counting ALL `consumed` locks, including those for settled predictions

**Root Cause:**
```typescript
// BEFORE (BROKEN):
// fetchEscrowFromLocks counted all consumed locks, even for settled predictions
if (!isExpired && (lockStatus === 'locked' || lockStatus === 'consumed')) {
  escrowTotal += amount; // ❌ Counted settled predictions
}
```

**Solution:**
```typescript
// AFTER (FIXED):
// Exclude consumed locks for settled predictions
const predictionIds = [...new Set(locks.map(l => l.prediction_id).filter(Boolean))];
const { data: predictions } = await supabase
  .from('predictions')
  .select('id, status')
  .in('id', predictionIds);
  
const settledPredictionIds = new Set(
  predictions.filter(p => p.status === 'settled').map(p => p.id)
);

if (isConsumed && lock.prediction_id && settledPredictionIds.has(lock.prediction_id)) {
  continue; // ✅ Skip settled predictions
}
```

**Files Modified:**
- `server/src/services/walletReconciliation.ts` - `fetchEscrowFromLocks()`

**Key Learnings:**
- Always check prediction status when calculating escrow from locks
- Even if lock release query fails, settled predictions should not block available balance
- Database consistency is critical: locks must be released after settlement

---

### Challenge 2: Duplicate Claimable Entries Causing Failed Transactions

**Problem:**
- `/api/v2/settlement/claimable` endpoint returned duplicate entries for the same prediction
- Users attempted to claim the same payout multiple times, causing transaction failures
- Only one claim succeeded, others reverted with "AlreadyClaimed" error

**Root Cause:**
- Multiple `bet_settlements` rows for the same prediction (on-chain + off-chain)
- No deduplication logic in the claimable endpoint
- Client-side had no safety net

**Solution:**

**Server-Side Deduplication:**
```typescript
// Use Map keyed by bet_id to ensure at most one settlement per prediction
const settledMap = new Map<string, typeof settlement>();

for (const s of onchainSettled) {
  if (!settledMap.has(s.bet_id)) {
    settledMap.set(s.bet_id, s);
  }
}

// For off-chain settlements, only include if Merkle root exists
for (const s of offchainSettled) {
  if (!settledMap.has(s.bet_id)) {
    const root = await ensureOnchainPosted(s.bet_id);
    if (root) {
      settledMap.set(s.bet_id, { ...s, status: 'onchain_posted' });
    }
  }
}
```

**Client-Side Safety Net:**
```typescript
// Deduplicate by predictionId (safety net if backend returns duplicates)
const seen = new Map<string, ClaimableItem>();
for (const item of items) {
  if (!seen.has(item.predictionId)) {
    seen.set(item.predictionId, item);
  }
}
```

**Files Modified:**
- `server/src/routes/settlement.ts` - `/claimable` endpoint
- `client/src/hooks/useClaimableClaims.ts` - Client-side deduplication

**Key Learnings:**
- Always deduplicate by unique identifier (prediction ID)
- Implement both server-side and client-side deduplication
- Check on-chain claim status before including in claimable list

---

### Challenge 3: On-Chain Settlement Transaction Reverting

**Problem:**
- `postSettlementRoot` transaction was reverting on-chain
- Error: "execution reverted" (insufficient USDC balance for fees)
- Settlement couldn't complete, blocking payouts

**Root Cause:**
- Escrow contract didn't have sufficient USDC balance to pay creator/platform fees
- Fee calculation was correct, but contract balance was insufficient
- Old escrow contract may have been in a bad state

**Solution:**

**Temporary Fallback (Later Removed):**
```typescript
// Initially set fees to 0n to bypass revert
creatorFee: 0n,
platformFee: 0n,
```

**Proper Solution:**
1. Deployed new escrow contract: `0x7B657F5140635241aec55f547d10F31cBDdF3105`
2. Updated environment variables in Render and Vercel
3. Restored on-chain fee logic:
```typescript
creatorFee: BigInt(data.data.creatorFeeUnits),
platformFee: BigInt(data.data.platformFeeUnits),
```
4. Implemented fallback to off-chain settlement if on-chain fails:
```typescript
try {
  await settleWithMerkle(...); // On-chain
} catch (error) {
  await settleManually(...); // Off-chain fallback
}
```

**Files Modified:**
- `client/src/components/modals/SettlementModal.tsx`
- `client/src/hooks/useSettlementMerkle.ts`
- `deploy-escrow.sh` - New contract deployment script

**Key Learnings:**
- Always ensure escrow contract has sufficient balance before settlement
- Implement graceful fallback to off-chain settlement if on-chain fails
- Never deploy contracts without proper balance checks
- Document contract addresses and update them in all environments

---

### Challenge 4: Balance Not Updating After Deposit/Withdrawal

**Problem:**
- After depositing or withdrawing USDC, balance didn't update in UI
- Required manual page refresh or navigation to see updated balance
- Poor user experience

**Root Cause:**
1. `useEscrowBalance` had `refetchOnMount: false` and high `staleTime`
2. `isEnabled` was too strict, disabling query during hydration
3. No delay after transaction confirmation for backend reconciliation

**Solution:**

**Aggressive Refetching:**
```typescript
// useEscrowBalance.ts
refetchOnMount: true,
staleTime: 5000, // 5 seconds instead of default

// Force refetch after address becomes available
useEffect(() => {
  if (effectiveAddress && isEnabled) {
    setTimeout(() => {
      refetch();
    }, 500);
  }
}, [effectiveAddress, isEnabled]);
```

**Transaction Delays:**
```typescript
// DepositUSDCModal.tsx & WithdrawUSDCModal.tsx
await waitForTransactionReceipt(...);
await hardDelay(3000); // Allow backend reconciliation
broadcastBalanceRefresh();
```

**Files Modified:**
- `client/src/hooks/useEscrowBalance.ts`
- `client/src/components/wallet/DepositUSDCModal.tsx`
- `client/src/components/wallet/WithdrawUSDCModal.tsx`

**Key Learnings:**
- Always refetch on mount for balance queries
- Add delays after transactions to allow backend reconciliation
- Use `broadcastBalanceRefresh()` to notify all components
- Prioritize on-chain data over database snapshots

---

### Challenge 5: Stale Escrow Balance After Page Reload

**Problem:**
- After page reload, escrow balance showed $0.00
- Wallet was connected, but `useEscrowBalance` wasn't reading balance
- `useAccount` from wagmi reports `address = undefined` during hydration

**Root Cause:**
- `useEscrowBalance` relied on `useAccount().address` which is undefined during SSR/hydration
- No fallback to persisted address from `localStorage`

**Solution:**

**Persisted Address During Hydration:**
```typescript
function getPersistedAddress(): string | null {
  try {
    const stored = localStorage.getItem('wagmi.store');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    const state = parsed?.state?.connections?.values()?.next()?.value;
    return state?.accounts?.[0] || null;
  } catch {
    return null;
  }
}

const persistedAddress = getPersistedAddress();
const effectiveAddress = address || persistedAddress;
const isEnabled = !!effectiveAddress && (chainId === baseSepolia.id || typeof chainId === 'undefined');
```

**Files Modified:**
- `client/src/hooks/useEscrowBalance.ts`

**Key Learnings:**
- Always handle SSR/hydration edge cases
- Persist wallet state in localStorage for hydration
- Use `effectiveAddress` (live or persisted) for query enabling

---

### Challenge 6: PWA Update Logging Users Out

**Problem:**
- When PWA update prompt appeared and user clicked "Update", app reloaded
- User was logged out and had to sign in again
- Poor user experience

**Root Cause:**
- `window.location.reload()` cleared Supabase session
- No session persistence across reloads

**Solution:**

**Session Capture Before Reload:**
```typescript
// PWAInstallManager.tsx
const handleUpdateApp = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    sessionStorage.setItem('fcz:supabase:session', JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    }));
  }
  window.location.reload();
};
```

**Session Restoration After Reload:**
```typescript
// AuthSessionProvider.tsx
const getInitialSession = async () => {
  // Check sessionStorage for cached session
  const cached = sessionStorage.getItem('fcz:supabase:session');
  if (cached) {
    try {
      const { access_token, refresh_token } = JSON.parse(cached);
      await supabase.auth.setSession({ access_token, refresh_token });
      sessionStorage.removeItem('fcz:supabase:session');
    } catch (e) {
      console.error('[AUTH] Failed to restore session:', e);
    }
  }
  // ... rest of initialization
};
```

**Files Modified:**
- `client/src/components/PWAInstallManager.tsx`
- `client/src/providers/AuthSessionProvider.tsx`

**Key Learnings:**
- Always persist critical state (auth, wallet) before reloads
- Use `sessionStorage` for temporary persistence (cleared on tab close)
- Restore state immediately on initialization

---

### Challenge 7: Deposit Transaction Reverting Due to Minimum Amount

**Problem:**
- Users could enter amounts < 1 USDC in deposit modal
- Transaction reverted with "Minimum deposit not met"
- No UI validation before submission

**Root Cause:**
- Escrow contract has `MIN_DEPOSIT = 1_000_000` (1 USDC with 6 decimals)
- UI allowed deposits as low as $0.01

**Solution:**

**Pre-Submission Validation:**
```typescript
const MIN_DEPOSIT_USD = 1.0;

const handleDeposit = async () => {
  const cleanAmount = parseFloat(amount);
  
  // Validate minimum deposit
  if (cleanAmount < MIN_DEPOSIT_USD) {
    toast.error(`Minimum deposit is ${MIN_DEPOSIT_USD} USDC`);
    return;
  }
  
  // Disable button and show warning if amount too low
  const isAmountTooLow = cleanAmount < MIN_DEPOSIT_USD;
  
  // ... rest of deposit logic
};
```

**Files Modified:**
- `client/src/components/wallet/DepositUSDCModal.tsx`

**Key Learnings:**
- Always validate against contract constraints in UI
- Show clear error messages before transaction submission
- Disable submit button for invalid amounts

---

### Challenge 8: Approval Request Not Hitting Wallet

**Problem:**
- When depositing, approval request didn't appear in wallet
- Silent failures, no user feedback
- WalletConnect session errors not handled

**Root Cause:**
- `writeContractAsync` calls not wrapped with session recovery
- No error handling for user rejection or session errors

**Solution:**

**Session Recovery Wrapper:**
```typescript
const withSessionRecovery = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    if (isUserRejection(error)) {
      throw new Error('Transaction rejected by user');
    }
    if (checkSessionError(error)) {
      // Handle WalletConnect session errors
      await reconnectWallet();
      return await fn();
    }
    throw error;
  }
};

// Usage:
await withSessionRecovery(async () => {
  await writeContractAsync({ ...approvalConfig });
});
```

**Files Modified:**
- `client/src/components/wallet/DepositUSDCModal.tsx`

**Key Learnings:**
- Always wrap blockchain transactions with error handling
- Handle user rejection gracefully
- Implement session recovery for WalletConnect

---

### Challenge 9: Module Loading Errors (Stale Chunks)

**Problem:**
- After deployment, users saw "Failed to fetch dynamically imported module" errors
- Required hard refresh to fix
- Service worker serving stale chunks

**Root Cause:**
- Vercel serving stale JavaScript chunks after deployments
- Service worker caching old chunks
- No cache busting on module load failures

**Solution:**

**Global Error Handlers:**
```typescript
// main.tsx
window.addEventListener('error', (event) => {
  if (event.message.includes('Failed to fetch dynamically imported module')) {
    // Clear service worker caches and reload
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
    window.location.reload(true);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('Failed to fetch')) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
    window.location.reload(true);
  }
});
```

**Error Boundary:**
```typescript
// ErrorBoundary.tsx
if (error.name === 'ChunkLoadError') {
  // Clear caches and reload
  caches.keys().then(names => {
    names.forEach(name => caches.delete(name));
  });
  window.location.reload(true);
}
```

**Files Modified:**
- `client/src/main.tsx`
- `client/src/components/ErrorBoundary.tsx`

**Key Learnings:**
- Always handle chunk loading errors globally
- Clear service worker caches on module load failures
- Implement automatic recovery (reload) for stale chunks

---

### Challenge 10: Incorrect Available Balance After Stake

**Problem:**
- After placing a stake, available balance didn't decrease
- Balance showed same amount before and after stake
- Users could stake more than available

**Root Cause:**
- `useUnifiedBalance` used `Math.max(onchainAvailable, summaryAvailable)`
- On-chain balance doesn't decrease for off-chain stakes
- `Math.max` kept showing higher (unchanged) on-chain value

**Solution:**

**Prioritize Backend Summary:**
```typescript
// useUnifiedBalance.ts
// Available balance: prioritize backend summary (accounts for consumed locks)
const computedAvailable = summaryAvailable > 0 
  ? summaryAvailable 
  : onchainBalance; // Fallback to on-chain if summary not loaded

// Reserved balance: use backend summary (only locked, not consumed)
const computedReserved = summaryReserved;

// Total balance: use on-chain (source of truth)
const computedTotal = Math.max(onchainTotal, summaryTotal);
```

**Files Modified:**
- `client/src/hooks/useUnifiedBalance.ts`
- `client/src/utils/queryInvalidation.ts` - Added `broadcastBalanceRefresh()` after bet placement

**Key Learnings:**
- Backend summary accounts for consumed locks, on-chain doesn't
- Use backend summary for "available" balance (what can be staked)
- Use on-chain balance for "total" balance (source of truth)
- Always invalidate queries after state changes

---

## On-Chain Settlement Architecture

### Merkle Tree Settlement Flow

1. **Settlement Initiation:**
   - Admin calls `/api/v2/settlement/settle-manual` or `settle-manual/merkle`
   - Backend computes winners/losers from `prediction_entries`
   - Calculates payouts, creator fees, platform fees

2. **Merkle Tree Construction:**
   ```typescript
   const settlement = computeMerkleSettlement({
     predictionId,
     winningOptionId,
     entries: allEntries,
     creatorFeeBps: 100, // 1%
     platformFeeBps: 100, // 1%
   });
   
   // settlement.root = Merkle root hash
   // settlement.leaves = Array of { account, amountUnits, proof }
   ```

3. **On-Chain Root Posting:**
   ```typescript
   await postSettlementRoot({
     predictionId,
     merkleRoot: settlement.root,
     creatorFee: BigInt(creatorFeeUnits),
     platformFee: BigInt(platformFeeUnits),
   });
   ```

4. **Claim Process:**
   ```typescript
   await claim({
     predictionId,
     account: userAddress,
     amountUnits: BigInt(leaf.amountUnits),
     proof: leaf.proof,
   });
   ```

### Database Schema

**`bet_settlements` Table:**
```sql
CREATE TABLE bet_settlements (
  id UUID PRIMARY KEY,
  bet_id UUID REFERENCES predictions(id),
  winning_option_id UUID REFERENCES prediction_options(id),
  status VARCHAR(50) CHECK (status IN ('pending', 'computing', 'computed', 'posting', 'onchain_posted', 'completed', 'failed')),
  meta JSONB DEFAULT '{}', -- Stores merkle_root, payouts, etc.
  merkle_root VARCHAR(66),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Status Flow:**
- `pending` → `computing` → `computed` → `posting` → `onchain_posted` → `completed`

### Fee Distribution

- **Creator Fee:** 1% of total pool → Creator's wallet
- **Platform Fee:** 1% of total pool → Platform treasury (`0x80f204ea1b41f08227b87334e1384e5687f332d2`)
- **Winner Payouts:** Remaining 98% distributed to winners based on stake amounts

---

## Balance Reconciliation System

### Architecture

**Two Sources of Truth:**
1. **On-Chain Escrow Contract:** Source of truth for total deposits/withdrawals
2. **Database Escrow Locks:** Tracks which funds are locked/consumed/released

### Reconciliation Logic

```typescript
// 1. Fetch on-chain escrow balance
const snapshot = await fetchEscrowSnapshotFor(userAddress);
// snapshot.availableUSDC = total deposited - total withdrawn

// 2. Fetch escrow from locks (locked + consumed, excluding released/expired)
const escrowFromLocks = await fetchEscrowFromLocks(userId);
// Excludes: released locks, expired locks, settled predictions

// 3. Calculate available balance
const effectiveAvailable = Math.max(
  snapshot.availableUSDC - escrowFromLocks,
  0
);

// 4. Reserved = only 'locked' status (pending bets)
const reservedFromLocks = await fetchReservedFromLocks(userId);
```

### Lock States

- **`locked`:** Bet is pending, not yet placed
- **`consumed`:** Bet was placed, prediction not yet settled
- **`released`:** Prediction settled, funds unlocked
- **`expired`:** Lock timed out (10 minutes default)

### Critical Rules

1. **Never count released locks** in escrow calculation
2. **Never count expired locks** in escrow calculation
3. **Never count consumed locks for settled predictions** (even if not released)
4. **Always check prediction status** when calculating escrow from locks

---

## Transaction Logging and Activity Feed

### Transaction Channels

- **`escrow_deposit`:** USDC deposited to escrow (credit)
- **`escrow_withdraw`:** USDC withdrawn from escrow (debit)
- **`escrow_consumed`:** Stake placed on prediction (debit)
- **`payout`:** Claimed winnings (credit)
- **`settlement_loss`:** Lost prediction (debit)
- **`platform_fee`:** Platform fee deducted (debit)
- **`creator_fee`:** Creator fee deducted (debit)

### Activity Feed Normalization

```typescript
// walletActivity.ts
switch (tx.channel) {
  case 'escrow_consumed':
    return { type: 'bet_placed', title: 'Stake placed', ... };
  case 'payout':
    return { type: 'wallet.win', title: 'Won prediction', ... };
  case 'settlement_loss':
    return { type: 'wallet.loss', title: 'Lost prediction', ... };
  case 'platform_fee':
    return { type: 'wallet.fee', title: '$ Platform fee', ... };
}
```

### Deduplication

- Filter by `status: ['completed', 'success']` to prevent duplicates
- Exclude `escrow_consumed` from user activity (shown as bet_placed instead)
- Use `external_ref` (tx_hash) for idempotency

---

## Image Stability System

### Problem
- Images changed between page loads
- Client-side caching insufficient for long-term stability

### Solution

**Database Storage:**
```sql
ALTER TABLE predictions ADD COLUMN image_url TEXT;
CREATE INDEX idx_predictions_image_url ON predictions(image_url) WHERE image_url IS NOT NULL;
```

**Image Selection Flow:**
1. Check `prediction.image_url` (database)
2. If not present, fetch from Pexels/Unsplash
3. Save fetched URL to database via `PATCH /api/v2/predictions/:id/image`
4. Use saved URL for all future loads

**Files Modified:**
- `server/migrations/120_add_prediction_image_url.sql`
- `server/src/routes/predictions.ts` - Added image URL endpoints
- `client/src/features/images/StableImageProvider.tsx` - Database-first image loading

**Key Learnings:**
- Always persist user selections to database
- Client-side cache is temporary, database is permanent
- Use database as source of truth for user-generated content

---

## Authentication and Session Management

### OAuth Flow

1. **Initiation:**
   ```typescript
   await signInWithOAuth({
     provider: 'google',
     options: {
       redirectTo: `${getRedirectUrl()}/auth/callback`,
       queryParams: { access_type: 'offline', prompt: 'consent' },
     },
   });
   ```

2. **Callback Handling:**
   ```typescript
   // AuthCallback.tsx
   const { data: { session } } = await supabase.auth.getSession();
   const returnTo = consumeReturnTo(); // From sessionStorage
   navigate(returnTo || '/discover');
   ```

3. **Session Persistence:**
   - Store return URL in `sessionStorage` before OAuth redirect
   - Restore return URL after callback
   - Handle PWA updates with session capture/restore

### Auth Guard for Create Prediction

```typescript
// App.tsx
const handleFABClick = () => {
  if (!isAuthenticated) {
    openAuthGate({ intent: 'create_prediction' });
    captureReturnTo('/create');
    return;
  }
  navigate('/create');
};
```

---

## Deployment and Environment Configuration

### Environment Variables

**Render (Backend):**
```bash
BASE_ESCROW_ADDRESS=0x7B657F5140635241aec55f547d10F31cBDdF3105
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
CHAIN_ID=84532
RUNTIME_ENV=prod
RPC_URL=https://sepolia.base.org
```

**Vercel (Frontend):**
```bash
VITE_BASE_ESCROW_ADDRESS=0x7B657F5140635241aec55f547d10F31cBDdF3105
VITE_USDC_ADDRESS_BASE_SEPOLIA=0x036CbD53842c5426634e7929541eC2318f3dCF7e
VITE_CHAIN_ID=84532
VITE_SUPABASE_URL=https://auth.fanclubz.app
```

### Contract Addresses

**Base Sepolia (Testnet):**
- USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- Escrow: `0x7B657F5140635241aec55f547d10F31cBDdF3105`
- Platform Treasury: `0x80f204ea1b41f08227b87334e1384e5687f332d2`

**Base Mainnet (Future):**
- TBD - Update all environment variables before migration

### Database Migrations

**Critical Migrations:**
1. `120_add_prediction_image_url.sql` - Image URL storage
2. `121_create_bet_settlements.sql` - Settlement tracking

**Run in Supabase:**
```sql
-- See RUN_IN_SUPABASE.sql for consolidated migrations
```

---

## Performance Optimizations

### Query Optimization

- **Debouncing:** All refetch operations debounced (300ms)
- **Stale Time:** Balance queries use 5-second stale time
- **Refetch On Mount:** Enabled for balance queries
- **Query Invalidation:** Specific keys instead of `type: 'active'`

### Image Loading

- **Lazy Loading:** Images load on scroll
- **Plain Placeholders:** Simple gradients during loading (no icons)
- **Database Caching:** Images stored in database for stability
- **ETag Caching:** API responses cached with ETags

### Bundle Optimization

- **Code Splitting:** Route-based code splitting
- **Tree Shaking:** Unused code eliminated
- **Compression:** Gzip/Brotli compression enabled
- **Service Worker:** Caching for static assets

---

## Lessons Learned for Mainnet Migration

### 1. Contract Deployment

**Before Mainnet:**
- ✅ Deploy contracts to testnet first
- ✅ Test all settlement flows thoroughly
- ✅ Verify fee distribution works correctly
- ✅ Ensure contract has sufficient balance for fees
- ✅ Document all contract addresses

**Mainnet Checklist:**
- [ ] Deploy USDC contract (or use existing Base USDC)
- [ ] Deploy Escrow contract
- [ ] Update all environment variables
- [ ] Test deposit/withdrawal flows
- [ ] Test settlement and claim flows
- [ ] Verify fee distribution
- [ ] Set up monitoring and alerts

### 2. Balance Reconciliation

**Critical Rules:**
- Always check prediction status when calculating escrow from locks
- Never count released/expired locks
- Never count consumed locks for settled predictions
- Use on-chain balance as source of truth for totals
- Use backend summary for available balance (accounts for locks)

**Mainnet Considerations:**
- Monitor reconciliation accuracy
- Set up alerts for balance discrepancies
- Implement automatic reconciliation cron job
- Log all reconciliation events for auditing

### 3. Settlement Architecture

**Current Flow:**
1. Compute Merkle tree off-chain
2. Post root on-chain
3. Users claim with Merkle proof

**Mainnet Improvements:**
- Consider gasless claiming (relayer)
- Implement batch claiming for multiple predictions
- Add settlement dispute resolution
- Monitor settlement success rate

### 4. Error Handling

**Always Implement:**
- Graceful fallbacks (on-chain → off-chain)
- User-friendly error messages
- Transaction retry logic
- Session recovery for WalletConnect
- Global error boundaries

### 5. Testing Strategy

**Before Mainnet:**
- [ ] End-to-end test deposit flow
- [ ] End-to-end test stake flow
- [ ] End-to-end test settlement flow
- [ ] End-to-end test claim flow
- [ ] End-to-end test withdrawal flow
- [ ] Test balance reconciliation accuracy
- [ ] Test error scenarios (insufficient balance, failed transactions)
- [ ] Load testing for high traffic

### 6. Monitoring and Alerts

**Set Up:**
- Balance discrepancy alerts
- Failed transaction alerts
- Settlement failure alerts
- Claim failure alerts
- Database connection alerts
- RPC endpoint health checks

### 7. Documentation

**Maintain:**
- Contract addresses and ABIs
- Environment variable documentation
- API endpoint documentation
- Database schema documentation
- Deployment procedures
- Rollback procedures

---

## Recovery Procedures

### Creating Recovery Branch

```bash
git checkout -b recovery/fcz-stable-production-$(date +%Y%m%d-%H%M%S)
git tag -a "fcz-stable-production-$(date +%Y%m%d-%H%M%S)" -m "Stable production state"
git push origin <branch-name>
git push origin --tags
```

### Rolling Back to Stable State

```bash
git checkout recovery/fcz-stable-production-<timestamp>
# Or
git checkout fcz-stable-production-<timestamp>
```

### Database Rollback

- Use Supabase point-in-time recovery if available
- Or restore from backup before problematic migration

---

## Conclusion

This documentation captures all critical challenges faced during production deployment and the solutions implemented. Key takeaways:

1. **Always check prediction status** when calculating escrow from locks
2. **Implement deduplication** at both server and client levels
3. **Handle hydration edge cases** for wallet connections
4. **Persist critical state** before reloads (auth, wallet)
5. **Validate against contract constraints** in UI
6. **Implement graceful fallbacks** for on-chain operations
7. **Monitor balance reconciliation** accuracy
8. **Document everything** for future reference

**For Mainnet Migration:**
- Review this document thoroughly
- Test all flows on testnet first
- Update all contract addresses
- Set up monitoring and alerts
- Have rollback procedures ready

---

**Last Stable State:** Settlement TX `0xcf1e6ccbedeb391dd07dce2f9fd86c7b00186e3f425664b205b7098104304652`  
**Recovery Branch:** `recovery/fcz-stable-production-*`  
**Recovery Tag:** `fcz-stable-production-*`

