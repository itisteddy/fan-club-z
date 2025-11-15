/**
 * Performance Utilities
 * Tools for monitoring and optimizing application performance
 */

import React from 'react';

interface PerformanceMetrics {
  timestamp: number;
  url: string;
  loadTime: number;
  renderTime?: number;
  memoryUsage?: number;
  bundleSize?: number;
}

interface ComponentMetrics {
  name: string;
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  propsChanges: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private componentMetrics = new Map<string, ComponentMetrics>();
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializePerformanceObserver();
    this.initializeMemoryMonitoring();
  }

  /**
   * Initialize performance observer for web vitals
   */
  private initializePerformanceObserver() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    // Observe Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log('🎯 LCP:', entry.startTime.toFixed(2) + 'ms');
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      this.observers.push(lcpObserver);
    } catch (e) {
      // Silently fail if not supported
    }

    // Observe First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const perfEntry = entry as PerformanceEventTiming;
          const processingStart = 'processingStart' in perfEntry && perfEntry.processingStart !== undefined 
            ? perfEntry.processingStart 
            : perfEntry.startTime;
          console.log('⚡ FID:', Math.max(0, processingStart - perfEntry.startTime) + 'ms');
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
      this.observers.push(fidObserver);
    } catch (e) {
      // Silently fail if not supported
    }

    // Observe Cumulative Layout Shift
    try {
      const clsObserver = new PerformanceObserver((list) => {
        let clsScore = 0;
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsScore += (entry as any).value;
          }
        }
        if (clsScore > 0) {
          console.log('📏 CLS:', clsScore.toFixed(4));
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      this.observers.push(clsObserver);
    } catch (e) {
      // Silently fail if not supported
    }
  }

  /**
   * Initialize memory usage monitoring
   */
  private initializeMemoryMonitoring() {
    if (typeof window === 'undefined') return;

    // Monitor memory usage every 30 seconds
    setInterval(() => {
      this.recordMemoryUsage();
    }, 30000);
  }

  /**
   * Record current memory usage
   */
  recordMemoryUsage() {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return 0;
    }

    const memory = (performance as any).memory;
    if (memory) {
      const usage = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };

      // Log if memory usage is high
      const usagePercent = (usage.used / usage.limit) * 100;
      if (usagePercent > 80) {
        console.warn('🔴 High memory usage:', usagePercent.toFixed(1) + '%');
      } else if (usagePercent > 60) {
        console.log('🟡 Memory usage:', usagePercent.toFixed(1) + '%');
      }

      return usage.used;
    }

    return 0;
  }

  /**
   * Record page load metrics
   */
  recordPageLoad(url: string) {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return;
    }

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (navigation) {
      const startReference = typeof navigation.startTime === 'number' ? navigation.startTime : 0;
      const metrics: PerformanceMetrics = {
        timestamp: Date.now(),
        url,
        loadTime: navigation.loadEventEnd - startReference,
        renderTime: navigation.domContentLoadedEventEnd - startReference,
        memoryUsage: this.recordMemoryUsage(),
      };

      this.metrics.push(metrics);
      
      // Log performance metrics in development
      if (import.meta.env.DEV) {
        console.log('📊 Page Load Metrics:', {
          url: metrics.url,
          loadTime: metrics.loadTime.toFixed(2) + 'ms',
          renderTime: metrics.renderTime?.toFixed(2) + 'ms',
          memoryUsage: metrics.memoryUsage ? (metrics.memoryUsage / 1024 / 1024).toFixed(2) + 'MB' : 'N/A',
        });
      }

      // Keep only last 50 metrics
      if (this.metrics.length > 50) {
        this.metrics = this.metrics.slice(-50);
      }
    }
  }

  /**
   * Record component render metrics
   */
  recordComponentRender(componentName: string, renderTime: number, propsChanged = false) {
    const existing = this.componentMetrics.get(componentName);
    
    if (existing) {
      existing.renderCount++;
      existing.lastRenderTime = renderTime;
      existing.averageRenderTime = (existing.averageRenderTime + renderTime) / 2;
      if (propsChanged) existing.propsChanges++;
    } else {
      this.componentMetrics.set(componentName, {
        name: componentName,
        renderCount: 1,
        averageRenderTime: renderTime,
        lastRenderTime: renderTime,
        propsChanges: propsChanged ? 1 : 0,
      });
    }

    // Log slow renders in development
    if (import.meta.env.DEV && renderTime > 16) {
      console.warn(`🐌 Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const recentMetrics = this.metrics.slice(-10);
    const avgLoadTime = recentMetrics.reduce((sum, m) => sum + m.loadTime, 0) / recentMetrics.length || 0;
    
    const slowestComponents = Array.from(this.componentMetrics.values())
      .sort((a, b) => b.averageRenderTime - a.averageRenderTime)
      .slice(0, 5);

    return {
      totalPageLoads: this.metrics.length,
      averageLoadTime: avgLoadTime.toFixed(2) + 'ms',
      currentMemoryUsage: this.recordMemoryUsage(),
      totalComponents: this.componentMetrics.size,
      slowestComponents: slowestComponents.map(c => ({
        name: c.name,
        avgRenderTime: c.averageRenderTime.toFixed(2) + 'ms',
        renderCount: c.renderCount,
      })),
    };
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
    this.componentMetrics.clear();
  }

  /**
   * Cleanup observers
   */
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.clear();
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Expose to window for debugging in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).performanceMonitor = performanceMonitor;
}

/**
 * Higher-order component for measuring render performance
 */
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const name = componentName || Component.displayName || Component.name || 'Unknown';
  
  return function WrappedComponent(props: P) {
    const renderStart = performance.now();
    
    React.useLayoutEffect(() => {
      const renderEnd = performance.now();
      const renderTime = renderEnd - renderStart;
      performanceMonitor.recordComponentRender(name, renderTime);
    });

    return React.createElement(Component, props);
  };
}

/**
 * Hook for measuring component render time
 */
export function usePerformanceTracking(componentName: string) {
  const renderStartRef = React.useRef(0);
  
  // Record start time
  renderStartRef.current = performance.now();
  
  React.useLayoutEffect(() => {
    const renderTime = performance.now() - renderStartRef.current;
    performanceMonitor.recordComponentRender(componentName, renderTime);
  });

  return {
    recordCustomMetric: (metricName: string, value: number) => {
      console.log(`📈 ${componentName} - ${metricName}:`, value);
    },
  };
}

export default performanceMonitor;
