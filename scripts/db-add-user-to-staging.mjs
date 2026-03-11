#!/usr/bin/env node
/**
 * Add a specific user from prod to staging so they can use staging (profile, faucet, referrals).
 * Run: node scripts/db-add-user-to-staging.mjs <user-id>
 *
 * Example: node scripts/db-add-user-to-staging.mjs bc1866ca-71c5-4029-886d-4eace081f5c4
 */
import pg from 'pg';
const { Client } = pg;

const PROD_URL =
  process.env.DB_PORT_PROD_URL ||
  'postgresql://postgres.ihtnsyhknvltgrksffun:QAZxcvbnm%3CLP%401984@aws-0-us-east-2.pooler.supabase.com:6543/postgres';
const STAGING_URL =
  process.env.DB_PORT_STAGING_URL ||
  'postgresql://postgres.rzihzwvgpvozekicrdqr:gsaBmp5LPsUlFBJG@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';

const AUTH_SKIP = ['confirmed_at', 'email_confirmed_at', 'recovery_sent_at'];

async function main() {
  const userId = process.argv[2]?.trim();
  if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    console.error('Usage: node scripts/db-add-user-to-staging.mjs <user-uuid>');
    process.exit(1);
  }

  const prodClient = new Client({ connectionString: PROD_URL });
  const stagingClient = new Client({ connectionString: STAGING_URL });

  try {
    await prodClient.connect();
    await stagingClient.connect();

    // 1. Fetch from prod
    const authCols = await prodClient.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'auth' AND table_name = 'users' ORDER BY ordinal_position`
    );
    const authColNames = authCols.rows
      .map((r) => r.column_name)
      .filter((c) => !AUTH_SKIP.includes(c));

    const { rows: authRows } = await prodClient.query(
      `SELECT * FROM auth.users WHERE id = $1`,
      [userId]
    );
    if (authRows.length === 0) {
      console.error(`User ${userId} not found in prod auth.users`);
      process.exit(1);
    }
    const authRow = authRows[0];

    const { rows: pubRows } = await prodClient.query(
      `SELECT * FROM public.users WHERE id = $1`,
      [userId]
    );
    if (pubRows.length === 0) {
      console.error(`User ${userId} not found in prod public.users`);
      process.exit(1);
    }
    const pubRow = pubRows[0];

    // 2. Insert auth.users into staging
    const authVals = authColNames.map((c) => authRow[c]);
    const authPh = authVals.map((_, i) => `$${i + 1}`).join(', ');
    const authColList = authColNames.map((c) => `"${c}"`).join(', ');
    const updateCols = authColNames.filter((c) => c !== 'id');
    const updates = updateCols.map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ');

    try {
      await stagingClient.query(
        `INSERT INTO auth.users (${authColList}) VALUES (${authPh})
         ON CONFLICT (id) DO UPDATE SET ${updates}`,
        authVals
      );
      console.log('  auth.users: upserted');
    } catch (e) {
      console.warn('  auth.users:', e.message);
    }

    // 3. Insert public.users (referred_by = null to avoid FK)
    const pubCols = await stagingClient.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'users' ORDER BY ordinal_position`
    );
    const pubColNames = pubCols.rows.map((r) => r.column_name);
    const pubData = { ...pubRow, referred_by: null };
    const pubVals = pubColNames.map((c) => pubData[c]);
    const pubPh = pubVals.map((_, i) => `$${i + 1}`).join(', ');
    const pubColList = pubColNames.map((c) => `"${c}"`).join(', ');
    const pubUpdates = pubColNames
      .filter((c) => c !== 'id')
      .map((c) => `"${c}" = EXCLUDED."${c}"`)
      .join(', ');

    await stagingClient.query(
      `INSERT INTO public.users (${pubColList}) VALUES (${pubPh})
       ON CONFLICT (id) DO UPDATE SET ${pubUpdates}`,
      pubVals
    );
    console.log('  public.users: upserted');

    // 4. Ensure DEMO_USD wallet exists (minimal columns; migrations add demo_credits_balance etc.)
    await stagingClient.query(
      `INSERT INTO public.wallets (user_id, currency, available_balance, reserved_balance, updated_at)
       VALUES ($1, 'DEMO_USD', 0, 0, now())
       ON CONFLICT (user_id, currency) DO UPDATE SET updated_at = now()`,
      [userId]
    );
    console.log('  wallets: DEMO_USD row ensured');

    console.log(`\n✅ User ${userId} added to staging. Profile, faucet, and referrals should work now.`);
  } finally {
    await prodClient.end();
    await stagingClient.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
