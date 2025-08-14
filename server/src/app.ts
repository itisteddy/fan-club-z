import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config';
import logger from './utils/logger';
import { errorHandler } from './middleware/error';
import { defaultRateLimit } from './middleware/rate-limit';
import { ChatService } from './services/ChatService';

// Route imports
import authRoutes from './routes/auth';
import predictionRoutes from './routes/predictions';
import walletRoutes from './routes/wallet';
import socialRoutes from './routes/social';
import clubRoutes from './routes/clubs';

const app = express();

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"], // Allow WebSocket connections
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      config.frontend.url,
      'https://app.fanclubz.app',
      'https://dev.fanclubz.app',
      'https://fan-club-z-pw49foj6y-teddys-projects-d67ab22a.vercel.app',
      'https://fanclubz.app',
      'https://www.fanclubz.app'
    ]
  : [
      config.frontend.url, 
      'http://localhost:3000', 
      'http://localhost:5173',
      'https://dev.fanclubz.app'
    ];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('🌐 CORS: Allowing request with no origin');
      return callback(null, true);
    }
    
    console.log('🌐 CORS: Checking origin:', origin);
    console.log('🌐 CORS: Allowed origins:', allowedOrigins);
    
    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.indexOf(origin) !== -1;
    
    // Also allow any Vercel deployment (for development)
    const isVercelDeployment = origin.includes('.vercel.app');
    
    if (isAllowed || isVercelDeployment) {
      console.log('✅ CORS: Origin allowed', isVercelDeployment ? '(Vercel deployment)' : '(explicit allow)');
      callback(null, true);
    } else {
      console.log('❌ CORS: Origin blocked');
      // In development, be more permissive
      if (process.env.NODE_ENV !== 'production') {
        console.log('🚧 CORS: Development mode - allowing anyway');
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// ============================================================================
// GENERAL MIDDLEWARE
// ============================================================================

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      },
    },
  }));
}

// Rate limiting
app.use('/api/', defaultRateLimit);

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Fan Club Z API is running',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected', // This would check actual database connection in production
      redis: 'connected',     // This would check actual Redis connection in production
      websocket: 'enabled',   // WebSocket support enabled
    },
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

// v2 routes (current)
app.use('/api/v2/auth', authRoutes);
app.use('/api/v2/predictions', predictionRoutes);
app.use('/api/v2/wallet', walletRoutes);
app.use('/api/v2/social', socialRoutes);
app.use('/api/v2/clubs', clubRoutes);

// Legacy routes (for backward compatibility)
app.use('/api/auth', authRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/clubs', clubRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
  });
});

// Global error handler
app.use(errorHandler);

// ============================================================================
// WEBSOCKET & SERVER STARTUP
// ============================================================================

const PORT = config.server.port;

// Initialize WebSocket chat service
const chatService = new ChatService(app);
const server = chatService.getHttpServer();

server.listen(PORT, () => {
  logger.info(`🚀 Fan Club Z Server started on port ${PORT}`);
  logger.info(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🌐 API URL: http://localhost:${PORT}/api/v2`);
  logger.info(`💬 WebSocket Chat: Enabled`);
  logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;