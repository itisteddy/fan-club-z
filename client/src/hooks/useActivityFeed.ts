import { useState, useEffect, useCallback, useRef } from 'react';

export interface ActivityItem {
  id: string;
  timestamp: string;
  type: string;
  actor?: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
    is_verified?: boolean;
  } | null;
  data: Record<string, any>;
  predictionId?: string;
  predictionTitle?: string;
  predictionStatus?: string;
}

export interface ActivityFeedResponse {
  items: ActivityItem[];
  nextCursor?: string;
  hasMore: boolean;
  version: string;
}

export interface UseActivityFeedOptions {
  predictionId?: string;
  userId?: string;
  limit?: number;
  autoLoad?: boolean;
}

export interface UseActivityFeedReturn {
  items: ActivityItem[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => void;
}

/**
 * Hook for fetching and managing activity feed data
 * Supports both prediction-specific and user-specific activity feeds
 */
export function useActivityFeed({
  predictionId,
  userId,
  limit = 25,
  autoLoad = true
}: UseActivityFeedOptions): UseActivityFeedReturn {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const hasLoadedRef = useRef(false);

  // Build API URL based on whether we're fetching prediction or user activity
  const getApiUrl = useCallback((cursorParam?: string) => {
    const baseUrl = '/api/v2/activity';
    const params = new URLSearchParams();
    
    if (limit) params.set('limit', limit.toString());
    if (cursorParam) params.set('cursor', cursorParam);

    if (predictionId) {
      return `${baseUrl}/predictions/${predictionId}?${params.toString()}`;
    } else if (userId) {
      return `${baseUrl}/user/${userId}?${params.toString()}`;
    }
    
    throw new Error('Either predictionId or userId must be provided');
  }, [predictionId, userId, limit]);

  // Fetch activity data
  const fetchActivity = useCallback(async (cursorParam?: string, append = false) => {
    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      const url = getApiUrl(cursorParam);
      console.log('🔍 Fetching activity feed:', url);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Activity feed returned non-JSON:', {
          status: response.status,
          statusText: response.statusText,
          contentType,
          preview: text.substring(0, 200)
        });
        throw new Error(`Expected JSON but got ${contentType}. Status: ${response.status}`);
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: ActivityFeedResponse = await response.json();
      
      if (append) {
        setItems(prev => [...prev, ...data.items]);
      } else {
        setItems(data.items);
      }
      
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
      
      console.log('✅ Activity feed loaded:', {
        itemsCount: data.items.length,
        hasMore: data.hasMore,
        nextCursor: data.nextCursor
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch activity feed';
      console.error('❌ Activity feed error:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loading, getApiUrl]);

  // Load more items (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !cursor) return;
    await fetchActivity(cursor, true);
  }, [hasMore, loading, cursor, fetchActivity]);

  // Refresh the feed
  const refresh = useCallback(async () => {
    setCursor(undefined);
    setHasMore(true);
    hasLoadedRef.current = false;
    await fetchActivity(undefined, false);
  }, [fetchActivity]);

  // Clear all items
  const clear = useCallback(() => {
    setItems([]);
    setCursor(undefined);
    setHasMore(true);
    setError(null);
    hasLoadedRef.current = false;
  }, []);

  // Auto-load on mount or when dependencies change
  useEffect(() => {
    if (autoLoad && (predictionId || userId) && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      clear();
      // Call fetchActivity directly without including it in dependencies
      fetchActivity(undefined, false);
    }
  }, [predictionId, userId, autoLoad, clear]);

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    clear
  };
}

/**
 * Hook specifically for prediction activity feed
 */
export function usePredictionActivity(predictionId: string, options?: Omit<UseActivityFeedOptions, 'predictionId'>) {
  return useActivityFeed({
    predictionId,
    ...options
  });
}

/**
 * Hook specifically for user activity feed
 */
export function useUserActivity(userId: string, options?: Omit<UseActivityFeedOptions, 'userId'>) {
  return useActivityFeed({
    userId,
    ...options
  });
}
