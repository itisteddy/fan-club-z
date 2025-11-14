#!/usr/bin/env tsx

/**
 * Run migrations directly using pg library
 * Requires DATABASE_URL or builds it from Supabase credentials
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '.env') });

// Get database connection string
let DATABASE_URL = process.env.DATABASE_URL;

// If no DATABASE_URL, try to build from Supabase env vars
if (!DATABASE_URL) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD;
  
  if (supabaseUrl && dbPassword) {
    // Extract project ref from Supabase URL
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (projectRef) {
      DATABASE_URL = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;
      console.log('📝 Built DATABASE_URL from Supabase credentials\n');
    }
  }
}

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL');
  console.error('');
  console.error('Option 1: Set DATABASE_URL environment variable');
  console.error('   DATABASE_URL="postgresql://user:pass@host:port/db"');
  console.error('');
  console.error('Option 2: Set Supabase credentials');
  console.error('   SUPABASE_URL (or VITE_SUPABASE_URL)');
  console.error('   SUPABASE_DB_PASSWORD (or DB_PASSWORD)');
  console.error('');
  console.error('Get connection string from:');
  console.error('   https://supabase.com/dashboard/project/[project]/settings/database');
  console.error('');
  process.exit(1);
}

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : undefined
});

async function executeSQL(sql: string, fileName: string): Promise<void> {
  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 10 && !s.startsWith('--'))
    .map(s => s.endsWith(';') ? s : s + ';');

  console.log(`📄 ${fileName}: ${statements.length} statements\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (stmt.length < 10) continue;

    try {
      // Show first 80 chars of statement
      const preview = stmt.substring(0, 80).replace(/\n/g, ' ');
      console.log(`   [${i + 1}/${statements.length}] ${preview}...`);
      
      await client.query(stmt);
      console.log(`   ✅ Statement ${i + 1} executed\n`);
    } catch (error: any) {
      // Check if error is "already exists" - that's OK
      if (error.message?.includes('already exists') || 
          error.message?.includes('duplicate') ||
          error.code === '42P07' || // duplicate_table
          error.code === '42710') { // duplicate_object
        console.log(`   ⚠️  Statement ${i + 1} skipped (already exists)\n`);
      } else {
        console.error(`   ❌ Error in statement ${i + 1}:`, error.message);
        throw error;
      }
    }
  }
}

async function main() {
  const migrationsDir = path.join(__dirname, 'migrations');
  
  const migrations = [
    '109_prediction_entries_crypto.sql',
    '110_cleanup_demo_data.sql'
  ];

  console.log('🚀 Running Crypto Migrations');
  console.log('═'.repeat(60));
  console.log(`📡 Connecting to database...\n`);

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    for (const migration of migrations) {
      const filePath = path.join(migrationsDir, migration);
      
      if (!require('fs').existsSync(filePath)) {
        console.error(`❌ File not found: ${migration}`);
        continue;
      }

      const sql = readFileSync(filePath, 'utf8');
      await executeSQL(sql, migration);
      console.log(`✅ ${migration} completed\n`);
    }

    console.log('═'.repeat(60));
    console.log('✅ All migrations completed successfully!\n');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('');
    console.error('If you see connection errors:');
    console.error('   1. Check DATABASE_URL is correct');
    console.error('   2. Check database password in SUPABASE_DB_PASSWORD');
    console.error('   3. Ensure your IP is allowed (Supabase Dashboard → Settings → Database → Connection Pooling)');
    console.error('');
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

main().catch(console.error);

