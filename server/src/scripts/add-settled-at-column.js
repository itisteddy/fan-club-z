const { supabase } = require('../../dist/config/database');

async function addSettledAtColumn() {
  try {
    console.log('🔄 Adding settled_at column to predictions table...');
    
    // Add settled_at column
    const { error: settledAtError } = await supabase
      .from('predictions')
      .select('settled_at')
      .limit(1);
    
    if (settledAtError && settledAtError.code === 'PGRST204') {
      console.log('⚠️ settled_at column missing, but we cannot add columns via Supabase client');
      console.log('📝 Please run this SQL in your Supabase SQL Editor:');
      console.log(`
ALTER TABLE predictions 
ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;

ALTER TABLE predictions 
ADD COLUMN IF NOT EXISTS winning_option_id UUID REFERENCES prediction_options(id);

CREATE INDEX IF NOT EXISTS idx_predictions_settled_at ON predictions(settled_at);
CREATE INDEX IF NOT EXISTS idx_predictions_winning_option_id ON predictions(winning_option_id);
      `);
    } else {
      console.log('✅ settled_at column already exists');
    }
    
    // Check winning_option_id column
    const { error: winningOptionError } = await supabase
      .from('predictions')
      .select('winning_option_id')
      .limit(1);
    
    if (winningOptionError && winningOptionError.code === 'PGRST204') {
      console.log('⚠️ winning_option_id column missing');
    } else {
      console.log('✅ winning_option_id column already exists');
    }
    
  } catch (error) {
    console.error('❌ Error checking columns:', error);
  }
}

addSettledAtColumn();
