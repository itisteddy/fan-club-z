type Level = 'error' | 'warn' | 'info' | 'debug';
const LEVELS: Record<Level, number> = { error: 0, warn: 1, info: 2, debug: 3 };
const envLevel = (import.meta.env.VITE_LOG_LEVEL ?? 'warn') as Level;
const threshold = LEVELS[envLevel] ?? 1;

function log(level: Level, ...args: any[]) {
  if (LEVELS[level] <= threshold) {
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](...args);
  }
}

export const logger = {
  error: (...a: any[]) => log('error', ...a),
  warn:  (...a: any[]) => log('warn', ...a),
  info:  (...a: any[]) => log('info', ...a),
  debug: (...a: any[]) => log('debug', ...a),
};
