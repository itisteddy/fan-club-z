#!/usr/bin/env node

/**
 * Simple database setup script using direct knex configuration
 */

import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'
import knex from 'knex'

console.log('🗄️ Fan Club Z - Database Setup')
console.log('===============================')

// Simple database configuration
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './dev.db'
  },
  useNullAsDefault: true
})

async function setupDemoUser() {
  try {
    console.log('🔍 Checking for existing demo user...')
    
    // Check if demo user already exists
    const existingUser = await db('users')
      .where('email', 'fausty@fcz.app')
      .first()
    
    if (existingUser) {
      console.log('✅ Demo user already exists:', existingUser.email)
      console.log('   User ID:', existingUser.id)
      console.log('   Username:', existingUser.username)
      console.log('   Wallet Balance:', existingUser.wallet_balance)
      return existingUser
    }
    
    console.log('👤 Creating demo user...')
    
    // Hash the demo password
    const hashedPassword = await bcrypt.hash('demo123', 10)
    
    // Create demo user
    const [user] = await db('users')
      .insert({
        id: uuidv4(),
        email: 'fausty@fcz.app',
        username: 'fausty',
        password_hash: hashedPassword,
        first_name: 'Demo',
        last_name: 'User',
        phone: '+1 (555) 123-4567',
        date_of_birth: '1990-01-01',
        wallet_address: '0x' + Math.random().toString(16).substr(2, 40),
        kyc_level: 'enhanced',
        wallet_balance: 500, // $500 starting balance
        bio: 'Demo account for testing Fan Club Z features',
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*')
    
    console.log('✅ Demo user created successfully!')
    console.log('   Email: fausty@fcz.app')
    console.log('   Password: demo123')
    console.log('   User ID:', user.id)
    console.log('   Starting Balance: $500')
    
    return user
    
  } catch (error) {
    console.error('❌ Error setting up demo user:', error)
    throw error
  }
}

async function checkDatabase() {
  try {
    console.log('🔍 Checking database connection...')
    
    // Test basic connection
    const result = await db.raw('SELECT 1 as test')
    console.log('✅ Database connection successful')
    
    // Check if users table exists
    const tables = await db.raw("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    
    if (tables.length === 0) {
      console.log('❌ Users table does not exist')
      console.log('   Please run database migrations first:')
      console.log('   npm run build && npm run db:migrate')
      return false
    }
    
    console.log('✅ Users table exists')
    
    // Count total users
    const userCount = await db('users').count('* as count').first()
    console.log(`📊 Total users in database: ${userCount.count}`)
    
    return true
    
  } catch (error) {
    console.error('❌ Database check failed:', error)
    return false
  }
}

async function main() {
  try {
    // Check database first
    const dbOk = await checkDatabase()
    if (!dbOk) {
      console.log('\n❌ Database setup failed. Please check your database configuration.')
      console.log('\n🔧 Try running:')
      console.log('   npm run build')
      console.log('   npm run db:migrate')
      console.log('   npm run db:seed')
      process.exit(1)
    }
    
    // Setup demo user
    await setupDemoUser()
    
    console.log('\n🎉 Database setup complete!')
    console.log('\n📋 Demo Login Credentials:')
    console.log('   Email: fausty@fcz.app')
    console.log('   Password: demo123')
    console.log('\n🚀 Ready to test login!')
    
  } catch (error) {
    console.error('\n💥 Setup failed:', error)
    console.log('\n🔧 This might help:')
    console.log('   1. Check that dev.db file exists')
    console.log('   2. Run: npm run build')
    console.log('   3. Run: npm run db:migrate')
    console.log('   4. Try this script again')
    process.exit(1)
  } finally {
    // Close database connection
    await db.destroy()
  }
}

main()
