const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const platformOperationsController = require('../controllers/platform-operations-controller');

// All routes require authentication
router.use(auth);

/**
 * @route GET /api/platform-operations/tasks
 * @desc Get all background tasks for the user
 * @access Private
 */
router.get('/tasks', (req, res) =>
  platformOperationsController.getTasks.call(
    platformOperationsController,
    req,
    res
  )
);

/**
 * @route POST /api/platform-operations/tasks/order-fetching
 * @desc Start background order fetching task
 * @access Private
 */
router.post('/tasks/order-fetching', (req, res) =>
  platformOperationsController.startOrderFetching.call(
    platformOperationsController,
    req,
    res
  )
);

/**
 * @route POST /api/platform-operations/tasks/:taskId/stop
 * @desc Stop a background task
 * @access Private
 */
router.post('/tasks/:taskId/stop', (req, res) =>
  platformOperationsController.stopTask.call(
    platformOperationsController,
    req,
    res
  )
);

/**
 * @route GET /api/platform-operations/connections
 * @desc Get platform connections for user
 * @access Private
 */
router.get('/connections', (req, res) =>
  platformOperationsController.getPlatformConnections.call(
    platformOperationsController,
    req,
    res
  )
);

/**
 * @route GET /api/platform-operations/stats/orders
 * @desc Get order statistics
 * @access Private
 */
router.get('/stats/orders', (req, res) =>
  platformOperationsController.getOrderStats.call(
    platformOperationsController,
    req,
    res
  )
);

module.exports = router;
