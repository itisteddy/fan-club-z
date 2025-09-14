// Centralized logging utility
export const logger = {
  debug: (...args: unknown[]) => {
    if (import.meta?.env?.MODE !== 'production') {
      console.debug('[FCZ]', ...args);
    }
  },
  info: (...args: unknown[]) => console.info('[FCZ]', ...args),
  warn: (...args: unknown[]) => console.warn('[FCZ]', ...args),
  error: (...args: unknown[]) => console.error('[FCZ]', ...args),
};

export default logger;
