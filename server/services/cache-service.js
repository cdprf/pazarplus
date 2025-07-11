let Redis;
try {
  Redis = require("redis");
} catch (error) {
  console.warn("Redis module not available, using in-memory cache only");
  Redis = null;
}
const logger = require("../utils/logger");

/**
 * Redis Cache Service
 * Provides caching functionality for platform data, orders, and frequently accessed resources
 * Falls back to in-memory cache when Redis is unavailable
 */
class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 3600; // 1 hour default TTL
    this.fallbackCache = new Map(); // In-memory fallback
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 3;
    this.lastConnectionAttempt = 0;
    this.reconnectInterval = 30000; // 30 seconds between attempts
    this.useRedis = Redis !== null && process.env.REDIS_ENABLED !== "false";

    // In development, don't attempt Redis connection unless explicitly enabled
    if (
      process.env.NODE_ENV === "development" &&
      process.env.REDIS_ENABLED !== "true"
    ) {
      this.useRedis = false;
      logger.info(
        "Redis disabled in development environment. Set REDIS_ENABLED=true to enable."
      );
    }
  }

  async connect() {
    const now = Date.now();

    // If Redis module is not available, skip connection
    if (!this.useRedis) {
      logger.warn("Redis module not available, using in-memory cache only");
      return false;
    }

    // Don't attempt connection if we've reached max attempts and haven't waited long enough
    if (
      this.connectionAttempts >= this.maxConnectionAttempts &&
      now - this.lastConnectionAttempt < this.reconnectInterval
    ) {
      return false;
    }

    // Reset attempts after waiting period
    if (now - this.lastConnectionAttempt >= this.reconnectInterval) {
      this.connectionAttempts = 0;
    }

    this.lastConnectionAttempt = now;

    try {
      this.client = Redis.createClient({
        host: process.env.REDIS_HOST || "localhost",
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 1, // Reduced from 3
        lazyConnect: true,
        connectTimeout: 3000, // Reduced from 5000
      });

      this.client.on("error", (err) => {
        if (this.connectionAttempts === 0) {
          logger.warn("Redis unavailable, using in-memory cache fallback");
        }
        this.isConnected = false;
        this.connectionAttempts++;
      });

      this.client.on("connect", () => {
        logger.info("Redis cache connected successfully");
        this.isConnected = true;
        this.connectionAttempts = 0;
      });

      // Add manual timeout wrapper
      const connectWithTimeout = () => {
        return Promise.race([
          this.client.connect(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Connection timeout")), 5000)
          ),
        ]);
      };

      await connectWithTimeout();
      await this.client.ping();
      logger.info("Redis cache service initialized successfully");
      return true;
    } catch (error) {
      this.connectionAttempts++;
      if (this.connectionAttempts === 1) {
        logger.warn("Redis not available, using fallback cache");
      }
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
    this.fallbackCache.clear();
  }

  // Generic cache operations with fallback
  async get(key) {
    if (this.isConnected && this.client) {
      try {
        const value = await this.client.get(key);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        logger.warn(
          `Redis get error for key ${key}, using fallback:`,
          error.message
        );
        this.isConnected = false;
      }
    }

    // Fallback to in-memory cache
    const fallbackValue = this.fallbackCache.get(key);
    if (fallbackValue && fallbackValue.expires > Date.now()) {
      return fallbackValue.data;
    } else if (fallbackValue) {
      this.fallbackCache.delete(key);
    }
    return null;
  }

  async set(key, value, ttl = this.defaultTTL) {
    const serializedValue = JSON.stringify(value);

    if (this.isConnected && this.client) {
      try {
        await this.client.setEx(key, ttl, serializedValue);
        return true;
      } catch (error) {
        logger.warn(
          `Redis set error for key ${key}, using fallback:`,
          error.message
        );
        this.isConnected = false;
      }
    }

    // Fallback to in-memory cache
    this.fallbackCache.set(key, {
      data: value,
      expires: Date.now() + ttl * 1000,
    });
    return true;
  }

  async del(key) {
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
      } catch (error) {
        logger.warn(`Redis del error for key ${key}:`, error.message);
        this.isConnected = false;
      }
    }

    // Also remove from fallback cache
    this.fallbackCache.delete(key);
    return true;
  }

  async exists(key) {
    if (!this.isConnected) {
      return false;
    }

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
    if (!this.isConnected) {
      return { count: 0, resetTime: Date.now() + window * 1000 };
    }

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
    if (!this.isConnected) {
      return { count: 0, resetTime: Date.now() };
    }

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
    if (!this.isConnected) {
      return false;
    }

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
    if (!this.isConnected) {
      return false;
    }

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
    const stats = {
      isConnected: this.isConnected,
      fallbackCacheSize: this.fallbackCache.size,
      connectionAttempts: this.connectionAttempts,
    };

    if (this.isConnected && this.client) {
      try {
        const info = await this.client.info("memory");
        const keyspace = await this.client.info("keyspace");
        stats.memory = info;
        stats.keyspace = keyspace;
      } catch (error) {
        logger.warn("Error getting Redis cache stats:", error.message);
        this.isConnected = false;
      }
    }

    return stats;
  }

  // Health check
  async healthCheck() {
    if (!this.isConnected) {
      return {
        status: "degraded",
        message: "Using fallback cache",
        isConnected: false,
        fallbackCacheSize: this.fallbackCache.size,
      };
    }

    try {
      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;

      return {
        status: "healthy",
        latency: `${latency}ms`,
        isConnected: this.isConnected,
        fallbackCacheSize: this.fallbackCache.size,
      };
    } catch (error) {
      logger.error("Cache health check failed:", error);
      this.isConnected = false;
      return {
        status: "unhealthy",
        error: error.message,
        isConnected: false,
        fallbackCacheSize: this.fallbackCache.size,
      };
    }
  }

  // Get keys matching pattern
  async getKeys(pattern) {
    if (!this.isConnected) {
      // For fallback cache, filter Map keys by pattern
      const keys = Array.from(this.fallbackCache.keys());
      if (pattern.includes("*")) {
        const regex = new RegExp(pattern.replace(/\*/g, ".*"));
        return keys.filter((key) => regex.test(key));
      }
      return keys.filter((key) => key === pattern);
    }

    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error(`Get keys error for pattern ${pattern}:`, error);
      return [];
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
