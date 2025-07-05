import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import { networkInterfaces } from 'os'
import router from './routes.js'

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

const app = express()
const PORT = process.env.PORT || 5001
const LOCAL_IP = getLocalIP()

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Disable for development
}))

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://fanclubz.app', 'https://www.fanclubz.app']
    : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Compression middleware
app.use(compression())

// Logging middleware
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined'))
}

// API routes
app.use('/api', router)

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Fan Club Z API! 🚀',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    docs: '/api/health'
  })
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Fan Club Z API is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
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
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  })
})

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...')
  process.exit(0)
})

// Start server with error handling
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 Fan Club Z API Server Started!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌍 Environment: ${process.env.NODE_ENV || 'development'}
🔗 Local:       http://localhost:${PORT}
📱 Network:     http://${LOCAL_IP}:${PORT}
📋 Health:      http://localhost:${PORT}/health
🔌 API:         http://localhost:${PORT}/api

📊 Available Endpoints:
   • POST /api/users/register
   • POST /api/users/login
   • GET  /api/bets
   • GET  /api/clubs
   • GET  /api/health

📱 Mobile Access:
   Use http://${LOCAL_IP}:${PORT} on your mobile device

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ready to accept connections! 🎯
  `)
})

server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`
❌ Port ${PORT} is already in use!

💡 Solutions:
   1. Kill the process using port ${PORT}:
      lsof -ti:${PORT} | xargs kill -9
   
   2. Or change the port in .env.local:
      PORT=5002
   
   3. Or set a different port:
      PORT=5002 npm run dev:server
`)
    process.exit(1)
  } else {
    console.error('Server error:', error)
    process.exit(1)
  }
})

// Export for testing
export default app
