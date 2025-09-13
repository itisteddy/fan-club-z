// Centralized logging utility
export const log = {
  debug: (...args: unknown[]) => {
    if (import.meta?.env?.MODE !== 'production') {
      console.debug(...args);
    }
  },
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export default log;

// Named export for compatibility
export const debug = log.debug;
export const info = log.info;
export const warn = log.warn;
export const error = log.error;
