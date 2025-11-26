/**
 * [PERF] Performance Utilities
 * 
 * Helpers for:
 * - Zustand shallow selectors (prevent unnecessary re-renders)
 * - Performance marks/measures for key user flows
 * - Debug timing utilities
 */

import { shallow } from 'zustand/shallow';

// Re-export shallow for convenient import
export { shallow };

/**
 * [PERF] Performance mark names for consistent tracking
 */
export const PERF_MARKS = {
  // Route transitions
  ROUTE_START: 'fcz:route-start',
  ROUTE_END: 'fcz:route-end',
  
  // Wallet operations
  WALLET_CONNECT_START: 'fcz:wallet-connect-start',
  WALLET_CONNECT_END: 'fcz:wallet-connect-end',
  WALLET_LOAD_START: 'fcz:wallet-load-start',
  WALLET_LOAD_END: 'fcz:wallet-load-end',
  
  // Prediction operations
  BET_PLACE_START: 'fcz:bet-place-start',
  BET_PLACE_END: 'fcz:bet-place-end',
  
  // Data loading
  PREDICTIONS_LOAD_START: 'fcz:predictions-load-start',
  PREDICTIONS_LOAD_END: 'fcz:predictions-load-end',
} as const;

type PerfMarkName = typeof PERF_MARKS[keyof typeof PERF_MARKS];

/**
 * [PERF] Create a performance mark
 * Safe - won't throw if Performance API unavailable
 */
export function mark(name: PerfMarkName | string): void {
  if (typeof performance === 'undefined') return;
  
  try {
    performance.mark(name);
    
    if (import.meta.env.DEV) {
      console.debug(`[PERF] ⏱️ Mark: ${name}`);
    }
  } catch {
    // Silently ignore errors
  }
}

/**
 * [PERF] Measure time between two marks
 * Returns duration in ms, or null if measurement fails
 */
export function measure(
  name: string,
  startMark: PerfMarkName | string,
  endMark?: PerfMarkName | string
): number | null {
  if (typeof performance === 'undefined') return null;
  
  try {
    // If no end mark provided, measure from start to now
    if (!endMark) {
      const entries = performance.getEntriesByName(startMark, 'mark');
      if (entries.length === 0) return null;
      
      const startTime = entries[entries.length - 1].startTime;
      const duration = performance.now() - startTime;
      
      if (import.meta.env.DEV) {
        console.log(`[PERF] ⏱️ ${name}: ${duration.toFixed(2)}ms`);
      }
      
      return duration;
    }
    
    // Measure between two marks
    performance.measure(name, startMark, endMark);
    const entries = performance.getEntriesByName(name, 'measure');
    
    if (entries.length > 0) {
      const duration = entries[entries.length - 1].duration;
      
      if (import.meta.env.DEV) {
        const emoji = duration < 100 ? '✅' : duration < 500 ? '⚠️' : '❌';
        console.log(`[PERF] ${emoji} ${name}: ${duration.toFixed(2)}ms`);
      }
      
      return duration;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * [PERF] Clear all performance marks and measures
 * Useful for resetting between routes
 */
export function clearMarks(): void {
  if (typeof performance === 'undefined') return;
  
  try {
    performance.clearMarks();
    performance.clearMeasures();
  } catch {
    // Silently ignore
  }
}

/**
 * [PERF] Track a route transition
 * Call at route start, returns function to call at route end
 */
export function trackRouteTransition(routeName: string): () => void {
  mark(PERF_MARKS.ROUTE_START);
  
  return () => {
    mark(PERF_MARKS.ROUTE_END);
    measure(`Route: ${routeName}`, PERF_MARKS.ROUTE_START, PERF_MARKS.ROUTE_END);
  };
}

/**
 * [PERF] Track wallet connection
 */
export function trackWalletConnect(): () => void {
  mark(PERF_MARKS.WALLET_CONNECT_START);
  
  return () => {
    mark(PERF_MARKS.WALLET_CONNECT_END);
    measure('Wallet Connect', PERF_MARKS.WALLET_CONNECT_START, PERF_MARKS.WALLET_CONNECT_END);
  };
}

/**
 * [PERF] Track bet placement
 */
export function trackBetPlacement(): () => void {
  mark(PERF_MARKS.BET_PLACE_START);
  
  return () => {
    mark(PERF_MARKS.BET_PLACE_END);
    measure('Bet Placement', PERF_MARKS.BET_PLACE_START, PERF_MARKS.BET_PLACE_END);
  };
}

/**
 * [PERF] Simple timing utility for async operations
 * 
 * Usage:
 *   const timer = startTimer('fetchData');
 *   await fetchData();
 *   timer.end(); // Logs duration in DEV
 */
export function startTimer(label: string) {
  const start = performance.now();
  
  return {
    end: () => {
      const duration = performance.now() - start;
      
      if (import.meta.env.DEV) {
        const emoji = duration < 100 ? '✅' : duration < 500 ? '⚠️' : '❌';
        console.log(`[PERF] ${emoji} ${label}: ${duration.toFixed(2)}ms`);
      }
      
      return duration;
    },
  };
}

/**
 * [PERF] Report a custom metric (for Sentry)
 */
export function reportMetric(name: string, value: number, unit: string = 'millisecond'): void {
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    try {
      (window as any).Sentry.setMeasurement(name, value, unit);
    } catch {
      // Silently ignore
    }
  }
}
