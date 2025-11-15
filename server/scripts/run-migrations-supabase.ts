#!/usr/bin/env tsx
/**
 * Run Migrations via Supabase Client
 * Uses the existing Supabase client configuration
 */

import { readFile } from 'fs/promises';
import path from 'path';
import { supabase } from '../src/config/database';

async function runMigration(filePath: string) {
  try {
    console.log(`\n📄 Reading migration: ${filePath}`);
    const sql = await readFile(filePath, 'utf-8');
    
    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`   Found ${statements.length} SQL statements`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;
      
      console.log(`   Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          // Try direct query if RPC doesn't exist
          console.log('   RPC not available, trying direct query...');
          // For Supabase, we'll need to use the REST API or client
          // Since exec_sql might not be available, let's try a different approach
          console.warn('   ⚠️  Cannot execute raw SQL via Supabase client');
          console.warn('   💡 Please run this migration in Supabase SQL Editor instead');
          console.warn(`   File: ${filePath}`);
          return { success: false, needsManualRun: true };
        }
        
        console.log(`   ✅ Statement ${i + 1} executed`);
      } catch (err) {
        console.error(`   ❌ Error in statement ${i + 1}:`, err);
        return { success: false, error: err };
      }
    }
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// Main execution
const migrationFiles = process.argv.slice(2);

if (migrationFiles.length === 0) {
  console.log('📋 Running pending migrations...\n');
  
  // Default migrations to run
  const migrations = [
    'migrations/111_wallet_summary_view.sql',
    'migrations/112_wallet_tx_indexes.sql'
  ];
  
  for (const migration of migrations) {
    const filePath = path.resolve(process.cwd(), migration);
    console.log(`\n🔧 Running: ${migration}`);
    const result = await runMigration(filePath);
    
    if (result.success) {
      console.log(`✅ Migration ${migration} completed`);
    } else if (result.needsManualRun) {
      console.log(`⚠️  Migration ${migration} needs manual execution`);
      console.log(`   Please copy/paste the SQL into Supabase SQL Editor`);
    } else {
      console.error(`❌ Migration ${migration} failed:`, result.error);
      process.exit(1);
    }
  }
} else {
  // Run specific migrations
  for (const migrationFile of migrationFiles) {
    const filePath = path.resolve(process.cwd(), migrationFile);
    const result = await runMigration(filePath);
    
    if (!result.success && !result.needsManualRun) {
      process.exit(1);
    }
  }
}

console.log('\n✅ All migrations processed');

