import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { logger } from '../utils/logger';

const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

// Sample data for seeding
const sampleUsers = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'admin@fanclubz.com',
    username: 'admin',
    full_name: 'Admin User',
    kyc_level: 'enhanced',
    is_verified: true,
    reputation_score: 100.0,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'john@example.com',
    username: 'john_doe',
    full_name: 'John Doe',
    kyc_level: 'basic',
    is_verified: true,
    reputation_score: 85.5,
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'jane@example.com',
    username: 'jane_smith',
    full_name: 'Jane Smith',
    kyc_level: 'basic',
    is_verified: true,
    reputation_score: 92.3,
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    email: 'mike@example.com',
    username: 'mike_wilson',
    full_name: 'Mike Wilson',
    kyc_level: 'none',
    is_verified: false,
    reputation_score: 45.7,
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    email: 'sarah@example.com',
    username: 'sarah_jones',
    full_name: 'Sarah Jones',
    kyc_level: 'enhanced',
    is_verified: true,
    reputation_score: 78.9,
  },
];

const sampleClubs = [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    name: 'Premier League Fans',
    description: 'Discussion and predictions about Premier League football',
    owner_id: '22222222-2222-2222-2222-222222222222',
    visibility: 'public',
    tags: ['sports', 'football', 'premier-league'],
  },
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    name: 'Crypto Enthusiasts',
    description: 'Predictions about cryptocurrency prices and trends',
    owner_id: '33333333-3333-3333-3333-333333333333',
    visibility: 'public',
    tags: ['crypto', 'finance', 'blockchain'],
  },
  {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    name: 'Reality TV Addicts',
    description: 'Big Brother, Love Island, and more reality show predictions',
    owner_id: '55555555-5555-5555-5555-555555555555',
    visibility: 'public',
    tags: ['entertainment', 'reality-tv', 'pop-culture'],
  },
  {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    name: 'Esports Arena',
    description: 'Competitive gaming predictions and discussions',
    owner_id: '44444444-4444-4444-4444-444444444444',
    visibility: 'public',
    tags: ['esports', 'gaming', 'competitions'],
  },
  {
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    name: 'Political Predictions',
    description: 'Elections, policy changes, and political outcomes',
    owner_id: '11111111-1111-1111-1111-111111111111',
    visibility: 'public',
    tags: ['politics', 'elections', 'government'],
  },
];

const samplePredictions = [
  {
    id: 'pred1111-1111-1111-1111-111111111111',
    creator_id: '22222222-2222-2222-2222-222222222222',
    title: 'Will Manchester City win the Premier League this season?',
    description: 'Prediction about Manchester City winning the 2024-25 Premier League title',
    category: 'sports',
    type: 'binary',
    status: 'open',
    stake_min: 100.00,
    stake_max: 10000.00,
    entry_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    settlement_method: 'manual',
    club_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    tags: ['football', 'premier-league', 'manchester-city'],
  },
  {
    id: 'pred2222-2222-2222-2222-222222222222',
    creator_id: '33333333-3333-3333-3333-333333333333',
    title: 'Bitcoin price at end of 2025',
    description: 'Will Bitcoin be above $100,000 at the end of 2025?',
    category: 'custom',
    type: 'binary',
    status: 'open',
    stake_min: 50.00,
    stake_max: 5000.00,
    entry_deadline: '2025-12-31T23:59:59Z',
    settlement_method: 'auto',
    club_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    tags: ['bitcoin', 'crypto', 'price'],
  },
  {
    id: 'pred3333-3333-3333-3333-333333333333',
    creator_id: '55555555-5555-5555-5555-555555555555',
    title: 'Next Big Brother winner',
    description: 'Who will win the next season of Big Brother Naija?',
    category: 'pop_culture',
    type: 'multi_outcome',
    status: 'open',
    stake_min: 25.00,
    stake_max: 2000.00,
    entry_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    settlement_method: 'manual',
    club_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    tags: ['big-brother', 'reality-tv', 'nigeria'],
  },
  {
    id: 'pred4444-4444-4444-4444-444444444444',
    creator_id: '44444444-4444-4444-4444-444444444444',
    title: 'League of Legends World Championship 2025',
    description: 'Which region will win the LoL World Championship?',
    category: 'esports',
    type: 'multi_outcome',
    status: 'open',
    stake_min: 20.00,
    stake_max: 1000.00,
    entry_deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
    settlement_method: 'auto',
    club_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    tags: ['league-of-legends', 'worlds', 'esports'],
  },
  {
    id: 'pred5555-5555-5555-5555-555555555555',
    creator_id: '11111111-1111-1111-1111-111111111111',
    title: 'US Presidential Election 2028',
    description: 'Will the Democratic Party win the 2028 US Presidential Election?',
    category: 'politics',
    type: 'binary',
    status: 'open',
    stake_min: 10.00,
    stake_max: 50000.00,
    entry_deadline: '2028-11-01T00:00:00Z',
    settlement_method: 'manual',
    club_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    tags: ['usa', 'election', 'president'],
  },
];

