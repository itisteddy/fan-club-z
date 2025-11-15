#!/usr/bin/env tsx
/**
 * Safe Database Connection Utility
 * Connects to Supabase using environment variables
 * 
 * Usage:
 *   npm run db:connect
 * 
 * Environment variables required:
 *   SUPABASE_DB_URL or DATABASE_URL
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

// Get database URL from environment
const dbUrl = process.env.SUPABASE_DB_URL || 
              process.env.DATABASE_URL || 
              process.env.POSTGRES_URL ||
              (process.env.POSTGRES_HOST && process.env.POSTGRES_USER && process.env.POSTGRES_PASSWORD
                ? `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || 'postgres'}`
                : null);

if (!dbUrl) {
  console.error('❌ No database URL found in environment variables');
  console.error('Please set SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL');
  process.exit(1);
}

// Parse connection string safely
function parseConnectionString(url: string) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '5432'),
      database: parsed.pathname.replace('/', ''),
      user: parsed.username,
      password: parsed.password,
      ssl: parsed.hostname.includes('supabase.co') ? { rejectUnauthorized: false } : false,
    };
  } catch (error) {
    console.error('❌ Invalid database URL format');
    throw error;
  }
}

// Create connection pool
const pool = new Pool(parseConnectionString(dbUrl));

// Test connection
export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Database connection successful');
    console.log(`   Time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Run a query
export async function runQuery(query: string, params?: any[]) {
  try {
    const result = await pool.query(query, params);
    return { success: true, rows: result.rows, rowCount: result.rowCount };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Check table exists
export async function tableExists(tableName: string): Promise<boolean> {
  const result = await runQuery(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    )`,
    [tableName]
  );
  return result.success && result.rows?.[0]?.exists === true;
}

// Get table schema
export async function getTableSchema(tableName: string) {
  return runQuery(`
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
}

// Run migration file
export async function runMigrationFile(filePath: string) {
  const fs = await import('fs/promises');
  const sql = await fs.readFile(filePath, 'utf-8');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  } finally {
    client.release();
  }
}

// Close connection
export async function closeConnection() {
  await pool.end();
}

// CLI mode
if (require.main === module) {
  (async () => {
    console.log('🔌 Testing database connection...');
    const connected = await testConnection();
    
    if (connected) {
      console.log('\n📊 Quick database stats:');
      
      // Check key tables
      const tables = ['wallets', 'wallet_transactions', 'escrow_locks', 'prediction_entries'];
      for (const table of tables) {
        const exists = await tableExists(table);
        if (exists) {
          const count = await runQuery(`SELECT COUNT(*) as count FROM ${table}`);
          console.log(`   ${table}: ${count.rows?.[0]?.count || 0} rows`);
        } else {
          console.log(`   ${table}: ❌ does not exist`);
        }
      }
      
      console.log('\n✅ Ready for database operations');
      console.log('   Use: import { runQuery } from "./scripts/db-connect"');
    }
    
    await closeConnection();
    process.exit(connected ? 0 : 1);
  })();
}

export { pool };

