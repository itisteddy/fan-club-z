/**
 * Development-only QA logging utility
 * Logs are only shown in development builds, production remains silent
 */

export const qaLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log('[FCZ-QA]', ...args);
  }
};

export const qaWarn = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.warn('[FCZ-QA]', ...args);
  }
};

export const qaError = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.error('[FCZ-QA]', ...args);
  }
};

export const qaGroup = (label: string) => {
  if (import.meta.env.DEV) {
    console.group(`[FCZ-QA] ${label}`);
  }
};

export const qaGroupEnd = () => {
  if (import.meta.env.DEV) {
    console.groupEnd();
  }
};

export const qaTime = (label: string) => {
  if (import.meta.env.DEV) {
    console.time(`[FCZ-QA] ${label}`);
  }
};

export const qaTimeEnd = (label: string) => {
  if (import.meta.env.DEV) {
    console.timeEnd(`[FCZ-QA] ${label}`);
  }
};
