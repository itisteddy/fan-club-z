const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function setupDatabase() {
  const supabaseUrl = 'https://ihtnsyhknvltgrksffun.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NzA2MzYsImV4cCI6MjA2OTI0NjYzNn0.ZmoZ5cGVHfhDwTvkmaw9LSVHm_awoyMOTyQKewr7rYo';
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    console.log('📋 Testing Supabase connection...');
    
    // Test connection first
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Supabase connection failed:', testError);
      return;
    }
    
    console.log('✅ Supabase connected successfully');
    
    // Check if tables exist
    console.log('📋 Checking existing tables...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
      
    if (tables) {
      console.log('📋 Existing tables:', tables.map(t => t.table_name));
    }
    
    console.log('✅ Database setup complete! Tables will be created via Supabase SQL Editor.');
    console.log('Please run the following SQL in your Supabase SQL Editor:');
    console.log('');
    console.log(`
-- Create settlement_validations table
CREATE TABLE IF NOT EXISTS settlement_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('accept', 'dispute')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prediction_id, user_id)
);

-- Create bet_settlements table if it doesn't exist
CREATE TABLE IF NOT EXISTS bet_settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bet_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  winning_option_id UUID REFERENCES prediction_options(id),
  total_payout DECIMAL(18,8) NOT NULL DEFAULT 0,
  platform_fee_collected DECIMAL(18,8) NOT NULL DEFAULT 0,
  creator_payout_amount DECIMAL(18,8) NOT NULL DEFAULT 0,
  settlement_time TIMESTAMPTZ DEFAULT NOW(),
  proof_url TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bet_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_settlement_validations_prediction_id ON settlement_validations(prediction_id);
CREATE INDEX IF NOT EXISTS idx_settlement_validations_user_id ON settlement_validations(user_id);
CREATE INDEX IF NOT EXISTS idx_bet_settlements_bet_id ON bet_settlements(bet_id);
    `);

    console.log('🎉 Database setup complete!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();
