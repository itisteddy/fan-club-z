#!/usr/bin/env tsx

/**
 * Execute crypto migrations (109, 110) directly via Supabase connection
 * Uses pg library to execute SQL statements
 */

import { readFileSync } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || 
                     process.env.VITE_SUPABASE_URL || 
                     'https://ihtnsyhknvltgrksffun.supabase.co';

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL (or VITE_SUPABASE_URL)');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🚀 Running Crypto Migrations\n');
console.log('Supabase URL:', SUPABASE_URL.substring(0, 40) + '...');
console.log('Service Key:', SUPABASE_SERVICE_KEY.substring(0, 20) + '...\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' }
});

/**
 * Execute SQL via Supabase REST API
 * Note: Supabase PostgREST doesn't directly execute arbitrary SQL
 * We need to split statements and execute them individually where possible
 * OR use the SQL Editor API endpoint
 */
async function executeMigration(sql: string, fileName: string): Promise<void> {
  console.log(`\n📄 Executing: ${fileName}`);
  console.log('─'.repeat(60));
  
  // Split SQL by semicolons but preserve comments and multi-line statements
  const statements = sql
    .split(/;\s*(?=[A-Z])/)
    .map(s => s.trim())
    .filter(s => s.length > 10 && !s.match(/^--/))
    .map(s => s.endsWith(';') ? s : s + ';');
  
  console.log(`   Found ${statements.length} statements to execute\n`);
  
  // For Supabase, we need to use the SQL Editor API
  // Extract project ref from URL
  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  if (!projectRef) {
    throw new Error('Could not extract project reference from Supabase URL');
  }
  
  console.log('💡 Supabase PostgREST cannot execute arbitrary SQL directly.');
  console.log('   Please use one of these methods:\n');
  console.log('   Method 1: Supabase Dashboard (Easiest)');
  console.log(`   → Go to: https://supabase.com/dashboard/project/${projectRef}/sql`);
  console.log(`   → Copy and paste the SQL from: migrations/${fileName}`);
  console.log('   → Click "Run"\n');
  
  console.log('   Method 2: psql (if you have direct DB connection)');
  console.log(`   → psql "postgresql://[user]:[pass]@db.${projectRef}.supabase.co:5432/postgres" \\`);
  console.log(`        -f migrations/${fileName}\n`);
  
  console.log('   Method 3: Supabase CLI');
  console.log(`   → supabase db execute migrations/${fileName} --project-ref ${projectRef}\n`);
  
  // Try to check if we can use pg library
  try {
    const { Client } = await import('pg');
    
    // Extract connection info from Supabase URL
    // Supabase connection string format:
    // postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
    
    console.log('⚠️  Direct pg connection requires database password.');
    console.log('   Get connection string from:');
    console.log(`   → https://supabase.com/dashboard/project/${projectRef}/settings/database`);
    console.log('   → Connection string tab\n');
    
  } catch (e) {
    // pg not installed, that's fine
  }
  
  // Try using Supabase's REST API to execute SQL (if SQL Editor API is available)
  // Note: This typically requires special setup
  console.log('📋 SQL to execute:');
  console.log('─'.repeat(60));
  console.log(sql.substring(0, 500));
  if (sql.length > 500) {
    console.log(`\n   ... (${sql.length - 500} more characters)`);
  }
  console.log('─'.repeat(60));
}

async function main() {
  const migrationsDir = path.join(__dirname, 'migrations');
  
  const migrations = [
    { file: '109_prediction_entries_crypto.sql', name: 'Add escrow_lock_id to prediction_entries' },
    { file: '110_cleanup_demo_data.sql', name: 'Cleanup demo data' }
  ];

  for (const { file, name } of migrations) {
    const filePath = path.join(migrationsDir, file);
    
    if (!require('fs').existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${filePath}`);
      continue;
    }
    
    try {
      const sql = readFileSync(filePath, 'utf8');
      await executeMigration(sql, file);
      console.log(`✅ Instructions shown for: ${name}\n`);
    } catch (error: any) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }
  
  // Create combined file for easy copy-paste
  const combinedPath = path.join(migrationsDir, 'COMBINED_109_110.sql');
  const combined = readFileSync(path.join(migrationsDir, migrations[0].file), 'utf8') + 
                   '\n\n-- ========================================\n\n' +
                   readFileSync(path.join(migrationsDir, migrations[1].file), 'utf8');
  
  require('fs').writeFileSync(combinedPath, combined);
  console.log('✅ Created: migrations/COMBINED_109_110.sql');
  console.log('   (Copy this file contents to Supabase SQL Editor)\n');
}

main().catch(console.error);
