/**
 * [PERF] Web Vitals Logger
 * 
 * Reports Core Web Vitals metrics:
 * - FCP (First Contentful Paint)
 * - LCP (Largest Contentful Paint)
 * - CLS (Cumulative Layout Shift)
 * - INP (Interaction to Next Paint - replaces FID)
 * - TTFB (Time to First Byte)
 * 
 * DEV: Logs to console
 * PROD: Reports to Sentry with configurable sample rate
 * 
 * @see https://web.dev/vitals/
 */

type MetricName = 'FCP' | 'LCP' | 'CLS' | 'INP' | 'TTFB';

interface WebVitalMetric {
  name: MetricName;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

// [PERF] Thresholds per Google's Core Web Vitals recommendations
const THRESHOLDS: Record<MetricName, { good: number; poor: number }> = {
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 },
  TTFB: { good: 800, poor: 1800 },
};

function getRating(name: MetricName, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

// [PERF] Check if we should sample this session (controlled by env)
function shouldSample(): boolean {
  const sampleRate = parseFloat(import.meta.env.VITE_WEB_VITALS_SAMPLE || '0.05');
  return Math.random() < sampleRate;
}

// [PERF] Log metric to console in development
function logToConsole(metric: WebVitalMetric): void {
  const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
  const color = metric.rating === 'good' ? 'color: green' : metric.rating === 'needs-improvement' ? 'color: orange' : 'color: red';
  
  console.log(
    `%c[PERF] ${emoji} ${metric.name}: ${metric.value.toFixed(2)}${metric.name === 'CLS' ? '' : 'ms'} (${metric.rating})`,
    color
  );
}

// [PERF] Report metric to Sentry
function reportToSentry(metric: WebVitalMetric): void {
  // Only report if Sentry is available
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    const Sentry = (window as any).Sentry;
    
    // Add breadcrumb for context
    Sentry.addBreadcrumb({
      category: 'web-vital',
      message: `${metric.name}: ${metric.value.toFixed(2)}`,
      level: metric.rating === 'poor' ? 'warning' : 'info',
      data: {
        rating: metric.rating,
        value: metric.value,
        delta: metric.delta,
        navigationType: metric.navigationType,
      },
    });

    // For poor metrics, create a measurement
    if (metric.rating === 'poor') {
      Sentry.setMeasurement(metric.name, metric.value, metric.name === 'CLS' ? '' : 'millisecond');
    }
  }
}

// [PERF] Handle incoming web vital metric
function handleMetric(metric: { name: string; value: number; delta: number; id: string; navigationType?: string }): void {
  const name = metric.name as MetricName;
  const rating = getRating(name, metric.value);
  
  const webVitalMetric: WebVitalMetric = {
    name,
    value: metric.value,
    rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType || 'unknown',
  };

  // Always log in development
  if (import.meta.env.DEV) {
    logToConsole(webVitalMetric);
    return;
  }

  // In production, check sample rate
  if (shouldSample()) {
    reportToSentry(webVitalMetric);
  }
}

/**
 * [PERF] Initialize Web Vitals reporting
 * 
 * Call this function once in main.tsx after the app mounts.
 * Uses dynamic import to keep the web-vitals library out of the main bundle.
 */
export async function initWebVitals(): Promise<void> {
  // [PERF] Guard: only initialize in browser environment
  if (typeof window === 'undefined') return;

  try {
    // [PERF] Dynamic import to avoid bundle bloat
    const { onFCP, onLCP, onCLS, onINP, onTTFB } = await import('web-vitals');

    // [PERF] Register handlers for each metric
    onFCP(handleMetric);
    onLCP(handleMetric);
    onCLS(handleMetric);
    onINP(handleMetric);
    onTTFB(handleMetric);

    if (import.meta.env.DEV) {
      console.log('[PERF] Web Vitals monitoring initialized');
    }
  } catch (err) {
    // [PERF] Silently fail - don't break the app for metrics
    if (import.meta.env.DEV) {
      console.warn('[PERF] Failed to initialize Web Vitals:', err);
    }
  }
}

/**
 * [PERF] Manually report a custom performance mark
 * 
 * Useful for tracking specific interactions like:
 * - Route transitions
 * - Wallet updates
 * - Modal open/close
 */
export function reportCustomMark(name: string, startMark?: string): void {
  if (typeof window === 'undefined' || typeof performance === 'undefined') return;

  try {
    if (startMark) {
      // [PERF] Measure from a previous mark
      performance.measure(name, startMark);
      const entries = performance.getEntriesByName(name, 'measure');
      const latest = entries[entries.length - 1];
      
      if (latest && import.meta.env.DEV) {
        console.log(`[PERF] ⏱️ ${name}: ${latest.duration.toFixed(2)}ms`);
      }
    } else {
      // [PERF] Just create a mark for later measurement
      performance.mark(name);
    }
  } catch (err) {
    // Silently fail
  }
}

export default initWebVitals;
