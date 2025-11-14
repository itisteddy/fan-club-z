const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ihtnsyhknvltgrksffun.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY3MDYzNiwiZXhwIjoyMDY5MjQ2NjM2fQ.w0Yr9MoA7Sj1c19lXD7te_Q6vmtY4dRAyxaS6yN8sTY';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQL(sql) {
  // Execute via Supabase client - it will use the service role
  const { data, error } = await supabase.rpc('exec', { sql });
  return { data, error };
}

async function runMigration(filePath) {
  console.log(`\n📝 Running: ${path.basename(filePath)}`);
  
  const sql = fs.readFileSync(filePath, 'utf8');
  
  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s.length > 5);
  
  console.log(`   Found ${statements.length} statements`);
  
  // Execute using raw query
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    
    try {
      // Try direct table operations for ALTER/CREATE
      if (stmt.toUpperCase().includes('ALTER TABLE escrow_locks')) {
        if (stmt.includes('ADD COLUMN')) {
          const match = stmt.match(/ADD COLUMN IF NOT EXISTS (\w+)/);
          if (match) {
            console.log(`   [${i+1}/${statements.length}] Adding column ${match[1]}...`);
          }
        }
      } else if (stmt.toUpperCase().includes('CREATE INDEX')) {
        const match = stmt.match(/CREATE INDEX IF NOT EXISTS (\w+)/);
        if (match) {
          console.log(`   [${i+1}/${statements.length}] Creating index ${match[1]}...`);
        }
      } else if (stmt.toUpperCase().includes('UPDATE')) {
        console.log(`   [${i+1}/${statements.length}] Updating records...`);
      }
      
      // For now, just log - Supabase client doesn't support raw DDL
      console.log(`   ✅ Logged (manual execution needed)`);
      
    } catch (error) {
      console.error(`   ❌ Error:`, error.message);
    }
  }
  
  return true;
}

async function main() {
  console.log('🚀 Phase 1 Migrations\n');
  console.log('⚠️  Note: Supabase client cannot execute DDL (ALTER TABLE, CREATE INDEX)');
  console.log('Please run these in Supabase SQL Editor:\n');
  
  const migrations = [
    '../server/migrations/114_add_lock_expiration.sql',
    '../server/migrations/115_lock_idempotency.sql',
    '../cleanup-locks.sql'
  ];
  
  for (const migration of migrations) {
    const filePath = path.join(__dirname, migration);
    if (fs.existsSync(filePath)) {
      console.log(`\n📄 File: ${migration}`);
      console.log('   Action: Copy this file to Supabase SQL Editor');
      console.log(`   URL: https://supabase.com/dashboard/project/ihtnsyhknvltgrksffun/sql/new\n`);
    }
  }
  
  console.log('\n✅ Files ready for execution in Supabase SQL Editor');
  console.log('\nAfter running in Supabase:');
  console.log('  cd server && npm run dev');
}

main();

