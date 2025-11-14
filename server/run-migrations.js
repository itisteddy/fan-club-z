#!/usr/bin/env node
/**
 * Run database migrations using Supabase client
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(filePath) {
  console.log(`\n🔄 Running migration: ${filePath}`);
  
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Split by semicolons and filter out comments and empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement || statement.startsWith('--')) continue;
      
      console.log(`\n[${i + 1}/${statements.length}] Executing...`);
      
      // Use raw SQL execution via Supabase RPC
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: statement + ';' 
      }).catch(async (err) => {
        // Fallback: try using PostgREST's raw query endpoint
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ sql_query: statement + ';' })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        
        return { data: await response.json(), error: null };
      });
      
      if (error) {
        console.error(`❌ Error:`, error.message);
        throw error;
      }
      
      console.log(`✅ Success`);
    }
    
    console.log(`\n✅ Migration completed: ${filePath}`);
    return true;
    
  } catch (error) {
    console.error(`\n❌ Migration failed: ${filePath}`);
    console.error(error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting database migrations...\n');
  
  const migrations = [
    'migrations/114_add_lock_expiration.sql',
    'migrations/115_lock_idempotency.sql',
    'cleanup-locks.sql'
  ];
  
  for (const migration of migrations) {
    const filePath = path.join(__dirname, migration);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  Skipping ${migration} (file not found)`);
      continue;
    }
    
    const success = await runMigration(filePath);
    
    if (!success) {
      console.log('\n❌ Migration failed. Stopping.');
      process.exit(1);
    }
  }
  
  console.log('\n✅ All migrations completed successfully!');
  process.exit(0);
}

main();

