/**
 * Error Monitoring & Sentry Integration
 * Production-ready error tracking and performance monitoring
 */

import React from 'react';

interface ErrorContext {
  user?: {
    id?: string;
    email?: string;
    username?: string;
  };
  page?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  timestamp: number;
  tags?: Record<string, string>;
}

interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  level: 'error' | 'warning' | 'info';
  timestamp: number;
  context: ErrorContext;
  fingerprint?: string[];
}

class ErrorMonitor {
  private isInitialized: boolean = false;
  private sentryEnabled: boolean = false;
  private errorBuffer: ErrorReport[] = [];
  private performanceBuffer: PerformanceMetric[] = [];
  private userId?: string;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeMonitoring();
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Initialize error monitoring
   */
  private async initializeMonitoring(): Promise<void> {
    try {
      // Check if Sentry should be initialized
      const dsn = import.meta.env.VITE_SENTRY_DSN;
      const environment = import.meta.env.MODE || 'development';
      
      if (dsn && import.meta.env.PROD) {
        await this.initializeSentry(dsn, environment);
      } else {
        console.log('📊 Error monitoring: Using local error tracking (no Sentry DSN)');
        this.initializeLocalTracking();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize error monitoring:', error);
      this.initializeLocalTracking();
    }
  }

  /**
   * Initialize Sentry for production error tracking
   */
  private async initializeSentry(dsn: string, environment: string): Promise<void> {
    try {
      // Dynamic import to avoid including Sentry in bundle if not needed
      const Sentry = await import('@sentry/react');
      const { BrowserTracing } = await import('@sentry/tracing');

      Sentry.init({
        dsn,
        environment,
        integrations: [
          new BrowserTracing({
            routingInstrumentation: Sentry.reactRouterV6Instrumentation(
              React.useEffect,
              useLocation,
              useNavigationType,
              createRoutesFromChildren,
              matchRoutes
            ),
          }),
        ],
        
        // Performance monitoring
        tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
        
        // Release tracking
        release: import.meta.env.VITE_APP_VERSION || 'unknown',
        
        // Error filtering
        beforeSend(event) {
          // Filter out non-critical errors in production
          if (environment === 'production') {
            // Skip cancelled requests
            if (event.exception?.values?.some(e => 
              e.value?.includes('AbortError') || 
              e.value?.includes('cancelled')
            )) {
              return null;
            }
            
            // Skip network errors that are expected
            if (event.exception?.values?.some(e => 
              e.value?.includes('NetworkError') || 
              e.value?.includes('Failed to fetch')
            )) {
              return null;
            }
          }
          
          return event;
        },
        
        // Performance filtering
        beforeTransaction(event) {
          // Sample navigation transactions
          if (event.transaction?.includes('navigation')) {
            return Math.random() > 0.5 ? null : event;
          }
          return event;
        },
      });

      this.sentryEnabled = true;
      console.log('📊 Sentry error monitoring initialized');

      // Set initial context
      Sentry.setTag('sessionId', this.sessionId);
      Sentry.setContext('app', {
        version: import.meta.env.VITE_APP_VERSION,
        environment,
        buildTime: import.meta.env.VITE_BUILD_TIME,
      });

    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
      this.initializeLocalTracking();
    }
  }

  /**
   * Initialize local error tracking for development
   */
  private initializeLocalTracking(): void {
    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.captureException(event.error, {
        component: 'GlobalErrorHandler',
        action: 'unhandledError',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureException(event.reason, {
        component: 'GlobalErrorHandler',
        action: 'unhandledRejection',
      });
    });

    console.log('📊 Local error monitoring initialized');
  }

  /**
   * Set user context for error tracking
   */
  public setUser(user: { id: string; email?: string; username?: string }): void {
    this.userId = user.id;

    if (this.sentryEnabled) {
      const Sentry = (window as any).Sentry;
      if (Sentry) {
        Sentry.setUser({
          id: user.id,
          email: user.email,
          username: user.username,
        });
      }
    }
  }

  /**
   * Clear user context (on logout)
   */
  public clearUser(): void {
    this.userId = undefined;

    if (this.sentryEnabled) {
      const Sentry = (window as any).Sentry;
      if (Sentry) {
        Sentry.setUser(null);
      }
    }
  }

  /**
   * Capture an exception with context
   */
  public captureException(error: Error | string, context?: ErrorContext): string {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    const errorReport: ErrorReport = {
      id: errorId,
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      level: 'error',
      timestamp: Date.now(),
      context: {
        ...context,
        user: context?.user || { id: this.userId },
        page: context?.page || window.location.pathname,
      },
    };

    // Store locally
    this.errorBuffer.push(errorReport);
    this.trimBuffer();

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error(`🚨 Error captured [${errorId}]:`, errorReport);
    }

    // Send to Sentry if available
    if (this.sentryEnabled) {
      const Sentry = (window as any).Sentry;
      if (Sentry) {
        Sentry.withScope((scope: any) => {
          if (context?.component) scope.setTag('component', context.component);
          if (context?.action) scope.setTag('action', context.action);
          if (context?.page) scope.setTag('page', context.page);
          if (context?.metadata) scope.setContext('metadata', context.metadata);
          
          if (typeof error === 'string') {
            Sentry.captureMessage(error, 'error');
          } else {
            Sentry.captureException(error);
          }
        });
      }
    }

    return errorId;
  }

