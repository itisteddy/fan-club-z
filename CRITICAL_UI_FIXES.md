# Critical UI Fixes - November 8, 2025

## Issues to Fix

### 1. Settlement Modal - Odds Display Issue ✅
**Problem:** Shows "0% • $0.00 staked" for both options instead of actual odds/stakes

**Root Cause:** The option data structure is inconsistent. Options have multiple possible field names for staked amounts:
- `total_staked`
- `staked_amount`
- `amount_staked`
- `total_amount`
- `totalStaked`

**Solution:** Already implemented fallback logic in SettlementModal.tsx (lines 141-148)

**Verification Needed:**
- Check API response from `/api/v2/predictions/{id}` to see which field names are actually returned
- Ensure backend is calculating and returning `total_staked` for each option

---

### 2. Wallet Activity - Missing Settlement Transactions ❌
**Problem:** Only shows "Bet placed" transactions, no settlement/payout transactions visible

**Root Cause:** Need to investigate:
1. Are settlement transactions being created in the database?
2. Is the wallet activity API returning them?
3. Is the frontend filtering them out?

**Files to Check:**
- `/server/src/routes/wallet.ts` - Wallet activity endpoint
- `/client/src/pages/WalletPageV2.tsx` - Wallet activity display
- `/client/src/store/walletStore.ts` - Wallet state management

**Expected Transaction Types:**
- `bet_placed` / `prediction_entry`
- `settlement_payout` / `winnings`
- `deposit`
- `withdrawal`
- `creator_fee`
- `platform_fee`

---

### 3. Timestamp Display Issues ❌
**Problem:** Prediction cards show "Closes in 0h" when they should show actual time or "Closed"

**Root Cause:** Time calculation or display logic issue

**Files to Check:**
- Prediction card components that display timestamps
- Time formatting utilities
- Backend `entry_deadline` field format

**Expected Behavior:**
- Open predictions: Show "Closes in Xh Xm"
- Closed predictions: Show "Closed"
- Ended predictions: Show "Ended Xh ago"

---

### 4. Close Early Button Not Working ❌
**Problem:** "Close Early" button in Manage Prediction modal doesn't work

**Current Implementation:** Lines 228-244 in ManagePredictionModal.tsx
```typescript
const handleClosePrediction = () => {
  console.log('🔒 Close Early clicked:', {...});
  if (prediction.status !== 'open') {
    toast.error('Can only close predictions that are currently open');
    return;
  }
  setShowCloseModal(true);
};
```

**Investigation Needed:**
1. Check if `closePrediction()` API call is actually being made
2. Check backend `/api/v2/predictions/:id/close` endpoint
3. Verify database update is happening
4. Check for any errors in console

---

## Fix Priority

1. **HIGH:** Close Early Button - Core functionality broken
2. **HIGH:** Wallet Activity - Settlement transactions not showing
3. **MEDIUM:** Timestamp Display - UX issue but not blocking
4. **LOW:** Settlement Modal Odds - Already has fallback logic

---

## Next Steps

1. Investigate backend API responses for option data structure
2. Check wallet transactions table for settlement records
3. Test Close Early functionality with detailed logging
4. Fix timestamp calculation/display logic

---

## Files That Need Updates

### Settlement Modal Odds (Already Fixed)
- ✅ `/client/src/components/modals/SettlementModal.tsx`

### Wallet Activity
- ❌ `/server/src/routes/wallet.ts`
- ❌ `/client/src/pages/WalletPageV2.tsx`
- ❌ `/client/src/store/walletStore.ts`

### Timestamp Display
- ❌ Prediction card components (need to identify which ones)
- ❌ Time formatting utilities

### Close Early Button
- ❌ `/server/src/routes/predictions.ts` - Close endpoint
- ❌ `/client/src/store/predictionStore.ts` - closePrediction function
