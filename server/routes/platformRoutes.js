const express = require('express');
const router = express.Router();
const platformController = require('../controllers/platform-controller');
const { auth } = require('../middleware/auth');

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
router.get('/connections/:id/settings', platformController.getConnectionSettings);
router.put('/connections/:id/settings', platformController.updateConnectionSettings);

// Platform sync routes
router.post('/connections/:id/sync', platformController.syncPlatform);

// Platform analytics routes
router.get('/connections/:id/analytics', platformController.getPlatformAnalytics);

// Platform sync history routes
router.get('/connections/:id/sync-history', platformController.getSyncHistory);
router.post('/connections/:id/sync-history/:syncId/retry', platformController.retrySyncHistory);

module.exports = router;
