# Critical Bugs to Fix - Implementation Guide

## Bug #1: Settlement Modal - Incorrect Odds Display
**Problem:** Shows "0% • $0.00 staked" for options instead of actual stakes and percentages

**Root Cause:** The SettlementModal is reading `option.total_staked` but the API might be returning different field names like `staked_amount` or `amount_staked`.

**Fix Location:** `/client/src/components/modals/SettlementModal.tsx` (line ~153)

**Current Code:**
```typescript
const optionStaked = Number(option.total_staked || 0);
const percentage = totalPool > 0 ? (optionStaked / totalPool) * 100 : 0;
```

**Fixed Code:**
```typescript
// Try multiple possible field names for staked amount
const optionStaked = Number(
  option.total_staked || 
  option.staked_amount || 
  option.amount_staked || 
  option.total_amount || 
  0
);
const percentage = totalPool > 0 ? (optionStaked / totalPool) * 100 : 0;

// Add debug logging to see what fields are actually available
console.log('Option data:', {
  id: option.id,
  label: option.label,
  total_staked: option.total_staked,
  staked_amount: option.staked_amount,
  amount_staked: option.amount_staked,
  allFields: Object.keys(option)
});
```

---

## Bug #2: Wallet Activity - Missing Settlement Transactions
**Problem:** Only "Bet placed" transactions show in wallet, no settlement/payout transactions

**Root Cause:** Wallet activity API might not be including settlement transactions, or frontend is filtering them out.

**Fix Locations:**
1. Backend API: `/server/src/routes/wallet.ts` - Check wallet activity endpoint
2. Frontend Store: `/client/src/store/walletStore.ts` - Check activity fetching

**Investigation Needed:**
1. Check what transaction types the wallet activity endpoint returns
2. Verify settlement transactions are being created in the database when predictions are settled
3. Ensure frontend isn't filtering out settlement transaction types

**Quick Test:**
```bash
# Test wallet activity endpoint directly
curl http://localhost:3001/api/wallet/activity/[USER_ID] | jq
```

---

## Bug #3: Timestamp Display Issues
**Problem:** Shows "Closes in 0h" or "ends in 0m" instead of proper time or "Closed" status

**Root Cause:** Time calculation logic not handling edge cases for:
- Predictions past deadline
- Closed predictions
- Ended predictions

**Fix Location:** `/client/src/components/predictions/PredictionCard.tsx` or similar

**Investigation:** Look for `timeRemaining` calculation function

**Expected Fix:**
```typescript
const getTimeDisplay = (prediction: Prediction) => {
  if (prediction.status === 'closed' || prediction.status === 'ended' || prediction.status === 'settled') {
    return 'Closed';
  }
  
  const deadline = new Date(prediction.entry_deadline);
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  
  if (diff <= 0) {
    return 'Closed';
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h left`;
  }
  
  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }
  
  return `${minutes}m left`;
};
```

---

## Bug #4: Close Early Button Not Working
**Problem:** "Close Early" button in Manage Prediction modal doesn't work

**Root Cause:** Button might be disabled incorrectly or click handler not properly connected

**Fix Location:** `/client/src/components/modals/ManagePredictionModal.tsx`

**Investigation:**
The ManagePredictionModal shows:
```typescript
<button
  onClick={handleClosePrediction}
  disabled={updating || loading || prediction.status !== 'open'}
  ...
>
```

**Check:**
1. Is `prediction.status` actually 'open'?
2. Is `updating` or `loading` stuck as `true`?
3. Is `handleClosePrediction` being called?

**Debug Code to Add:**
```typescript
const handleClosePrediction = () => {
  console.log('🔒 Close Early clicked', {
    status: prediction.status,
    updating,
    loading,
    canClose: prediction.status === 'open' && !updating && !loading
  });
  setShowCloseModal(true);
};
```

---

## Quick Fix Priority

1. **Highest Priority:** Settlement Modal odds display (User can't see correct data when settling)
2. **High Priority:** Wallet activity missing settlements (User can't see payouts)
3. **Medium Priority:** Timestamp display (UX issue but not critical)
4. **Medium Priority:** Close Early button (Workaround: user can wait for natural close)

---

## Next Steps

1. Add console logging to SettlementModal to see what option fields are available
2. Check backend wallet activity endpoint to ensure it returns settlement transactions
3. Find and fix time display calculation
4. Add debugging to Close Early button to see why it's not working

Would you like me to implement these fixes directly in the code files?
