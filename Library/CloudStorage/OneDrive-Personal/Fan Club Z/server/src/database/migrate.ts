import { db, testConnection } from './config.js'

async function runMigrations() {
  try {
    console.log('🔄 Testing database connection...')
    const isConnected = await testConnection()
    
    if (!isConnected) {
      console.error('❌ Cannot connect to database. Please check your configuration.')
      process.exit(1)
    }

    console.log('🔄 Running database migrations...')
    
    // Run migrations
    await db.migrate.latest()
    
    console.log('✅ Database migrations completed successfully!')
    
    // Get migration status
    const batchNo = await db.migrate.status()
    console.log(`📊 Migration status: Batch ${batchNo}`)
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await db.destroy()
  }
}

runMigrations()

export default runMigrations 