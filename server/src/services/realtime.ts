import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { getCorsOrigins } from '../config';

let io: SocketIOServer | null = null;

export function initRealtime(server: HttpServer) {
  if (io) return io;

  const allowedOrigins = getCorsOrigins();
  console.log('[RT] Socket.io CORS allowlist:', allowedOrigins.filter(o => o.includes('fanclubz') || o.includes('localhost')));
  const warnedBlockedOrigins = new Set<string>();
  
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
        
        if (!warnedBlockedOrigins.has(origin)) {
          warnedBlockedOrigins.add(origin);
          console.warn(
            `[RT-CORS] ❌ Blocked origin (Socket.IO CORS will not allow): ${origin}. ` +
              `If this is a real frontend surface, add it to allowedOrigins in server/src/index.ts and server/src/services/realtime.ts.`
          );
        }
        // Do not throw; fail closed without crashing the server.
        callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000, // Render cold start can take 30s+
    upgradeTimeout: 30000,
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


