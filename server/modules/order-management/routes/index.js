const express = require('express');

// Import route modules (only the ones that actually exist)
const orderRoutes = require('./orderRoutes');
const adminRoutes = require('./adminRoutes');
const shippingRoutes = require('./shippingRoutes');
const exportRoutes = require('./exportRoutes');
const csvRoutes = require('./csvRoutes');
const connections = require('./connections');
const settingsRoutes = require('./settingsRoutes');
const platformTemplatesRoutes = require('./platformTemplatesRoutes');
const proxyRoutes = require('./proxyRoutes');
const devRoutes = require('./dev');

const router = express.Router();

// Mount all routes
router.use('/orders', orderRoutes);
router.use('/admin', adminRoutes);
router.use('/shipping', shippingRoutes);
router.use('/export', exportRoutes);
router.use('/csv', csvRoutes);
router.use('/connections', connections);
router.use('/settings', settingsRoutes);
router.use('/templates', platformTemplatesRoutes);
router.use('/proxy', proxyRoutes);
router.use('/dev', devRoutes);

module.exports = router;
