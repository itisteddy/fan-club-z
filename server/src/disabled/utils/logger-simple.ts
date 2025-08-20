/**
 * Simple Logger for Development
 * Fallback when full Winston logger fails
 */

interface LogLevel {
  info: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
}

const createSimpleLogger = (): LogLevel => {
  const timestamp = () => new Date().toISOString();
  
  return {
    info: (message: string, ...args: any[]) => {
      console.log(`[${timestamp()}] INFO: ${message}`, ...args);
    },
    error: (message: string, ...args: any[]) => {
      console.error(`[${timestamp()}] ERROR: ${message}`, ...args);
    },
    warn: (message: string, ...args: any[]) => {
      console.warn(`[${timestamp()}] WARN: ${message}`, ...args);
    },
    debug: (message: string, ...args: any[]) => {
      console.log(`[${timestamp()}] DEBUG: ${message}`, ...args);
    }
  };
};

let logger: LogLevel;

try {
  // Try to import the full Winston logger
  const winston = require('winston');
  const config = require('../config');
  
  logger = winston.createLogger({
    level: config.default?.logging?.level || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.simple()
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ]
  });
} catch (error) {
  // Fallback to simple logger if Winston fails
  console.warn('⚠️ Winston logger failed to initialize, using simple logger');
  logger = createSimpleLogger();
}

export default logger;
