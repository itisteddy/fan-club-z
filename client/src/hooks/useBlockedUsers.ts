/**
 * Blocked users list and actions (UGC moderation)
 * Feature flag: VITE_FCZ_UGC_MODERATION
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { fetchBlockedUserIds, blockUser as blockUserApi, unblockUser as unblockUserApi } from '@/lib/blockUser';
import { isFeatureEnabled } from '@/config/featureFlags';

export function useBlockedUsers(): {
  blockedUserIds: string[];
  isBlocked: (userId: string) => boolean;
  blockUser: (userId: string) => Promise<{ ok: boolean; message?: string }>;
  unblockUser: (userId: string) => Promise<{ ok: boolean; message?: string }>;
  refresh: () => Promise<void>;
  loading: boolean;
  isEnabled: boolean;
} {
  const { user, session } = useAuthSession();
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const isEnabled = isFeatureEnabled('UGC_MODERATION');

  const refresh = useCallback(async () => {
    if (!isEnabled || !session?.access_token) {
      setBlockedUserIds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const ids = await fetchBlockedUserIds(session.access_token);
      setBlockedUserIds(ids);
    } finally {
      setLoading(false);
    }
  }, [isEnabled, session?.access_token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isBlocked = useCallback(
    (userId: string) => blockedUserIds.includes(userId),
    [blockedUserIds]
  );

  const blockUser = useCallback(
    async (userId: string): Promise<{ ok: boolean; message?: string }> => {
      if (!session?.access_token) return { ok: false, message: 'Not signed in' };
      const result = await blockUserApi(userId, session.access_token);
      if (result.ok) {
        setBlockedUserIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
      }
      return result;
    },
    [session?.access_token]
  );

  const unblockUser = useCallback(
    async (userId: string): Promise<{ ok: boolean; message?: string }> => {
      if (!session?.access_token) return { ok: false, message: 'Not signed in' };
      const result = await unblockUserApi(userId, session.access_token);
      if (result.ok) {
        setBlockedUserIds((prev) => prev.filter((id) => id !== userId));
      }
      return result;
    },
    [session?.access_token]
  );

  return {
    blockedUserIds,
    isBlocked,
    blockUser,
    unblockUser,
    refresh,
    loading,
    isEnabled: isEnabled && !!user?.id,
  };
}
