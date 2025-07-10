/**
 * Product Linking Service
 * Matches order items with products in the database using multiple strategies
 */

const sequelize = require('../config/database');
const { Product, OrderItem } = require('../models');
const { Op } = require('sequelize');

class ProductLinkingService {
  /**
   * Find matching products for an order item using multiple strategies
   */
  static async findMatchingProducts(orderItem) {
    const { sku, barcode, platformProductId, title } = orderItem;
    const matchingProducts = [];

    try {
      // Strategy 1: Exact SKU match (highest priority)
      if (sku) {
        const skuMatches = await Product.findAll({
          where: {
            sku: sku,
            status: 'active'
          }
        });

        matchingProducts.push(
          ...skuMatches.map((p) => ({
            ...p.dataValues,
            matchType: 'sku',
            confidence: 100
          }))
        );
      }

      // Strategy 2: Exact barcode match (high priority)
      if (barcode && matchingProducts.length === 0) {
        const barcodeMatches = await Product.findAll({
          where: {
            barcode: barcode,
            status: 'active'
          }
        });

        matchingProducts.push(
          ...barcodeMatches.map((p) => ({
            ...p.dataValues,
            matchType: 'barcode',
            confidence: 95
          }))
        );
      }

      // Strategy 3: Platform product ID match (medium priority)
      if (platformProductId && matchingProducts.length === 0) {
        // For platform product ID, we need to search in JSON field
        // Note: This is a simplified approach - you might need to adjust based on your actual platform JSON structure
        const platformMatches = await Product.findAll({
          where: {
            [Op.and]: [
              sequelize.where(
                sequelize.fn('JSON_EXTRACT', sequelize.col('platforms'), '$.*'),
                'LIKE',
                `%${platformProductId}%`
              ),
              { status: 'active' }
            ]
          }
        });

        matchingProducts.push(
          ...platformMatches.map((p) => ({
            ...p.dataValues,
            matchType: 'platformProductId',
            confidence: 80
          }))
        );
      }

      // Strategy 4: Title fuzzy match (lower priority)
      if (title && matchingProducts.length === 0) {
        const titleMatches = await Product.findAll({
          where: {
            name: { [Op.like]: `%${title.substring(0, 50)}%` },
            status: 'active'
          },
          limit: 5
        });

        matchingProducts.push(
          ...titleMatches.map((p) => ({
            ...p.dataValues,
            matchType: 'title',
            confidence: 60
          }))
        );
      }

      // Remove duplicates and sort by confidence
      const uniqueProducts = matchingProducts
        .filter(
          (product, index, array) =>
            array.findIndex((p) => p.id === product.id) === index
        )
        .sort((a, b) => b.confidence - a.confidence);

      return uniqueProducts;
    } catch (error) {
      console.error('Error finding matching products:', error);
      return [];
    }
  }

  /**
   * Get order items with their linked products
   */
  static async getOrderItemsWithProducts(orderId) {
    try {
      // Get order items using Sequelize
      const orderItems = await OrderItem.findAll({
        where: {
          orderId: orderId
        },
        order: [['createdAt', 'ASC']]
      });

      // For each order item, find matching products
      const itemsWithProducts = await Promise.all(
        orderItems.map(async (item) => {
          const matchingProducts = await this.findMatchingProducts(
            item.dataValues
          );
          return {
            ...item.dataValues,
            matchingProducts,
            bestMatch: matchingProducts.length > 0 ? matchingProducts[0] : null
          };
        })
      );

      return itemsWithProducts;
    } catch (error) {
      console.error('Error getting order items with products:', error);
      throw error;
    }
  }

  /**
   * Manually link an order item with a product
   */
  static async linkOrderItemWithProduct(orderItemId, productId) {
    try {
      await OrderItem.update(
        { productId: productId },
        { where: { id: orderItemId } }
      );

      return { success: true };
    } catch (error) {
      console.error('Error linking order item with product:', error);
      throw error;
    }
  }

  /**
   * Unlink an order item from a product
   */
  static async unlinkOrderItemFromProduct(orderItemId) {
    try {
      await OrderItem.update(
        { productId: null },
        { where: { id: orderItemId } }
      );

      return { success: true };
    } catch (error) {
      console.error('Error unlinking order item from product:', error);
      throw error;
    }
  }

  /**
   * Search products for manual linking
   */
  static async searchProducts(query, limit = 10) {
    try {
      const products = await Product.findAll({
        where: {
          [Op.or]: [
            { name: { [Op.like]: `%${query}%` } },
            { sku: { [Op.like]: `%${query}%` } },
            { barcode: { [Op.like]: `%${query}%` } }
          ],
          status: 'active'
        },
        attributes: [
          'id',
          'name',
          'sku',
          'barcode',
          'price',
          'images',
          'stockQuantity'
        ],
        order: [['name', 'ASC']],
        limit: limit
      });

      return products.map((product) => ({
        ...product.dataValues,
        images: product.images ? JSON.parse(product.images) : []
      }));
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }
}

module.exports = ProductLinkingService;
