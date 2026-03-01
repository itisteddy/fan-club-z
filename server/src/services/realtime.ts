import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export function initRealtime(server: HttpServer) {
  if (io) return io;
  
  // Get allowed origins from environment or use defaults
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
    'https://app.fanclubz.app',
    'https://fanclubz.app',
    'https://www.fanclubz.app',
    'https://dev.fanclubz.app',
  ];
  
  io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
          return callback(null, true);
        }
        // Check if origin is allowed
        if (allowedOrigins.includes(origin) || origin.includes('.vercel.app') || origin.includes('.onrender.com')) {
          callback(null, true);
        } else {
          // In production, be strict; in dev, allow all
          if (process.env.NODE_ENV === 'production') {
            callback(new Error(`Origin ${origin} not allowed by CORS`));
          } else {
            callback(null, true);
          }
        }
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'], // Add polling fallback for Render compatibility
    allowEIO3: true, // Support older clients
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    // Lightweight logging; no rooms for now
    try {
      const ua = (socket.handshake.headers['user-agent'] as string) || '';
      console.log(`[RT] client connected ${socket.id} ${ua}`);
      socket.on('disconnect', (reason) => {
        console.log(`[RT] client disconnected ${socket.id} ${reason}`);
      });
    } catch {}
  });

  console.log('[RT] Socket.io realtime server initialized');
  return io;
}

function safeEmit(event: string, payload: any) {
  if (!io) return;
  try {
    io.emit(event, payload);
  } catch (e) {
    console.error('[RT] emit error', event, e);
  }
}

export function emitWalletUpdate(payload: { userId: string; reason?: string; amountDelta?: number }) {
  safeEmit('wallet:update', payload);
}

export function emitPredictionUpdate(payload: { predictionId: string; reason?: string }) {
  safeEmit('prediction:update', payload);
}

export function emitSettlementComplete(payload: { predictionId: string; winnersCount?: number }) {
  safeEmit('settlement:complete', payload);
}


