// Quick Database Seeder - Run this to populate the database with sample predictions
// Usage: node seed-database-quick.js

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://ihtnsyhknvltgrksffun.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY3MDYzNiwiZXhwIjoyMDY5MjQ2NjM2fQ.w0Yr9MoA7Sj1c19lXD7te_Q6vmtY4dRAyxaS6yN8sTY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedDatabase() {
  console.log('🚀 Starting database seeding...');

  try {
    // Step 1: Create sample user
    console.log('👥 Creating sample user...');
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: 'sample-user-1',
        email: 'creator@fanclubz.app',
        username: 'fanclubz_creator',
        full_name: 'Fan Club Z Creator',
        kyc_level: 'enhanced',
        is_verified: true,
        reputation_score: 95.5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (userError) {
      console.error('❌ User creation error:', userError.message);
    } else {
      console.log('✅ Sample user created');
    }

    // Step 2: Create sample predictions
    console.log('🎯 Creating sample predictions...');
    const predictions = [
      {
        id: '4b6592c9-e811-409d-8bbf-4da4f71fe261',
        creator_id: 'sample-user-1',
        title: 'Will Bitcoin reach $100,000 by end of 2025?',
        description: 'With Bitcoin\'s recent surge and institutional adoption, many experts predict it could hit the six-figure mark. What do you think?',
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
        comments_count: 23,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        updated_at: new Date().toISOString()
      },
      {
        id: 'a1b2c3d4-e5f6-7g8h-9i0j-1k2l3m4n5o6p',
        creator_id: 'sample-user-1',
        title: 'Will Taylor Swift announce a new album in 2025?',
        description: 'Following her recent Eras Tour success, fans are speculating about her next musical project. Will she surprise us with a new album announcement this year?',
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
        comments_count: 15,
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
        updated_at: new Date().toISOString()
      },
      {
        id: 'p1q2r3s4-t5u6-v7w8-x9y0-z1a2b3c4d5e6',
        creator_id: 'sample-user-1',
        title: 'Will the Lakers make the NBA playoffs this season?',
        description: 'With LeBron and AD leading the team, the Lakers are fighting for a playoff spot. Can they secure their position?',
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
        comments_count: 34,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        updated_at: new Date().toISOString()
      },
      {
        id: 'q2w3e4r5-t6y7-u8i9-o0p1-a2s3d4f5g6h7',
        creator_id: 'sample-user-1',
        title: 'Which AI company will be valued highest by end of 2025?',
        description: 'The AI race is heating up between OpenAI, Anthropic, Google, and others. Which company will lead in valuation?',
        category: 'custom',
        type: 'multi_outcome',
        status: 'open',
        stake_min: 10.00,
        stake_max: 2000.00,
        pool_total: 5678.90,
        entry_deadline: '2025-12-20T23:59:59Z',
        settlement_method: 'manual',
        is_private: false,
        creator_fee_percentage: 3.5,
        platform_fee_percentage: 1.5,
        participant_count: 84,
        likes_count: 156,
        comments_count: 67,
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        updated_at: new Date().toISOString()
      },
      {
        id: 'z9y8x7w6-v5u4-t3s2-r1q0-p9o8n7m6l5k4',
        creator_id: 'sample-user-1',
        title: 'Will Ethereum 2.0 staking rewards exceed 5% APR?',
        description: 'With the ongoing Ethereum upgrades and staking mechanisms, many are watching the reward rates closely.',
        category: 'custom',
        type: 'binary',
        status: 'open',
        stake_min: 3.00,
        stake_max: 1500.00,
        pool_total: 4123.67,
        entry_deadline: '2025-09-30T23:59:59Z',
        settlement_method: 'auto',
        is_private: false,
        creator_fee_percentage: 3.5,
        platform_fee_percentage: 1.5,
        participant_count: 91,
        likes_count: 72,
        comments_count: 28,
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
        updated_at: new Date().toISOString()
      },
      {
        id: 'm5n6b7v8-c9x0-z1a2-s3d4-f5g6h7j8k9l0',
        creator_id: 'sample-user-1',
        title: 'Will the next Marvel movie break $1B box office?',
        description: 'Marvel\'s next big release is generating huge buzz. Will it join the billion-dollar club?',
        category: 'pop_culture',
        type: 'binary',
        status: 'open',
        stake_min: 1.50,
        stake_max: 800.00,
        pool_total: 2890.33,
        entry_deadline: '2025-07-01T23:59:59Z',
        settlement_method: 'manual',
        is_private: false,
        creator_fee_percentage: 3.5,
        platform_fee_percentage: 1.5,
        participant_count: 78,
        likes_count: 95,
        comments_count: 41,
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        updated_at: new Date().toISOString()
      }
    ];

    const { error: predictionsError } = await supabase
      .from('predictions')
      .upsert(predictions, { onConflict: 'id' });

    if (predictionsError) {
      console.error('❌ Predictions creation error:', predictionsError.message);
    } else {
      console.log('✅ Sample predictions created');
    }

    // Step 3: Create prediction options
    console.log('🎯 Creating prediction options...');
    const options = [
      // Bitcoin prediction options
      { id: 'opt-btc-yes', prediction_id: '4b6592c9-e811-409d-8bbf-4da4f71fe261', label: 'Yes, Bitcoin will reach $100K', total_staked: 1547.50, current_odds: 1.65 },
      { id: 'opt-btc-no', prediction_id: '4b6592c9-e811-409d-8bbf-4da4f71fe261', label: 'No, Bitcoin will stay below $100K', total_staked: 1000.00, current_odds: 2.55 },
      
      // Taylor Swift prediction options
      { id: 'opt-ts-yes', prediction_id: 'a1b2c3d4-e5f6-7g8h-9i0j-1k2l3m4n5o6p', label: 'Yes, she will announce a new album', total_staked: 823.25, current_odds: 2.21 },
      { id: 'opt-ts-no', prediction_id: 'a1b2c3d4-e5f6-7g8h-9i0j-1k2l3m4n5o6p', label: 'No, no new album announcement', total_staked: 1000.00, current_odds: 1.82 },
      
      // Lakers prediction options
      { id: 'opt-lakers-yes', prediction_id: 'p1q2r3s4-t5u6-v7w8-x9y0-z1a2b3c4d5e6', label: 'Yes, Lakers will make playoffs', total_staked: 2041.75, current_odds: 1.59 },
      { id: 'opt-lakers-no', prediction_id: 'p1q2r3s4-t5u6-v7w8-x9y0-z1a2b3c4d5e6', label: 'No, Lakers will miss playoffs', total_staked: 1200.00, current_odds: 2.70 },
      
      // AI company prediction options (multi-outcome)
      { id: 'opt-ai-openai', prediction_id: 'q2w3e4r5-t6y7-u8i9-o0p1-a2s3d4f5g6h7', label: 'OpenAI', total_staked: 2000.00, current_odds: 2.84 },
      { id: 'opt-ai-google', prediction_id: 'q2w3e4r5-t6y7-u8i9-o0p1-a2s3d4f5g6h7', label: 'Google/Alphabet', total_staked: 1678.90, current_odds: 3.38 },
      { id: 'opt-ai-anthropic', prediction_id: 'q2w3e4r5-t6y7-u8i9-o0p1-a2s3d4f5g6h7', label: 'Anthropic', total_staked: 1200.00, current_odds: 4.73 },
      { id: 'opt-ai-other', prediction_id: 'q2w3e4r5-t6y7-u8i9-o0p1-a2s3d4f5g6h7', label: 'Other company', total_staked: 800.00, current_odds: 7.10 },
      
      // Ethereum prediction options
      { id: 'opt-eth-yes', prediction_id: 'z9y8x7w6-v5u4-t3s2-r1q0-p9o8n7m6l5k4', label: 'Yes, rewards will exceed 5%', total_staked: 2123.67, current_odds: 1.94 },
      { id: 'opt-eth-no', prediction_id: 'z9y8x7w6-v5u4-t3s2-r1q0-p9o8n7m6l5k4', label: 'No, rewards will stay below 5%', total_staked: 2000.00, current_odds: 2.06 },
      
      // Marvel prediction options
      { id: 'opt-marvel-yes', prediction_id: 'm5n6b7v8-c9x0-z1a2-s3d4-f5g6h7j8k9l0', label: 'Yes, it will break $1B', total_staked: 1390.33, current_odds: 2.08 },
      { id: 'opt-marvel-no', prediction_id: 'm5n6b7v8-c9x0-z1a2-s3d4-f5g6h7j8k9l0', label: 'No, it will stay under $1B', total_staked: 1500.00, current_odds: 1.93 }
    ].map(opt => ({
      ...opt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error: optionsError } = await supabase
      .from('prediction_options')
      .upsert(options, { onConflict: 'id' });

    if (optionsError) {
      console.error('❌ Options creation error:', optionsError.message);
    } else {
      console.log('✅ Prediction options created');
    }

    // Step 4: Create sample wallets
    console.log('💰 Creating sample wallets...');
    const wallets = [
      { id: 'wallet-sample-1', user_id: 'sample-user-1', currency: 'USD', available_balance: 10000.00, reserved_balance: 0.00 }
    ];

    const { error: walletsError } = await supabase
      .from('wallets')
      .upsert(wallets.map(w => ({
        ...w,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })), { onConflict: 'user_id,currency' });

    if (walletsError) {
      console.error('❌ Wallets creation error:', walletsError.message);
    } else {
      console.log('✅ Sample wallets created');
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('📊 Created:');
    console.log('   - 1 sample user');
    console.log('   - 6 sample predictions');
    console.log('   - 14 prediction options');
    console.log('   - 1 sample wallet');
    console.log('');
    console.log('✅ You can now test the app with real data!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  seedDatabase().then(() => {
    console.log('🏁 Seeding process completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { seedDatabase };
