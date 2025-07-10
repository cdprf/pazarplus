const express = require('express');
const router = express.Router();
const platformController = require('../controllers/platform-controller');
const { auth } = require('../middleware/auth');
const { platformServiceFactory } = require('../services/platform-factory');
const { body, query, param, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Define validateRequest locally to avoid import issues
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Apply authentication middleware
router.use(auth);

// Platform connection routes
router.get('/connections', platformController.getConnections);
router.post('/connections', platformController.createConnection);
router.get('/connections/:id', platformController.getConnection);
router.put('/connections/:id', platformController.updateConnection);
router.delete('/connections/:id', platformController.deleteConnection);
router.post('/connections/:id/test', platformController.testConnection);

// Platform settings routes
router.get(
  '/connections/:id/settings',
  platformController.getConnectionSettings
);
router.put(
  '/connections/:id/settings',
  platformController.updateConnectionSettings
);

// Platform sync routes
router.post('/connections/:id/sync', platformController.syncPlatform);

// Platform analytics routes
router.get(
  '/connections/:id/analytics',
  platformController.getPlatformAnalytics
);

// Platform sync history routes
router.get('/connections/:id/sync-history', platformController.getSyncHistory);
router.post(
  '/connections/:id/sync-history/:syncId/retry',
  platformController.retrySyncHistory
);

// Enhanced Platform Routes - merged from enhanced-platforms.js

/**
 * GET /api/platforms/health
 * Get global health status of all platform services
 */
router.get('/health', async (req, res) => {
  try {
    const healthStatus = platformServiceFactory.getGlobalHealthStatus();

    res.json({
      success: true,
      data: healthStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get platform health status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve health status',
      error: error.message
    });
  }
});

/**
 * GET /api/platforms/available
 * Get list of available enhanced platform integrations
 */
router.get('/available', async (req, res) => {
  try {
    const platforms = platformServiceFactory.getAvailablePlatforms();

    res.json({
      success: true,
      data: platforms,
      total: platforms.length
    });
  } catch (error) {
    logger.error('Failed to get available platforms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve available platforms',
      error: error.message
    });
  }
});

/**
 * POST /api/platforms/:platform/connections/:connectionId/sync
 * Trigger manual sync for a specific platform connection
 */
