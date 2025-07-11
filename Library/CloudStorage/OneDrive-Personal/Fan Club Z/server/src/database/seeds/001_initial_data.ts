import { db } from '../config.js'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

export async function seed(knex: any) {
  // Clear existing data
  await knex('transactions').del()
  await knex('bet_entries').del()
  await knex('bets').del()
  await knex('clubs').del()
  await knex('users').del()

  console.log('🌱 Seeding initial data...')

  // Generate UUIDs for all users, clubs, and bets
  const demoUserId = uuidv4();
  const user1Id = uuidv4();
  const user2Id = uuidv4();
  const user3Id = uuidv4();
  const club1Id = uuidv4();
  const club2Id = uuidv4();
  const club3Id = uuidv4();
  const bet1Id = uuidv4();
  const bet2Id = uuidv4();
  const bet3Id = uuidv4();
  const entry1Id = uuidv4();
  const entry2Id = uuidv4();
  const entry3Id = uuidv4();
  const tx1Id = uuidv4();
  const tx2Id = uuidv4();

  // Create demo users
  const demoPassword = await bcrypt.hash('demo123', 10)
  const testPassword = await bcrypt.hash('password123', 10)

  const users = [
    {
      id: demoUserId,
      email: 'demo@fanclubz.app',
      username: 'demouser',
      password_hash: demoPassword,
      first_name: 'Demo',
      last_name: 'User',
      phone: '+1234567890',
      wallet_address: '0x' + '0'.repeat(40),
      kyc_level: 'verified',
      wallet_balance: 2500,
      profile_image_url: null,
      cover_image_url: null,
      bio: 'Demo user for testing Fan Club Z features',
      is_active: true,
      is_verified: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: user1Id,
      email: 'alex@example.com',
      username: 'alexj',
      password_hash: testPassword,
      first_name: 'Alex',
      last_name: 'Johnson',
      phone: '+1234567891',
      wallet_address: '0x' + Math.random().toString(16).substr(2, 40),
      kyc_level: 'basic',
      wallet_balance: 1200,
      profile_image_url: null,
      cover_image_url: null,
      bio: 'Sports betting enthusiast',
      is_active: true,
      is_verified: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: user2Id,
      email: 'sarah@example.com',
      username: 'sarahc',
      password_hash: testPassword,
      first_name: 'Sarah',
      last_name: 'Chen',
      phone: '+1234567892',
      wallet_address: '0x' + Math.random().toString(16).substr(2, 40),
      kyc_level: 'basic',
      wallet_balance: 800,
      profile_image_url: null,
      cover_image_url: null,
      bio: 'Crypto and pop culture fan',
      is_active: true,
      is_verified: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: user3Id,
      email: 'mike@example.com',
      username: 'miket',
      password_hash: testPassword,
      first_name: 'Mike',
      last_name: 'Thompson',
      phone: '+1234567893',
      wallet_address: '0x' + Math.random().toString(16).substr(2, 40),
      kyc_level: 'basic',
      wallet_balance: 1500,
      profile_image_url: null,
      cover_image_url: null,
      bio: 'Political betting specialist',
      is_active: true,
      is_verified: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]

  await knex('users').insert(users)
  console.log('✅ Created users')

  // Create clubs
  const clubs = [
    {
      id: club1Id,
      name: 'Premier League Predictors',
      description: 'The ultimate destination for Premier League betting and predictions',
      category: 'sports',
      creator_id: user1Id,
      member_count: 1247,
      is_private: false,
      image_url: '⚽',
      rules: 'Be respectful, no spam, only Premier League related bets.',
      settings: JSON.stringify({ allowPublicBets: true, requireApproval: false }),
      is_active: true,
      created_at: new Date('2025-06-15T10:00:00Z'),
      updated_at: new Date('2025-07-04T15:45:00Z')
    },
    {
      id: club2Id,
      name: 'Crypto Bulls',
      description: 'Betting on cryptocurrency prices and market movements',
      category: 'crypto',
      creator_id: user2Id,
      member_count: 892,
      is_private: false,
      image_url: '₿',
      rules: 'Only crypto-related bets. No financial advice.',
      settings: JSON.stringify({ allowPublicBets: true, requireApproval: true }),
      is_active: true,
      created_at: new Date('2025-06-20T14:30:00Z'),
      updated_at: new Date('2025-07-04T12:00:00Z')
    },
    {
      id: club3Id,
      name: 'Pop Culture Central',
      description: 'Celebrity drama, award shows, and entertainment bets',
      category: 'pop',
      creator_id: user3Id,
      member_count: 567,
      is_private: false,
      image_url: '🎭',
      rules: 'Keep it fun and respectful. No personal attacks.',
      settings: JSON.stringify({ allowPublicBets: true, requireApproval: false }),
      is_active: true,
      created_at: new Date('2025-06-25T09:15:00Z'),
      updated_at: new Date('2025-07-04T10:30:00Z')
    }
  ]

  await knex('clubs').insert(clubs)
  console.log('✅ Created clubs')

  // Create bets
  const bets = [
    {
      id: bet1Id,
      creator_id: user1Id,
      title: 'Will Bitcoin reach $100K by end of 2025?',
      description: 'Bitcoin has been on a bull run. Will it hit the magical 100K mark by December 31st, 2025?',
      type: 'binary',
      category: 'crypto',
      options: JSON.stringify([
        { id: 'yes', label: 'Yes', totalStaked: 15000 },
        { id: 'no', label: 'No', totalStaked: 8500 }
      ]),
      status: 'open',
      stake_min: 10,
      stake_max: 1000,
      pool_total: 23500,
      entry_deadline: '2025-12-31T23:59:59Z',
      settlement_method: 'auto',
      is_private: false,
      club_id: club2Id,
      likes_count: 234,
      comments_count: 67,
      shares_count: 89,
      entries_count: 45,
      created_at: new Date('2025-07-01T10:30:00Z'),
      updated_at: new Date('2025-07-04T15:45:00Z')
    },
    {
      id: bet2Id,
      creator_id: user2Id,
      title: 'Premier League: Man City vs Arsenal - Who wins?',
      description: 'The title race is heating up! City and Arsenal face off.',
      type: 'multi',
      category: 'sports',
      options: JSON.stringify([
        { id: 'city', label: 'Man City', totalStaked: 12000 },
        { id: 'arsenal', label: 'Arsenal', totalStaked: 9000 },
        { id: 'draw', label: 'Draw', totalStaked: 4000 }
      ]),
      status: 'open',
      stake_min: 5,
      stake_max: 500,
      pool_total: 25000,
      entry_deadline: '2025-07-15T14:00:00Z',
      settlement_method: 'auto',
      is_private: false,
      club_id: club1Id,
      likes_count: 445,
      comments_count: 123,
      shares_count: 67,
      entries_count: 78,
      created_at: new Date('2025-07-02T09:15:00Z'),
      updated_at: new Date('2025-07-04T16:20:00Z')
    },
    {
      id: bet3Id,
      creator_id: user3Id,
      title: 'Taylor Swift announces surprise album?',
      description: 'Swifties are convinced she\'s dropping hints. Will T-Swift surprise us this month?',
      type: 'binary',
      category: 'pop',
      options: JSON.stringify([
        { id: 'yes', label: 'Yes, she will', totalStaked: 6500 },
        { id: 'no', label: 'No announcement', totalStaked: 4200 }
      ]),
      status: 'open',
      stake_min: 1,
      stake_max: 100,
      pool_total: 10700,
      entry_deadline: '2025-07-31T23:59:59Z',
      settlement_method: 'manual',
      is_private: false,
      club_id: club3Id,
      likes_count: 156,
      comments_count: 89,
      shares_count: 234,
      entries_count: 23,
      created_at: new Date('2025-07-03T14:22:00Z'),
      updated_at: new Date('2025-07-04T11:18:00Z')
    }
  ]

  await knex('bets').insert(bets)
  console.log('✅ Created bets')

  // Create some bet entries
  const betEntries = [
    {
      id: entry1Id,
      bet_id: bet1Id,
      user_id: demoUserId,
      selected_option: 'yes',
      stake_amount: 100,
      potential_winnings: 156.67,
      status: 'active',
      created_at: new Date('2025-07-01T11:00:00Z'),
      updated_at: new Date('2025-07-01T11:00:00Z')
    },
    {
      id: entry2Id,
      bet_id: bet2Id,
      user_id: demoUserId,
      selected_option: 'city',
      stake_amount: 50,
      potential_winnings: 104.17,
      status: 'active',
      created_at: new Date('2025-07-02T10:00:00Z'),
      updated_at: new Date('2025-07-02T10:00:00Z')
    },
    {
      id: entry3Id,
      bet_id: bet3Id,
      user_id: user1Id,
      selected_option: 'no',
      stake_amount: 25,
      potential_winnings: 38.69,
      status: 'active',
      created_at: new Date('2025-07-03T15:00:00Z'),
      updated_at: new Date('2025-07-03T15:00:00Z')
    }
  ]

  await knex('bet_entries').insert(betEntries)
  console.log('✅ Created bet entries')

  // Create some transactions
  const transactions = [
    {
      id: tx1Id,
      user_id: demoUserId,
      type: 'deposit',
      amount: 2500,
      balance_before: 0,
      balance_after: 2500,
      status: 'completed',
      reference_id: 'demo-deposit-001',
      description: 'Initial demo account funding',
      metadata: JSON.stringify({ source: 'demo_account' }),
      processed_at: new Date('2025-07-01T10:00:00Z'),
      created_at: new Date('2025-07-01T10:00:00Z'),
      updated_at: new Date('2025-07-01T10:00:00Z')
    },
    {
      id: tx2Id,
      user_id: demoUserId,
      type: 'bet_placed',
      amount: -100,
      balance_before: 2500,
      balance_after: 2400,
      status: 'completed',
      reference_id: entry1Id,
      description: 'Bet placed on Bitcoin $100K prediction',
      metadata: JSON.stringify({ betId: bet1Id, option: 'yes' }),
      processed_at: new Date('2025-07-01T11:00:00Z'),
      created_at: new Date('2025-07-01T11:00:00Z'),
      updated_at: new Date('2025-07-01T11:00:00Z')
    }
  ]

  await knex('transactions').insert(transactions)
  console.log('✅ Created transactions')

  console.log('🎉 Database seeding completed successfully!')
}

(async () => {
  try {
    await seed(db)
    console.log('🌱 Seeding complete!')
    process.exit(0)
  } catch (err) {
    console.error('❌ Seeding failed:', err)
    process.exit(1)
  }
})(); 