#!/usr/bin/env tsx
/**
 * Seed staging database with data from production (read-only copy).
 * Use this to get production-like data on staging for testing.
 *
 * Requires:
 *   PRODUCTION_DATABASE_URL  - production Supabase/Postgres (read-only recommended)
 *   STAGING_DATABASE_URL    - staging Supabase/Postgres (will insert)
 *
 * Usage (from server/):
 *   PRODUCTION_DATABASE_URL='postgresql://...' STAGING_DATABASE_URL='postgresql://...' npx tsx scripts/seed-staging-from-production.ts
 *
 * Optionally limit how much to copy with SEED_LIMIT_PREDICTIONS=50 (default: all).
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env.staging') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Pool } = pg;

const prodUrl = process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL;
const stagingUrl = process.env.STAGING_DATABASE_URL || process.env.MIGRATION_DATABASE_URL;

if (!prodUrl || !stagingUrl) {
  console.error('❌ Set PRODUCTION_DATABASE_URL (or DATABASE_URL) and STAGING_DATABASE_URL (or MIGRATION_DATABASE_URL)');
  process.exit(1);
}
const allowSameDb = process.env.SEED_ALLOW_SAME_DB === '1' || process.env.SEED_ALLOW_SAME_DB === 'true';
if (prodUrl === stagingUrl && !allowSameDb) {
  console.error('❌ Production and staging URLs must be different (or set SEED_ALLOW_SAME_DB=1 to copy within same DB)');
  process.exit(1);
}

const limitPredictions = parseInt(process.env.SEED_LIMIT_PREDICTIONS || '0', 10) || undefined;

function poolConfig(url: string) {
  const isSupabase =
    url.includes('supabase.com') || url.includes('supabase.co');
  const connectionString = url.split('?')[0];
  const config: pg.PoolConfig = {
    connectionString,
    ssl: isSupabase ? { rejectUnauthorized: false } : false,
  };
  return config;
}

const prodPool = new Pool(poolConfig(prodUrl));
const stagingPool = new Pool(poolConfig(stagingUrl));

async function getTableColumns(pool: pg.Pool, table: string): Promise<string[]> {
  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    [table]
  );
  return rows.map((r: { column_name: string }) => r.column_name);
}

async function copyTable(
  name: string,
  orderBy?: string,
  limit?: number,
  conflictColumn: string = 'id',
  whereClause?: string,
  whereParams?: unknown[]
): Promise<number> {
  const prodClient = await prodPool.connect();
  const stagingClient = await stagingPool.connect();
  try {
    const [stagingCols, prodCols] = await Promise.all([
      getTableColumns(stagingPool, name),
      getTableColumns(prodPool, name),
    ]);
    if (stagingCols.length === 0) {
      console.log(`   ${name}: table missing on staging (skip)`);
      return 0;
    }
    const cols = stagingCols.filter((c) => prodCols.includes(c));
    if (cols.length === 0) {
      console.log(`   ${name}: no common columns (skip)`);
      return 0;
    }
    const colList = cols.join(', ');
    const order = orderBy ? ` ORDER BY ${orderBy}` : '';
    const limitClause = limit != null ? ` LIMIT ${limit}` : '';
    const whereSql = whereClause ? ` WHERE ${whereClause}` : '';
    const query = `SELECT ${colList} FROM public.${name}${whereSql}${order}${limitClause}`;
    const { rows } = whereParams?.length
      ? await prodClient.query(query, whereParams)
      : await prodClient.query(query);
    if (rows.length === 0) {
      console.log(`   ${name}: 0 rows (skip)`);
      return 0;
    }
    const placeholders = rows
      .map(
        (_, i) =>
          `(${cols.map((_, j) => `$${i * cols.length + j + 1}`).join(', ')})`
      )
      .join(', ');
    const flat = rows.flatMap((r) => cols.map((c) => r[c]));
    const updateSet = cols
      .filter((c) => c !== conflictColumn)
      .map((c) => `${c} = EXCLUDED.${c}`)
      .join(', ');
    const upsert = `INSERT INTO public.${name} (${colList}) VALUES ${placeholders} ON CONFLICT (${conflictColumn}) DO UPDATE SET ${updateSet}`;
    await stagingClient.query(upsert, flat);
    console.log(`   ${name}: ${rows.length} rows`);
    return rows.length;
  } finally {
    prodClient.release();
    stagingClient.release();
  }
}

async function main() {
  console.log('🔌 Connecting to production (read) and staging (write)...');
  try {
    await prodPool.query('SELECT 1');
    console.log('   Production: OK');
  } catch (e) {
    console.error('❌ Production connection failed (check PRODUCTION_DATABASE_URL / password):', e);
    process.exit(1);
  }
  try {
    await stagingPool.query('SELECT 1');
    console.log('   Staging: OK');
  } catch (e) {
    console.error('❌ Staging connection failed (check STAGING_DATABASE_URL / password):', e);
    process.exit(1);
  }
  console.log('✅ Both connected.\n');

  try {
    console.log('Copying categories...');
    await copyTable('categories', undefined, undefined, 'slug');

    console.log('Copying public.users (only those present in staging auth)...');
    const { rows: authRows } = await stagingPool.query('SELECT id FROM auth.users');
    const stagingAuthIds = authRows.map((r: { id: string }) => r.id);
    if (stagingAuthIds.length === 0) {
      console.log('   users: 0 rows (no auth users on staging; public.users requires matching auth.users id)');
    } else {
      await copyTable('users', undefined, undefined, 'id', 'id = ANY($1)', [stagingAuthIds]);
    }

    const { rows: stagingUserRows } = await stagingPool.query('SELECT id FROM public.users');
    const stagingUserIds = stagingUserRows.map((r: { id: string }) => r.id);
    console.log('Copying predictions' + (limitPredictions ? ` (limit ${limitPredictions})` : '') + '...');
    if (stagingUserIds.length === 0) {
      console.log('   predictions: 0 rows (no creators in staging public.users; predictions.creator_id FK requires them)');
    } else {
      await copyTable('predictions', 'created_at DESC', limitPredictions, 'id', 'creator_id = ANY($1)', [stagingUserIds]);
    }

    const { rows: stagingPredRows } = await stagingPool.query('SELECT id FROM public.predictions');
    const stagingPredIds = stagingPredRows.map((r: { id: string }) => r.id);
    console.log('Copying prediction_options...');
    if (stagingPredIds.length === 0) {
      console.log('   prediction_options: 0 rows (no predictions on staging)');
    } else {
      await copyTable('prediction_options', undefined, undefined, 'id', 'prediction_id = ANY($1)', [stagingPredIds]);
    }

    console.log('\n✅ Staging seed from production complete.');
  } catch (err) {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await prodPool.end();
    await stagingPool.end();
  }
}

main();
