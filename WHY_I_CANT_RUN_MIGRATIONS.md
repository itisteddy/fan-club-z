# Why I Can't Run Database Migrations Directly

## The Challenge

Supabase uses PostgreSQL but provides access through **PostgREST**, which doesn't support executing arbitrary SQL statements directly via the JavaScript client. This is a security feature.

## What I Can Do

I've created tools to help you run migrations easily:

1. **`server/run-migrations-crypto.sh`** - Shows instructions and creates combined SQL file
2. **`server/migrations/COMBINED_109_110.sql`** - Both migrations in one file for easy copy-paste

## How to Run Migrations

### ✅ Method 1: Supabase Dashboard (Recommended - 2 minutes)

1. Go to: https://supabase.com/dashboard/project/ihtnsyhknvltgrksffun/sql
2. Open: `server/migrations/COMBINED_109_110.sql`
3. Copy all contents
4. Paste into Supabase SQL Editor
5. Click "Run"
6. Done! ✅

### ✅ Method 2: psql (If you have connection string)

```bash
# Get connection string from Supabase Dashboard:
# Settings → Database → Connection string → URI

psql "postgresql://postgres:[YOUR-PASSWORD]@db.ihtnsyhknvltgrksffun.supabase.co:5432/postgres" \
  -f server/migrations/109_prediction_entries_crypto.sql

psql "postgresql://postgres:[YOUR-PASSWORD]@db.ihtnsyhknvltgrksffun.supabase.co:5432/postgres" \
  -f server/migrations/110_cleanup_demo_data.sql
```

### ✅ Method 3: Supabase CLI

```bash
# Install Supabase CLI first: https://supabase.com/docs/guides/cli
supabase link --project-ref ihtnsyhknvltgrksffun
supabase db push
```

### ✅ Method 4: I Can Help Create a Direct Connection Script

If you provide your database connection string (password), I can create a script that uses the `pg` library to execute SQL directly.

## Why Not Direct Execution?

1. **Security**: Supabase PostgREST API doesn't allow arbitrary SQL
2. **No RPC**: Your Supabase instance doesn't have an `exec_sql` RPC function
3. **Connection String**: I don't have your database password

## What I Did Instead

- ✅ Created migration SQL files
- ✅ Created helper scripts with instructions
- ✅ Created combined migration file for easy copy-paste
- ✅ Verified SQL syntax is correct

## Quick Solution (Right Now)

**Easiest way:** Just copy-paste the SQL:

```bash
# View the combined migration:
cat server/migrations/COMBINED_109_110.sql

# Then paste it into Supabase SQL Editor
```

That's it! Takes 30 seconds.

---

**TL;DR:** Supabase's API doesn't allow direct SQL execution. Use the Supabase Dashboard SQL Editor - it's the fastest way (2 minutes total).

