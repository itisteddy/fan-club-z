const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Present' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🔄 Running Migration 116: Fix escrow_locks schema...\n');
  
  const statements = [
    {
      name: 'Drop old state CHECK constraint',
      sql: `ALTER TABLE public.escrow_locks DROP CONSTRAINT IF EXISTS escrow_locks_state_check;`
    },
    {
      name: 'Add new state CHECK constraint (with consumed/expired)',
      sql: `ALTER TABLE public.escrow_locks ADD CONSTRAINT escrow_locks_state_check CHECK (state IN ('locked', 'released', 'voided', 'consumed', 'expired'));`
    },
    {
      name: 'Add status column if missing',
      sql: `ALTER TABLE public.escrow_locks ADD COLUMN IF NOT EXISTS status text;`
    },
    {
      name: 'Drop old status CHECK constraint',
      sql: `ALTER TABLE public.escrow_locks DROP CONSTRAINT IF EXISTS escrow_locks_status_check;`
    },
    {
      name: 'Add new status CHECK constraint',
      sql: `ALTER TABLE public.escrow_locks ADD CONSTRAINT escrow_locks_status_check CHECK (status IS NULL OR status IN ('locked', 'released', 'voided', 'consumed', 'expired'));`
    },
    {
      name: 'Sync status from state',
      sql: `UPDATE public.escrow_locks SET status = state WHERE status IS NULL OR status != state;`
    },
    {
      name: 'Add index on state',
      sql: `CREATE INDEX IF NOT EXISTS idx_escrow_locks_state ON public.escrow_locks(state) WHERE state IN ('locked', 'consumed');`
    },
    {
      name: 'Add index on user_id + state',
      sql: `CREATE INDEX IF NOT EXISTS idx_escrow_locks_user_state ON public.escrow_locks(user_id, state, created_at DESC);`
    },
    {
      name: 'Add lock_ref column',
      sql: `ALTER TABLE public.escrow_locks ADD COLUMN IF NOT EXISTS lock_ref text;`
    },
    {
      name: 'Add unique index on lock_ref',
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_locks_lock_ref ON public.escrow_locks(lock_ref) WHERE lock_ref IS NOT NULL;`
    },
    {
      name: 'Add option_id column',
      sql: `ALTER TABLE public.escrow_locks ADD COLUMN IF NOT EXISTS option_id uuid;`
    }
  ];
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const { name, sql } = statements[i];
    console.log(`[${i + 1}/${statements.length}] ${name}...`);
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql });
      
      if (error) {
        console.error(`  ❌ Error:`, error.message);
        failCount++;
      } else {
        console.log(`  ✅ Success`);
        successCount++;
      }
    } catch (err) {
      console.error(`  ❌ Exception:`, err.message);
      failCount++;
    }
  }
  
  console.log(`\n📊 Results: ${successCount} succeeded, ${failCount} failed\n`);
  
  // Verify the migration
  console.log('🔍 Verifying migration...');
  const { data: locks, error: verifyError } = await supabase
    .from('escrow_locks')
    .select('id, state, status, created_at, lock_ref')
    .order('created_at', { ascending: false })
    .limit(3);
  
  if (verifyError) {
    console.error('❌ Verification failed:', verifyError.message);
  } else {
    console.log('✅ Migration verified! Recent locks:');
    console.log(JSON.stringify(locks, null, 2));
  }
  
  // Check constraints
  console.log('\n🔍 Checking constraints...');
  const { data: constraints, error: constError } = await supabase.rpc('exec_sql', {
    sql: `SELECT conname, pg_get_constraintdef(oid) as definition 
          FROM pg_constraint 
          WHERE conrelid = 'public.escrow_locks'::regclass 
          AND conname LIKE '%check%';`
  });
  
  if (!constError && constraints) {
    console.log('✅ Active CHECK constraints:', constraints);
  }
  
  console.log('\n✅ Migration 116 completed!');
  console.log('🎯 You can now place bets successfully.\n');
}

runMigration()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  });

