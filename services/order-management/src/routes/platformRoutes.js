const express = require('express');
const { body } = require('express-validator');
const platformController = require('../controllers/platform-controller');
const { authenticateToken } = require('../middleware/auth-middleware');

const router = express.Router();

// All platform routes should be protected
router.use(authenticateToken);

// Platform routes with validation
router.get('/connections', platformController.getConnections);
router.get('/connections/:id', platformController.getConnection);

router.post('/connections', [
  body('platformType').notEmpty().trim().withMessage('Platform type is required'),
  body('name').notEmpty().trim().withMessage('Connection name is required'),
  body('credentials').notEmpty().withMessage('Credentials are required'),
], platformController.createConnection);

router.put('/connections/:id', [
  body('name').optional().trim(),
  body('credentials').optional(),
], platformController.updateConnection);

router.delete('/connections/:id', platformController.deleteConnection);
router.post('/connections/:id/test', platformController.testConnection);
router.get('/types', platformController.getPlatformTypes);

module.exports = router;