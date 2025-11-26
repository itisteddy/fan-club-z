# Comprehensive On-Chain Flow Fix

## Issues Identified

### 1. WalletConnect Session Management
- **Problem**: Unhandled promise rejection "No matching key. session topic doesn't exist"
- **Root Cause**: Stale WalletConnect sessions not being cleaned up on disconnect
- **Impact**: Users experience errors on reconnection, especially after failed transactions

### 2. Deposit Flow - Allowance Race Condition
- **Problem**: "ERC20: transfer amount exceeds allowance" despite successful approval
- **Root Cause**: `refetchAllowance` not being awaited properly; deposit hitting before allowance updates
- **Impact**: Deposit transactions fail even after approval succeeds

### 3. Missing Transaction Logging
- **Problem**: No comprehensive error propagation for on-chain failures
- **Impact**: Users don't see helpful error messages; activity feed inconsistent

### 4. Settlement & Fee Tracking
- **Problem**: No validation of amounts sent; no tx hash logging for settlements
- **Impact**: Settlement flow can fail silently; reconciliation issues

## Comprehensive Solution

### Phase 1: WalletConnect Session Management (CRITICAL)

**File: `client/src/lib/wagmi.ts`**
- Add session cleanup on disconnect
- Implement session refresh on reconnect
- Add error boundary for WalletConnect errors

### Phase 2: Deposit Flow Allowance Fix (CRITICAL)

**File: `client/src/components/wallet/DepositUSDCModal.tsx`**
- Already has `waitForAllowanceUpdate()` helper ✅
- Add retry logic with exponential backoff
- Add clear user feedback during each step

### Phase 3: Transaction Logging & Error Handling

**New Backend Route: `/api/wallet/log-transaction`**
- Log all on-chain transactions (approval, deposit, withdraw, settlement)
- Store: txHash, type, status, amount, timestamp, error
- Enable activity feed reconstruction

### Phase 4: Settlement Enhancement

**File: `server/src/routes/settlement.ts`**
- Add pre-flight validation for settlement amounts
- Log settlement tx hash to database
- Emit settlement events for real-time updates

## Implementation Plan

### Priority 1: Fix WalletConnect Session Handling
### Priority 2: Enhance Allowance Waiting Logic
### Priority 3: Implement Transaction Logging API
### Priority 4: Settlement Validation & Logging

## Files Modified
1. `client/src/lib/wagmi.ts` - WalletConnect configuration
2. `client/src/components/wallet/DepositUSDCModal.tsx` - Deposit flow
3. `client/src/components/wallet/WithdrawUSDCModal.tsx` - Withdraw flow
4. `server/src/routes/wallet/` - New transaction logging routes
5. `server/src/routes/settlement.ts` - Settlement enhancements
6. `client/src/hooks/useWalletConnect.ts` - New hook for session management

## Testing Checklist
- [ ] Deposit flow with MetaMask
- [ ] Deposit flow with Coinbase Wallet
- [ ] Deposit flow with WalletConnect
- [ ] Withdrawal flow
- [ ] Transaction logging verification
- [ ] Settlement flow with logging
- [ ] Reconnection after disconnect
- [ ] Reconnection after failed transaction
