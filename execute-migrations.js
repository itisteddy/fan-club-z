#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ihtnsyhknvltgrksffun.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY3MDYzNiwiZXhwIjoyMDY5MjQ2NjM2fQ.w0Yr9MoA7Sj1c19lXD7te_Q6vmtY4dRAyxaS6yN8sTY';

async function executeSql(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ query: sql })
  });

  const text = await response.text();
  
  return { ok: response.ok, status: response.status, body: text };
}

async function runMigration(filePath) {
  console.log(`\n🔄 Running: ${path.basename(filePath)}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  Skipped (file not found)`);
    return true;
  }
  
  const sql = fs.readFileSync(filePath, 'utf8');
  
  // Remove comments and split into statements
  const cleanSql = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');
  
  const result = await executeSql(cleanSql);
  
  if (result.ok || result.status === 200) {
    console.log(`✅ Success`);
    return true;
  } else {
    console.error(`❌ Failed (${result.status})`);
    console.error(result.body);
    return false;
  }
}

async function main() {
  console.log('🚀 Executing Phase 1 Migrations\n');
  
  const migrations = [
    'server/migrations/114_add_lock_expiration.sql',
    'server/migrations/115_lock_idempotency.sql',
    'cleanup-locks.sql'
  ];
  
  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (!success) {
      console.log('\n❌ Migration failed. Stopping.');
      process.exit(1);
    }
  }
  
  console.log('\n✅ All migrations completed!');
  console.log('\nNext: Restart server with: cd server && npm run dev');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

