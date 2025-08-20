import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import logger from '../utils/logger';

const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

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

    // Get real users from Supabase Auth
    logger.info('Fetching real users from Supabase Auth...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      logger.error('Error fetching auth users:', authError);
      throw authError;
    }

    if (!authUsers.users || authUsers.users.length === 0) {
      logger.warn('No users found in Supabase Auth. Please run create-test-users.ts first.');
      return;
    }

    logger.info(`Found ${authUsers.users.length} users in Supabase Auth`);

    // Create user profiles for auth users
    logger.info('Creating user profiles...');
    const userProfiles = authUsers.users.map(user => ({
      id: user.id,
      email: user.email!,
      username: user.user_metadata?.username || user.email!.split('@')[0],
      full_name: user.user_metadata?.full_name || `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim(),
      kyc_level: 'basic',
      is_verified: true,
      reputation_score: Math.floor(Math.random() * 50) + 50, // Random score 50-100
    }));

    const { error: usersError } = await supabase
      .from('users')
      .insert(userProfiles);

    if (usersError) {
      logger.error('Error creating user profiles:', usersError);
      throw usersError;
    }

    // Create wallets for users
    logger.info('Creating wallets...');
    const wallets = userProfiles.flatMap(user => [
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

    // Create contextually meaningful clubs
    logger.info('Creating clubs...');
    const clubs = [
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        name: 'Premier League Predictions',
        description: 'The ultimate destination for Premier League football predictions. From title races to relegation battles, predict it all!',
        owner_id: userProfiles[1]?.id || userProfiles[0]?.id, // John Doe or Admin
        visibility: 'public',
        tags: ['sports', 'football', 'premier-league', 'england'],
        member_count: 0,
      },
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        name: 'Crypto & Web3 Predictions',
        description: 'Predict cryptocurrency prices, DeFi trends, NFT markets, and blockchain developments. Stay ahead of the crypto curve!',
        owner_id: userProfiles[2]?.id || userProfiles[0]?.id, // Jane Smith or Admin
        visibility: 'public',
        tags: ['crypto', 'finance', 'blockchain', 'web3', 'defi'],
        member_count: 0,
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        name: 'Nigerian Entertainment Hub',
        description: 'Predict Big Brother Naija winners, Nollywood box office hits, music chart toppers, and celebrity events in Nigeria!',
        owner_id: userProfiles[3]?.id || userProfiles[0]?.id, // Mike Wilson or Admin
        visibility: 'public',
        tags: ['entertainment', 'nigeria', 'bbnaija', 'nollywood', 'music'],
        member_count: 0,
      },
      {
        id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        name: 'Esports & Gaming Arena',
        description: 'Predict esports tournament winners, game releases, streaming trends, and gaming industry developments worldwide!',
        owner_id: userProfiles[4]?.id || userProfiles[0]?.id, // Sarah Jones or Admin
        visibility: 'public',
        tags: ['esports', 'gaming', 'tournaments', 'streaming', 'competitive'],
        member_count: 0,
      },
      {
        id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        name: 'Global Politics & Elections',
        description: 'Predict election outcomes, policy changes, international relations, and political developments around the world!',
        owner_id: userProfiles[0]?.id, // Admin
        visibility: 'public',
        tags: ['politics', 'elections', 'government', 'international', 'policy'],
        member_count: 0,
      },
    ];

    const { error: clubsError } = await supabase
      .from('clubs')
      .insert(clubs);

    if (clubsError) {
      logger.error('Error creating clubs:', clubsError);
      throw clubsError;
    }

    // Add club memberships
    logger.info('Creating club memberships...');
    const clubMemberships = [
      // Owners as admins
      ...clubs.map(club => ({
        club_id: club.id,
        user_id: club.owner_id,
        role: 'admin',
      })),
      // Additional meaningful memberships
      {
        club_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        user_id: userProfiles[2]?.id, // Jane joins Premier League club
        role: 'member',
      },
      {
        club_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        user_id: userProfiles[1]?.id, // John joins Crypto club
        role: 'member',
      },
      {
        club_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        user_id: userProfiles[4]?.id, // Sarah joins Entertainment club
        role: 'member',
      },
      {
        club_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        user_id: userProfiles[0]?.id, // Admin joins Gaming club
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

    // Create contextually meaningful predictions
    logger.info('Creating predictions...');
    const predictions = [
      {
        id: 'pred1111-1111-1111-1111-111111111111',
        creator_id: userProfiles[1]?.id, // John Doe
        title: 'Will Manchester City win the 2024-25 Premier League?',
        description: 'Manchester City has been dominant in recent years. Can they secure another Premier League title this season?',
        category: 'sports',
        type: 'binary',
        status: 'open',
        stake_min: 100.00,
        stake_max: 10000.00,
        entry_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        settlement_method: 'manual',
        club_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        tags: ['football', 'premier-league', 'manchester-city', 'england'],
      },
      {
        id: 'pred2222-2222-2222-2222-222222222222',
        creator_id: userProfiles[2]?.id, // Jane Smith
        title: 'Bitcoin Price at End of 2025',
        description: 'Will Bitcoin reach $100,000 or higher by December 31, 2025?',
        category: 'finance',
        type: 'binary',
        status: 'open',
        stake_min: 50.00,
        stake_max: 5000.00,
        entry_deadline: '2025-12-31T23:59:59Z',
        settlement_method: 'auto',
        club_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        tags: ['bitcoin', 'crypto', 'price', '2025'],
      },
      {
        id: 'pred3333-3333-3333-3333-333333333333',
        creator_id: userProfiles[3]?.id, // Mike Wilson
        title: 'Big Brother Naija Season 10 Winner',
        description: 'Who will be crowned the winner of Big Brother Naija Season 10?',
        category: 'entertainment',
        type: 'multi_outcome',
        status: 'open',
        stake_min: 25.00,
        stake_max: 2000.00,
        entry_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        settlement_method: 'manual',
        club_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        tags: ['bbnaija', 'reality-tv', 'nigeria', 'season-10'],
      },
      {
        id: 'pred4444-4444-4444-4444-444444444444',
        creator_id: userProfiles[4]?.id, // Sarah Jones
        title: 'League of Legends Worlds 2025 Champion',
        description: 'Which region will win the League of Legends World Championship 2025?',
        category: 'esports',
        type: 'multi_outcome',
        status: 'open',
        stake_min: 20.00,
        stake_max: 1000.00,
        entry_deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
        settlement_method: 'auto',
        club_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        tags: ['league-of-legends', 'worlds', 'esports', '2025'],
      },
      {
        id: 'pred5555-5555-5555-5555-555555555555',
        creator_id: userProfiles[0]?.id, // Admin
        title: '2028 US Presidential Election Winner',
        description: 'Will the Democratic Party candidate win the 2028 US Presidential Election?',
        category: 'politics',
        type: 'binary',
        status: 'open',
        stake_min: 10.00,
        stake_max: 50000.00,
        entry_deadline: '2028-11-01T00:00:00Z',
        settlement_method: 'manual',
        club_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        tags: ['usa', 'election', 'president', '2028'],
      },
    ];

    const { error: predictionsError } = await supabase
      .from('predictions')
      .insert(predictions);

    if (predictionsError) {
      logger.error('Error creating predictions:', predictionsError);
      throw predictionsError;
    }

    // Create prediction options with realistic odds
    logger.info('Creating prediction options...');
    const predictionOptions = [
      // Premier League prediction
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
      // Bitcoin prediction
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
      // BBNaija prediction
      {
        prediction_id: 'pred3333-3333-3333-3333-333333333333',
        label: 'Male Contestant',
        total_staked: 800.00,
        current_odds: 3.2,
      },
      {
        prediction_id: 'pred3333-3333-3333-3333-333333333333',
        label: 'Female Contestant',
        total_staked: 1200.00,
        current_odds: 2.1,
      },
      {
        prediction_id: 'pred3333-3333-3333-3333-333333333333',
        label: 'Wildcard Entry',
        total_staked: 600.00,
        current_odds: 4.3,
      },
      // LoL Worlds prediction
      {
        prediction_id: 'pred4444-4444-4444-4444-444444444444',
        label: 'Korea (LCK)',
        total_staked: 2500.00,
        current_odds: 1.5,
      },
      {
        prediction_id: 'pred4444-4444-4444-4444-444444444444',
        label: 'China (LPL)',
        total_staked: 1800.00,
        current_odds: 2.1,
      },
      {
        prediction_id: 'pred4444-4444-4444-4444-444444444444',
        label: 'Europe (LEC)',
        total_staked: 1200.00,
        current_odds: 3.1,
      },
      {
        prediction_id: 'pred4444-4444-4444-4444-444444444444',
        label: 'North America (LCS)',
        total_staked: 900.00,
        current_odds: 4.2,
      },
      // US Election prediction
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

    // Update prediction pool totals
    logger.info('Updating prediction pool totals...');
    for (const prediction of predictions) {
      const totalPool = predictionOptions
        .filter(option => option.prediction_id === prediction.id)
        .reduce((sum, option) => sum + option.total_staked, 0);

      await supabase
        .from('predictions')
        .update({ pool_total: totalPool })
        .eq('id', prediction.id);
    }

    // Create meaningful comments
    logger.info('Creating comments...');
    const comments = [
      {
        prediction_id: 'pred1111-1111-1111-1111-111111111111',
        user_id: userProfiles[2]?.id, // Jane
        content: 'Man City has the strongest squad depth in the league. Pep Guardiola knows how to win titles!',
      },
      {
        prediction_id: 'pred1111-1111-1111-1111-111111111111',
        user_id: userProfiles[3]?.id, // Mike
        content: 'Arsenal and Liverpool are looking really strong this season. It will be a close race!',
      },
      {
        prediction_id: 'pred2222-2222-2222-2222-222222222222',
        user_id: userProfiles[1]?.id, // John
        content: 'Bitcoin halving in 2024 + institutional adoption = $100k+ by 2025!',
      },
      {
        prediction_id: 'pred3333-3333-3333-3333-333333333333',
        user_id: userProfiles[0]?.id, // Admin
        content: 'This season has some really interesting housemates. The drama is going to be intense!',
      },
    ];

    const { error: commentsError } = await supabase
      .from('comments')
      .insert(comments);

    if (commentsError) {
      logger.error('Error creating comments:', commentsError);
      throw commentsError;
    }

    // Create reactions
    logger.info('Creating reactions...');
    const reactions = [
      {
        prediction_id: 'pred1111-1111-1111-1111-111111111111',
        user_id: userProfiles[2]?.id, // Jane
        type: 'like',
      },
      {
        prediction_id: 'pred1111-1111-1111-1111-111111111111',
        user_id: userProfiles[3]?.id, // Mike
        type: 'fire',
      },
      {
        prediction_id: 'pred2222-2222-2222-2222-222222222222',
        user_id: userProfiles[4]?.id, // Sarah
        type: 'thinking',
      },
      {
        prediction_id: 'pred3333-3333-3333-3333-333333333333',
        user_id: userProfiles[1]?.id, // John
        type: 'cheer',
      },
    ];

    const { error: reactionsError } = await supabase
      .from('reactions')
      .insert(reactions);

    if (reactionsError) {
      logger.error('Error creating reactions:', reactionsError);
      throw reactionsError;
    }

    // Create wallet transactions
    logger.info('Creating transactions...');
    const transactions = userProfiles.flatMap((user, index) => [
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
      .insert(transactions);

    if (transactionsError) {
      logger.error('Error creating transactions:', transactionsError);
      throw transactionsError;
    }

    logger.info('✅ Database seeding completed successfully!');
    
    // Log summary
    logger.info('📊 Seeding Summary:');
    logger.info(`- ${userProfiles.length} user profiles created`);
    logger.info(`- ${userProfiles.length * 2} wallets created`);
    logger.info(`- ${clubs.length} clubs created`);
    logger.info(`- ${clubMemberships.length} club memberships created`);
    logger.info(`- ${predictions.length} predictions created`);
    logger.info(`- ${predictionOptions.length} prediction options created`);
    logger.info(`- ${comments.length} comments created`);
    logger.info(`- ${reactions.length} reactions created`);
    logger.info(`- ${transactions.length} transactions created`);

  } catch (error) {
    logger.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      logger.info('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}
