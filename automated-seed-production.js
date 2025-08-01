#!/usr/bin/env node

/**
 * Automated Production Database Seeding Script
 * This script will automatically seed your Supabase database with real data
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration - these should match your Vercel environment variables
const SUPABASE_URL = 'https://ihtnsyhknvltgrksffun.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('💡 To fix this:');
  console.log('1. Go to your Supabase Dashboard');
  console.log('2. Go to Settings → API');
  console.log('3. Copy the "service_role" key');
  console.log('4. Run: export SUPABASE_SERVICE_ROLE_KEY="your-service-key"');
  console.log('5. Then run this script again');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function seedProductionDatabase() {
  console.log('🚀 Starting automated production database seeding...');
  console.log('==================================================');

  try {
    // Step 1: Get existing users
    console.log('📋 Step 1: Checking existing users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching users:', authError.message);
      return;
    }

    console.log(`✅ Found ${authUsers.users.length} users in Supabase Auth`);

    // Step 2: Create user profiles
    console.log('👥 Step 2: Creating user profiles...');
    for (const user of authUsers.users) {
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          username: user.user_metadata?.username || user.email.split('@')[0],
          full_name: user.user_metadata?.full_name || 'User',
          kyc_level: 'basic',
          is_verified: true,
          reputation_score: Math.floor(Math.random() * 50) + 50,
        }, { onConflict: 'id' });

      if (profileError) {
        console.error(`❌ Error creating profile for ${user.email}:`, profileError.message);
      } else {
        console.log(`✅ Created profile for: ${user.email}`);
      }
    }

    // Step 3: Create wallets
    console.log('💰 Step 3: Creating wallets...');
    const { data: users } = await supabase.from('users').select('id');
    
    for (const user of users) {
      // Create NGN wallet
      await supabase.from('wallets').upsert({
        user_id: user.id,
        currency: 'NGN',
        available_balance: Math.floor(Math.random() * 50000) + 1000,
        total_deposited: Math.floor(Math.random() * 100000) + 5000,
      }, { onConflict: 'user_id,currency' });

      // Create USD wallet
      await supabase.from('wallets').upsert({
        user_id: user.id,
        currency: 'USD',
        available_balance: Math.floor(Math.random() * 1000) + 100,
        total_deposited: Math.floor(Math.random() * 2000) + 500,
      }, { onConflict: 'user_id,currency' });
    }
    console.log(`✅ Created wallets for ${users.length} users`);

    // Step 4: Create clubs
    console.log('🏆 Step 4: Creating clubs...');
    const clubs = [
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        name: 'Premier League Predictions',
        description: 'The ultimate destination for Premier League football predictions. From title races to relegation battles, predict it all!',
        owner_id: users[0]?.id,
        visibility: 'public',
        tags: ['sports', 'football', 'premier-league', 'england'],
        member_count: 0,
      },
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        name: 'Crypto & Web3 Predictions',
        description: 'Predict cryptocurrency prices, DeFi trends, NFT markets, and blockchain developments. Stay ahead of the crypto curve!',
        owner_id: users[0]?.id,
        visibility: 'public',
        tags: ['crypto', 'finance', 'blockchain', 'web3', 'defi'],
        member_count: 0,
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        name: 'Nigerian Entertainment Hub',
        description: 'Predict Big Brother Naija winners, Nollywood box office hits, music chart toppers, and celebrity events in Nigeria!',
        owner_id: users[0]?.id,
        visibility: 'public',
        tags: ['entertainment', 'nigeria', 'bbnaija', 'nollywood', 'music'],
        member_count: 0,
      },
      {
        id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        name: 'Esports & Gaming Arena',
        description: 'Predict esports tournament winners, game releases, streaming trends, and gaming industry developments worldwide!',
        owner_id: users[0]?.id,
        visibility: 'public',
        tags: ['esports', 'gaming', 'tournaments', 'streaming', 'competitive'],
        member_count: 0,
      },
      {
        id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        name: 'Global Politics & Elections',
        description: 'Predict election outcomes, policy changes, international relations, and political developments around the world!',
        owner_id: users[0]?.id,
        visibility: 'public',
        tags: ['politics', 'elections', 'government', 'international', 'policy'],
        member_count: 0,
      },
    ];

    for (const club of clubs) {
      const { error: clubError } = await supabase
        .from('clubs')
        .upsert(club, { onConflict: 'id' });

      if (clubError) {
        console.error(`❌ Error creating club ${club.name}:`, clubError.message);
      } else {
        console.log(`✅ Created club: ${club.name}`);
      }
    }

    // Step 5: Create predictions
    console.log('🎯 Step 5: Creating predictions...');
    const predictions = [
      {
        id: 'pred1111-1111-1111-1111-111111111111',
        creator_id: users[0]?.id,
        title: 'Will Manchester City win the 2024-25 Premier League?',
        description: 'Manchester City has been dominant in recent years. Can they secure another Premier League title this season?',
        category: 'sports',
        type: 'binary',
        status: 'open',
        stake_min: 100.00,
        stake_max: 10000.00,
        entry_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        settlement_method: 'manual',
        club_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        tags: ['football', 'premier-league', 'manchester-city', 'england'],
        pool_total: 0,
      },
      {
        id: 'pred2222-2222-2222-2222-222222222222',
        creator_id: users[0]?.id,
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
        pool_total: 0,
      },
      {
        id: 'pred3333-3333-3333-3333-333333333333',
        creator_id: users[0]?.id,
        title: 'Big Brother Naija Season 10 Winner',
        description: 'Who will be crowned the winner of Big Brother Naija Season 10?',
        category: 'entertainment',
        type: 'multi_outcome',
        status: 'open',
        stake_min: 25.00,
        stake_max: 2000.00,
        entry_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        settlement_method: 'manual',
        club_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        tags: ['bbnaija', 'reality-tv', 'nigeria', 'season-10'],
        pool_total: 0,
      },
      {
        id: 'pred4444-4444-4444-4444-444444444444',
        creator_id: users[0]?.id,
        title: 'League of Legends Worlds 2025 Champion',
        description: 'Which region will win the League of Legends World Championship 2025?',
        category: 'esports',
        type: 'multi_outcome',
        status: 'open',
        stake_min: 20.00,
        stake_max: 1000.00,
        entry_deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        settlement_method: 'auto',
        club_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        tags: ['league-of-legends', 'worlds', 'esports', '2025'],
        pool_total: 0,
      },
      {
        id: 'pred5555-5555-5555-5555-555555555555',
        creator_id: users[0]?.id,
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
        pool_total: 0,
      },
    ];

    for (const prediction of predictions) {
      const { error: predError } = await supabase
        .from('predictions')
        .upsert(prediction, { onConflict: 'id' });

      if (predError) {
        console.error(`❌ Error creating prediction ${prediction.title}:`, predError.message);
      } else {
        console.log(`✅ Created prediction: ${prediction.title}`);
      }
    }

    // Step 6: Create prediction options
    console.log('📊 Step 6: Creating prediction options...');
    const options = [
      // Premier League
      { prediction_id: 'pred1111-1111-1111-1111-111111111111', label: 'Yes', total_staked: 1500.00, current_odds: 1.8 },
      { prediction_id: 'pred1111-1111-1111-1111-111111111111', label: 'No', total_staked: 2300.00, current_odds: 1.2 },
      // Bitcoin
      { prediction_id: 'pred2222-2222-2222-2222-222222222222', label: 'Yes', total_staked: 3200.00, current_odds: 2.1 },
      { prediction_id: 'pred2222-2222-2222-2222-222222222222', label: 'No', total_staked: 1800.00, current_odds: 2.8 },
      // BBNaija
      { prediction_id: 'pred3333-3333-3333-3333-333333333333', label: 'Male Contestant', total_staked: 800.00, current_odds: 3.2 },
      { prediction_id: 'pred3333-3333-3333-3333-333333333333', label: 'Female Contestant', total_staked: 1200.00, current_odds: 2.1 },
      { prediction_id: 'pred3333-3333-3333-3333-333333333333', label: 'Wildcard Entry', total_staked: 600.00, current_odds: 4.3 },
      // LoL Worlds
      { prediction_id: 'pred4444-4444-4444-4444-444444444444', label: 'Korea (LCK)', total_staked: 2500.00, current_odds: 1.5 },
      { prediction_id: 'pred4444-4444-4444-4444-444444444444', label: 'China (LPL)', total_staked: 1800.00, current_odds: 2.1 },
      { prediction_id: 'pred4444-4444-4444-4444-444444444444', label: 'Europe (LEC)', total_staked: 1200.00, current_odds: 3.1 },
      { prediction_id: 'pred4444-4444-4444-4444-444444444444', label: 'North America (LCS)', total_staked: 900.00, current_odds: 4.2 },
      // US Election
      { prediction_id: 'pred5555-5555-5555-5555-555555555555', label: 'Yes', total_staked: 5000.00, current_odds: 1.9 },
      { prediction_id: 'pred5555-5555-5555-5555-555555555555', label: 'No', total_staked: 4200.00, current_odds: 2.2 },
    ];

    for (const option of options) {
      const { error: optError } = await supabase
        .from('prediction_options')
        .upsert(option, { onConflict: 'prediction_id,label' });

      if (optError) {
        console.error(`❌ Error creating option ${option.label}:`, optError.message);
      }
    }
    console.log(`✅ Created ${options.length} prediction options`);

    // Step 7: Update pool totals
    console.log('💰 Step 7: Updating pool totals...');
    for (const prediction of predictions) {
      const { data: options } = await supabase
        .from('prediction_options')
        .select('total_staked')
        .eq('prediction_id', prediction.id);

      const totalPool = options?.reduce((sum, opt) => sum + opt.total_staked, 0) || 0;

      await supabase
        .from('predictions')
        .update({ pool_total: totalPool })
        .eq('id', prediction.id);
    }

    // Step 8: Create comments and reactions
    console.log('💬 Step 8: Creating comments and reactions...');
    const comments = [
      { prediction_id: 'pred1111-1111-1111-1111-111111111111', user_id: users[0]?.id, content: 'Man City has the strongest squad depth in the league. Pep Guardiola knows how to win titles!' },
      { prediction_id: 'pred2222-2222-2222-2222-222222222222', user_id: users[0]?.id, content: 'Bitcoin halving in 2024 + institutional adoption = $100k+ by 2025!' },
      { prediction_id: 'pred3333-3333-3333-3333-333333333333', user_id: users[0]?.id, content: 'This season has some really interesting housemates. The drama is going to be intense!' },
    ];

    for (const comment of comments) {
      await supabase.from('comments').insert(comment);
    }

    const reactions = [
      { prediction_id: 'pred1111-1111-1111-1111-111111111111', user_id: users[0]?.id, type: 'like' },
      { prediction_id: 'pred2222-2222-2222-2222-222222222222', user_id: users[0]?.id, type: 'fire' },
      { prediction_id: 'pred3333-3333-3333-3333-333333333333', user_id: users[0]?.id, type: 'thinking' },
    ];

    for (const reaction of reactions) {
      await supabase.from('reactions').insert(reaction);
    }

    // Step 9: Create transactions
    console.log('💳 Step 9: Creating transactions...');
    for (const user of users) {
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'deposit',
        currency: 'NGN',
        amount: Math.floor(Math.random() * 50000) + 10000,
        status: 'completed',
        description: 'Initial deposit',
        reference: `DEP_${Date.now()}_${user.id.slice(0, 8)}`,
      });
    }

    console.log('🎉 Production database seeding completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`- ${users.length} user profiles created`);
    console.log(`- ${users.length * 2} wallets created`);
    console.log(`- ${clubs.length} clubs created`);
    console.log(`- ${predictions.length} predictions created`);
    console.log(`- ${options.length} prediction options created`);
    console.log(`- ${comments.length} comments created`);
    console.log(`- ${reactions.length} reactions created`);
    console.log(`- ${users.length} transactions created`);
    console.log('');
    console.log('🌐 Your app now has real, contextually relevant data!');
    console.log('Visit: https://fan-club-z.vercel.app');

  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  }
}

// Run the seeding
seedProductionDatabase(); 