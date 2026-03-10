#!/usr/bin/env node
/**
 * Port public schema data from prod Supabase to staging Supabase.
 * Run: pnpm run db:port-prod-to-staging
 *
 * Requires: schema already exists on staging (run migrations first).
 * Tables are truncated on staging before copy. Order respects FK dependencies.
 * Uses pooler URLs (port 6543) for IPv4 compatibility.
 */
import pg from 'pg';
const { Client } = pg;

const PROD_URL =
  process.env.DB_PORT_PROD_URL ||
  'postgresql://postgres.ihtnsyhknvltgrksffun:QAZxcvbnm%3CLP%401984@aws-0-us-east-2.pooler.supabase.com:6543/postgres';
const STAGING_URL =
  process.env.DB_PORT_STAGING_URL ||
  'postgresql://postgres.rzihzwvgpvozekicrdqr:gsaBmp5LPsUlFBJG@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';

// Tables in dependency order (parents first). auth.users must be copied first for public.users FK.
const TABLE_ORDER = [
  'categories',
  'users',
  'crypto_addresses',
  'wallets',
  'predictions',
  'prediction_options',
  'escrow_locks',
  'prediction_entries',
  'wallet_transactions',
  'event_log',
  'bet_settlements',
  'prediction_settlement_results',
  'blockchain_transactions',
  'payment_providers',
  'referral_clicks',
  'referral_attributions',
  'auth_logins',
  'users_referrals',
  'admin_audit_log',
  'app_config',
  'content_reports',
  'disputes',
  'notifications',
  'settlement_finalize_jobs',
  'settlement_validations',
  'user_blocks',
  'terms_acceptance',
  'support_notes',
  'fiat_withdrawals',
  'fx_rates',
  'comments',
  'comment_moderation',
  'prediction_images',
  'content_hides',
  'moderation_actions',
  'comment_likes',
  'comment_mentions',
];

async function getTables(client, schema = 'public') {
  const r = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = $1 ORDER BY tablename`,
    [schema]
  );
  return r.rows.map((x) => x.tablename);
}

// Supabase auth.users columns that have triggers/constraints - omit from insert, let DB set them
const AUTH_USERS_SKIP_COLS = ['confirmed_at', 'email_confirmed_at', 'recovery_sent_at'];

async function copyAuthUsers(prodClient, stagingClient) {
  const count = await prodClient.query(`SELECT count(*)::int FROM auth.users`).then((r) => r.rows[0].count);
  if (count === 0) return 0;
  const cols = await prodClient.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'auth' AND table_name = 'users' ORDER BY ordinal_position`
  );
  const colNames = cols.rows.filter((r) => !AUTH_USERS_SKIP_COLS.includes(r.column_name)).map((r) => r.column_name);
  const colList = colNames.map((c) => `"${c}"`).join(', ');
  const { rows } = await prodClient.query(`SELECT * FROM auth.users`);
  let inserted = 0;
  for (const row of rows) {
    const vals = colNames.map((c) => row[c]);
    const ph = vals.map((_, i) => `$${i + 1}`).join(', ');
    const updateCols = colNames.filter((c) => c !== 'id' && !AUTH_USERS_SKIP_COLS.includes(c));
    const updates = updateCols.map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ');
    try {
      await stagingClient.query(
        `INSERT INTO auth.users (${colList}) VALUES (${ph})
         ON CONFLICT (id) DO UPDATE SET ${updates}`,
        vals
      );
      inserted++;
    } catch (e) {
      console.warn(`  auth.users insert:`, e.message);
    }
  }
  return inserted;
}

async function getRowCount(client, table) {
  const r = await client.query(`SELECT count(*)::int FROM public."${table}"`);
  return r.rows[0].count;
}

// Tables that use ON CONFLICT DO UPDATE (e.g. users is populated by auth trigger, we merge prod data)
const UPSERT_TABLES = ['users'];

