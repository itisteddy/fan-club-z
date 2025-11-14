import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import pg from 'pg';

const { Client } = pg;

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    
    const files = readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    for (const f of files) {
      const sql = readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
      console.log(`[migrate] applying ${f}`);
      await client.query(sql);
    }
    
    await client.end();
    console.log('[migrate] done');
  } catch (e) {
    console.error('[migrate] error:', e);
    process.exit(1);
  }
}

main().catch(e => { 
  console.error(e); 
  process.exit(1); 
});
