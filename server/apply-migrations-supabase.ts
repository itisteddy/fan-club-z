import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Create Supabase client with service role for migrations
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
  }
);

async function main() {
  try {
    console.log('🔄 Starting Supabase migrations...');
    
    const files = readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    for (const f of files) {
      const sql = readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
      console.log(`[migrate] applying ${f}`);
      
      // Execute SQL using Supabase RPC
      const { error } = await supabase.rpc('exec_sql', { sql });
      
      if (error) {
        console.error(`[migrate] error in ${f}:`, error);
        // Continue with other migrations
      } else {
        console.log(`[migrate] ✅ ${f} applied successfully`);
      }
    }
    
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
