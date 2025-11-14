#!/usr/bin/env tsx
/**
 * Execute SQL Query
 * Safely executes a single SQL query against Supabase
 * 
 * Usage:
 *   npm run db:query -- "SELECT * FROM wallets LIMIT 5"
 */

import { runQuery, testConnection, closeConnection } from './db-connect';

const query = process.argv[2];

if (!query) {
  console.error('❌ Usage: tsx scripts/db-query.ts "<SQL QUERY>"');
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

    console.log(`\n🔍 Executing query: ${query.substring(0, 100)}...`);
    
    const result = await runQuery(query);
    
    if (result.success) {
      console.log(`\n✅ Query executed successfully (${result.rowCount || 0} rows)`);
      console.log('\n📊 Results:');
      console.log(JSON.stringify(result.rows, null, 2));
    } else {
      console.error('❌ Query failed:', result.error);
      process.exit(1);
    }
    
    await closeConnection();
  } catch (error) {
    console.error('❌ Error:', error);
    await closeConnection();
    process.exit(1);
  }
})();

