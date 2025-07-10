const express = require('express');
console.log('Order Management Routes: Creating express router');

// Initialize variables for route modules
let orderRoutes,
  adminRoutes,
  exportRoutes,
  csvRoutes,
  connections,
  settingsRoutes,
  platformTemplatesRoutes,
  qnbFinansRoutes,
  productLinkingRoutes,
  productLinkingJobRoutes;
let ProductLinkingService;

// Create the router
const router = express.Router();

// Import route modules with try/catch blocks
try {
  console.log('Order Management Routes: About to require orderRoutes');
  orderRoutes = require('./orderRoutes');
  console.log('Order Management Routes: orderRoutes loaded successfully');
} catch (error) {
  console.error('Failed to load orderRoutes:', error);
  // Create dummy router
  orderRoutes = express.Router();
  orderRoutes.use((req, res) => {
    res.status(500).json({ error: 'Order routes unavailable' });
  });
}

try {
  console.log('Order Management Routes: About to require adminRoutes');
  adminRoutes = require('./adminRoutes');
  console.log('Order Management Routes: adminRoutes loaded successfully');
} catch (error) {
  console.error('Failed to load adminRoutes:', error);
  adminRoutes = express.Router();
}

try {
  console.log('Order Management Routes: About to require exportRoutes');
  exportRoutes = require('./exportRoutes');
  console.log('Order Management Routes: exportRoutes loaded successfully');
} catch (error) {
  console.error('Failed to load exportRoutes:', error);
  exportRoutes = express.Router();
}

try {
  console.log('Order Management Routes: About to require csvRoutes');
  csvRoutes = require('./csvRoutes');
  console.log('Order Management Routes: csvRoutes loaded successfully');
} catch (error) {
  console.error('Failed to load csvRoutes:', error);
  csvRoutes = express.Router();
}

try {
  console.log('Order Management Routes: About to require connections');
  connections = require('../../../routes/connections');
  console.log('Order Management Routes: connections loaded successfully');
} catch (error) {
  console.error('Failed to load connections:', error);
  connections = express.Router();
}

try {
  console.log('Order Management Routes: About to require settingsRoutes');
  settingsRoutes = require('./settingsRoutes');
  console.log('Order Management Routes: settingsRoutes loaded successfully');
} catch (error) {
  console.error('Failed to load settingsRoutes:', error);
  settingsRoutes = express.Router();
}

try {
  console.log(
    'Order Management Routes: About to require platformTemplatesRoutes'
  );
  platformTemplatesRoutes = require('./platform-templates-routes');
  console.log(
    'Order Management Routes: platformTemplatesRoutes loaded successfully'
  );
} catch (error) {
  console.error('Failed to load platformTemplatesRoutes:', error);
  platformTemplatesRoutes = express.Router();
}

try {
  console.log('Order Management Routes: About to require qnbFinansRoutes');
  qnbFinansRoutes = require('./qnbFinansRoutes');
  console.log('Order Management Routes: qnbFinansRoutes loaded successfully');
} catch (error) {
  console.error('Failed to load qnbFinansRoutes:', error);
  qnbFinansRoutes = express.Router();
}

try {
  console.log('Order Management Routes: About to require productLinkingRoutes');
  productLinkingRoutes = require('./productLinkingRoutes');
  console.log(
    'Order Management Routes: productLinkingRoutes loaded successfully'
  );
} catch (error) {
  console.error('Failed to load productLinkingRoutes:', error);
  productLinkingRoutes = express.Router();
}

try {
  console.log(
    'Order Management Routes: About to require productLinkingJobRoutes'
  );
  productLinkingJobRoutes = require('./productLinkingJobRoutes');
  console.log(
    'Order Management Routes: productLinkingJobRoutes loaded successfully'
  );
} catch (error) {
  console.error('Failed to load productLinkingJobRoutes:', error);
  productLinkingJobRoutes = express.Router();
}

// Import ProductLinkingService
try {
  console.log('Order Management Routes: About to import ProductLinkingService');
  ProductLinkingService = require('../../../services/ProductLinkingService');
  console.log(
    'Order Management Routes: ProductLinkingService loaded successfully'
  );
} catch (error) {
  console.error('Error loading ProductLinkingService:', error);
  // Create a fallback service
  ProductLinkingService = {
    getOrderItemsWithProducts: async () => [],
    searchProducts: async () => [],
    linkOrderItemWithProduct: async () => ({
      success: false,
      error: 'Service unavailable'
    })
  };
}

// Import authentication middleware
const { auth: authenticateToken } = require('../../../middleware/auth');

console.log('Order Management Routes: Setting up API endpoints');

// Mount sub-routers with error handling
try {
  router.use('/orders', orderRoutes);
  router.use('/admin', adminRoutes);
  router.use('/export', exportRoutes);
  router.use('/csv', csvRoutes);
  router.use('/connections', connections);
  router.use('/settings', settingsRoutes);
  router.use('/templates', platformTemplatesRoutes);
  router.use('/qnb-finans', qnbFinansRoutes);
  router.use('/product-linking', productLinkingRoutes);
  router.use('/product-linking-jobs', productLinkingJobRoutes);

  console.log('Order Management Routes: All routes mounted successfully');
} catch (error) {
  console.error('Error mounting order management routes:', error);
}

// Enhanced Product Linking API - Direct endpoints with error handling
router.get(
  '/orders/:orderId/items-with-products',
  authenticateToken,
  async (req, res) => {
    try {
      const { orderId } = req.params;
      const itemsWithProducts =
        await ProductLinkingService.getOrderItemsWithProducts(orderId);

      res.json({
        success: true,
        data: itemsWithProducts
      });
    } catch (error) {
      console.error('Error getting order items with products:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get order items with products'
      });
    }
  }
);

// Search products for linking
router.get('/products/search', authenticateToken, async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;
    const products = await ProductLinkingService.searchProducts(query, limit);

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search products'
    });
  }
});

// Link order item with product
router.post(
  '/orders/:orderId/items/:itemId/link',
  authenticateToken,
  async (req, res) => {
    try {
      const { orderId, itemId } = req.params;
      const { productId } = req.body;

      const result = await ProductLinkingService.linkOrderItemWithProduct(
        itemId,
        productId,
        orderId
      );

      res.json(result);
    } catch (error) {
      console.error('Error linking order item with product:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to link order item with product'
      });
    }
  }
);

console.log('Order Management Routes: Module exports complete');
module.exports = router;
