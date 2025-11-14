import React, { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const url = getSocketUrl().replace(/\/$/, '');
    const socket = io(url, {
      transports: ['websocket'],
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
    });
    socketRef.current = socket;

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
  }, [user?.id, queryClient]);

  return <>{children}</>;
};


