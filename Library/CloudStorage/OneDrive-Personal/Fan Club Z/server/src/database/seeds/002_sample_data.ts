import { Knex } from 'knex'

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data
  await knex('user_interactions').del()
  await knex('club_memberships').del()
  await knex('user_stats').del()
  await knex('bet_entries').del()
  await knex('bets').del()
  await knex('clubs').del()

  // Create sample clubs
  const clubs = await knex('clubs').insert([
    {
      name: 'Sports Enthusiasts',
      description: 'A club for sports betting enthusiasts',
      category: 'sports',
      creator_id: 'demo-user-id',
      member_count: 5,
      is_private: false,
      image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
      rules: 'Be respectful and follow sports betting guidelines',
      is_active: true
    },
    {
      name: 'Crypto Traders',
      description: 'Cryptocurrency betting and trading discussions',
      category: 'crypto',
      creator_id: 'demo-user-id',
      member_count: 3,
      is_private: false,
      image_url: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400',
      rules: 'Share insights and predictions responsibly',
      is_active: true
    },
    {
      name: 'Pop Culture Fans',
      description: 'Betting on entertainment and pop culture events',
      category: 'pop',
      creator_id: 'demo-user-id',
      member_count: 2,
      is_private: false,
      image_url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400',
      rules: 'Keep it fun and family-friendly',
      is_active: true
    }
  ]).returning('*')

  // Create sample bets
  const bets = await knex('bets').insert([
    {
      creator_id: 'demo-user-id',
      title: 'Will Bitcoin reach $100K by end of 2024?',
      description: 'Bitcoin has been showing strong momentum. Will it break the $100K barrier?',
      type: 'binary',
      category: 'crypto',
      options: JSON.stringify([
        { id: 'yes', label: 'Yes', odds: 2.5 },
        { id: 'no', label: 'No', odds: 1.8 }
      ]),
      status: 'open',
      stake_min: 10,
      stake_max: 1000,
      pool_total: 2500,
      entry_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      settlement_method: 'auto',
      is_private: false,
      club_id: clubs[1].id, // Crypto Traders club
      likes_count: 15,
      comments_count: 8,
      shares_count: 3,
      entries_count: 12
    },
    {
      creator_id: 'demo-user-id',
      title: 'Manchester City vs Arsenal - Who wins the title race?',
      description: 'Premier League title race heating up between these two giants',
      type: 'multi',
      category: 'sports',
      options: JSON.stringify([
        { id: 'city', label: 'Manchester City', odds: 1.9 },
        { id: 'arsenal', label: 'Arsenal', odds: 2.1 },
        { id: 'other', label: 'Other Team', odds: 15.0 }
      ]),
      status: 'open',
      stake_min: 5,
      stake_max: 500,
      pool_total: 1800,
      entry_deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      settlement_method: 'auto',
      is_private: false,
      club_id: clubs[0].id, // Sports Enthusiasts club
      likes_count: 22,
      comments_count: 12,
      shares_count: 5,
      entries_count: 18
    },
    {
      creator_id: 'demo-user-id',
      title: 'Oscars 2024 - Best Picture Winner',
      description: 'Who will take home the Academy Award for Best Picture?',
      type: 'multi',
      category: 'pop',
      options: JSON.stringify([
        { id: 'oppenheimer', label: 'Oppenheimer', odds: 1.5 },
        { id: 'barbie', label: 'Barbie', odds: 8.0 },
        { id: 'killers', label: 'Killers of the Flower Moon', odds: 12.0 },
        { id: 'other', label: 'Other', odds: 25.0 }
      ]),
      status: 'settled',
      stake_min: 5,
      stake_max: 200,
      pool_total: 1200,
      entry_deadline: new Date('2024-03-10'),
      settlement_method: 'manual',
      is_private: false,
      club_id: clubs[2].id, // Pop Culture Fans club
      likes_count: 8,
      comments_count: 4,
      shares_count: 2,
      entries_count: 6,
      settled_at: new Date('2024-03-11'),
      settled_by: 'demo-user-id'
    }
  ]).returning('*')

  // Create sample bet entries
  const betEntries = await knex('bet_entries').insert([
    // Bitcoin bet entries
    {
      bet_id: bets[0].id,
      user_id: 'demo-user-id',
      selected_option: 'yes',
      stake_amount: 100,
      potential_winnings: 250,
      status: 'active'
    },
    {
      bet_id: bets[0].id,
      user_id: 'demo-user-id',
      selected_option: 'no',
      stake_amount: 50,
      potential_winnings: 90,
      status: 'active'
    },
    // Football bet entries
    {
      bet_id: bets[1].id,
      user_id: 'demo-user-id',
      selected_option: 'city',
      stake_amount: 75,
      potential_winnings: 142.5,
      status: 'active'
    },
    {
      bet_id: bets[1].id,
      user_id: 'demo-user-id',
      selected_option: 'arsenal',
      stake_amount: 60,
      potential_winnings: 126,
      status: 'active'
    },
    // Oscars bet entries (settled)
    {
      bet_id: bets[2].id,
      user_id: 'demo-user-id',
      selected_option: 'oppenheimer',
      stake_amount: 25,
      potential_winnings: 37.5,
      status: 'won',
      winnings_paid: 37.5,
      paid_at: new Date('2024-03-11')
    },
    {
      bet_id: bets[2].id,
      user_id: 'demo-user-id',
      selected_option: 'barbie',
      stake_amount: 15,
      potential_winnings: 120,
      status: 'lost',
      winnings_paid: 0
    }
  ]).returning('*')

  // Create club memberships
  await knex('club_memberships').insert([
    {
      club_id: clubs[0].id,
      user_id: 'demo-user-id',
      role: 'member',
      status: 'active',
      joined_at: new Date('2024-01-15')
    },
    {
      club_id: clubs[1].id,
      user_id: 'demo-user-id',
      role: 'admin',
      status: 'active',
      joined_at: new Date('2024-02-01')
    },
    {
      club_id: clubs[2].id,
      user_id: 'demo-user-id',
      role: 'member',
      status: 'active',
      joined_at: new Date('2024-02-20')
    }
  ])

  // Create user interactions
  await knex('user_interactions').insert([
    {
      from_user_id: 'other-user-1',
      to_user_id: 'demo-user-id',
      type: 'like',
      bet_id: bets[0].id
    },
    {
      from_user_id: 'other-user-2',
      to_user_id: 'demo-user-id',
      type: 'like',
      bet_id: bets[1].id
    },
    {
      from_user_id: 'other-user-3',
      to_user_id: 'demo-user-id',
      type: 'comment',
      bet_id: bets[0].id,
      content: 'Great analysis on Bitcoin!'
    },
    {
      from_user_id: 'other-user-1',
      to_user_id: 'demo-user-id',
      type: 'share',
      bet_id: bets[1].id
    },
    {
      from_user_id: 'other-user-2',
      to_user_id: 'demo-user-id',
      type: 'reputation_vote',
      bet_id: bets[0].id,
      rating: 5
    },
    {
      from_user_id: 'other-user-3',
      to_user_id: 'demo-user-id',
      type: 'reputation_vote',
      bet_id: bets[1].id,
      rating: 4
    }
  ])

  // Create user stats
  await knex('user_stats').insert({
    user_id: 'demo-user-id',
    total_bets: 6,
    active_bets: 4,
    won_bets: 1,
    lost_bets: 1,
    cancelled_bets: 0,
    total_staked: 325,
    total_won: 37.5,
    total_lost: 15,
    net_profit: 22.5,
    win_rate: 50.0, // 1 win out of 2 settled bets
    clubs_joined: 3,
    bets_created: 3,
    total_likes_received: 2,
    total_comments_received: 1,
    total_shares_received: 1,
    reputation_score: 4.5, // Average of 5 and 4
    reputation_votes: 2,
    current_win_streak: 1,
    longest_win_streak: 1,
    current_loss_streak: 0,
    longest_loss_streak: 1,
    last_bet_at: new Date('2024-03-11'),
    last_win_at: new Date('2024-03-11'),
    last_login_at: new Date()
  })

  console.log('✅ Sample data seeded successfully!')
} 