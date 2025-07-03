/**
 * Client-side logger utility
 * Provides consistent logging across the application with persistent storage
 */

const isDevelopment = process.env.NODE_ENV === "development";

class Logger {
  constructor() {
    this.isDev = isDevelopment;
    this.logs = [];
    this.maxLogs = 1000;
    this.listeners = [];

    // Load existing logs from localStorage if available
    this.loadLogs();
  }

  // Load logs from localStorage
  loadLogs() {
    try {
      const stored = localStorage.getItem("app_logs");
      if (stored) {
        this.logs = JSON.parse(stored).slice(-this.maxLogs);
      }
    } catch (err) {
      console.warn("Failed to load stored logs:", err);
    }
  }

  // Save logs to localStorage
  saveLogs() {
    try {
      localStorage.setItem(
        "app_logs",
        JSON.stringify(this.logs.slice(-this.maxLogs))
      );
    } catch (err) {
      // localStorage might be full, remove old logs and try again
      this.logs = this.logs.slice(-Math.floor(this.maxLogs / 2));
      try {
        localStorage.setItem("app_logs", JSON.stringify(this.logs));
      } catch (err2) {
        console.warn("Failed to save logs to localStorage:", err2);
      }
    }
  }

  // Add listener for log events
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(
        (listener) => listener !== callback
      );
    };
  }

  // Internal log method
  _log(level, category, message, data = {}) {
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: typeof data === "object" ? data : { value: data },
      stack: level === "error" ? new Error().stack : undefined,
    };

    // Add to logs array
    this.logs.push(logEntry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Save to localStorage periodically
    if (this.logs.length % 10 === 0) {
      this.saveLogs();
    }

    // Notify listeners
    this.listeners.forEach((listener) => {
      try {
        listener(logEntry);
      } catch (err) {
        console.error("Logger listener error:", err);
      }
    });

    // Console output for development
    if (this.isDev) {
      const prefix = `[${level.toUpperCase()}][${category.toUpperCase()}]`;
      const consoleMethod =
        level === "debug" ? "log" : level === "success" ? "log" : level;
      if (console[consoleMethod]) {
        console[consoleMethod](`${prefix} ${message}`, logEntry.data);
      }
    }

    return logEntry;
  }

  info(message, data, category = "general") {
    return this._log("info", category, message, data);
  }

  warn(message, data, category = "general") {
    return this._log("warn", category, message, data);
  }

  error(message, data, category = "general") {
    return this._log("error", category, message, data);
  }

  debug(message, data, category = "general") {
    return this._log("debug", category, message, data);
  }

  success(message, data, category = "general") {
    return this._log("success", category, message, data);
  }

  // Category-specific loggers
  websocket = {
    info: (message, data) => this.info(message, data, "websocket"),
    warn: (message, data) => this.warn(message, data, "websocket"),
    error: (message, data) => this.error(message, data, "websocket"),
    debug: (message, data) => this.debug(message, data, "websocket"),
    success: (message, data) => this.success(message, data, "websocket"),
  };

  api = {
    info: (message, data) => this.info(message, data, "api"),
    warn: (message, data) => this.warn(message, data, "api"),
    error: (message, data) => this.error(message, data, "api"),
    debug: (message, data) => this.debug(message, data, "api"),
    success: (message, data) => this.success(message, data, "api"),
  };

  ui = {
    info: (message, data) => this.info(message, data, "ui"),
    warn: (message, data) => this.warn(message, data, "ui"),
    error: (message, data) => this.error(message, data, "ui"),
    debug: (message, data) => this.debug(message, data, "ui"),
    success: (message, data) => this.success(message, data, "ui"),
  };

  // Utility methods
  getLogs(category = null, level = null) {
    let filtered = this.logs;

    if (category) {
      filtered = filtered.filter((log) => log.category === category);
    }

    if (level) {
      filtered = filtered.filter((log) => log.level === level);
    }

    return filtered;
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem("app_logs");
  }

  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }

  searchLogs(query) {
    const lowerQuery = query.toLowerCase();
    return this.logs.filter(
      (log) =>
        log.message.toLowerCase().includes(lowerQuery) ||
        log.category.toLowerCase().includes(lowerQuery) ||
        JSON.stringify(log.data).toLowerCase().includes(lowerQuery)
    );
  }
}

const logger = new Logger();

export default logger;
