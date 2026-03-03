#!/usr/bin/env tsx
/**
 * Run all SQL migrations in order (by filename).
 * Uses direct Postgres connection (DATABASE_URL / SUPABASE_DB_URL).
 *
 * Usage (from server/):
 *   npm run db:migrate-all
 *   # Or with staging DB:
 *   APP_ENV=staging npm run db:migrate-all
 *
 * Ensure DATABASE_URL (or SUPABASE_DB_URL) points to the target DB (e.g. staging).
 */

import { readdir } from 'fs/promises';
import path from 'path';
import { runMigrationFile, testConnection, closeConnection } from './db-connect';

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

async function main() {
  console.log('🔌 Testing database connection...');
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Cannot connect to database. Set DATABASE_URL or SUPABASE_DB_URL.');
    process.exit(1);
  }

  let files: string[];
  try {
    files = await readdir(MIGRATIONS_DIR);
  } catch (err) {
    console.error('❌ Cannot read migrations dir:', MIGRATIONS_DIR, err);
    await closeConnection();
    process.exit(1);
  }

  const skipPrefixes = ['COMBINED_', 'DIAGNOSTIC', 'EMERGENCY_', 'FIX_', 'FINAL_', 'SANITY_', 'VERIFY_'];
  const sqlFiles = files
    .filter((f) => f.endsWith('.sql') && !skipPrefixes.some((p) => f.startsWith(p)) && f !== 'create_blockchain_transactions.sql')
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  console.log(`\n📋 Found ${sqlFiles.length} migration(s). Running in order...\n`);

  for (const file of sqlFiles) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    process.stdout.write(`   ${file} ... `);
    const result = await runMigrationFile(filePath);
    if (result.success) {
      console.log('✅');
    } else {
      console.log('❌');
      console.error(`\n❌ Migration failed: ${file}`);
      console.error(result.error);
      await closeConnection();
      process.exit(1);
    }
  }

  await closeConnection();
  console.log('\n✅ All migrations completed.');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  closeConnection().then(() => process.exit(1));
});