  /**
   * Capture a warning message
   */
  public captureWarning(message: string, context?: ErrorContext): string {
    const warningId = `warning_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    const errorReport: ErrorReport = {
      id: warningId,
      message,
      level: 'warning',
      timestamp: Date.now(),
      context: {
        ...context,
        user: context?.user || { id: this.userId },
        page: context?.page || window.location.pathname,
      },
    };

    this.errorBuffer.push(errorReport);
    this.trimBuffer();

    if (import.meta.env.DEV) {
      console.warn(`⚠️ Warning captured [${warningId}]:`, message, context);
    }

    if (this.sentryEnabled) {
      const Sentry = (window as any).Sentry;
      if (Sentry) {
        Sentry.withScope((scope: any) => {
          if (context?.component) scope.setTag('component', context.component);
          if (context?.action) scope.setTag('action', context.action);
          Sentry.captureMessage(message, 'warning');
        });
      }
    }

    return warningId;
  }

  /**
   * Track performance metric
   */
  public trackPerformance(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const performanceMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now(),
    };

    this.performanceBuffer.push(performanceMetric);
    this.trimPerformanceBuffer();

    if (import.meta.env.DEV) {
      console.log(`📊 Performance metric: ${metric.name} = ${metric.value}${metric.unit}`);
    }

    // Send to Sentry if available
    if (this.sentryEnabled) {
      const Sentry = (window as any).Sentry;
      if (Sentry && Sentry.addBreadcrumb) {
        Sentry.addBreadcrumb({
          message: `Performance: ${metric.name}`,
          level: 'info',
          data: {
            value: metric.value,
            unit: metric.unit,
            ...metric.tags,
          },
        });
      }
    }
  }

  /**
   * Add breadcrumb for debugging
   */
  public addBreadcrumb(message: string, category: string = 'navigation', data?: any): void {
    if (this.sentryEnabled) {
      const Sentry = (window as any).Sentry;
      if (Sentry && Sentry.addBreadcrumb) {
        Sentry.addBreadcrumb({
          message,
          category,
          level: 'info',
          data,
          timestamp: Date.now(),
        });
      }
    }

    if (import.meta.env.DEV) {
      console.log(`🍞 Breadcrumb [${category}]: ${message}`, data);
    }
  }

  /**
   * Get error statistics
   */
  public getStats(): {
    errors: number;
    warnings: number;
    totalReports: number;
    sessionId: string;
    userId?: string;
    isInitialized: boolean;
    sentryEnabled: boolean;
  } {
    return {
      errors: this.errorBuffer.filter(e => e.level === 'error').length,
      warnings: this.errorBuffer.filter(e => e.level === 'warning').length,
      totalReports: this.errorBuffer.length,
      sessionId: this.sessionId,
      userId: this.userId,
      isInitialized: this.isInitialized,
      sentryEnabled: this.sentryEnabled,
    };
  }

  /**
   * Get recent errors for debugging
   */
  public getRecentErrors(limit: number = 10): ErrorReport[] {
    return this.errorBuffer
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Trim error buffer to prevent memory leaks
   */
  private trimBuffer(): void {
    const MAX_BUFFER_SIZE = 100;
    if (this.errorBuffer.length > MAX_BUFFER_SIZE) {
      this.errorBuffer = this.errorBuffer.slice(-MAX_BUFFER_SIZE);
    }
  }

  /**
   * Trim performance buffer
   */
  private trimPerformanceBuffer(): void {
    const MAX_BUFFER_SIZE = 50;
    if (this.performanceBuffer.length > MAX_BUFFER_SIZE) {
      this.performanceBuffer = this.performanceBuffer.slice(-MAX_BUFFER_SIZE);
    }
  }

  /**
   * Manual error reporting for testing
   */
  public testError(message: string = 'Test error from error monitor'): void {
    if (!import.meta.env.DEV) {
      console.warn('Test errors are only available in development');
      return;
    }

    this.captureException(new Error(message), {
      component: 'ErrorMonitor',
      action: 'testError',
      metadata: { test: true },
    });
  }
}

// Create singleton instance
export const errorMonitor = new ErrorMonitor();

// Higher-order component for error boundary
export function withErrorMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  return function ErrorMonitoredComponent(props: P) {
    React.useEffect(() => {
      errorMonitor.addBreadcrumb(`Component mounted: ${componentName || 'Unknown'}`, 'component');
    }, []);

    return React.createElement(Component, props);
  };
}

// Error boundary component with monitoring
export class ErrorBoundaryWithMonitoring extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    errorMonitor.captureException(error, {
      component: 'ErrorBoundary',
      action: 'componentDidCatch',
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
    });
  }

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback || DefaultErrorFallback;
      return React.createElement(Fallback, { error: this.state.error! });
    }

    return this.props.children;
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<{ error: Error }> = ({ error }) => {
  return React.createElement(
    'div',
    { className: "min-h-screen bg-gray-50 flex items-center justify-center p-4" },
    React.createElement(
      'div',
      { className: "max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center" },
      React.createElement(
        'div',
        { className: "text-red-500 mb-4" },
        React.createElement('div', { className: "w-16 h-16 mx-auto text-red-500" }, "⚠️")
      ),
      React.createElement('h1', { className: "text-lg font-semibold text-gray-900 mb-2" }, "Something went wrong"),
      React.createElement('p', { className: "text-sm text-gray-600 mb-4" }, "We're sorry, but something unexpected happened. Please try refreshing the page."),
      import.meta.env.DEV && React.createElement(
        'details',
        { className: "text-left text-xs text-gray-500 mt-4 p-2 bg-gray-50 rounded" },
        React.createElement('summary', null, "Error details (dev only)"),
        React.createElement('pre', { className: "mt-2 whitespace-pre-wrap" }, `${error.message}\n${error.stack}`)
      ),
      React.createElement(
        'button',
        { 
          onClick: () => window.location.reload(),
          className: "mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        },
        "Refresh Page"
      )
    )
  );
};

// Expose to window for debugging
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).errorMonitor = errorMonitor;
}

export default errorMonitor;
