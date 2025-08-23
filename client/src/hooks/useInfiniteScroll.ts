/**
 * Custom hook for infinite scroll functionality
 * Handles scroll detection and loading more content
 */

import { useEffect, useCallback, useRef } from 'react';

interface UseInfiniteScrollOptions {
  hasNext: boolean;
  loading: boolean;
  onLoadMore: () => void;
  threshold?: number; // Distance from bottom to trigger load (default: 200px)
  disabled?: boolean;
}

export const useInfiniteScroll = ({
  hasNext,
  loading,
  onLoadMore,
  threshold = 200,
  disabled = false
}: UseInfiniteScrollOptions) => {
  const loadingRef = useRef(false);

  const handleScroll = useCallback(() => {
    // Skip if disabled, already loading, no more content, or throttled
    if (disabled || loading || !hasNext || loadingRef.current) {
      return;
    }

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight || document.documentElement.clientHeight;

    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

    // Load more when user is within threshold distance from bottom
    if (distanceFromBottom <= threshold) {
      console.log('🔄 Infinite scroll triggered:', {
        distanceFromBottom,
        threshold,
        hasNext,
        loading
      });

      loadingRef.current = true;
      onLoadMore();

      // Reset throttle after 1 second
      setTimeout(() => {
        loadingRef.current = false;
      }, 1000);
    }
  }, [disabled, loading, hasNext, threshold, onLoadMore]);

  useEffect(() => {
    if (disabled) return;

    // Throttled scroll handler
    let timeoutId: NodeJS.Timeout;
    const throttledScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100);
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });
    window.addEventListener('touchmove', throttledScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', throttledScroll);
      window.removeEventListener('touchmove', throttledScroll);
      clearTimeout(timeoutId);
    };
  }, [handleScroll, disabled]);

  // Manual trigger function for testing
  const triggerLoadMore = useCallback(() => {
    if (!disabled && !loading && hasNext && !loadingRef.current) {
      console.log('🔄 Manual infinite scroll trigger');
      loadingRef.current = true;
      onLoadMore();
      setTimeout(() => {
        loadingRef.current = false;
      }, 1000);
    }
  }, [disabled, loading, hasNext, onLoadMore]);

  return {
    triggerLoadMore
  };
};
