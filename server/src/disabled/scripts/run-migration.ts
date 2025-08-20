import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🔧 Running database migration to add missing columns...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'add-missing-columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executing migration SQL...');
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      return;
    }

    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Added the following:');
    console.log('   • likes_count column to predictions table');
    console.log('   • comments_count column to predictions table');
    console.log('   • fee column to wallet_transactions table');
    console.log('   • prediction_likes table');
    console.log('   • comment_likes table');
    console.log('   • Automatic triggers for count updates');
    console.log('   • RLS policies for new tables');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
runMigration();
