import React, { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { getSocketUrl } from '@/utils/environment';
import { useAuthSession } from './AuthSessionProvider';
import { QK } from '@/lib/queryKeys';
import { usePredictionStore } from '@/store/predictionStore';

type Props = { children: React.ReactNode };

const refreshActivePredictions = async () => {
  const { refreshPredictions } = usePredictionStore.getState();
  if (typeof refreshPredictions !== 'function') return;
  try {
    console.log('[REALTIME] Refreshing prediction store (forced)');
    await refreshPredictions(true);
  } catch (error) {
    console.warn('[REALTIME] Failed to refresh predictions after realtime update:', error);
  }
};

export const RealtimeProvider: React.FC<Props> = ({ children }) => {
  const { user } = useAuthSession();
  const location = useLocation();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const isAdminRoute = location.pathname.startsWith('/admin');
    if (isAdminRoute) {
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch {}
        socketRef.current = null;
      }
      return;
    }

    const url = getSocketUrl().replace(/\/$/, '');
    console.log('[REALTIME] Connecting to Socket.io:', url);
    const socket = io(url, {
      transports: ['websocket', 'polling'], // Add polling fallback for Render compatibility
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
      timeout: 20000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[REALTIME] ✅ Connected to Socket.io server');
      console.log('[REALTIME] Transport:', socket.io.engine?.transport?.name || 'unknown');
    });

    socket.on('connect_error', (error) => {
      console.error('[REALTIME] ❌ Connection error:', error.message);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[REALTIME] 🔌 Disconnected:', reason);
    });

    const onWalletUpdate = (payload: { userId: string }) => {
      if (!user?.id || payload.userId !== user.id) return;
      // Invalidate wallet data aggressively
      queryClient.invalidateQueries({ queryKey: QK.walletSummary(user.id) });
      queryClient.invalidateQueries({ queryKey: QK.walletActivity(user.id) });
      queryClient.invalidateQueries({ queryKey: QK.escrowBalance(user.id) });
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    };

    const onPredictionUpdate = (payload: { predictionId: string }) => {
      if (payload.predictionId) {
        queryClient.invalidateQueries({ queryKey: QK.prediction(payload.predictionId) });
        queryClient.invalidateQueries({ queryKey: QK.predictionEntries(payload.predictionId) });
        void refreshActivePredictions();
      }
    };

    const onSettlementComplete = (payload: { predictionId: string }) => {
      if (payload.predictionId) {
        queryClient.invalidateQueries({ queryKey: QK.prediction(payload.predictionId) });
        queryClient.invalidateQueries({ queryKey: QK.predictionEntries(payload.predictionId) });
        if (user?.id) {
          queryClient.invalidateQueries({ queryKey: QK.walletSummary(user.id) });
        }
        void refreshActivePredictions();
      }
    };

    socket.on('wallet:update', onWalletUpdate);
    socket.on('prediction:update', onPredictionUpdate);
    socket.on('settlement:complete', onSettlementComplete);

    return () => {
      socket.off('wallet:update', onWalletUpdate);
      socket.off('prediction:update', onPredictionUpdate);
      socket.off('settlement:complete', onSettlementComplete);
      socket.close();
    };
  }, [user?.id, queryClient, location.pathname]);

  return <>{children}</>;
};

