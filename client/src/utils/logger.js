/**
 * Client-side logger utility
 * Provides consistent logging across the application
 */

const isDevelopment = process.env.NODE_ENV === "development";

class Logger {
  constructor() {
    this.isDev = isDevelopment;
  }

  info(message, ...args) {
    if (this.isDev) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  warn(message, ...args) {
    if (this.isDev) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message, ...args) {
    console.error(`[ERROR] ${message}`, ...args);
  }

  debug(message, ...args) {
    if (this.isDev) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  success(message, ...args) {
    if (this.isDev) {
      console.log(`[SUCCESS] ${message}`, ...args);
    }
  }
}

const logger = new Logger();

export default logger;