async function copyTable(prodClient, stagingClient, table) {
  let count = await getRowCount(prodClient, table);
  if (count === 0) return 0;

  // For users: only copy rows whose id exists in auth.users (FK). Set referred_by=NULL to avoid FK cycle.
  // For predictions: only copy where creator_id exists in staging's public.users (already copied).
  let rows;
  if (table === 'users') {
    const r = await prodClient.query(
      `SELECT u.* FROM public.users u WHERE u.id IN (SELECT id FROM auth.users)`
    );
    rows = r.rows.map((row) => ({ ...row, referred_by: null }));
    count = rows.length;
  } else if (table === 'predictions') {
    const r = await stagingClient.query(`SELECT id FROM public.users`);
    const userIds = r.rows.map((x) => x.id);
    if (userIds.length === 0) rows = [];
    else {
      const ph = userIds.map((_, i) => `$${i + 1}`).join(',');
      const q = await prodClient.query(`SELECT * FROM public.predictions WHERE creator_id IN (${ph})`, userIds);
      rows = q.rows;
    }
    count = rows.length;
  } else if (table === 'prediction_options') {
    const r = await stagingClient.query(`SELECT id FROM public.predictions`);
    const predIds = r.rows.map((x) => x.id);
    if (predIds.length === 0) rows = [];
    else {
      const ph = predIds.map((_, i) => `$${i + 1}`).join(',');
      const q = await prodClient.query(`SELECT * FROM public.prediction_options WHERE prediction_id IN (${ph})`, predIds);
      rows = q.rows;
    }
    count = rows.length;
  } else if (table === 'bet_settlements') {
    const r = await stagingClient.query(`SELECT id FROM public.predictions`);
    const predIds = r.rows.map((x) => x.id);
    if (predIds.length === 0) rows = [];
    else {
      const ph = predIds.map((_, i) => `$${i + 1}`).join(',');
      const q = await prodClient.query(`SELECT * FROM public.bet_settlements WHERE bet_id IN (${ph})`, predIds);
      rows = q.rows;
    }
    count = rows.length;
  } else if (['wallets', 'prediction_entries', 'escrow_locks', 'wallet_transactions'].includes(table)) {
    const r = await stagingClient.query(`SELECT id FROM public.users`);
    const userIds = r.rows.map((x) => x.id);
    if (userIds.length === 0) rows = [];
    else {
      const ph = userIds.map((_, i) => `$${i + 1}`).join(',');
      const userCol = table === 'wallets' ? 'user_id' : table === 'escrow_locks' ? 'user_id' : 'user_id';
      const predCol = table === 'prediction_entries' ? 'prediction_id' : null;
      let q;
      if (predCol && table === 'prediction_entries') {
        const preds = await stagingClient.query(`SELECT id FROM public.predictions`);
        const predIds = preds.rows.map((x) => x.id);
        if (predIds.length === 0) q = { rows: [] };
        else {
          const ph2 = predIds.map((_, i) => `$${userIds.length + i + 1}`).join(',');
          q = await prodClient.query(
            `SELECT * FROM public.prediction_entries WHERE user_id IN (${ph}) AND prediction_id IN (${ph2})`,
            [...userIds, ...predIds]
          );
        }
      } else {
        q = await prodClient.query(`SELECT * FROM public."${table}" WHERE ${userCol} IN (${ph})`, userIds);
      }
      rows = q.rows;
    }
    count = rows.length;
  } else {
    const r = await prodClient.query(`SELECT * FROM public."${table}"`);
    rows = r.rows;
  }
  if (rows.length === 0) return 0;

  const [prodCols, stgCols] = await Promise.all([
    prodClient.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
      [table]
    ),
    stagingClient.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
      [table]
    ),
  ]);
  const prodNames = new Set(prodCols.rows.map((r) => r.column_name));
  const colNames = stgCols.rows.map((r) => r.column_name).filter((c) => prodNames.has(c));
  if (colNames.length === 0) {
    console.warn(`  ⚠️ No matching columns for ${table}, skipping`);
    return 0;
  }
  const colList = colNames.map((c) => `"${c}"`).join(', ');
  const upsert = UPSERT_TABLES.includes(table);
  const updateSet = upsert
    ? colNames.filter((c) => c !== 'id').map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ')
    : '';
  const batchSize = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const values = [];
    const placeholders = [];
    let paramIndex = 1;
    for (const row of batch) {
      placeholders.push('(' + colNames.map(() => `$${paramIndex++}`).join(',') + ')');
      values.push(...colNames.map((c) => row[c]));
    }
    const sql = upsert
      ? `INSERT INTO public."${table}" (${colList}) VALUES ${placeholders.join(', ')} ON CONFLICT (id) DO UPDATE SET ${updateSet}`
      : `INSERT INTO public."${table}" (${colList}) VALUES ${placeholders.join(', ')}`;
    try {
      const r = await stagingClient.query(sql, values);
      inserted += r.rowCount ?? batch.length;
    } catch (e) {
      console.error(`  ⚠️ Batch insert failed (${table}):`, e.message);
    }
  }
  return inserted;
}

async function main() {
  const prodClient = new Client({
    connectionString: PROD_URL,
    ssl: { rejectUnauthorized: false },
  });
  const stagingClient = new Client({
    connectionString: STAGING_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await prodClient.connect();
    await stagingClient.connect();
    console.log('Connected to prod and staging\n');

    const prodTables = await getTables(prodClient);
    const stagingTables = await getTables(stagingClient);
    const tablesToCopy = TABLE_ORDER.filter((t) => prodTables.includes(t) && stagingTables.includes(t));
    const missing = TABLE_ORDER.filter((t) => prodTables.includes(t) && !stagingTables.includes(t));
    if (missing.length) {
      console.log('⚠️ Tables in prod but not staging (run migrations first):', missing.join(', '));
    }

    // 1. Truncate staging public tables first (reverse order)
    console.log('Truncating staging public tables...');
    for (const table of [...tablesToCopy].reverse()) {
      try {
        await stagingClient.query(`TRUNCATE public."${table}" CASCADE`);
      } catch (e) {
        console.warn(`  Truncate ${table}:`, e.message);
      }
    }

    // 2. Copy auth.users (trigger populates public.users)
    console.log('\nCopying auth.users...');
    let authCount = 0;
    try {
      authCount = await copyAuthUsers(prodClient, stagingClient);
      console.log(`  auth.users: ${authCount} rows\n`);
    } catch (e) {
      console.warn('  ⚠️ auth.users copy failed:', e.message);
      console.warn('  Continuing with public schema only.\n');
    }

    // 3. Copy public schema
    console.log('\nCopying public schema...\n');
    let total = 0;
    for (const table of tablesToCopy) {
      const n = await copyTable(prodClient, stagingClient, table);
      if (n > 0) {
        console.log(`  ${table}: ${n} rows`);
        total += n;
    }
    console.log(`\n✅ Done. Total rows copied: ${total} (auth: ${authCount})`);
  } finally {
    await prodClient.end();
    await stagingClient.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
