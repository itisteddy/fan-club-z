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
  container?: HTMLElement | null; // Container element for scrolling (if null, uses window)
}

export const useInfiniteScroll = ({
  hasNext,
  loading,
  onLoadMore,
  threshold = 200,
  disabled = false,
  container = null
}: UseInfiniteScrollOptions) => {
  const loadingRef = useRef(false);

  const handleScroll = useCallback(() => {
    // Skip if disabled, already loading, no more content, or throttled
    if (disabled || loading || !hasNext || loadingRef.current) {
      return;
    }

    let scrollTop: number;
    let scrollHeight: number;
    let clientHeight: number;

    if (container) {
      // Container-based scrolling
      scrollTop = container.scrollTop;
      scrollHeight = container.scrollHeight;
      clientHeight = container.clientHeight;
    } else {
      // Window-based scrolling
      scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      scrollHeight = document.documentElement.scrollHeight;
      clientHeight = window.innerHeight || document.documentElement.clientHeight;
    }

    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

    // Load more when user is within threshold distance from bottom
    if (distanceFromBottom <= threshold) {
      console.log('🔄 Infinite scroll triggered:', {
        distanceFromBottom,
        threshold,
        hasNext,
        loading,
        container: container ? 'container' : 'window'
      });

      loadingRef.current = true;
      onLoadMore();

      // Reset throttle after 1 second
      setTimeout(() => {
        loadingRef.current = false;
      }, 1000);
    }
  }, [disabled, loading, hasNext, threshold, onLoadMore, container]);

  useEffect(() => {
    if (disabled) return;

    // Throttled scroll handler
    let timeoutId: NodeJS.Timeout;
    const throttledScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100);
    };

    const scrollElement = container || window;
    const scrollEventName = container ? 'scroll' : 'scroll';
    const touchEventName = container ? 'touchmove' : 'touchmove';

    scrollElement.addEventListener(scrollEventName, throttledScroll, { passive: true });
    
    // Only add touchmove to window, not container to avoid conflicts
    if (!container) {
      window.addEventListener(touchEventName, throttledScroll, { passive: true });
    }

    return () => {
      scrollElement.removeEventListener(scrollEventName, throttledScroll);
      if (!container) {
        window.removeEventListener(touchEventName, throttledScroll);
      }
      clearTimeout(timeoutId);
    };
  }, [handleScroll, disabled, container]);

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
