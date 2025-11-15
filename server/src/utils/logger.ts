/**
 * Structured Logging Utility
 * 
 * Provides consistent, structured logging with tags and metadata
 * Supports different log levels and formats for production observability
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  userId?: string;
  chainId?: number;
  txHash?: string;
  lockId?: string;
  entryId?: string;
  predictionId?: string;
  [key: string]: any;
}

/**
 * Structured logger with consistent formatting
 */
class StructuredLogger {
  private prefix: string;
  private enabled: boolean;

  constructor(prefix: string = '[FCZ]') {
    this.prefix = prefix;
    this.enabled = process.env.NODE_ENV !== 'test';
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `${this.prefix} [${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  info(message: string, context?: LogContext): void {
    if (!this.enabled) return;
    console.log(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: LogContext): void {
    if (!this.enabled) return;
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!this.enabled) return;
    const errorContext = {
      ...context,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
    console.error(this.formatMessage('error', message, errorContext));
  }

  debug(message: string, context?: LogContext): void {
    if (!this.enabled || process.env.NODE_ENV === 'production') return;
    console.debug(this.formatMessage('debug', message, context));
  }
}

// Export singleton loggers for different modules
export const logger = new StructuredLogger('[FCZ]');
export const payLogger = new StructuredLogger('[FCZ-PAY]');
export const betLogger = new StructuredLogger('[FCZ-BET]');
export const chainLogger = new StructuredLogger('[FCZ-CHAIN]');
export const apiLogger = new StructuredLogger('[FCZ-API]');

/**
 * Create a scoped logger for a specific operation
 */
export function createScopedLogger(scope: string): StructuredLogger {
  return new StructuredLogger(`[FCZ-${scope}]`);
}

/**
 * Log performance metrics
 */
export function logPerformance(operation: string, durationMs: number, context?: LogContext): void {
  if (durationMs > 1000) {
    payLogger.warn(`Slow operation: ${operation}`, { ...context, durationMs });
  } else {
    payLogger.debug(`Operation: ${operation}`, { ...context, durationMs });
  }
}

/**
 * Log API request/response
 */
export function logApiRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  context?: LogContext
): void {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  apiLogger[level](`${method} ${path}`, {
    ...context,
    statusCode,
    durationMs,
  });
}
