// Load environment variables from .env file FIRST
import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import { networkInterfaces } from 'os'
import router from './routes.js'
import { testConnection, closeConnection } from './database/config.js'
import { config, validateConfig } from './config.js'
import { notificationService } from './services/notificationService.js'
import { generalLimiter } from './middleware/rateLimit.js'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import jwt from 'jsonwebtoken'
import { realtimeService } from './services/realtimeService.js'
import { databaseStorage } from './services/databaseStorage.js'

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any
    }
  }
}

// Helper function to get local IP address
function getLocalIP(): string {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      // Skip over non-IPv4 and internal addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address
      }
    }
  }
  return 'localhost'
}

// Validate configuration on startup
validateConfig()

const app = express()
const LOCAL_IP = getLocalIP()
const server = createServer(app)

// Create WebSocket server
const wss = new WebSocketServer({ server })

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Disable for development
}))

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://172.20.2.210:3000',
    'http://172.20.2.210:3001',
    'http://0.0.0.0:3000',
    ...(config.nodeEnv === 'development' ? ['*'] : [])
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Compression middleware
app.use(compression())

// Logging middleware
if (config.nodeEnv !== 'production') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined'))
}

// Apply general rate limiting to all API routes
app.use('/api', generalLimiter, router)

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const url = new URL(req.url!, `http://${req.headers.host}`)
  const path = url.pathname

  if (path === '/ws/notifications') {
    // Handle notification WebSocket
    const token = url.searchParams.get('token')
    if (token) {
      // For notifications, we need to handle the connection differently
      // since the notification service expects a different interface
      try {
        const decoded = jwt.verify(token, config.jwtSecret) as { userId: string }
        const userId = decoded.userId
        
        // Send welcome message
        notificationService.sendSystemNotification(userId, 'Connected', 'Real-time notifications enabled')
        
        console.log(`✅ Notification WebSocket authenticated for user: ${userId}`)
      } catch (error) {
        console.log('❌ Invalid token for notification WebSocket connection:', error)
        ws.close(1008, 'Invalid token')
      }
    } else {
      console.log('No token provided for notification WebSocket connection')
      ws.close(1008, 'No token provided')
    }
  } else if (path === '/ws/realtime') {
    // Handle realtime WebSocket
    const token = url.searchParams.get('token')
    if (token) {
      realtimeService.handleConnection(ws, token)
    } else {
      console.log('No token provided for realtime WebSocket connection')
      ws.close(1008, 'No token provided')
    }
  } else {
    console.log(`Unknown WebSocket path: ${path}`)
    ws.close(1008, 'Unknown path')
  }
})

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Fan Club Z API! 🚀',
    version: config.appVersion,
    environment: config.nodeEnv,
    docs: '/api/health'
  })
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      notifications: {
        connectedUsers: notificationService.getConnectedUsers(),
        connectionCount: notificationService.getConnectionCount()
      },
      realtime: realtimeService.getStats(),
      database: 'connected'
    }
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: [
      'GET /api/health',
      'POST /api/users/register',
      'POST /api/users/login',
      'GET /api/bets',
      'GET /api/clubs'
    ]
  })
})

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error)
  
  res.status(error.status || 500).json({
    success: false,
    error: config.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message,
    ...(config.nodeEnv !== 'production' && { stack: error.stack })
  })
})

// Initialize database
async function initializeDatabase() {
  try {
    await testConnection()
    console.log('✅ Database initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize database:', error)
    process.exit(1)
  }
}

// Start server
async function startServer() {
  await initializeDatabase()
  
  server.listen(config.port, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${config.port}`)
    console.log(`📱 Local: http://localhost:${config.port}`)
    console.log(`📱 Network: http://${LOCAL_IP}:${config.port}`)
    console.log(`📱 Client URL: http://172.20.2.210:3000`)
    console.log(`🔌 WebSocket endpoints:`)
    console.log(`   - Notifications: ws://localhost:${config.port}/ws/notifications`)
    console.log(`   - Realtime: ws://localhost:${config.port}/ws/realtime`)
    console.log(`📊 Health check: http://localhost:${config.port}/health`)
    console.log(`🌐 CORS Origins: http://172.20.2.210:3000, http://localhost:3000`)
  })
}

startServer().catch(console.error)

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

// Export for testing
export default app