router.post(
  '/:platform/connections/:connectionId/sync',
  [
    param('platform')
      .isIn(['trendyol', 'hepsiburada', 'n11'])
      .withMessage('Invalid platform'),
    param('connectionId').isUUID().withMessage('Invalid connection ID'),
    body('startDate').optional().isISO8601().withMessage('Invalid start date'),
    body('endDate').optional().isISO8601().withMessage('Invalid end date'),
    body('pageSize')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Page size must be between 1 and 100'),
    body('maxPages')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Max pages must be between 1 and 50'),
    body('processCompliance')
      .optional()
      .isBoolean()
      .withMessage('Process compliance must be boolean'),
    validateRequest
  ],
  async (req, res) => {
    try {
      const { platform, connectionId } = req.params;
      const options = req.body;

      // Get connection data
      const { PlatformConnection } = require('../models');
      const connection = await PlatformConnection.findOne({
        where: {
          id: connectionId,
          userId: req.user.id,
          platformType: platform,
          isActive: true
        }
      });

      if (!connection) {
        return res.status(404).json({
          success: false,
          message: 'Platform connection not found or inactive'
        });
      }

      // Create or get service
      const service = await platformServiceFactory.createService(platform, {
        id: connection.id,
        userId: connection.userId,
        credentials: JSON.parse(connection.credentials),
        settings: connection.settings || {}
      });

      // Perform sync
      const result = await platformServiceFactory.performSync(
        platform,
        connectionId,
        options
      );

      res.json({
        success: true,
        message: 'Sync completed successfully',
        data: result
      });
    } catch (error) {
      logger.error('Manual sync failed:', error);
      res.status(500).json({
        success: false,
        message: 'Sync failed',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/platforms/:platform/connections/:connectionId/realtime/start
 * Start real-time sync for a platform connection
 */
router.post(
  '/:platform/connections/:connectionId/realtime/start',
  [
    param('platform')
      .isIn(['trendyol', 'hepsiburada', 'n11'])
      .withMessage('Invalid platform'),
    param('connectionId').isUUID().withMessage('Invalid connection ID'),
    body('interval')
      .optional()
      .isInt({ min: 60000, max: 3600000 })
      .withMessage('Interval must be between 1 minute and 1 hour'),
    body('processCompliance')
      .optional()
      .isBoolean()
      .withMessage('Process compliance must be boolean'),
    validateRequest
  ],
  async (req, res) => {
    try {
      const { platform, connectionId } = req.params;
      const options = req.body;

      // Verify connection ownership
      const { PlatformConnection } = require('../models');
      const connection = await PlatformConnection.findOne({
        where: {
          id: connectionId,
          userId: req.user.id,
          platformType: platform,
          isActive: true
        }
      });

      if (!connection) {
        return res.status(404).json({
          success: false,
          message: 'Platform connection not found or inactive'
        });
      }

      // Create or get service
      const service = await platformServiceFactory.createService(platform, {
        id: connection.id,
        userId: connection.userId,
        credentials: JSON.parse(connection.credentials),
        settings: connection.settings || {}
      });

      // Start real-time sync
      const result = await platformServiceFactory.startRealTimeSync(
        platform,
        connectionId,
        options
      );

      res.json({
        success: true,
        message: 'Real-time sync started successfully',
        data: result
      });
    } catch (error) {
      logger.error('Failed to start real-time sync:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start real-time sync',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/platforms/:platform/connections/:connectionId/realtime/stop
 * Stop real-time sync for a platform connection
 */
router.post(
  '/:platform/connections/:connectionId/realtime/stop',
  [
    param('platform')
      .isIn(['trendyol', 'hepsiburada', 'n11'])
      .withMessage('Invalid platform'),
    param('connectionId').isUUID().withMessage('Invalid connection ID'),
    validateRequest
  ],
  async (req, res) => {
    try {
      const { platform, connectionId } = req.params;

      // Verify connection ownership
      const { PlatformConnection } = require('../models');
      const connection = await PlatformConnection.findOne({
        where: {
          id: connectionId,
          userId: req.user.id,
          platformType: platform
        }
      });

      if (!connection) {
        return res.status(404).json({
          success: false,
          message: 'Platform connection not found'
        });
      }

      // Stop real-time sync
      const result = await platformServiceFactory.stopRealTimeSync(
        platform,
        connectionId
      );

      res.json({
        success: true,
        message: 'Real-time sync stopped successfully',
        data: result
      });
    } catch (error) {
      logger.error('Failed to stop real-time sync:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to stop real-time sync',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/platforms/:platform/connections/:connectionId/status
 * Get detailed status for a specific platform service
 */
router.get(
  '/:platform/connections/:connectionId/status',
  [
    param('platform')
      .isIn(['trendyol', 'hepsiburada', 'n11'])
      .withMessage('Invalid platform'),
    param('connectionId').isUUID().withMessage('Invalid connection ID'),
    validateRequest
  ],
  async (req, res) => {
    try {
      const { platform, connectionId } = req.params;

      // Verify connection ownership
      const { PlatformConnection } = require('../models');
      const connection = await PlatformConnection.findOne({
        where: {
          id: connectionId,
          userId: req.user.id,
          platformType: platform
        }
      });

      if (!connection) {
        return res.status(404).json({
          success: false,
          message: 'Platform connection not found'
        });
      }

      // Get service status
      const service = platformServiceFactory.getService(platform, connectionId);

      if (!service) {
        return res.json({
          success: true,
          data: {
            status: 'inactive',
            message: 'Service not currently running'
          }
        });
      }

      const healthStatus = service.getHealthStatus();

      res.json({
        success: true,
        data: healthStatus
      });
    } catch (error) {
      logger.error('Failed to get service status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve service status',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/platforms/user/connections
 * Get all enhanced platform connections for the authenticated user
 */
router.get('/user/connections', async (req, res) => {
  try {
    const { PlatformConnection } = require('../models');

    const connections = await PlatformConnection.findAll({
      where: {
        userId: req.user.id,
        isActive: true
      },
      attributes: ['id', 'platformType', 'settings', 'createdAt', 'lastSync'],
      order: [['createdAt', 'DESC']]
    });

    // Enhance with service status
    const enhancedConnections = connections.map((connection) => {
      const service = platformServiceFactory.getService(
        connection.platformType,
        connection.id
      );

      return {
        ...connection.toJSON(),
        serviceStatus: service
          ? service.getHealthStatus()
          : { status: 'inactive' }
      };
    });

    res.json({
      success: true,
      data: enhancedConnections,
      total: enhancedConnections.length
    });
  } catch (error) {
    logger.error('Failed to get user connections:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve connections',
      error: error.message
    });
  }
});

/**
 * DELETE /api/platforms/:platform/connections/:connectionId
 * Destroy a platform service and clean up resources
 */
router.delete(
  '/:platform/connections/:connectionId',
  [
    param('platform')
      .isIn(['trendyol', 'hepsiburada', 'n11'])
      .withMessage('Invalid platform'),
    param('connectionId').isUUID().withMessage('Invalid connection ID'),
    validateRequest
  ],
  async (req, res) => {
    try {
      const { platform, connectionId } = req.params;

      // Verify connection ownership
      const { PlatformConnection } = require('../models');
      const connection = await PlatformConnection.findOne({
        where: {
          id: connectionId,
          userId: req.user.id,
          platformType: platform
        }
      });

      if (!connection) {
        return res.status(404).json({
          success: false,
          message: 'Platform connection not found'
        });
      }

      // Destroy service
      const result = await platformServiceFactory.destroyService(
        platform,
        connectionId
      );

      res.json({
        success: true,
        message: 'Platform service destroyed successfully',
        data: result
      });
    } catch (error) {
      logger.error('Failed to destroy platform service:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to destroy platform service',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/platforms/compliance/:orderId
 * Get compliance status for a specific order
 */
router.get(
  '/compliance/:orderId',
  [param('orderId').isUUID().withMessage('Invalid order ID'), validateRequest],
  async (req, res) => {
    try {
      const { orderId } = req.params;

      // Verify order ownership
      const { Order } = require('../models');
      const order = await Order.findOne({
        where: {
          id: orderId,
          userId: req.user.id
        }
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Get compliance status
      const {
        TurkishComplianceService
      } = require('../services/turkishComplianceService');
      const complianceService = new TurkishComplianceService();

      const complianceStatus = await complianceService.getComplianceStatus(
        orderId
      );

      res.json({
        success: true,
        data: complianceStatus
      });
    } catch (error) {
      logger.error('Failed to get compliance status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve compliance status',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/platforms/compliance/report
 * Generate compliance report for date range
 */
router.get(
  '/compliance/report',
  [
    query('startDate').isISO8601().withMessage('Invalid start date'),
    query('endDate').isISO8601().withMessage('Invalid end date'),
    validateRequest
  ],
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      // Get compliance report
      const {
        TurkishComplianceService
      } = require('../services/turkishComplianceService');
      const complianceService = new TurkishComplianceService();

      const report = await complianceService.generateComplianceReport({
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      });

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Failed to generate compliance report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate compliance report',
        error: error.message
      });
    }
  }
);

// Setup global event listeners for enhanced platform factory
platformServiceFactory.on('globalSyncComplete', (data) => {
  logger.info('Global sync completed:', data);
});

platformServiceFactory.on('globalCircuitOpen', (data) => {
  logger.warn('Global circuit breaker opened:', data);
});

platformServiceFactory.on('platformWideIssue', async (data) => {
  logger.error('Platform-wide issue detected:', data);

  // Send alerts to administrators
  try {
    const alertService = require('../services/alertService');
    await alertService.sendPlatformWideIssueAlert(data);
    logger.info('Administrator alert sent for platform issue', {
      platform: data.platform
    });
  } catch (alertError) {
    logger.error('Failed to send administrator alert:', alertError);
  }
});

module.exports = router;
