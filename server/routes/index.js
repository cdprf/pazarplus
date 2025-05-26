const express = require('express');
const router = express.Router();

// Import centralized route modules
const authRoutes = require('./auth');
const platformRoutes = require('./platformRoutes');
const settingsRoutes = require('./settingsRoutes');
const complianceRoutes = require('./complianceRoutes');
const orderManagementRoutes = require('../modules/order-management/routes');
const orderRoutes = require('./orderRoutes'); // Fixed: now points to the correct file

// Health check endpoint - should be accessible first
router.get('/api/health', (req, res) => {
  console.log('Health check accessed');
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    routes: {
      auth: '/api/auth',
      platforms: '/api/platforms',
      settings: '/api/settings',
      compliance: '/api/compliance',
      orderManagement: '/api/order-management'
    }
  });
});

// Debug middleware to log all requests
router.use('/api', (req, res, next) => {
  console.log(`API Route accessed: ${req.method} /api${req.url}`);
  next();
});

// Mount centralized routes
router.use('/api/auth', authRoutes);
router.use('/api/platforms', platformRoutes);
router.use('/api/settings', settingsRoutes);
router.use('/api/compliance', complianceRoutes);

// Direct orders API for frontend compatibility
router.use('/api/orders', orderRoutes);

// Module-specific routes
router.use('/api/order-management', orderManagementRoutes);

// Catch-all for debugging
router.use('/api/*', (req, res) => {
  console.log(`Unmatched API route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

module.exports = router;
