const express = require('express');
const router = express.Router();
const settingsController = require('../../../controllers/settings-controller');
const { auth, adminAuth } = require('../../../middleware/auth');

// Apply authentication middleware
router.use(auth);

// Company settings routes
router.get('/company', settingsController.getCompanyInfo);
router.post('/company', settingsController.saveCompanyInfo);
router.post('/company/logo', settingsController.uploadCompanyLogo);

// General settings routes
router.get('/general', settingsController.getGeneralSettings);
router.post('/general', settingsController.saveGeneralSettings);

// Notification settings routes
router.get('/notifications', settingsController.getNotificationSettings);
router.post('/notifications', settingsController.saveNotificationSettings);

// Shipping settings routes
router.get('/shipping', settingsController.getShippingSettings);
router.post('/shipping', settingsController.saveShippingSettings);

// Email settings routes
router.get('/email', settingsController.getEmailSettings);
router.post('/email', settingsController.saveEmailSettings);
router.post('/email/test', settingsController.testEmailSettings);

module.exports = router;