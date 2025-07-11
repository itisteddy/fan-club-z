import knex from 'knex'
import { config } from '../config.js'

// Determine database client based on connection string
const getClient = (connectionString: string): string => {
  if (connectionString.startsWith('sqlite3:')) {
    return 'sqlite3'
  }
  return 'postgresql'
}

const getConnection = (connectionString: string) => {
  if (connectionString.startsWith('sqlite3:')) {
    // Extract file path from sqlite3:./dev.db
    const filePath = connectionString.replace('sqlite3:', '')
    return {
      filename: filePath
    }
  }
  
  return {
    connectionString: connectionString,
    ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false
  }
}

const sharedConfig = {
  client: getClient(config.databaseUrl),
  connection: getConnection(config.databaseUrl),
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    directory: './dist/server/src/database/migrations'
  },
  seeds: {
    directory: './dist/server/src/database/seeds'
  },
  useNullAsDefault: true // Required for SQLite
}

const dbConfigs = {
  development: sharedConfig,
  production: {
    ...sharedConfig,
    pool: { min: 2, max: 20 }
  }
}

const dbConfig = dbConfigs[config.nodeEnv as keyof typeof dbConfigs]

if (!dbConfig) {
  throw new Error(`Database configuration not found for environment: ${config.nodeEnv}`)
}

export const db = knex(dbConfig)

// Test database connection
export async function testConnection() {
  try {
    await db.raw('SELECT 1')
    console.log('✅ Database connection successful')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

// Graceful shutdown
export async function closeConnection() {
  try {
    await db.destroy()
    console.log('✅ Database connection closed')
  } catch (error) {
    console.error('❌ Error closing database connection:', error)
  }
}

export default db 