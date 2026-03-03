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

const prodUrl = process.env.PRODUCTION_DATABASE_URL;
const stagingUrl = process.env.STAGING_DATABASE_URL;

if (!prodUrl || !stagingUrl) {
  console.error('❌ Set PRODUCTION_DATABASE_URL and STAGING_DATABASE_URL');
  process.exit(1);
}

const limitPredictions = parseInt(process.env.SEED_LIMIT_PREDICTIONS || '0', 10) || undefined;

function parseConn(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '5432'),
    database: parsed.pathname.replace('/', ''),
    user: parsed.username,
    password: parsed.password,
    ssl: parsed.hostname?.includes('supabase.co') ? { rejectUnauthorized: false } : false,
  };
}

const prodPool = new Pool(parseConn(prodUrl));
const stagingPool = new Pool(parseConn(stagingUrl));

async function copyTable(
  name: string,
  orderBy?: string,
  limit?: number
): Promise<number> {
  const prodClient = await prodPool.connect();
  const stagingClient = await stagingPool.connect();
  try {
    const order = orderBy ? ` ORDER BY ${orderBy}` : '';
    const limitClause = limit != null ? ` LIMIT ${limit}` : '';
    const { rows } = await prodClient.query(`SELECT * FROM public.${name}${order}${limitClause}`);
    if (rows.length === 0) {
      console.log(`   ${name}: 0 rows (skip)`);
      return 0;
    }
    const cols = Object.keys(rows[0]).filter((c) => c !== 'undefined');
    const colList = cols.join(', ');
    const placeholders = rows
      .map(
        (_, i) =>
          `(${cols.map((_, j) => `$${i * cols.length + j + 1}`).join(', ')})`
      )
      .join(', ');
    const flat = rows.flatMap((r) => cols.map((c) => r[c]));
    const updateSet = cols.filter((c) => c !== 'id').map((c) => `${c} = EXCLUDED.${c}`).join(', ');
    const upsert = `INSERT INTO public.${name} (${colList}) VALUES ${placeholders} ON CONFLICT (id) DO UPDATE SET ${updateSet}`;
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
    await stagingPool.query('SELECT 1');
  } catch (e) {
    console.error('❌ Connection failed:', e);
    process.exit(1);
  }
  console.log('✅ Connected.\n');

  try {
    console.log('Copying categories...');
    await copyTable('categories');

    console.log('Copying public.users (creators for predictions)...');
    await copyTable('users');

    console.log('Copying predictions' + (limitPredictions ? ` (limit ${limitPredictions})` : '') + '...');
    await copyTable('predictions', 'created_at DESC', limitPredictions);

    console.log('Copying prediction_options...');
    const predIds = limitPredictions
      ? (await prodPool.query('SELECT id FROM public.predictions ORDER BY created_at DESC LIMIT $1', [limitPredictions])).rows.map((r: { id: string }) => r.id)
      : null;
    if (predIds?.length) {
      const stagingClient = await stagingPool.connect();
      const prodClient = await prodPool.connect();
      try {
        const { rows } = await prodClient.query(
          'SELECT * FROM public.prediction_options WHERE prediction_id = ANY($1)',
          [predIds]
        );
        if (rows.length > 0) {
          const cols = Object.keys(rows[0]);
          const placeholders = rows
            .map((_, i) => `(${cols.map((_, j) => `$${i * cols.length + j + 1}`).join(', ')})`)
            .join(', ');
          const flat = rows.flatMap((r) => cols.map((c) => r[c]));
          await stagingClient.query(
            `INSERT INTO public.prediction_options (${cols.join(', ')}) VALUES ${placeholders} ON CONFLICT (id) DO UPDATE SET ${cols.filter((c) => c !== 'id').map((c) => `${c} = EXCLUDED.${c}`).join(', ')}`,
            flat
          );
          console.log(`   prediction_options: ${rows.length} rows`);
        }
      } finally {
        stagingClient.release();
        prodClient.release();
      }
    } else {
      await copyTable('prediction_options');
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
