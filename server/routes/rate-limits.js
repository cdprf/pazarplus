const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const cacheService = require('../services/cache-service');
const logger = require('../utils/logger');

// Rate limiting management middleware - only for admins
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Get comprehensive rate limit status
router.get('/rate-limits', auth, requireAdmin, async (req, res) => {
  try {
    const { user: userId, type, ip } = req.query;

    let keys = [];
    if (userId) {
      keys = await cacheService.client.keys(`rate_limit:*${userId}*`);
    } else if (type) {
      keys = await cacheService.client.keys(`rate_limit:${type}:*`);
    } else if (ip) {
      keys = await cacheService.client.keys(`rate_limit:*${ip}*`);
    } else {
      keys = await cacheService.client.keys('rate_limit:*');
    }

    const rateLimits = {};
    for (const key of keys) {
      try {
        const value = await cacheService.client.get(key);
        const ttl = await cacheService.client.ttl(key);
        rateLimits[key] = {
          count: parseInt(value) || 0,
          ttl: ttl,
          expiresAt: ttl > 0 ? new Date(Date.now() + ttl * 1000) : null
        };
      } catch (error) {
        logger.warn(`Failed to get rate limit data for key ${key}:`, error);
      }
    }

    // Group by type for better overview
    const grouped = {};
    Object.entries(rateLimits).forEach(([key, data]) => {
      const parts = key.split(':');
      const type = parts[1] || 'unknown';
      if (!grouped[type]) {grouped[type] = [];}
      grouped[type].push({ key, ...data });
    });

    res.json({
      success: true,
      data: {
        total: Object.keys(rateLimits).length,
        byType: grouped,
        raw: rateLimits
      }
    });
  } catch (error) {
    logger.error('Rate limit status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get rate limit status',
      error: error.message
    });
  }
});

// Clear specific rate limits
router.delete('/rate-limits', auth, requireAdmin, async (req, res) => {
  try {
    const { user: userId, type, ip, key } = req.body;

    let keysToDelete = [];

    if (key) {
      // Delete specific key
      keysToDelete = [key];
    } else if (userId) {
      keysToDelete = await cacheService.client.keys(`rate_limit:*${userId}*`);
    } else if (type) {
      keysToDelete = await cacheService.client.keys(`rate_limit:${type}:*`);
    } else if (ip) {
      keysToDelete = await cacheService.client.keys(`rate_limit:*${ip}*`);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please specify user, type, ip, or specific key to delete'
      });
    }

    if (keysToDelete.length === 0) {
      return res.json({
        success: true,
        message: 'No rate limit entries found to delete',
        deleted: 0
      });
    }

    await cacheService.client.del(...keysToDelete);

    logger.info(`Rate limits cleared by admin ${req.user.id}`, {
      adminId: req.user.id,
      keysDeleted: keysToDelete.length,
      criteria: { user: userId, type, ip, key }
    });

    res.json({
      success: true,
      message: `Successfully cleared ${keysToDelete.length} rate limit entries`,
      deleted: keysToDelete.length
    });
  } catch (error) {
    logger.error('Rate limit clear error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear rate limits',
      error: error.message
    });
  }
});

// Check if user/IP is currently rate limited
router.post('/rate-limits/check', auth, async (req, res) => {
  try {
    const { identifier, type } = req.body;
    const checkId = identifier || req.user?.id || req.ip;

    const keys = await cacheService.client.keys(`rate_limit:*${checkId}*`);
    const limits = {};

    for (const key of keys) {
      const value = await cacheService.client.get(key);
      const ttl = await cacheService.client.ttl(key);
      limits[key] = {
        count: parseInt(value) || 0,
        ttl: ttl,
        resetTime: ttl > 0 ? new Date(Date.now() + ttl * 1000) : null
      };
    }

    res.json({
      success: true,
      data: {
        identifier: checkId,
        limits,
        isLimited: Object.keys(limits).length > 0
      }
    });
  } catch (error) {
    logger.error('Rate limit check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check rate limits',
      error: error.message
    });
  }
});

// Get rate limiting statistics
router.get('/rate-limits/stats', auth, requireAdmin, async (req, res) => {
  try {
    const allKeys = await cacheService.client.keys('rate_limit:*');

    const stats = {
      total: allKeys.length,
      byType: {},
      topUsers: {},
      recentActivity: []
    };

    // Analyze keys
    for (const key of allKeys) {
      const parts = key.split(':');
      const type = parts[1] || 'unknown';
      const identifier = parts[2] || 'unknown';

      // Count by type
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Count by user/IP
      if (identifier && identifier !== 'unknown') {
        stats.topUsers[identifier] = (stats.topUsers[identifier] || 0) + 1;
      }

      try {
        const count = await cacheService.client.get(key);
        const ttl = await cacheService.client.ttl(key);

        stats.recentActivity.push({
          key,
          type,
          identifier,
          count: parseInt(count) || 0,
          expiresIn: ttl
        });
      } catch (error) {
        // Skip if we can't read the key
      }
    }

    // Sort top users by number of rate limits
    stats.topUsers = Object.entries(stats.topUsers)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});

    // Sort recent activity by count (highest first)
    stats.recentActivity = stats.recentActivity
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Rate limit stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get rate limit statistics',
      error: error.message
    });
  }
});

module.exports = router;
