import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuthSession } from '../providers/AuthSessionProvider';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../utils/environment';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  metadata: Record<string, any>;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  items: Notification[];
  unreadCount: number;
  nextCursor?: string;
  version: string;
}

interface UseNotificationsOptions {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

/**
 * Hook for fetching and managing in-app notifications
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const { session } = useAuthSession();
  const { limit = 20, autoRefresh = true, refreshInterval = 30000 } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);

  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Get auth token from Supabase session
   */
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    if (!session?.access_token) {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      return currentSession?.access_token || null;
    }
    return session.access_token;
  }, [session]);

  /**
   * Fetch notifications from API
   */
  const fetchNotifications = useCallback(
    async (cursor?: string, append = false) => {
      if (!session) {
        setError(new Error('Not authenticated'));
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const token = await getAuthToken();
        if (!token) {
          throw new Error('No auth token available');
        }

        const params = new URLSearchParams();
        params.set('limit', String(limit));
        if (cursor) {
          params.set('cursor', cursor);
        }

        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/v2/notifications?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.message || `HTTP error! status: ${response.status}`);
        }

        const data: NotificationsResponse = await response.json();

        if (!isMountedRef.current) return;

        if (append) {
          setNotifications((prev) => [...prev, ...data.items]);
        } else {
          setNotifications(data.items);
        }

        setUnreadCount(data.unreadCount || 0);
        setNextCursor(data.nextCursor);
        setHasMore(Boolean(data.nextCursor));
      } catch (err) {
        if (!isMountedRef.current) return;
        const error = err instanceof Error ? err : new Error('Failed to fetch notifications');
        setError(error);
        console.error('[useNotifications] Fetch error:', error);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [session, limit, getAuthToken]
  );

  /**
   * Refresh unread count only (lightweight)
   */
  const refreshUnreadCount = useCallback(async () => {
    if (!session) return;

    try {
      const token = await getAuthToken();
      if (!token) return;

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/v2/notifications?limit=1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data: NotificationsResponse = await response.json();
        if (isMountedRef.current) {
          setUnreadCount(data.unreadCount || 0);
        }
      }
    } catch (err) {
      // Silently fail for unread count refresh
      console.warn('[useNotifications] Failed to refresh unread count:', err);
    }
  }, [session, getAuthToken]);

  /**
   * Mark notifications as read
   */
  const markRead = useCallback(
    async (ids: string[]) => {
      if (!session || ids.length === 0) return;

      try {
        const token = await getAuthToken();
        if (!token) throw new Error('No auth token available');

        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/v2/notifications/mark-read`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.message || `HTTP error! status: ${response.status}`);
        }

        // Update local state optimistically
        setNotifications((prev) =>
          prev.map((n) => (ids.includes(n.id) ? { ...n, readAt: new Date().toISOString() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - ids.length));

        // Refresh to ensure sync
        await refreshUnreadCount();
      } catch (err) {
        console.error('[useNotifications] Mark read error:', err);
        throw err;
      }
    },
    [session, getAuthToken, refreshUnreadCount]
  );

  /**
   * Mark all notifications as read
   */
  const markAllRead = useCallback(async () => {
    if (!session) return;

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('No auth token available');

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/v2/notifications/mark-all-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.message || `HTTP error! status: ${response.status}`);
      }

      // Update local state optimistically
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[useNotifications] Mark all read error:', err);
      throw err;
    }
  }, [session, getAuthToken]);

  /**
   * Load more notifications (pagination)
   */
  const loadMore = useCallback(() => {
    if (hasMore && nextCursor && !loading) {
      fetchNotifications(nextCursor, true);
    }
  }, [hasMore, nextCursor, loading, fetchNotifications]);

  // Initial fetch
  useEffect(() => {
    if (session) {
      fetchNotifications();
    }
  }, [session]); // Only fetch when session changes

  // Auto-refresh unread count on window focus
  useEffect(() => {
    if (!autoRefresh || !session) return;

    const handleFocus = () => {
      refreshUnreadCount();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [autoRefresh, session, refreshUnreadCount]);

  // Periodic refresh of unread count
  useEffect(() => {
    if (!autoRefresh || !session) return;

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          refreshUnreadCount();
          scheduleRefresh(); // Schedule next refresh
        }
      }, refreshInterval);
    };

    scheduleRefresh();
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [autoRefresh, session, refreshInterval, refreshUnreadCount]);

  /**
   * Sync reminders (closing soon + claim reminders)
   * Called on app start/focus
   */
  const syncReminders = useCallback(async () => {
    if (!session) return;

    try {
      const token = await getAuthToken();
      if (!token) return;

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/v2/notifications/reminders/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh notifications to show new reminders
        if (data.created > 0) {
          await fetchNotifications();
        }
      }
    } catch (err) {
      // Silently fail for reminder sync
      console.warn('[useNotifications] Failed to sync reminders:', err);
    }
  }, [session, getAuthToken, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    hasMore,
    fetchNotifications: () => fetchNotifications(),
    refreshUnreadCount,
    markRead,
    markAllRead,
    loadMore,
    syncReminders,
  };
}
