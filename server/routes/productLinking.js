/**
 * Product Linking API Routes
 * Handles product-order linking functionality
 */

const express = require('express');
const router = express.Router();
const ProductLinkingService = require('../services/ProductLinkingService');
const { auth } = require('../middleware/auth');

// Get order items with linked products
router.get('/orders/:orderId/items-with-products', auth, async (req, res) => {
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
      error: 'Failed to get order items with products',
      details: error.message
    });
  }
});

// Search products for manual linking
router.get('/products/search', auth, async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const products = await ProductLinkingService.searchProducts(
      query.trim(),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search products',
      details: error.message
    });
  }
});

// Manually link order item with product
router.post('/order-items/:itemId/link-product', auth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      });
    }

    await ProductLinkingService.linkOrderItemWithProduct(itemId, productId);

    res.json({
      success: true,
      message: 'Order item linked with product successfully'
    });
  } catch (error) {
    console.error('Error linking order item with product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to link order item with product',
      details: error.message
    });
  }
});

// Remove link between order item and product
router.delete('/order-items/:itemId/unlink-product', auth, async (req, res) => {
  try {
    const { itemId } = req.params;

    await ProductLinkingService.linkOrderItemWithProduct(itemId, null);

    res.json({
      success: true,
      message: 'Order item unlinked from product successfully'
    });
  } catch (error) {
    console.error('Error unlinking order item from product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unlink order item from product',
      details: error.message
    });
  }
});

module.exports = router;
