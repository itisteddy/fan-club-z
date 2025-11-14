# Quick Database Setup

## 1. Add Connection String to `.env`

Add this line to `server/.env`:

```bash
SUPABASE_DB_URL="postgresql://postgres:QAZxcvbnm<LP@1984@db.ihtnsyhknvltgrksffun.supabase.co:5432/postgres"
```

## 2. Test Connection

```bash
cd server
npm run db:connect
```

You should see:
```
✅ Database connection successful
   Time: 2025-11-02T04:55:00.000Z
   PostgreSQL: PostgreSQL 15.x
```

## 3. Run Migrations

```bash
# Run wallet summary view migration
npm run db:migrate-file -- migrations/111_wallet_summary_view.sql

# Run wallet transaction indexes
npm run db:migrate-file -- migrations/112_wallet_tx_indexes.sql
```

## 4. Query Data

```bash
# Check wallet data for a user
npm run db:query -- "SELECT * FROM wallets WHERE user_id = 'bc1866ca-71c5-4029-886d-4eace081f5c4'"

# Count transactions
npm run db:query -- "SELECT COUNT(*) FROM wallet_transactions WHERE provider IN ('crypto-base-usdc', 'base/usdc', 'base-usdc')"
```

## What I Can Do Now

Once the connection is set up, I can:
- ✅ Inspect your database schema
- ✅ Check data counts
- ✅ Run SELECT queries
- ✅ Execute migrations (with your approval)
- ✅ Verify table structures
- ✅ Debug data issues

**I will always ask before making changes!**

