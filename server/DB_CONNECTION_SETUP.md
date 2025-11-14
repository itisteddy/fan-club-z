# Database Connection Setup

This guide explains how to connect directly to Supabase PostgreSQL for database operations.

## ⚠️ Security Warning

**NEVER commit database credentials to git!** Always use environment variables.

## Setup Steps

### 1. Install Dependencies

```bash
cd server
npm install pg @types/pg
```

### 2. Add Connection String to Environment

Add this to your `server/.env` file:

```bash
# Supabase PostgreSQL Connection (for direct database access)
SUPABASE_DB_URL="postgresql://postgres:QAZxcvbnm<LP@1984@db.ihtnsyhknvltgrksffun.supabase.co:5432/postgres"
```

**Or use these separate variables:**

```bash
POSTGRES_HOST=db.ihtnsyhknvltgrksffun.supabase.co
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=QAZxcvbnm<LP@1984
```

### 3. Verify Connection

```bash
npm run db:connect
```

This will:
- Test the connection
- Show database stats
- List key tables

### 4. Run Migrations

Execute SQL migration files:

```bash
# Run a single migration file
npm run db:migrate-file -- migrations/111_wallet_summary_view.sql
```

### 5. Execute Queries

Run a SQL query directly:

```bash
npm run db:query -- "SELECT * FROM wallets WHERE user_id = 'your-user-id' LIMIT 5"
```

### 6. Use in Code

```typescript
import { runQuery, tableExists } from './scripts/db-connect';

// Run a query
const result = await runQuery(
  'SELECT * FROM wallets WHERE currency = $1',
  ['USD']
);

// Check if table exists
const exists = await tableExists('wallets');
```

## Available Scripts

After setup, add these to `package.json`:

```json
{
  "scripts": {
    "db:connect": "tsx scripts/db-connect.ts",
    "db:migrate-file": "tsx scripts/run-migration.ts",
    "db:query": "tsx scripts/db-query.ts"
  }
}
```

## Direct Connection (Alternative)

If you prefer using `psql` directly:

```bash
psql "postgresql://postgres:QAZxcvbnm<LP@1984@db.ihtnsyhknvltgrksffun.supabase.co:5432/postgres"
```

## What I Can Do With Database Access

✅ **Safe Operations:**
- Read table schemas
- Run SELECT queries to inspect data
- Execute migration files you've reviewed
- Check table existence
- View data counts

⚠️ **Requires Your Approval:**
- CREATE/ALTER/DROP table operations
- DELETE/UPDATE/INSERT operations
- Running migrations that modify schema
- Any destructive operations

❌ **I Will NOT:**
- Run migrations automatically without approval
- Make schema changes without confirmation
- Delete data without explicit permission
- Modify production data unsafely

## Example: Check Wallet Data

```typescript
import { runQuery } from './scripts/db-connect';

// Check a user's wallet
const result = await runQuery(
  `SELECT 
    w.user_id,
    w.available_balance,
    w.reserved_balance,
    COUNT(wt.id) as transaction_count
   FROM wallets w
   LEFT JOIN wallet_transactions wt ON wt.user_id = w.user_id
   WHERE w.user_id = $1
   GROUP BY w.user_id, w.available_balance, w.reserved_balance`,
  ['bc1866ca-71c5-4029-886d-4eace081f5c4']
);

console.log(result.rows);
```

## Security Best Practices

1. ✅ Use environment variables
2. ✅ Add `.env` to `.gitignore`
3. ✅ Use connection pooling
4. ✅ Limit database access to development/staging when possible
5. ✅ Rotate passwords regularly
6. ❌ Don't hardcode credentials
7. ❌ Don't commit `.env` files
8. ❌ Don't share connection strings publicly

