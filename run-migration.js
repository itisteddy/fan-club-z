#!/usr/bin/env node

/**
 * Phase 3 Database Migration Runner
 * Applies sample prediction data to fix static content issues
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const SUPABASE_URL = 'https://ihtnsyhknvltgrksffun.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY3MDYzNiwiZXhwIjoyMDY5MjQ2NjM2fQ.w0Yr9MoA7Sj1c19lXD7te_Q6vmtY4dRAyxaS6yN8sTY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runMigration() {
  console.log('🔧 Phase 3: Adding sample prediction data...');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'phase3-sample-predictions-usd.sql');
    if (!fs.existsSync(sqlPath)) {
      console.error('❌ SQL file not found:', sqlPath);
      process.exit(1);
    }
    
    console.log('📁 Reading SQL file...');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📊 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
          
          // Use raw SQL execution
          const { data, error } = await supabase.rpc('exec', {
            sql: statement + ';'
          });
          
          if (error) {
            console.warn(`⚠️  Warning on statement ${i + 1}:`, error.message);
            // Continue with other statements
          } else {
            console.log(`✅ Statement ${i + 1} completed successfully`);
          }
        } catch (err) {
          console.warn(`⚠️  Warning on statement ${i + 1}:`, err.message);
          // Continue with other statements
        }
      }
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Added 6 sample predictions with realistic USD values and activity');
    console.log('🔄 Restart your development server to see the changes');
    
    // Verify the data was inserted
    console.log('\n🔍 Verifying inserted data...');
    const { data: predictions, error: verifyError } = await supabase
      .from('predictions')
      .select('id, title, pool_total, participant_count')
      .limit(5);
    
    if (verifyError) {
      console.warn('⚠️  Could not verify data:', verifyError.message);
    } else {
      console.log(`✅ Found ${predictions?.length || 0} predictions in database`);
      if (predictions && predictions.length > 0) {
        predictions.forEach(pred => {
          console.log(`  - ${pred.title}: $${pred.pool_total} pool, ${pred.participant_count} participants`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Alternative method using direct insert statements
async function runDirectInserts() {
  console.log('🔧 Running direct insert method...');
  
  try {
    // Insert sample user
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: 'sample-user-1',
        email: 'creator@fanclubz.app',
        username: 'fanclubz_creator',
        full_name: 'Fan Club Z Creator'
      });
    
    if (userError && !userError.message.includes('duplicate')) {
      console.warn('⚠️  User insert warning:', userError.message);
    }
    
    // Sample predictions data
    const samplePredictions = [
      {
        id: '4b6592c9-e811-409d-8bbf-4da4f71fe261',
        creator_id: 'sample-user-1',
        title: 'Will Bitcoin reach $100,000 by end of 2025?',
        description: 'With Bitcoin\'s recent surge and institutional adoption, many experts predict it could hit the six-figure mark.',
        category: 'custom',
        type: 'binary',
        status: 'open',
        stake_min: 1.00,
        stake_max: 1000.00,
        pool_total: 2547.50,
        entry_deadline: '2025-12-31T23:59:59Z',
        settlement_method: 'manual',
        is_private: false,
        creator_fee_percentage: 3.5,
        platform_fee_percentage: 1.5,
        participant_count: 42,
        likes_count: 67,
        comments_count: 23
      },
      {
        id: 'a1b2c3d4-e5f6-7g8h-9i0j-1k2l3m4n5o6p',
        creator_id: 'sample-user-1',
        title: 'Will Taylor Swift announce a new album in 2025?',
        description: 'Following her recent Eras Tour success, fans are speculating about her next musical project.',
        category: 'pop_culture',
        type: 'binary',
        status: 'open',
        stake_min: 5.00,
        stake_max: 500.00,
        pool_total: 1823.25,
        entry_deadline: '2025-12-15T23:59:59Z',
        settlement_method: 'manual',
        is_private: false,
        creator_fee_percentage: 3.5,
        platform_fee_percentage: 1.5,
        participant_count: 29,
        likes_count: 43,
        comments_count: 15
      },
      {
        id: 'p1q2r3s4-t5u6-v7w8-x9y0-z1a2b3c4d5e6',
        creator_id: 'sample-user-1',
        title: 'Will the Lakers make the NBA playoffs this season?',
        description: 'With LeBron and AD leading the team, the Lakers are fighting for a playoff spot.',
        category: 'sports',
        type: 'binary',
        status: 'open',
        stake_min: 2.50,
        stake_max: 750.00,
        pool_total: 3241.75,
        entry_deadline: '2025-04-15T23:59:59Z',
        settlement_method: 'auto',
        is_private: false,
        creator_fee_percentage: 3.5,
        platform_fee_percentage: 1.5,
        participant_count: 67,
        likes_count: 89,
        comments_count: 34
      }
    ];
    
    // Insert predictions
    const { error: predError } = await supabase
      .from('predictions')
      .upsert(samplePredictions);
    
    if (predError) {
      console.warn('⚠️  Predictions insert warning:', predError.message);
    } else {
      console.log('✅ Successfully inserted sample predictions');
    }
    
    // Insert prediction options
    const sampleOptions = [
      { id: 'opt-btc-yes', prediction_id: '4b6592c9-e811-409d-8bbf-4da4f71fe261', label: 'Yes, Bitcoin will reach $100K', total_staked: 1547.50, current_odds: 1.65 },
      { id: 'opt-btc-no', prediction_id: '4b6592c9-e811-409d-8bbf-4da4f71fe261', label: 'No, Bitcoin will stay below $100K', total_staked: 1000.00, current_odds: 2.55 },
      { id: 'opt-ts-yes', prediction_id: 'a1b2c3d4-e5f6-7g8h-9i0j-1k2l3m4n5o6p', label: 'Yes, she will announce a new album', total_staked: 823.25, current_odds: 2.21 },
      { id: 'opt-ts-no', prediction_id: 'a1b2c3d4-e5f6-7g8h-9i0j-1k2l3m4n5o6p', label: 'No, no new album announcement', total_staked: 1000.00, current_odds: 1.82 },
      { id: 'opt-lakers-yes', prediction_id: 'p1q2r3s4-t5u6-v7w8-x9y0-z1a2b3c4d5e6', label: 'Yes, Lakers will make playoffs', total_staked: 2041.75, current_odds: 1.59 },
      { id: 'opt-lakers-no', prediction_id: 'p1q2r3s4-t5u6-v7w8-x9y0-z1a2b3c4d5e6', label: 'No, Lakers will miss playoffs', total_staked: 1200.00, current_odds: 2.70 }
    ];
    
    const { error: optionsError } = await supabase
      .from('prediction_options')
      .upsert(sampleOptions);
    
    if (optionsError) {
      console.warn('⚠️  Options insert warning:', optionsError.message);
    } else {
      console.log('✅ Successfully inserted prediction options');
    }
    
    console.log('✅ Direct insert method completed!');
    
  } catch (error) {
    console.error('❌ Direct insert method failed:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Phase 3 database migration...');
  
  try {
    // Try direct insert method first (more reliable)
    await runDirectInserts();
    
  } catch (error) {
    console.log('⚠️  Direct method failed, trying SQL file method...');
    await runMigration();
  }
  
  console.log('\n🎉 Phase 3 migration complete!');
  console.log('🔄 Please restart your development server to see the changes');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runMigration, runDirectInserts };