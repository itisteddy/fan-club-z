#!/usr/bin/env tsx
/**
 * Run SQL Migration Script
 * Safely executes SQL migration files against Supabase
 * 
 * Usage:
 *   npm run db:migrate-file -- migrations/111_wallet_summary_view.sql
 */

import { runMigrationFile, testConnection, closeConnection } from './db-connect';
import { readFile } from 'fs/promises';
import path from 'path';

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Usage: tsx scripts/run-migration.ts <migration-file.sql>');
  process.exit(1);
}

(async () => {
  try {
    console.log('🔌 Testing database connection...');
    const connected = await testConnection();
    
    if (!connected) {
      console.error('❌ Cannot connect to database');
      process.exit(1);
    }

    const filePath = path.resolve(process.cwd(), migrationFile);
    console.log(`\n📄 Running migration: ${filePath}`);
    
    const result = await runMigrationFile(filePath);
    
    if (result.success) {
      console.log('✅ Migration completed successfully');
    } else {
      console.error('❌ Migration failed:', result.error);
      process.exit(1);
    }
    
    await closeConnection();
  } catch (error) {
    console.error('❌ Error:', error);
    await closeConnection();
    process.exit(1);
  }
})();

