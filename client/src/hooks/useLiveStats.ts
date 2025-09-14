import { useState, useEffect, useCallback, useRef } from 'react';

interface LiveStats {
  totalVolume: string;
  activePredictions: number;
  totalUsers: string;
  rawVolume: number;
  rawUsers: number;
}

interface UseLiveStatsOptions {
  intervalMs?: number; // Default 25 seconds (between 20-30s)
  enableFocusUpdates?: boolean; // Default true
  enableIntervalUpdates?: boolean; // Default true
}

interface UseLiveStatsReturn {
  stats: LiveStats;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

/**
 * Custom hook for live stats with automatic refresh capabilities
 * 
 * Features:
 * - Interval updates (default 25s)
 * - Focus/visibility change updates
 * - Network request debouncing and cancellation
 * - USD formatting with graceful zero handling
 * - Error handling and loading states
 */
export const useLiveStats = (options: UseLiveStatsOptions = {}): UseLiveStatsReturn => {
  const {
    intervalMs = 25000, // 25 seconds (between 20-30s requirement)
    enableFocusUpdates = true,
    enableIntervalUpdates = true
  } = options;

  const [stats, setStats] = useState<LiveStats>({
    totalVolume: '0.00',
    activePredictions: 0,
    totalUsers: '0',
    rawVolume: 0,
    rawUsers: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Refs for cleanup and request cancellation
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Format USD values with graceful zero handling
   */
  const formatUSD = useCallback((value: number): string => {
    if (value === 0) return '0.00';
    if (value < 0.01) return '<0.01';
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).replace('$', ''); // Remove $ symbol since we add it in the UI
  }, []);

  /**
   * Fetch platform stats with request cancellation and error handling
   */
  const fetchStats = useCallback(async (signal?: AbortSignal): Promise<void> => {
    if (!isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const requestSignal = signal || controller.signal;

      // Use the same environment API URL logic as the rest of the app
      const { getApiUrl } = await import('../lib/environment');
      const response = await fetch(`${getApiUrl()}/api/v2/predictions/stats/platform`, {
        signal: requestSignal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Check if request was aborted
      if (requestSignal.aborted) {
        console.log('📊 Stats request aborted');
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!isMountedRef.current) return;

      if (data.success && data.data) {
        const rawStats = data.data;
        
        // Format the stats with improved USD formatting
        const formattedStats: LiveStats = {
          totalVolume: formatUSD(rawStats.rawVolume || 0),
          activePredictions: rawStats.activePredictions || 0,
          totalUsers: (rawStats.rawUsers || 0).toLocaleString(),
          rawVolume: rawStats.rawVolume || 0,
          rawUsers: rawStats.rawUsers || 0
        };

        setStats(formattedStats);
        setLastUpdated(new Date());
        console.log('✅ Live stats updated:', formattedStats);
      } else {
        throw new Error('Invalid stats response format');
      }
    } catch (error: any) {
      if (!isMountedRef.current) return;
      
      // Don't set error if request was aborted
      if (error.name === 'AbortError') {
        console.log('📊 Stats request cancelled');
        return;
      }

      console.error('❌ Error fetching live stats:', error);
      setError(error.message || 'Failed to fetch live stats');
      
      // Set fallback stats on error
      setStats(prevStats => ({
        ...prevStats,
        totalVolume: formatUSD(0),
        activePredictions: 0,
        totalUsers: '0'
      }));
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [formatUSD]);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async (): Promise<void> => {
    await fetchStats();
  }, [fetchStats]);

  /**
   * Handle focus/visibility change events
   */
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible' && enableFocusUpdates) {
      console.log('📊 Page became visible, refreshing stats');
      fetchStats();
    }
  }, [fetchStats, enableFocusUpdates]);

  const handleFocus = useCallback(() => {
    if (enableFocusUpdates) {
      console.log('📊 Window focused, refreshing stats');
      fetchStats();
    }
  }, [fetchStats, enableFocusUpdates]);

  // Setup interval updates
  useEffect(() => {
    if (!enableIntervalUpdates) return;

    const startInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        console.log('📊 Interval refresh triggered');
        fetchStats();
      }, intervalMs);
    };

    // Start interval after initial fetch
    const initialTimeout = setTimeout(() => {
      startInterval();
    }, 1000);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchStats, intervalMs, enableIntervalUpdates]);

  // Setup focus/visibility change listeners
  useEffect(() => {
    if (!enableFocusUpdates) return;

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [handleVisibilityChange, handleFocus, enableFocusUpdates]);

  // Initial fetch on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    stats,
    loading,
    error,
    lastUpdated,
    refresh
  };
};

export default useLiveStats;
