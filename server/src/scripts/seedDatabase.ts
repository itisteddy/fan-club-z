#!/usr/bin/env node

/**
 * Database Seeding Script for Fan Club Z v2.0.49
 * Seeds the database with sample predictions, users, and options
 */

import { supabase, db } from '../config/database';
import { config } from '../config';

// Sample users to seed
const sampleUsers = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@fanclubz.com',
    username: 'fanclubz_admin',
    full_name: 'Fan Club Z Admin',
    avatar_url: null,
    is_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'sports_guru@fanclubz.com',
    username: 'sports_guru',
    full_name: 'Sports Guru',
    avatar_url: null,
    is_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'crypto_prophet@fanclubz.com',
    username: 'crypto_prophet',
    full_name: 'Crypto Prophet',
    avatar_url: null,
    is_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'pop_culture_maven@fanclubz.com',
    username: 'pop_culture_maven',
    full_name: 'Pop Culture Maven',
    avatar_url: null,
    is_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Sample predictions to seed
const samplePredictions = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    creator_id: '00000000-0000-0000-0000-000000000001',
    title: 'Will Bitcoin reach $100k in 2025?',
    description: 'Bitcoin has been showing strong momentum. Will it break the $100,000 barrier before the end of 2025?',
    category: 'crypto',
    type: 'binary',
    status: 'open',
    stake_min: 10,
    stake_max: 1000,
    pool_total: 850,
    entry_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    settlement_method: 'manual',
    is_private: false,
    creator_fee_percentage: 1.0,
    platform_fee_percentage: 2.5,
    tags: ['crypto', 'bitcoin', 'price'],
    participant_count: 24,
    likes_count: 45,
    comments_count: 12,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    updated_at: new Date().toISOString()
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    creator_id: '00000000-0000-0000-0000-000000000002',
    title: 'Manchester United vs Liverpool - Who will win?',
    description: 'The classic Premier League rivalry continues. Both teams are in great form this season.',
    category: 'sports',
    type: 'multi_outcome',
    status: 'open',
    stake_min: 5,
    stake_max: 500,
    pool_total: 1250,
    entry_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    settlement_method: 'auto',
    is_private: false,
    creator_fee_percentage: 1.0,
    platform_fee_percentage: 2.5,
    tags: ['sports', 'football', 'premier-league'],
    participant_count: 38,
    likes_count: 67,
    comments_count: 23,
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    updated_at: new Date().toISOString()
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    creator_id: '00000000-0000-0000-0000-000000000004',
    title: 'Will Taylor Swift announce a new album in 2025?',
    description: 'Taylor Swift has been dropping hints on social media. Will she surprise us with a new album announcement this year?',
    category: 'pop_culture',
    type: 'binary',
    status: 'open',
    stake_min: 1,
    stake_max: 200,
    pool_total: 420,
    entry_deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
    settlement_method: 'manual',
    is_private: false,
    creator_fee_percentage: 1.0,
    platform_fee_percentage: 2.5,
    tags: ['pop-culture', 'taylor-swift', 'music'],
    participant_count: 56,
    likes_count: 89,
    comments_count: 34,
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    updated_at: new Date().toISOString()
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    creator_id: '00000000-0000-0000-0000-000000000003',
    title: 'Ethereum price prediction for end of August 2025',
    description: 'ETH 2.0 staking rewards and DeFi growth are driving adoption. What will be the price range by end of August?',
    category: 'crypto',
    type: 'multi_outcome',
    status: 'open',
    stake_min: 25,
    stake_max: 2000,
    pool_total: 2100,
    entry_deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
    settlement_method: 'manual',
    is_private: false,
    creator_fee_percentage: 1.5,
    platform_fee_percentage: 2.5,
    tags: ['crypto', 'ethereum', 'defi'],
    participant_count: 42,
    likes_count: 78,
    comments_count: 19,
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    updated_at: new Date().toISOString()
  },
  {
    id: '10000000-0000-0000-0000-000000000005',
    creator_id: '00000000-0000-0000-0000-000000000002',
    title: 'NBA Finals 2025 - Which team will win?',
    description: 'The race to the NBA championship is heating up. Make your prediction for the 2025 NBA Finals winner!',
    category: 'sports',
    type: 'multi_outcome',
    status: 'open',
    stake_min: 10,
    stake_max: 1000,
    pool_total: 3400,
    entry_deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days from now
    settlement_method: 'auto',
    is_private: false,
    creator_fee_percentage: 1.0,
    platform_fee_percentage: 2.5,
    tags: ['sports', 'basketball', 'nba'],
    participant_count: 124,
    likes_count: 156,
    comments_count: 67,
    created_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(), // 18 hours ago
    updated_at: new Date().toISOString()
  },
  {
    id: '10000000-0000-0000-0000-000000000006',
    creator_id: '00000000-0000-0000-0000-000000000004',
    title: 'Will a Marvel movie be the highest-grossing film of 2025?',
    description: 'Marvel continues to dominate the box office. Will they take the top spot again in 2025?',
    category: 'pop_culture',
    type: 'binary',
    status: 'open',
    stake_min: 5,
    stake_max: 300,
    pool_total: 675,
    entry_deadline: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(), // 120 days from now
    settlement_method: 'manual',
    is_private: false,
    creator_fee_percentage: 1.0,
    platform_fee_percentage: 2.5,
    tags: ['pop-culture', 'movies', 'marvel'],
    participant_count: 73,
    likes_count: 102,
    comments_count: 28,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    updated_at: new Date().toISOString()
  }
];

