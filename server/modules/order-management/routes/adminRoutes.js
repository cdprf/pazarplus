const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin-controller');
const { auth, adminAuth } = require('../../../middleware/auth'); // Fixed path: 3 levels up to reach server/middleware

// All admin routes require admin authentication
router.use(adminAuth);

// Dashboard stats
router.get('/dashboard/stats', adminController.getDashboardStats);

// User management
router.get('/users', adminController.getAllUsers);
router.put('/users/:userId/status', adminController.updateUserStatus);

// System logs
router.get('/logs', adminController.getSystemLogs);

// Platform connections overview
router.get('/platforms', adminController.getPlatformConnections);

module.exports = router;
