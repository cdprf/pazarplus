/**
 * Database Transaction Management API Routes
 * Handles database transaction status, user interactions, and control
 */
const express = require('express');
const router = express.Router();
const dbTransactionManager = require('../services/database-transaction-manager');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');

// Apply authentication to all routes
router.use(auth);

/**
 * GET /api/database/status
 * Get current database transaction status
 */
router.get('/status', async (req, res) => {
  try {
    const status = dbTransactionManager.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Error getting database status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get database status',
      error: error.message
    });
  }
});

/**
 * POST /api/database/user-decision
 * Handle user decision for database busy state
 */
router.post('/user-decision', async (req, res) => {
  try {
    const { interactionId, action, options = {} } = req.body;

    if (!interactionId || !action) {
      return res.status(400).json({
        success: false,
        message: 'interactionId and action are required'
      });
    }

    const validActions = ['wait', 'force_close', 'queue', 'cancel'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: `Invalid action. Must be one of: ${validActions.join(', ')}`
      });
    }

    dbTransactionManager.handleUserDecision(interactionId, action, options);

    res.json({
      success: true,
      message: `User decision '${action}' registered for interaction ${interactionId}`
    });
  } catch (error) {
    logger.error('Error handling user decision:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle user decision',
      error: error.message
    });
  }
});

/**
 * POST /api/database/pause-operation/:operationId
 * Pause a specific operation
 */
router.post('/pause-operation/:operationId', async (req, res) => {
  try {
    const { operationId } = req.params;

    dbTransactionManager.pauseOperation(operationId);

    res.json({
      success: true,
      message: `Operation ${operationId} paused`
    });
  } catch (error) {
    logger.error('Error pausing operation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pause operation',
      error: error.message
    });
  }
});

/**
 * POST /api/database/resume-operation/:operationId
 * Resume a paused operation
 */
router.post('/resume-operation/:operationId', async (req, res) => {
  try {
    const { operationId } = req.params;

    dbTransactionManager.resumeOperation(operationId);

    res.json({
      success: true,
      message: `Operation ${operationId} resumed`
    });
  } catch (error) {
    logger.error('Error resuming operation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resume operation',
      error: error.message
    });
  }
});

/**
 * DELETE /api/database/cancel-operation/:operationId
 * Cancel a specific operation
 */
router.delete('/cancel-operation/:operationId', async (req, res) => {
  try {
    const { operationId } = req.params;

    dbTransactionManager.cancelOperation(operationId);

    res.json({
      success: true,
      message: `Operation ${operationId} cancelled`
    });
  } catch (error) {
    logger.error('Error cancelling operation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel operation',
      error: error.message
    });
  }
});

/**
 * GET /api/database/busy-details
 * Get detailed information about database busy state
 */
router.get('/busy-details', async (req, res) => {
  try {
    const busyDetails = dbTransactionManager.getDatabaseBusyDetails();
    res.json({
      success: true,
      data: busyDetails
    });
  } catch (error) {
    logger.error('Error getting database busy details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get database busy details',
      error: error.message
    });
  }
});

/**
 * POST /api/database/force-close-all
 * Force close all active transactions (emergency action)
 */
router.post('/force-close-all', async (req, res) => {
  try {
    const activeTransactions =
      dbTransactionManager.getStatus().activeTransactions;

    logger.warn(
      `Force closing ${activeTransactions.length} active transactions by user request`
    );

    // This is a dangerous operation, log it extensively
    logger.warn('EMERGENCY: Force closing all database transactions', {
      userId: req.user.id,
      userEmail: req.user.email,
      activeTransactionCount: activeTransactions.length,
      timestamp: new Date().toISOString()
    });

    // Force close all transactions by operation ID
    for (const transaction of activeTransactions) {
      try {
        await dbTransactionManager.forceCloseAndExecute(transaction.id);
      } catch (error) {
        logger.error(
          `Error force closing transaction ${transaction.id}:`,
          error
        );
      }
    }

    res.json({
      success: true,
      message: `Force closed ${activeTransactions.length} active transactions`,
      closedTransactions: activeTransactions.length
    });
  } catch (error) {
    logger.error('Error force closing all transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to force close all transactions',
      error: error.message
    });
  }
});

/**
 * GET /api/database/queue-status
 * Get status of queued operations
 */
router.get('/queue-status', async (req, res) => {
  try {
    const status = dbTransactionManager.getStatus();
    res.json({
      success: true,
      data: {
        queuedOperations: status.queuedOperations,
        totalQueued: dbTransactionManager.transactionQueue.length,
        queue: dbTransactionManager.transactionQueue.map((op) => ({
          operationId: op.operationId,
          queuedAt: op.queuedAt,
          waitTime: Date.now() - op.queuedAt
        }))
      }
    });
  } catch (error) {
    logger.error('Error getting queue status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get queue status',
      error: error.message
    });
  }
});

module.exports = router;
