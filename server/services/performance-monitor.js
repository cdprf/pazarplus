let prometheus;
try {
  prometheus = require("prom-client");
} catch (error) {
  console.warn("prom-client module not available, performance monitoring disabled");
  prometheus = null;
}
const logger = require("../utils/logger");
const cacheService = require("./cache-service");

/**
 * Performance Monitoring Service
 * Tracks application metrics, response times, and business KPIs
 */
class PerformanceMonitor {
  constructor() {
    this.isEnabled = prometheus !== null;
    
    if (!this.isEnabled) {
      logger.info("Performance monitoring disabled - prom-client not available");
      return;
    }
    
    this.register = new prometheus.Registry();
    this.setupMetrics();
    this.setupDefaultMetrics();
  }

  setupDefaultMetrics() {
    if (!this.isEnabled) return;
    
    // Collect default Node.js metrics
    prometheus.collectDefaultMetrics({
      register: this.register,
      prefix: "pazar_plus_",
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });
  }

  setupMetrics() {
    if (!this.isEnabled) {
      // Create no-op metrics when prometheus is not available
      this.createNoOpMetrics();
      return;
    }
    
    // HTTP Request metrics
    this.httpRequestDuration = new prometheus.Histogram({
      name: "pazar_plus_http_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "route", "status_code", "user_id"],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    });

    this.httpRequestTotal = new prometheus.Counter({
      name: "pazar_plus_http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status_code"],
    });

    // Database metrics
    this.dbQueryDuration = new prometheus.Histogram({
      name: "pazar_plus_db_query_duration_seconds",
      help: "Database query execution time",
      labelNames: ["operation", "table", "user_id"],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    });

    this.dbConnectionPool = new prometheus.Gauge({
      name: "pazar_plus_db_connections_active",
      help: "Number of active database connections",
    });

    this.dbPoolSize = new prometheus.Gauge({
      name: "pazar_plus_db_pool_size",
      help: "Database connection pool size",
    });

    // Platform integration metrics
    this.platformApiCalls = new prometheus.Counter({
      name: "pazar_plus_platform_api_calls_total",
      help: "Total platform API calls",
      labelNames: ["platform", "endpoint", "status", "user_id"],
    });

    this.platformApiDuration = new prometheus.Histogram({
      name: "pazar_plus_platform_api_duration_seconds",
      help: "Platform API call duration",
      labelNames: ["platform", "endpoint"],
      buckets: [0.5, 1, 2, 5, 10, 30, 60],
    });

    this.platformSyncSuccess = new prometheus.Counter({
      name: "pazar_plus_platform_sync_success_total",
      help: "Successful platform synchronizations",
      labelNames: ["platform", "user_id"],
    });

    this.platformSyncErrors = new prometheus.Counter({
      name: "pazar_plus_platform_sync_errors_total",
      help: "Failed platform synchronizations",
      labelNames: ["platform", "error_type", "user_id"],
    });

    // Business metrics
    this.ordersProcessed = new prometheus.Counter({
      name: "pazar_plus_orders_processed_total",
      help: "Total orders processed",
      labelNames: ["platform", "status", "user_id"],
    });

    this.orderValue = new prometheus.Histogram({
      name: "pazar_plus_order_value_try",
      help: "Order values in Turkish Lira",
      labelNames: ["platform", "user_id"],
      buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
    });

    this.activeUsers = new prometheus.Gauge({
      name: "pazar_plus_active_users",
      help: "Number of active users in the last 24 hours",
    });

    this.platformConnections = new prometheus.Gauge({
      name: "pazar_plus_platform_connections_active",
      help: "Number of active platform connections",
      labelNames: ["platform"],
    });

    // Cache metrics
    this.cacheHits = new prometheus.Counter({
      name: "pazar_plus_cache_hits_total",
      help: "Cache hit count",
      labelNames: ["cache_type"],
    });

    this.cacheMisses = new prometheus.Counter({
      name: "pazar_plus_cache_misses_total",
      help: "Cache miss count",
      labelNames: ["cache_type"],
    });

    // Rate limiting metrics
    this.rateLimitHits = new prometheus.Counter({
      name: "pazar_plus_rate_limit_hits_total",
      help: "Rate limit violations",
      labelNames: ["limiter_type", "user_id"],
    });

    // Error metrics
    this.errorCount = new prometheus.Counter({
      name: "pazar_plus_errors_total",
      help: "Total application errors",
      labelNames: ["error_type", "endpoint", "user_id"],
    });

    // Register all metrics
    this.register.registerMetric(this.httpRequestDuration);
    this.register.registerMetric(this.httpRequestTotal);
    this.register.registerMetric(this.dbQueryDuration);
    this.register.registerMetric(this.dbConnectionPool);
    this.register.registerMetric(this.dbPoolSize);
    this.register.registerMetric(this.platformApiCalls);
    this.register.registerMetric(this.platformApiDuration);
    this.register.registerMetric(this.platformSyncSuccess);
    this.register.registerMetric(this.platformSyncErrors);
    this.register.registerMetric(this.ordersProcessed);
    this.register.registerMetric(this.orderValue);
    this.register.registerMetric(this.activeUsers);
    this.register.registerMetric(this.platformConnections);
    this.register.registerMetric(this.cacheHits);
    this.register.registerMetric(this.cacheMisses);
    this.register.registerMetric(this.rateLimitHits);
    this.register.registerMetric(this.errorCount);
  }

  // Middleware for HTTP request monitoring
  createHttpMonitoringMiddleware() {
    return (req, res, next) => {
      if (!this.isEnabled) {
        return next();
      }
      
      const start = Date.now();

      res.on("finish", () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route?.path || req.path;
        const userId = req.user?.id || "anonymous";

        this.httpRequestDuration
          .labels(req.method, route, res.statusCode.toString(), userId)
          .observe(duration);

        this.httpRequestTotal
          .labels(req.method, route, res.statusCode.toString())
          .inc();

        // Log slow requests
        if (duration > 2) {
          logger.warn("Slow request detected", {
            method: req.method,
            path: req.path,
            duration: `${duration}s`,
            userId,
            statusCode: res.statusCode,
          });
        }
      });

      next();
    };
  }

