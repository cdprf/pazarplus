const Redis = require("redis");
const logger = require("../utils/logger");

/**
 * Redis Cache Service
 * Provides caching functionality for platform data, orders, and frequently accessed resources
 */
class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 3600; // 1 hour default TTL
  }

  async connect() {
    try {
      this.client = Redis.createClient({
        host: process.env.REDIS_HOST || "localhost",
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.client.on("error", (err) => {
        logger.error("Redis Client Error:", err);
        this.isConnected = false;
      });

      this.client.on("connect", () => {
        logger.info("Redis Client Connected");
        this.isConnected = true;
      });

      this.client.on("reconnecting", () => {
        logger.info("Redis Client Reconnecting");
      });

      await this.client.connect();

      // Test the connection
      await this.client.ping();
      logger.info("Redis cache service initialized successfully");

      return true;
    } catch (error) {
      logger.error("Failed to connect to Redis:", error);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        this.isConnected = false;
        logger.info("Redis connection closed");
      } catch (error) {
        logger.error("Error closing Redis connection:", error);
      }
    }
  }

  // Generic cache operations
  async get(key) {
    if (!this.isConnected) return null;

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isConnected) return false;

    try {
      await this.client.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected) return false;

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key) {
    if (!this.isConnected) return false;

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  // Business-specific cache operations
  async cacheUserOrders(userId, orders, ttl = 300) {
    const key = `user_orders:${userId}`;
    return await this.set(key, orders, ttl);
  }

  async getUserOrders(userId) {
    const key = `user_orders:${userId}`;
    return await this.get(key);
  }

  async cachePlatformOrders(connectionId, orders, ttl = 600) {
    const key = `platform_orders:${connectionId}`;
    return await this.set(key, orders, ttl);
  }

  async getPlatformOrders(connectionId) {
    const key = `platform_orders:${connectionId}`;
    return await this.get(key);
  }

  async cacheProductData(userId, products, ttl = 1800) {
    const key = `user_products:${userId}`;
    return await this.set(key, products, ttl);
  }

  async getUserProducts(userId) {
    const key = `user_products:${userId}`;
    return await this.get(key);
  }

  async cachePlatformConnection(connectionId, connectionData, ttl = 3600) {
    const key = `platform_connection:${connectionId}`;
    return await this.set(key, connectionData, ttl);
  }

  async getPlatformConnection(connectionId) {
    const key = `platform_connection:${connectionId}`;
    return await this.get(key);
  }

  // Rate limiting cache operations
  async incrementRateLimit(identifier, window = 60) {
    if (!this.isConnected)
      return { count: 0, resetTime: Date.now() + window * 1000 };

    const key = `rate_limit:${identifier}`;

    try {
      const multi = this.client.multi();
      multi.incr(key);
      multi.expire(key, window);
      const results = await multi.exec();

      const count = results[0][1];
      const resetTime = Date.now() + window * 1000;

      return { count, resetTime };
    } catch (error) {
      logger.error(`Rate limit error for ${identifier}:`, error);
      return { count: 0, resetTime: Date.now() + window * 1000 };
    }
  }

  async getRateLimit(identifier) {
    if (!this.isConnected) return { count: 0, resetTime: Date.now() };

    const key = `rate_limit:${identifier}`;

    try {
      const count = await this.client.get(key);
      const ttl = await this.client.ttl(key);

      return {
        count: parseInt(count) || 0,
        resetTime: ttl > 0 ? Date.now() + ttl * 1000 : Date.now(),
      };
    } catch (error) {
      logger.error(`Get rate limit error for ${identifier}:`, error);
      return { count: 0, resetTime: Date.now() };
    }
  }

  // Session management
  async cacheSession(sessionId, sessionData, ttl = 86400) {
    const key = `session:${sessionId}`;
    return await this.set(key, sessionData, ttl);
  }

  async getSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.get(key);
  }

  async deleteSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.del(key);
  }

  // Cache invalidation patterns
  async invalidateUserCache(userId) {
    if (!this.isConnected) return false;

    try {
      const patterns = [
        `user_orders:${userId}`,
        `user_products:${userId}`,
        `user_analytics:${userId}*`,
      ];

      for (const pattern of patterns) {
        if (pattern.includes("*")) {
          const keys = await this.client.keys(pattern);
          if (keys.length > 0) {
            await this.client.del(keys);
          }
        } else {
          await this.client.del(pattern);
        }
      }

      logger.info(`Cache invalidated for user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Cache invalidation error for user ${userId}:`, error);
      return false;
    }
  }

  async invalidatePlatformCache(connectionId) {
    if (!this.isConnected) return false;

    try {
      const patterns = [
        `platform_orders:${connectionId}`,
        `platform_connection:${connectionId}`,
        `platform_sync:${connectionId}*`,
      ];

      for (const pattern of patterns) {
        if (pattern.includes("*")) {
          const keys = await this.client.keys(pattern);
          if (keys.length > 0) {
            await this.client.del(keys);
          }
        } else {
          await this.client.del(pattern);
        }
      }

      logger.info(`Cache invalidated for platform connection ${connectionId}`);
      return true;
    } catch (error) {
      logger.error(
        `Cache invalidation error for connection ${connectionId}:`,
        error
      );
      return false;
    }
  }

  // Cache statistics and monitoring
  async getCacheStats() {
    if (!this.isConnected) return null;

    try {
      const info = await this.client.info("memory");
      const keyspace = await this.client.info("keyspace");

      return {
        memory: info,
        keyspace: keyspace,
        isConnected: this.isConnected,
      };
    } catch (error) {
      logger.error("Error getting cache stats:", error);
      return null;
    }
  }

  // Health check
  async healthCheck() {
    if (!this.isConnected) return false;

    try {
      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;

      return {
        status: "healthy",
        latency: `${latency}ms`,
        isConnected: this.isConnected,
      };
    } catch (error) {
      logger.error("Cache health check failed:", error);
      return {
        status: "unhealthy",
        error: error.message,
        isConnected: false,
      };
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

// Graceful shutdown handling
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, closing Redis connection");
  await cacheService.disconnect();
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, closing Redis connection");
  await cacheService.disconnect();
});

module.exports = cacheService;
