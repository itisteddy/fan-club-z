import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export function initRealtime(server: HttpServer) {
  if (io) return io;
  
  // Match exact CORS origins from server/src/index.ts
  // Phase 1: Socket.IO must use the same origin allowlist as REST API
  const allowedOrigins = [
    'https://fanclubz.app',
    'https://app.fanclubz.app',
    'https://auth.fanclubz.app',
    // Capacitor native shells (iOS/Android WebView origins)
    // These must be allowed for native app Socket.IO connections to work
    'capacitor://localhost',
    'capacitor://app.fanclubz.app',
    'ionic://localhost',
    'http://localhost',
    'http://localhost:5173',
    'http://localhost:5174', // Vite default dev port
    'http://localhost:3000',
  ];
  
  io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        // Log for debugging
        if (origin) {
          console.log(`[RT-CORS] Request origin: ${origin}`);
        }
        
        // Allow requests with no origin (mobile apps, Postman, curl, server-to-server)
        if (!origin) {
          return callback(null, true);
        }
        
        // Check exact match first
        if (allowedOrigins.includes(origin)) {
          console.log(`[RT-CORS] ✅ Allowed origin: ${origin}`);
          callback(null, true);
          return;
        }
        
        // Allow any capacitor:// or ionic:// origin for native builds
        // This ensures iOS/Android Capacitor apps can connect via Socket.IO
        if (origin.startsWith('capacitor://') || origin.startsWith('ionic://')) {
          console.log(`[RT-CORS] ✅ Allowed Capacitor origin: ${origin}`);
          callback(null, true);
          return;
        }
        
        console.log(`[RT-CORS] ❌ Blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
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


