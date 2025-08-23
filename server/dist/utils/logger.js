"use strict";
/**
 * Simple logger utility for Fan Club Z
 */
Object.defineProperty(exports, "__esModule", { value: true });
class SimpleLogger {
    log(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        console.log(prefix, message, ...args);
    }
    info(message, ...args) {
        this.log('info', message, ...args);
    }
    warn(message, ...args) {
        this.log('warn', message, ...args);
    }
    error(message, ...args) {
        this.log('error', message, ...args);
    }
    debug(message, ...args) {
        this.log('debug', message, ...args);
    }
}
const logger = new SimpleLogger();
exports.default = logger;
