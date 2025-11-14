# Migration Instructions

## Run These Migrations in Supabase SQL Editor

Copy and paste each migration file into the Supabase SQL Editor and execute:

### 1. Migration 111: Wallet Summary View
**File:** `migrations/111_wallet_summary_view.sql`

This creates a view that calculates wallet balances from transactions and escrow locks.

### 2. Migration 112: Wallet Transaction Indexes  
**File:** `migrations/112_wallet_tx_indexes.sql`

This adds indexes to optimize wallet queries.

### 3. Migration 113: Fix Existing Transactions
**File:** `migrations/113_fix_existing_transactions.sql`

This backfills `provider` and `channel` columns for existing transactions.

**OR** use the TypeScript script:
```bash
npm run fix-transactions
```

## After Running Migrations

1. Verify the data:
```bash
npm run db:inspect
```

2. Test the endpoints:
```bash
curl "http://localhost:3001/api/wallet/summary?userId=YOUR_USER_ID"
curl "http://localhost:3001/api/wallet/activity?userId=YOUR_USER_ID&limit=10"
```

3. Check the browser - wallet page should now show correct balances!