  // Database query monitoring
  trackDbQuery(operation, table, userId, duration) {
    if (!this.isEnabled) return;
    
    this.dbQueryDuration
      .labels(operation, table, userId || "system")
      .observe(duration);
  }

  // Platform API monitoring
  trackPlatformApiCall(platform, endpoint, status, userId, duration) {
    if (!this.isEnabled) return;
    
    this.platformApiCalls.labels(platform, endpoint, status, userId).inc();

    this.platformApiDuration.labels(platform, endpoint).observe(duration);
  }

  // Platform sync monitoring
  trackPlatformSync(platform, userId, success, errorType = null) {
    if (success) {
      this.platformSyncSuccess.labels(platform, userId).inc();
    } else {
      this.platformSyncErrors
        .labels(platform, errorType || "unknown", userId)
        .inc();
    }
  }

  // Business metrics tracking
  trackOrderProcessed(platform, status, userId, orderValue) {
    this.ordersProcessed.labels(platform, status, userId).inc();

    if (orderValue && orderValue > 0) {
      this.orderValue.labels(platform, userId).observe(orderValue);
    }
  }

  // Cache monitoring
  trackCacheHit(cacheType) {
    this.cacheHits.labels(cacheType).inc();
  }

  trackCacheMiss(cacheType) {
    this.cacheMisses.labels(cacheType).inc();
  }

  // Rate limiting monitoring
  trackRateLimitHit(limiterType, userId) {
    this.rateLimitHits.labels(limiterType, userId || "anonymous").inc();
  }

  // Error tracking
  trackError(errorType, endpoint, userId) {
    this.errorCount.labels(errorType, endpoint, userId || "anonymous").inc();
  }

