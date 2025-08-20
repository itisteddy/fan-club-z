#!/usr/bin/env node

/**
 * Database Seeding Script for Fan Club Z v2.0.50
 * Seeds the database with sample predictions, users, and options
 */

import { supabase } from '../config/database';

async function seedDatabase() {
  console.log('🌱 Starting database seeding for Fan Club Z v2.0.50...');
  
  try {
    // Sample users
    const sampleUsers = [
      {
        id: '10000000-0000-0000-0000-000000000001',
        email: 'john.doe@example.com',
        username: 'johndoe',
        full_name: 'John Doe',
        avatar_url: null,
        created_at: new Date().toISOString()
      },
      {
        id: '10000000-0000-0000-0000-000000000002',
        email: 'jane.smith@example.com',
        username: 'janesmith',
        full_name: 'Jane Smith',
        avatar_url: null,
        created_at: new Date().toISOString()
      },
      {
        id: '10000000-0000-0000-0000-000000000003',
        email: 'mike.wilson@example.com',
        username: 'mikewilson',
        full_name: 'Mike Wilson',
        avatar_url: null,
        created_at: new Date().toISOString()
      },
      {
        id: '10000000-0000-0000-0000-000000000004',
        email: 'sarah.jones@example.com',
        username: 'sarahjones',
        full_name: 'Sarah Jones',
        avatar_url: null,
        created_at: new Date().toISOString()
      }
    ];

    // Sample predictions
    const samplePredictions = [
      {
        id: '10000000-0000-0000-0000-000000000001',
        creator_id: '10000000-0000-0000-0000-000000000001',
        title: 'Bitcoin will reach $100,000 by end of 2024',
        description: 'Will Bitcoin achieve the $100k milestone before December 31st, 2024?',
        category: 'crypto',
        type: 'binary',
        status: 'open',
        stake_min: 5,
        stake_max: 1000,
        pool_total: 850,
        entry_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        settlement_method: 'manual',
        is_private: false,
        creator_fee_percentage: 2,
        platform_fee_percentage: 3,
        tags: ['bitcoin', 'crypto', 'price'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '10000000-0000-0000-0000-000000000002',
        creator_id: '10000000-0000-0000-0000-000000000002',
        title: 'Manchester United will beat Liverpool in their next match',
        description: 'Will Man Utd secure a victory against Liverpool in their upcoming Premier League fixture?',
        category: 'sports',
        type: 'binary',
        status: 'open',
        stake_min: 1,
        stake_max: 500,
        pool_total: 1250,
        entry_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        settlement_method: 'auto',
        is_private: false,
        creator_fee_percentage: 2,
        platform_fee_percentage: 3,
        tags: ['football', 'premier-league', 'man-utd', 'liverpool'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '10000000-0000-0000-0000-000000000003',
        creator_id: '10000000-0000-0000-0000-000000000003',
        title: 'Taylor Swift will announce a new album in 2024',
        description: 'Will Taylor Swift officially announce a new studio album before the end of 2024?',
        category: 'pop_culture',
        type: 'binary',
        status: 'open',
        stake_min: 2,
        stake_max: 200,
        pool_total: 420,
        entry_deadline: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
        settlement_method: 'manual',
        is_private: false,
        creator_fee_percentage: 2,
        platform_fee_percentage: 3,
        tags: ['taylor-swift', 'music', 'album'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '10000000-0000-0000-0000-000000000004',
        creator_id: '10000000-0000-0000-0000-000000000004',
        title: 'Ethereum will reach $5,000 by end of 2024',
        description: 'Will Ethereum achieve the $5k milestone before December 31st, 2024?',
        category: 'crypto',
        type: 'binary',
        status: 'open',
        stake_min: 5,
        stake_max: 1000,
        pool_total: 2100,
        entry_deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        settlement_method: 'manual',
        is_private: false,
        creator_fee_percentage: 2,
        platform_fee_percentage: 3,
        tags: ['ethereum', 'crypto', 'price'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '10000000-0000-0000-0000-000000000005',
        creator_id: '10000000-0000-0000-0000-000000000001',
        title: 'Lakers will win the NBA Finals 2025',
        description: 'Will the Los Angeles Lakers win the 2025 NBA Championship?',
        category: 'sports',
        type: 'binary',
        status: 'open',
        stake_min: 1,
        stake_max: 500,
        pool_total: 3400,
        entry_deadline: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000).toISOString(),
        settlement_method: 'manual',
        is_private: false,
        creator_fee_percentage: 2,
        platform_fee_percentage: 3,
        tags: ['nba', 'basketball', 'lakers', 'finals'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '10000000-0000-0000-0000-000000000006',
        creator_id: '10000000-0000-0000-0000-000000000002',
        title: 'Marvel\'s next movie will be #1 at box office',
        description: 'Will Marvel\'s next theatrical release top the box office in its opening weekend?',
        category: 'pop_culture',
        type: 'binary',
        status: 'open',
        stake_min: 1,
        stake_max: 300,
        pool_total: 675,
        entry_deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        settlement_method: 'auto',
        is_private: false,
        creator_fee_percentage: 2,
        platform_fee_percentage: 3,
        tags: ['marvel', 'movies', 'box-office'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Sample prediction options
    const sampleOptions = [
      // Bitcoin prediction options
      {
        id: '10000000-0000-0000-0000-000000000001',
        prediction_id: '10000000-0000-0000-0000-000000000001',
        label: 'Yes, Bitcoin will reach $100k',
        total_staked: 520,
        current_odds: 1.85,
        percentage: 61.2
      },
      {
        id: '10000000-0000-0000-0000-000000000002',
        prediction_id: '10000000-0000-0000-0000-000000000001',
        label: 'No, Bitcoin will not reach $100k',
        total_staked: 330,
        current_odds: 2.58,
        percentage: 38.8
      },
      // Man Utd vs Liverpool options
      {
        id: '10000000-0000-0000-0000-000000000003',
        prediction_id: '10000000-0000-0000-0000-000000000002',
        label: 'Manchester United wins',
        total_staked: 750,
        current_odds: 1.67,
        percentage: 60.0
      },
      {
        id: '10000000-0000-0000-0000-000000000004',
        prediction_id: '10000000-0000-0000-0000-000000000002',
        label: 'Liverpool wins',
        total_staked: 500,
        current_odds: 2.50,
        percentage: 40.0
      },
      // Taylor Swift album options
      {
        id: '10000000-0000-0000-0000-000000000005',
        prediction_id: '10000000-0000-0000-0000-000000000003',
        label: 'Yes, new album announced',
        total_staked: 280,
        current_odds: 1.50,
        percentage: 66.7
      },
      {
        id: '10000000-0000-0000-0000-000000000006',
        prediction_id: '10000000-0000-0000-0000-000000000003',
        label: 'No, no album announced',
        total_staked: 140,
        current_odds: 3.00,
        percentage: 33.3
      },
      // Ethereum price options
      {
        id: '10000000-0000-0000-0000-000000000007',
        prediction_id: '10000000-0000-0000-0000-000000000004',
        label: 'Yes, Ethereum reaches $5k',
        total_staked: 1260,
        current_odds: 1.67,
        percentage: 60.0
      },
      {
        id: '10000000-0000-0000-0000-000000000008',
        prediction_id: '10000000-0000-0000-0000-000000000004',
        label: 'No, Ethereum stays below $5k',
        total_staked: 840,
        current_odds: 2.50,
        percentage: 40.0
      },
      // Lakers NBA Finals options
      {
        id: '10000000-0000-0000-0000-000000000009',
        prediction_id: '10000000-0000-0000-0000-000000000005',
        label: 'Lakers win NBA Finals',
        total_staked: 2040,
        current_odds: 1.67,
        percentage: 60.0
      },
      {
        id: '10000000-0000-0000-0000-000000000010',
        prediction_id: '10000000-0000-0000-0000-000000000005',
        label: 'Lakers do not win NBA Finals',
        total_staked: 1360,
        current_odds: 2.50,
        percentage: 40.0
      },
      // Marvel movie options
      {
        id: '10000000-0000-0000-0000-000000000011',
        prediction_id: '10000000-0000-0000-0000-000000000006',
        label: 'Marvel movie is #1',
        total_staked: 405,
        current_odds: 1.67,
        percentage: 60.0
      },
      {
        id: '10000000-0000-0000-0000-000000000012',
        prediction_id: '10000000-0000-0000-0000-000000000006',
        label: 'Marvel movie is not #1',
        total_staked: 270,
        current_odds: 2.50,
        percentage: 40.0
      }
    ];

    // Insert users
    console.log('👥 Inserting sample users...');
    for (const user of sampleUsers) {
      const { error } = await supabase
        .from('users')
        .upsert(user, { onConflict: 'id' });
      
      if (error) {
        console.error('Error seeding users:', error);
      }
    }

    // Insert predictions
    console.log('🎯 Inserting sample predictions...');
    for (const prediction of samplePredictions) {
      const { error } = await supabase
        .from('predictions')
        .upsert(prediction, { onConflict: 'id' });
      
      if (error) {
        console.error('Error seeding predictions:', error);
      }
    }

    // Insert prediction options
    console.log('📊 Inserting sample prediction options...');
    for (const option of sampleOptions) {
      const { error } = await supabase
        .from('prediction_options')
        .upsert(option, { onConflict: 'id' });
      
      if (error) {
        console.error('Error seeding prediction options:', error);
      }
    }

    console.log('✅ Database seeding completed successfully!');
    
    return {
      users: sampleUsers.length,
      predictions: samplePredictions.length,
      options: sampleOptions.length
    };

  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    throw error;
  }
}

export { seedDatabase };
