import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export function initRealtime(server: HttpServer) {
  if (io) return io;
  io = new SocketIOServer(server, {
    cors: {
      origin: true,
      credentials: true,
    },
    transports: ['websocket'],
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


