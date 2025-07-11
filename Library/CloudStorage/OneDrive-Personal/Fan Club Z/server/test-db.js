import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  }
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    
    // Test connection
    await db.raw('SELECT 1');
    console.log('✅ Database connection successful!');
    
    // List all tables
    const tables = await db.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tables in database:');
    if (tables.rows.length === 0) {
      console.log('❌ No tables found!');
    } else {
      tables.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    }
    
    // Check if knex_migrations table exists
    const migrations = await db.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'knex_migrations'
    `);
    
    if (migrations.rows.length > 0) {
      console.log('\n📋 Migration history:');
      const migrationHistory = await db('knex_migrations').select('*').orderBy('id');
      migrationHistory.forEach(migration => {
        console.log(`  - ${migration.name} (${migration.batch})`);
      });
    } else {
      console.log('\n❌ No knex_migrations table found - migrations may not have run');
    }
    
    // Show sample data from key tables
    const showSample = async (table) => {
      try {
        const rows = await db(table).select('*').limit(5)
        console.log(`\nSample from ${table}:`)
        if (rows.length === 0) {
          console.log('  (no rows)')
        } else {
          rows.forEach(row => console.log('  ', row))
        }
      } catch (e) {
        console.log(`\nCould not query table ${table}:`, e.message)
      }
    }
    await showSample('users')
    await showSample('clubs')
    await showSample('bets')
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await db.destroy();
  }
}

testConnection(); 