// Sample prediction options
const samplePredictionOptions = [
  // Bitcoin prediction options
  {
    id: '20000000-0000-0000-0000-000000000001',
    prediction_id: '10000000-0000-0000-0000-000000000001',
    label: 'Yes, Bitcoin will reach $100k',
    total_staked: 520,
    current_odds: 1.63,
    is_winning_outcome: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '20000000-0000-0000-0000-000000000002',
    prediction_id: '10000000-0000-0000-0000-000000000001',
    label: 'No, Bitcoin will not reach $100k',
    total_staked: 330,
    current_odds: 2.58,
    is_winning_outcome: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  // Manchester United vs Liverpool options
  {
    id: '20000000-0000-0000-0000-000000000003',
    prediction_id: '10000000-0000-0000-0000-000000000002',
    label: 'Manchester United wins',
    total_staked: 450,
    current_odds: 2.78,
    is_winning_outcome: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '20000000-0000-0000-0000-000000000004',
    prediction_id: '10000000-0000-0000-0000-000000000002',
    label: 'Liverpool wins',
    total_staked: 550,
    current_odds: 2.27,
    is_winning_outcome: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '20000000-0000-0000-0000-000000000005',
    prediction_id: '10000000-0000-0000-0000-000000000002',
    label: 'Draw',
    total_staked: 250,
    current_odds: 5.00,
    is_winning_outcome: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  // Taylor Swift options
  {
    id: '20000000-0000-0000-0000-000000000006',
    prediction_id: '10000000-0000-0000-0000-000000000003',
    label: 'Yes, she will announce a new album',
    total_staked: 280,
    current_odds: 1.50,
    is_winning_outcome: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '20000000-0000-0000-0000-000000000007',
    prediction_id: '10000000-0000-0000-0000-000000000003',
    label: 'No, no new album announcement',
    total_staked: 140,
    current_odds: 3.00,
    is_winning_outcome: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  // Ethereum price options
  {
    id: '20000000-0000-0000-0000-000000000008',
    prediction_id: '10000000-0000-0000-0000-000000000004',
    label: '$3,000 - $4,000',
    total_staked: 650,
    current_odds: 3.23,
    is_winning_outcome: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '20000000-0000-0000-0000-000000000009',
    prediction_id: '10000000-0000-0000-0000-000000000004',
    label: '$4,000 - $5,000',
    total_staked: 750,
    current_odds: 2.80,
    is_winning_outcome: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '20000000-0000-0000-0000-000000000010',
    prediction_id: '10000000-0000-0000-0000-000000000004',
    label: 'Above $5,000',
    total_staked: 500,
    current_odds: 4.20,
    is_winning_outcome: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '20000000-0000-0000-0000-000000000011',
    prediction_id: '10000000-0000-0000-0000-000000000004',
    label: 'Below $3,000',
    total_staked: 200,
    current_odds: 10.50,
    is_winning_outcome: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  // NBA Finals options
  {
    id: '20000000-0000-0000-0000-000000000012',
    prediction_id: '10000000-0000-0000-0000-000000000005',
    label: 'Boston Celtics',
    total_staked: 890,
    current_odds: 3.82,
    is_winning_outcome: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '20000000-0000-0000-0000-000000000013',
    prediction_id: '10000000-0000-0000-0000-000000000005',
    label: 'Los Angeles Lakers',
    total_staked: 1200,
    current_odds: 2.83,
    is_winning_outcome: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '20000000-0000-0000-0000-000000000014',
    prediction_id: '10000000-0000-0000-0000-000000000005',
    label: 'Golden State Warriors',
    total_staked: 780,
    current_odds: 4.36,
    is_winning_outcome: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '20000000-0000-0000-0000-000000000015',
    prediction_id: '10000000-0000-0000-0000-000000000005',
    label: 'Other team',
    total_staked: 530,
    current_odds: 6.42,
    is_winning_outcome: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  
  // Marvel movie options
  {
    id: '20000000-0000-0000-0000-000000000016',
    prediction_id: '10000000-0000-0000-0000-000000000006',
    label: 'Yes, Marvel will be #1',
    total_staked: 425,
    current_odds: 1.59,
    is_winning_outcome: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '20000000-0000-0000-0000-000000000017',
    prediction_id: '10000000-0000-0000-0000-000000000006',
    label: 'No, another studio will be #1',
    total_staked: 250,
    current_odds: 2.70,
    is_winning_outcome: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

async function seedDatabase() {
  console.log('🌱 Starting database seeding for Fan Club Z v2.0.49...');
  
  try {
    console.log('🔧 Testing database connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      throw new Error(`Database connection failed: ${connectionError.message}`);
    }
    
    console.log('✅ Database connection successful');

    // Clear existing sample data (but keep any real user data)
    console.log('🧹 Cleaning existing sample data...');
    
    // Delete sample prediction options
    await supabase
      .from('prediction_options')
      .delete()
      .in('prediction_id', samplePredictions.map(p => p.id));
    
    // Delete sample predictions
    await supabase
      .from('predictions')
      .delete()
      .in('id', samplePredictions.map(p => p.id));
    
    // Delete sample users (but only the ones we're seeding)
    await supabase
      .from('users')
      .delete()
      .in('id', sampleUsers.map(u => u.id));

    console.log('✅ Cleaned existing sample data');

    // Insert sample users
    console.log('👥 Seeding sample users...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .insert(sampleUsers)
      .select();

    if (usersError) {
      console.error('❌ Error seeding users:', usersError);
      throw usersError;
    }

    console.log(`✅ Successfully seeded ${usersData?.length || 0} users`);

    // Insert sample predictions
    console.log('🎯 Seeding sample predictions...');
    const { data: predictionsData, error: predictionsError } = await supabase
      .from('predictions')
      .insert(samplePredictions)
      .select();

    if (predictionsError) {
      console.error('❌ Error seeding predictions:', predictionsError);
      throw predictionsError;
    }

    console.log(`✅ Successfully seeded ${predictionsData?.length || 0} predictions`);

    // Insert sample prediction options
    console.log('⚙️ Seeding prediction options...');
    const { data: optionsData, error: optionsError } = await supabase
      .from('prediction_options')
      .insert(samplePredictionOptions)
      .select();

    if (optionsError) {
      console.error('❌ Error seeding prediction options:', optionsError);
      throw optionsError;
    }

    console.log(`✅ Successfully seeded ${optionsData?.length || 0} prediction options`);

    // Verify the seeding worked
    console.log('🔍 Verifying seeded data...');
    
    const { data: verifyPredictions, error: verifyError } = await supabase
      .from('predictions')
      .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url),
        options:prediction_options(*)
      `)
      .order('created_at', { ascending: false });
    
    if (verifyError) {
      throw verifyError;
    }

    console.log(`✅ Verification complete: ${verifyPredictions?.length || 0} predictions found in database`);
    console.log('🎉 Database seeding completed successfully!');
    
    // Show summary
    console.log('\n📊 Seeding Summary:');
    console.log(`   Users: ${sampleUsers.length}`);
    console.log(`   Predictions: ${samplePredictions.length}`);
    console.log(`   Prediction Options: ${samplePredictionOptions.length}`);
    console.log(`   Total Volume: $${samplePredictions.reduce((sum, p) => sum + p.pool_total, 0).toLocaleString()}`);
    console.log(`   Categories: ${[...new Set(samplePredictions.map(p => p.category))].join(', ')}`);
    
    return {
      success: true,
      usersSeeded: sampleUsers.length,
      predictionsSeeded: samplePredictions.length,
      optionsSeeded: samplePredictionOptions.length
    };

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

// Run the seeding function if this script is executed directly
if (require.main === module) {
  seedDatabase()
    .then((result) => {
      console.log('\n✅ Seeding script completed successfully:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seeding script failed:', error);
      process.exit(1);
    });
}

export { seedDatabase, sampleUsers, samplePredictions, samplePredictionOptions };
