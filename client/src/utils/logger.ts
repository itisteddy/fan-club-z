/**
 * Production-safe logger utility
 * Automatically disables console logs in production builds
 */

import { isDev, DEBUG_ENABLED } from '@/utils/environment';

const isDevelopment = isDev;
const isDebugMode = DEBUG_ENABLED;

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment || isDebugMode) {
      console.log(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (isDevelopment || isDebugMode) {
      console.info(...args);
    }
  },
  
  warn: (...args: any[]) => {
    // Always show warnings
    console.warn(...args);
  },
  
  error: (...args: any[]) => {
    // Always show errors
    console.error(...args);
  },
  
  debug: (...args: any[]) => {
    if (isDebugMode) {
      console.debug(...args);
    }
  },
  
  // Production-safe success logging
  success: (...args: any[]) => {
    if (isDevelopment || isDebugMode) {
      console.log('✅', ...args);
    }
  },
  
  // Production-safe API logging
  api: (...args: any[]) => {
    if (isDevelopment || isDebugMode) {
      console.log('📡', ...args);
    }
  },
  
  // Production-safe store logging
  store: (...args: any[]) => {
    if (isDevelopment || isDebugMode) {
      console.log('🏪', ...args);
    }
  }
};

export default logger;
