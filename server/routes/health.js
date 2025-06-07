const express = require("express");
const router = express.Router();
const performanceMonitor = require("../services/performance-monitor");
const cacheService = require("../services/cache-service");
const { sequelize } = require("../models");
const logger = require("../utils/logger");

/**
 * Health Check and Metrics Endpoints
 * Provides application health status and performance metrics
 */

// Basic health check
router.get("/health", async (req, res) => {
  try {
    const healthMetrics = await performanceMonitor.getHealthMetrics();

    // Test database connection
    let dbStatus = "healthy";
    try {
      await sequelize.authenticate();
    } catch (error) {
      dbStatus = "unhealthy";
      logger.error("Database health check failed:", error);
    }

    const response = {
      ...healthMetrics,
      database: { status: dbStatus },
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
    };

    // Consider cache degraded mode as acceptable for development
    const cacheStatus = healthMetrics.cache?.status;
    const isCacheOk = cacheStatus === "healthy" || cacheStatus === "degraded";

    const overallStatus =
      healthMetrics.status === "healthy" && dbStatus === "healthy" && isCacheOk;

    res.status(overallStatus ? 200 : 503).json(response);
  } catch (error) {
    logger.error("Health check error:", error);
    res.status(503).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Detailed health check for monitoring systems
router.get("/health/detailed", async (req, res) => {
  try {
    // Database detailed check
    const dbCheck = async () => {
      try {
        const startTime = Date.now();
        await sequelize.query("SELECT 1");
        const latency = Date.now() - startTime;

        // Get connection pool status
        const pool = sequelize.connectionManager?.pool;

        return {
          status: "healthy",
          latency: `${latency}ms`,
          connections: {
            active: pool?.used?.length || 0,
            idle: pool?.available?.length || 0,
            total: pool?.size || 0,
          },
        };
      } catch (error) {
        return {
          status: "unhealthy",
          error: error.message,
        };
      }
    };

    // Cache detailed check
    const cacheCheck = await cacheService.healthCheck();
    const cacheStats = await cacheService.getCacheStats();

    // System metrics
    const systemMetrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      pid: process.pid,
      platform: process.platform,
      nodeVersion: process.version,
    };

    const response = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      database: await dbCheck(),
      cache: {
        ...cacheCheck,
        stats: cacheStats,
      },
      system: systemMetrics,
    };

    // Determine overall status
    const isHealthy =
      response.database.status === "healthy" &&
      response.cache.status === "healthy";

    response.status = isHealthy ? "healthy" : "degraded";

    res.status(isHealthy ? 200 : 503).json(response);
  } catch (error) {
    logger.error("Detailed health check error:", error);
    res.status(503).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Prometheus metrics endpoint
router.get("/metrics", async (req, res) => {
  try {
    const metrics = await performanceMonitor.getMetrics();
    res.set("Content-Type", "text/plain");
    res.send(metrics);
  } catch (error) {
    logger.error("Metrics endpoint error:", error);
    res.status(500).json({
      error: "Failed to generate metrics",
      message: error.message,
    });
  }
});

// Performance report endpoint (authenticated)
router.get("/performance", async (req, res) => {
  try {
    // This endpoint should be protected by authentication middleware
    const report = await performanceMonitor.generatePerformanceReport();

    if (!report) {
      return res.status(500).json({
        error: "Failed to generate performance report",
      });
    }

    res.json(report);
  } catch (error) {
    logger.error("Performance report error:", error);
    res.status(500).json({
      error: "Failed to generate performance report",
      message: error.message,
    });
  }
});

// Cache statistics endpoint (authenticated)
router.get("/cache/stats", async (req, res) => {
  try {
    const stats = await cacheService.getCacheStats();
    const health = await cacheService.healthCheck();

    res.json({
      health,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Cache stats error:", error);
    res.status(500).json({
      error: "Failed to get cache statistics",
      message: error.message,
    });
  }
});

// Cache management endpoints (authenticated admin only)
router.post("/cache/clear", async (req, res) => {
  try {
    const { pattern } = req.body;

    if (pattern) {
      // Clear specific pattern
      // This would need to be implemented in cacheService
      res.json({
        message: `Cache pattern ${pattern} clear requested`,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Clear all cache
      // Implementation would depend on Redis FLUSHDB or similar
      res.json({
        message: "Full cache clear requested",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error("Cache clear error:", error);
    res.status(500).json({
      error: "Failed to clear cache",
      message: error.message,
    });
  }
});

// Database optimization endpoint (authenticated admin only)
router.post("/database/optimize", async (req, res) => {
  try {
    const DatabaseOptimizer = require("../scripts/optimize-database");
    const optimizer = new DatabaseOptimizer();

    const result = await optimizer.run();

    res.json({
      message: "Database optimization completed",
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Database optimization error:", error);
    res.status(500).json({
      error: "Database optimization failed",
      message: error.message,
    });
  }
});

// Rate limit status endpoint
router.get("/rate-limits/:identifier?", async (req, res) => {
  try {
    const identifier = req.params.identifier || req.user?.id || req.ip;

    // Get rate limit status for different types
    const rateLimits = {
      api: await cacheService.getRateLimit(`rate_limit:${identifier}`),
      auth: await cacheService.getRateLimit(
        `rate_limit:${req.ip}:${req.user?.email || ""}`
      ),
      sync: await cacheService.getRateLimit(`rate_limit:sync:${req.user?.id}`),
      platform: await cacheService.getRateLimit(
        `rate_limit:platform_api:${identifier}`
      ),
    };

    res.json({
      identifier,
      rateLimits,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Rate limit status error:", error);
    res.status(500).json({
      error: "Failed to get rate limit status",
      message: error.message,
    });
  }
});

module.exports = router;
