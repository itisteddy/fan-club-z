/**
 * Tiny logger utility with default export only
 * Never import named {logger} - always use default import
 */

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

class TinyLogger implements Logger {
  private prefix = '[FCZ]';
  private isDev = import.meta?.env?.MODE !== 'production';

  debug(...args: unknown[]) {
    if (this.isDev) {
      console.debug(this.prefix, ...args);
    }
  }

  info(...args: unknown[]) {
    console.info(this.prefix, ...args);
  }

  warn(...args: unknown[]) {
    console.warn(this.prefix, ...args);
  }

  error(...args: unknown[]) {
    console.error(this.prefix, ...args);
  }
}

// Default export only - never use named imports
const logger = new TinyLogger();
export default logger;