export async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');

    // Check if data already exists
    const { data: existingUsers } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      logger.info('Database already seeded, skipping...');
      return;
    }

    // 1. Insert sample users
    logger.info('Seeding users...');
    const { error: usersError } = await supabase
      .from('users')
      .insert(sampleUsers);

    if (usersError) {
      logger.error('Error seeding users:', usersError);
      throw usersError;
    }

    // 2. Create default wallets for users
    logger.info('Creating wallets...');
    const wallets = sampleUsers.flatMap(user => [
      {
        user_id: user.id,
        currency: 'NGN',
        available_balance: Math.floor(Math.random() * 50000) + 1000, // Random balance between 1k-50k
        total_deposited: Math.floor(Math.random() * 100000) + 5000,
      },
      {
        user_id: user.id,
        currency: 'USD',
        available_balance: Math.floor(Math.random() * 1000) + 100,
        total_deposited: Math.floor(Math.random() * 2000) + 500,
      },
    ]);

    const { error: walletsError } = await supabase
      .from('wallets')
      .insert(wallets);

    if (walletsError) {
      logger.error('Error creating wallets:', walletsError);
      throw walletsError;
    }

    // 3. Insert sample clubs
    logger.info('Seeding clubs...');
    const { error: clubsError } = await supabase
      .from('clubs')
      .insert(sampleClubs);

    if (clubsError) {
      logger.error('Error seeding clubs:', clubsError);
      throw clubsError;
    }

    // 4. Add club memberships
    logger.info('Creating club memberships...');
    const clubMemberships = [
      // Owners as admins
      ...sampleClubs.map(club => ({
        club_id: club.id,
        user_id: club.owner_id,
        role: 'admin',
      })),
      // Additional memberships
      {
        club_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        user_id: '33333333-3333-3333-3333-333333333333',
        role: 'member',
      },
      {
        club_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        user_id: '22222222-2222-2222-2222-222222222222',
        role: 'member',
      },
      {
        club_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        user_id: '44444444-4444-4444-4444-444444444444',
        role: 'member',
      },
      {
        club_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        user_id: '11111111-1111-1111-1111-111111111111',
        role: 'moderator',
      },
    ];

    const { error: membershipsError } = await supabase
      .from('club_members')
      .insert(clubMemberships);

    if (membershipsError) {
      logger.error('Error creating club memberships:', membershipsError);
      throw membershipsError;
    }

    // 5. Insert sample predictions
    logger.info('Seeding predictions...');
    const { error: predictionsError } = await supabase
      .from('predictions')
      .insert(samplePredictions);

    if (predictionsError) {
      logger.error('Error seeding predictions:', predictionsError);
      throw predictionsError;
    }

    // 6. Insert prediction options
    logger.info('Creating prediction options...');
    const predictionOptions = [
      // Binary options for prediction 1
      {
        prediction_id: 'pred1111-1111-1111-1111-111111111111',
        label: 'Yes',
        total_staked: 1500.00,
        current_odds: 1.8,
      },
      {
        prediction_id: 'pred1111-1111-1111-1111-111111111111',
        label: 'No',
        total_staked: 2300.00,
        current_odds: 1.2,
      },
      // Binary options for prediction 2
      {
        prediction_id: 'pred2222-2222-2222-2222-222222222222',
        label: 'Yes',
        total_staked: 3200.00,
        current_odds: 2.1,
      },
      {
        prediction_id: 'pred2222-2222-2222-2222-222222222222',
        label: 'No',
        total_staked: 1800.00,
        current_odds: 2.8,
      },
      // Multi-outcome options for prediction 3
      {
        prediction_id: 'pred3333-3333-3333-3333-333333333333',
        label: 'Contestant A',
        total_staked: 800.00,
        current_odds: 3.2,
      },
      {
        prediction_id: 'pred3333-3333-3333-3333-333333333333',
        label: 'Contestant B',
        total_staked: 1200.00,
        current_odds: 2.1,
      },
      {
        prediction_id: 'pred3333-3333-3333-3333-333333333333',
        label: 'Contestant C',
        total_staked: 600.00,
        current_odds: 4.3,
      },
      // Multi-outcome options for prediction 4
      {
        prediction_id: 'pred4444-4444-4444-4444-444444444444',
        label: 'Korea',
        total_staked: 2500.00,
        current_odds: 1.5,
      },
      {
        prediction_id: 'pred4444-4444-4444-4444-444444444444',
        label: 'China',
        total_staked: 1800.00,
        current_odds: 2.1,
      },
      {
        prediction_id: 'pred4444-4444-4444-4444-444444444444',
        label: 'Europe',
        total_staked: 1200.00,
        current_odds: 3.1,
      },
      {
        prediction_id: 'pred4444-4444-4444-4444-444444444444',
        label: 'North America',
        total_staked: 900.00,
        current_odds: 4.2,
      },
      // Binary options for prediction 5
      {
        prediction_id: 'pred5555-5555-5555-5555-555555555555',
        label: 'Yes',
        total_staked: 5000.00,
        current_odds: 1.9,
      },
      {
        prediction_id: 'pred5555-5555-5555-5555-555555555555',
        label: 'No',
        total_staked: 4200.00,
        current_odds: 2.2,
      },
    ];

    const { error: optionsError } = await supabase
      .from('prediction_options')
      .insert(predictionOptions);

    if (optionsError) {
      logger.error('Error creating prediction options:', optionsError);
      throw optionsError;
    }

    // 7. Update prediction pool totals
    logger.info('Updating prediction pool totals...');
    for (const prediction of samplePredictions) {
      const totalPool = predictionOptions
        .filter(option => option.prediction_id === prediction.id)
        .reduce((sum, option) => sum + option.total_staked, 0);

      await supabase
        .from('predictions')
        .update({ pool_total: totalPool })
        .eq('id', prediction.id);
    }

    // 8. Create sample comments
    logger.info('Creating sample comments...');
    const sampleComments = [
      {
        prediction_id: 'pred1111-1111-1111-1111-111111111111',
        user_id: '33333333-3333-3333-3333-333333333333',
        content: 'Man City has a strong squad this season, I think they have a good chance!',
      },
      {
        prediction_id: 'pred1111-1111-1111-1111-111111111111',
        user_id: '44444444-4444-4444-4444-444444444444',
        content: 'Arsenal is looking really strong too, it will be close.',
      },
      {
        prediction_id: 'pred2222-2222-2222-2222-222222222222',
        user_id: '22222222-2222-2222-2222-222222222222',
        content: 'Bitcoin has been volatile but the trend seems bullish long-term.',
      },
      {
        prediction_id: 'pred3333-3333-3333-3333-333333333333',
        user_id: '11111111-1111-1111-1111-111111111111',
        content: 'This season has some really interesting contestants!',
      },
    ];

    const { error: commentsError } = await supabase
      .from('comments')
      .insert(sampleComments);

    if (commentsError) {
      logger.error('Error creating comments:', commentsError);
      throw commentsError;
    }

    // 9. Create sample reactions
    logger.info('Creating sample reactions...');
    const sampleReactions = [
      {
        prediction_id: 'pred1111-1111-1111-1111-111111111111',
        user_id: '33333333-3333-3333-3333-333333333333',
        type: 'like',
      },
      {
        prediction_id: 'pred1111-1111-1111-1111-111111111111',
        user_id: '44444444-4444-4444-4444-444444444444',
        type: 'fire',
      },
      {
        prediction_id: 'pred2222-2222-2222-2222-222222222222',
        user_id: '55555555-5555-5555-5555-555555555555',
        type: 'thinking',
      },
      {
        prediction_id: 'pred3333-3333-3333-3333-333333333333',
        user_id: '22222222-2222-2222-2222-222222222222',
        type: 'cheer',
      },
    ];

    const { error: reactionsError } = await supabase
      .from('reactions')
      .insert(sampleReactions);

    if (reactionsError) {
      logger.error('Error creating reactions:', reactionsError);
      throw reactionsError;
    }

    // 10. Create sample wallet transactions
    logger.info('Creating sample transactions...');
    const sampleTransactions = sampleUsers.flatMap((user, index) => [
      {
        user_id: user.id,
        type: 'deposit',
        currency: 'NGN',
        amount: (index + 1) * 5000,
        status: 'completed',
        description: 'Initial deposit',
        reference: `DEP_${Date.now()}_${user.id.slice(0, 8)}`,
      },
      {
        user_id: user.id,
        type: 'deposit',
        currency: 'USD',
        amount: (index + 1) * 100,
        status: 'completed',
        description: 'USD deposit',
        reference: `DEP_${Date.now()}_${user.id.slice(0, 8)}_USD`,
      },
    ]);

    const { error: transactionsError } = await supabase
      .from('wallet_transactions')
      .insert(sampleTransactions);

    if (transactionsError) {
      logger.error('Error creating transactions:', transactionsError);
      throw transactionsError;
    }

    logger.info('Database seeding completed successfully!');
    
    // Log summary
    logger.info('Seeding Summary:');
    logger.info(`- ${sampleUsers.length} users created`);
    logger.info(`- ${sampleUsers.length * 2} wallets created`);
    logger.info(`- ${sampleClubs.length} clubs created`);
    logger.info(`- ${clubMemberships.length} club memberships created`);
    logger.info(`- ${samplePredictions.length} predictions created`);
    logger.info(`- ${predictionOptions.length} prediction options created`);
    logger.info(`- ${sampleComments.length} comments created`);
    logger.info(`- ${sampleReactions.length} reactions created`);
    logger.info(`- ${sampleTransactions.length} transactions created`);

  } catch (error) {
    logger.error('Error seeding database:', error);
    throw error;
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      logger.info('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding failed:', error);
      process.exit(1);
    });
}
