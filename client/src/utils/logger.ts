type Level = 'debug' | 'info' | 'warn' | 'error';

const enabled = import.meta.env.MODE === 'development';
let last: Record<string, number> = {};

export const log = (level: Level, key: string, ...args: any[]) => {
  if (!enabled) return;
  
  const now = Date.now();
  
  if (level === 'debug') {
    // Simple throttle for debug logs
    if (now - (last[key] || 0) < 750) return;
    last[key] = now;
  }
  
  // eslint-disable-next-line no-console
  console[level](`[${key}]`, ...args);
};

// Convenience methods
export const debug = (key: string, ...args: any[]) => log('debug', key, ...args);
export const info = (key: string, ...args: any[]) => log('info', key, ...args);
export const warn = (key: string, ...args: any[]) => log('warn', key, ...args);
export const error = (key: string, ...args: any[]) => log('error', key, ...args);