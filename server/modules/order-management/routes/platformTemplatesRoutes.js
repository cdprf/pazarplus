const express = require('express');
const router = express.Router();
const platformTemplatesController = require('../controllers/platform-templates-controller');
const { auth, adminAuth } = require('../../../middleware/auth'); // Fixed: import correct middleware
const { body } = require('express-validator');

// Apply authentication middleware
router.use(auth); // Fixed: use 'auth' instead of 'protect'

// Platform templates routes
router.get('/', platformTemplatesController.getTemplates);
router.get('/:id', platformTemplatesController.getTemplate);

router.post('/', [
  body('platformType').notEmpty().trim().withMessage('Platform type is required'),
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('apiEndpoints').notEmpty().withMessage('API endpoints are required'),
  body('authType').notEmpty().trim().withMessage('Auth type is required'),
  body('credentialSchema').notEmpty().withMessage('Credential schema is required')
], platformTemplatesController.createTemplate);

router.put('/:id', [
  body('platformType').optional().trim(),
  body('name').optional().trim(),
  body('apiEndpoints').optional(),
  body('authType').optional().trim(),
  body('credentialSchema').optional()
], platformTemplatesController.updateTemplate);

router.delete('/:id', platformTemplatesController.deleteTemplate);

module.exports = router;
