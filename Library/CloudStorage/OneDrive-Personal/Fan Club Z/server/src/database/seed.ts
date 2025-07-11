import { db, testConnection } from './config.js'
import { seed } from './seeds/001_initial_data.js'

async function runSeeds() {
  try {
    console.log('🔄 Testing database connection...')
    const isConnected = await testConnection()
    
    if (!isConnected) {
      console.error('❌ Cannot connect to database. Please check your configuration.')
      process.exit(1)
    }

    console.log('🌱 Running database seeds...')
    
    // Run seeds
    await seed(db)
    
    console.log('✅ Database seeding completed successfully!')
    
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await db.destroy()
  }
}

// Run seeds if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSeeds()
}

export default runSeeds 