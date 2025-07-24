#!/usr/bin/env node

// Script to setup demo data and test the betting functionality
// Note: Run this from the server directory where node_modules exist
const { v4: uuidv4 } = require('uuid')
const knex = require('knex')

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './server/dev.db'
  },
  useNullAsDefault: true
})

async function setupDemoData() {
  console.log('🚀 Setting up demo betting data...')
  
  try {
    // Create demo users if they don't exist
    console.log('1. Creating demo users...')
    
    // Check if demo user exists
    const existingUser = await db('users').where('email', 'demo@fanclubz.app').first()
    let demoUserId = null
    
    if (!existingUser) {
      console.log('Creating new demo user...')
      const [user] = await db('users').insert({
        id: uuidv4(),
        email: 'demo@fanclubz.app',
        username: 'demo_user',
        password_hash: '$2b$10$demo.hash.placeholder',
        first_name: 'Demo',
        last_name: 'User',
        phone: '+1234567890',
        date_of_birth: '1990-01-01',
        wallet_address: '0xDemoWallet123',
        kyc_level: 'enhanced',
        wallet_balance: 1000.00, // Give demo user $1000
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*')
      demoUserId = user.id
      console.log('✅ Demo user created with ID:', demoUserId)
    } else {
      demoUserId = existingUser.id
      console.log('✅ Demo user already exists with ID:', demoUserId)
    }
    
    // Create demo bets
    console.log('2. Creating demo bets...')
    
    // Check if bets already exist
    const existingBets = await db('bets').count('* as count').first()
    const betCount = existingBets ? existingBets.count : 0
    
    if (betCount === 0) {
      console.log('Creating demo bets...')
      
      const demoBets = [
        {
          id: uuidv4(),
          creator_id: demoUserId,
          title: 'Will Bitcoin reach $100K by end of 2025?',
          description: 'Bitcoin has been on a bull run throughout 2024 and early 2025. With institutional adoption increasing, many analysts predict BTC could hit the magical $100,000 mark.',
          type: 'binary',
          category: 'crypto',
          options: JSON.stringify([
            { id: 'yes', label: 'Yes, it will reach $100K', totalStaked: 15000 },
            { id: 'no', label: 'No, it will stay below $100K', totalStaked: 8500 }
          ]),
          status: 'open',
          stake_min: 10.00,
          stake_max: 1000.00,
          pool_total: 23500.00,
          entry_deadline: new Date('2025-12-31T23:59:59Z').toISOString(),
          settlement_method: 'auto',
          is_private: false,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: uuidv4(),
          creator_id: demoUserId,
          title: 'Premier League: Man City vs Arsenal - Who wins?',
          description: 'The title race is heating up! City and Arsenal face off in what could be the decisive match of the season.',
          type: 'multi',
          category: 'sports',
          options: JSON.stringify([
            { id: 'city', label: 'Man City', totalStaked: 12000 },
            { id: 'arsenal', label: 'Arsenal', totalStaked: 9000 },
            { id: 'draw', label: 'Draw', totalStaked: 4000 }
          ]),
          status: 'open',
          stake_min: 5.00,
          stake_max: 500.00,
          pool_total: 25000.00,
          entry_deadline: new Date('2025-07-30T14:00:00Z').toISOString(),
          settlement_method: 'auto',
          is_private: false,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: uuidv4(),
          creator_id: demoUserId,
          title: 'Taylor Swift announces surprise album?',
          description: 'Swifties are convinced she\'s dropping hints about a new album. Will T-Swift surprise us with an announcement this month?',
          type: 'binary',
          category: 'entertainment',
          options: JSON.stringify([
            { id: 'yes', label: 'Yes, she will', totalStaked: 6500 },
            { id: 'no', label: 'No announcement', totalStaked: 4200 }
          ]),
          status: 'open',
          stake_min: 1.00,
          stake_max: 100.00,
          pool_total: 10700.00,
          entry_deadline: new Date('2025-07-31T23:59:59Z').toISOString(),
          settlement_method: 'manual',
          is_private: false,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]
      
      await db('bets').insert(demoBets)
      console.log('✅ Demo bets created successfully')
    } else {
      console.log(`✅ ${betCount} bets already exist in database`)
    }
    
    console.log('3. Testing database schema...')
    
    // Test bet_entries table structure
    const betEntriesColumns = await db.raw('PRAGMA table_info(bet_entries)')
    console.log('Bet entries columns:', betEntriesColumns.map(col => col.name))
    
    // Test transactions table structure
    const transactionsColumns = await db.raw('PRAGMA table_info(transactions)')
    console.log('Transactions columns:', transactionsColumns.map(col => col.name))
    
    console.log('✅ Demo data setup complete!')
    console.log('')
    console.log('🧪 You can now test bet placement with:')
    console.log('- Email: demo@fanclubz.app')
    console.log('- Password: demo123 (any password will work)')
    console.log('- Initial balance: $1000')
    console.log('')
    
  } catch (error) {
    console.error('❌ Error setting up demo data:', error)
  } finally {
    await db.destroy()
  }
}

setupDemoData()