  // Update real-time gauges
  async updateGauges() {
    try {
      // Database connection pool metrics
      try {
        const { sequelize } = require("../models");
        const pool = sequelize?.connectionManager?.pool;
        if (pool) {
          this.dbConnectionPool.set(pool.used?.length || 0);
          this.dbPoolSize.set(pool.size || 0);
        } else {
          this.dbConnectionPool.set(0);
          this.dbPoolSize.set(0);
        }
      } catch (dbError) {
        logger.warn(
          "Could not access database connection pool:",
          dbError.message
        );
        this.dbConnectionPool.set(0);
        this.dbPoolSize.set(0);
      }

      // Active users (last 24 hours)
      const activeUserCount = await this.getActiveUserCount();
      this.activeUsers.set(activeUserCount);

      // Platform connections
      const connectionCounts = await this.getPlatformConnectionCounts();
      for (const [platform, count] of Object.entries(connectionCounts)) {
        this.platformConnections.labels(platform).set(count);
      }
    } catch (error) {
      logger.error("Error updating performance gauges:", error);
    }
  }

  async getActiveUserCount() {
    try {
      const { User } = require("../models");
      const { Op } = require("sequelize");

      const count = await User.count({
        where: {
          lastLogin: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      return count;
    } catch (error) {
      logger.error("Error getting active user count:", error);
      return 0;
    }
  }

  async getPlatformConnectionCounts() {
    try {
      const { PlatformConnection } = require("../models");
      const { Op } = require("sequelize");

      const counts = await PlatformConnection.findAll({
        attributes: [
          "platformType",
          [PlatformConnection.sequelize.fn("COUNT", "*"), "count"],
        ],
        where: {
          isActive: true,
          status: "active",
        },
        group: ["platformType"],
        raw: true,
      });

      const result = {};
      counts.forEach((item) => {
        result[item.platformType] = parseInt(item.count);
      });

      return result;
    } catch (error) {
      logger.error("Error getting platform connection counts:", error);
      return {};
    }
  }

  // Generate performance report
  async generatePerformanceReport() {
    try {
      const metrics = await this.register.metrics();
      const cacheStats = await cacheService.getCacheStats();

      return {
        timestamp: new Date().toISOString(),
        metrics: metrics,
        cache: cacheStats,
        summary: {
          httpRequests: await this.httpRequestTotal.get(),
          errors: await this.errorCount.get(),
          rateLimitHits: await this.rateLimitHits.get(),
        },
      };
    } catch (error) {
      logger.error("Error generating performance report:", error);
      return null;
    }
  }

  // Health check endpoint data
  async getHealthMetrics() {
    try {
      const cacheHealth = await cacheService.healthCheck();

      return {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cache: cacheHealth,
        activeConnections: this.dbConnectionPool.get()?.values?.[0]?.value || 0,
      };
    } catch (error) {
      logger.error("Error getting health metrics:", error);
      return {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Start periodic updates
  startPeriodicUpdates() {
    // Update gauges every 30 seconds
    setInterval(() => {
      this.updateGauges().catch((error) => {
        logger.error("Error in periodic gauge update:", error);
      });
    }, 30000);

    logger.info("Performance monitoring started with periodic updates");
  }

  // Get metrics for Prometheus scraping
  async getMetrics() {
    if (!this.isEnabled) {
      return "";
    }
    return await this.register.metrics();
  }

  createNoOpMetrics() {
    // Create no-op objects that have the same interface as prometheus metrics
    const noOpMetric = {
      labels: () => ({ observe: () => {}, inc: () => {}, set: () => {} }),
      observe: () => {},
      inc: () => {},
      set: () => {},
    };

    this.httpRequestDuration = noOpMetric;
    this.httpRequestTotal = noOpMetric;
    this.dbQueryDuration = noOpMetric;
    this.dbConnectionPool = noOpMetric;
    this.dbPoolSize = noOpMetric;
    this.platformApiCalls = noOpMetric;
    this.platformApiDuration = noOpMetric;
    this.platformSyncSuccess = noOpMetric;
    this.platformSyncErrors = noOpMetric;
    this.ordersProcessed = noOpMetric;
    this.orderValue = noOpMetric;
    this.activeUsers = noOpMetric;
    this.platformConnections = noOpMetric;
    this.cacheHits = noOpMetric;
    this.cacheMisses = noOpMetric;
    this.rateLimitHits = noOpMetric;
    this.errorCount = noOpMetric;
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;
