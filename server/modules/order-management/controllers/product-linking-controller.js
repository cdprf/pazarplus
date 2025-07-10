const { Order, OrderItem, Product, User } = require('../../../models');
const { Op } = require('sequelize');
const logger = require('../../../utils/logger');
const ProductOrderLinkingService = require('../../../services/product-order-linking-service');

/**
 * Get unlinked order items statistics and list
 */
const getUnlinkedItems = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      platform,
      startDate,
      endDate,
      search
    } = req.query;

    const offset = (page - 1) * limit;

    // Build order where clause
    const orderWhere = {};
    if (platform) {orderWhere.platform = platform;}
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) {dateFilter[Op.gte] = new Date(startDate);}
      if (endDate) {dateFilter[Op.lte] = new Date(endDate);}
      orderWhere.orderDate = dateFilter;
    }

    // Build order item where clause
    const itemWhere = { productId: null };
    if (search) {
      itemWhere[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } },
        { barcode: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: unlinkedItems } = await OrderItem.findAndCountAll({
      where: itemWhere,
      include: [
        {
          model: Order,
          as: 'order',
          where: orderWhere,
          attributes: [
            'id',
            'orderNumber',
            'platform',
            'orderDate',
            'orderStatus'
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        total: count,
        items: unlinkedItems,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get unlinked items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unlinked items'
    });
  }
};

/**
 * Get linking statistics and reports
 */
const getLinkingStats = async (req, res) => {
  try {
    const { platform, startDate, endDate } = req.query;

    // Build order filters
    const orderWhere = {};
    if (platform) {
      orderWhere.platform = platform;
    }
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) {dateFilter[Op.gte] = new Date(startDate);}
      if (endDate) {dateFilter[Op.lte] = new Date(endDate);}
      orderWhere.orderDate = dateFilter;
    }

    // Get total order items count (simplified)
    const totalOrderItems = await OrderItem.count({
      include: [
        {
          model: Order,
          as: 'order',
          where: orderWhere,
          attributes: []
        }
      ]
    });

    // Get linked order items count (simplified)
    const linkedOrderItems = await OrderItem.count({
      where: { productId: { [Op.not]: null } },
      include: [
        {
          model: Order,
          as: 'order',
          where: orderWhere,
          attributes: []
        }
      ]
    });

    // Get unlinked order items
    const unlinkedOrderItems = totalOrderItems - linkedOrderItems;

    // Get platform stats using simpler approach
    const platforms = ['trendyol', 'hepsiburada', 'amazon', 'n11'];
    const platformStats = [];

    for (const platformName of platforms) {
      const platformOrderWhere = { ...orderWhere, platform: platformName };

      const total = await OrderItem.count({
        include: [
          {
            model: Order,
            as: 'order',
            where: platformOrderWhere,
            attributes: []
          }
        ]
      });

      if (total > 0) {
        const linked = await OrderItem.count({
          where: { productId: { [Op.not]: null } },
          include: [
            {
              model: Order,
              as: 'order',
              where: platformOrderWhere,
              attributes: []
            }
          ]
        });

        platformStats.push({
          platform: platformName,
          total,
          linked,
          unlinked: total - linked,
          linkingRate: ((linked / total) * 100).toFixed(2)
        });
      }
    }

    // Get recent linking activity (orders created in last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentActivity = await OrderItem.findAll({
      where: {
        productId: { [Op.not]: null },
        updatedAt: { [Op.gte]: weekAgo }
      },
      include: [
        {
          model: Order,
          as: 'order',
          where: orderWhere,
          attributes: ['id', 'platform', 'orderDate']
        }
      ],
      order: [['updatedAt', 'DESC']],
      limit: 10
    });

    const overallLinkingRate =
      totalOrderItems > 0
        ? ((linkedOrderItems / totalOrderItems) * 100).toFixed(2)
        : '0.00';

    res.json({
      success: true,
      data: {
        summary: {
          totalOrderItems,
          linkedOrderItems,
          unlinkedOrderItems,
          overallLinkingRate
        },
        platformBreakdown: platformStats,
        recentActivity: recentActivity.map((item) => ({
          orderItemId: item.id,
          orderId: item.order.id,
          platform: item.order.platform,
          orderDate: item.order.orderDate,
          linkedAt: item.updatedAt,
          productId: item.productId,
          itemTitle: item.title
        }))
      }
    });
  } catch (error) {
    logger.error('Get linking stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get linking statistics'
    });
  }
};

/**
 * Run retroactive product linking on existing orders
 */
const runRetroactiveLinking = async (req, res) => {
  try {
    const {
      platform,
      startDate,
      endDate,
      batchSize = 100,
      dryRun = false,
      strategies
    } = req.body;

    // Build query filters
    const orderWhere = {};
    if (platform) {orderWhere.platform = platform;}
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) {dateFilter[Op.gte] = new Date(startDate);}
      if (endDate) {dateFilter[Op.lte] = new Date(endDate);}
      orderWhere.orderDate = dateFilter;
    }

    // Get unlinked order items
    const unlinkedItems = await OrderItem.findAll({
      where: { productId: null },
      include: [
        {
          model: Order,
          as: 'order',
          where: orderWhere,
          attributes: ['id', 'platform', 'orderNumber']
        }
      ],
      limit: 1000 // Limit for safety
    });

    if (unlinkedItems.length === 0) {
      return res.json({
        success: true,
        message: 'No unlinked items found',
        data: {
          processedItems: 0,
          linkedItems: 0,
          results: []
        }
      });
    }

    logger.info(
      `Starting retroactive linking for ${unlinkedItems.length} items`,
      {
        platform,
        startDate,
        endDate,
        dryRun,
        strategies
      }
    );

    // Initialize the linking service
    const linkingService = new ProductOrderLinkingService();

    // Get all available products for matching (we need a user context)
    // For now, we'll use the first order's user as the context
    if (unlinkedItems.length === 0) {
      return res.json({
        success: true,
        message: 'No unlinked items found',
        data: { processedItems: 0, linkedItems: 0, results: [] }
      });
    }

    // Get user from the first order item
    const firstOrderItem = unlinkedItems[0];
    const firstOrder = await Order.findByPk(firstOrderItem.order.id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!firstOrder || !firstOrder.user) {
      return res.status(400).json({
        success: false,
        message: 'Cannot determine user context for linking'
      });
    }

    const userId = firstOrder.user.id;

    // Get user's products for matching
    const userProducts = await linkingService.getUserProducts(userId);

    if (userProducts.length === 0) {
      return res.json({
        success: true,
        message: 'No products available for linking',
        data: {
          processedItems: unlinkedItems.length,
          linkedItems: 0,
          results: []
        }
      });
    }

    // Process items in batches
    const results = [];
    const totalBatches = Math.ceil(unlinkedItems.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
      const batchStart = i * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, unlinkedItems.length);
      const batch = unlinkedItems.slice(batchStart, batchEnd);

      logger.info(
        `Processing batch ${i + 1}/${totalBatches} (${batch.length} items)`
      );

      try {
        const batchResult = await linkingService.processBatch(
          batch,
          userProducts,
          dryRun
        );
        results.push({
          processedItems: batchResult.processed,
          linkedItems: batchResult.linked,
          errors: []
        });
      } catch (batchError) {
        logger.error(`Batch ${i + 1} failed:`, batchError);
        results.push({
          processedItems: batch.length,
          linkedItems: 0,
          errors: [batchError.message]
        });
      }
    }

    // Aggregate results
    const aggregatedResults = results.reduce(
      (acc, result) => {
        acc.processedItems += result.processedItems || 0;
        acc.linkedItems += result.linkedItems || 0;
        acc.errors = [...(acc.errors || []), ...(result.errors || [])];
        return acc;
      },
      {
        processedItems: 0,
        linkedItems: 0,
        errors: []
      }
    );

    logger.info('Retroactive linking completed', aggregatedResults);

    res.json({
      success: true,
      message: `Processed ${aggregatedResults.processedItems} items, linked ${aggregatedResults.linkedItems}`,
      data: aggregatedResults
    });
  } catch (error) {
    logger.error('Retroactive linking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run retroactive linking'
    });
  }
};

/**
 * Manually link a specific order item to a product
 */
const manualLinkItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { productId } = req.body;

    // Validate order item exists
    const orderItem = await OrderItem.findByPk(id, {
      include: [{ model: Order, as: 'order' }]
    });

    if (!orderItem) {
      return res.status(404).json({
        success: false,
        message: 'Order item not found'
      });
    }

    // Validate product exists
    const product = await Product.findByPk(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Update the order item
    await orderItem.update({ productId });

    logger.info('Manual product linking completed', {
      orderItemId: id,
      productId,
      orderNumber: orderItem.order?.orderNumber
    });

    res.json({
      success: true,
      message: 'Order item linked to product successfully',
      data: {
        orderItem: await OrderItem.findByPk(id, {
          include: [
            { model: Order, as: 'order' },
            { model: Product, as: 'product' }
          ]
        })
      }
    });
  } catch (error) {
    logger.error('Manual linking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to link order item to product'
    });
  }
};

/**
 * Remove product link from an order item
 */
const unlinkItem = async (req, res) => {
  try {
    const { id } = req.params;

    const orderItem = await OrderItem.findByPk(id, {
      include: [{ model: Order, as: 'order' }]
    });

    if (!orderItem) {
      return res.status(404).json({
        success: false,
        message: 'Order item not found'
      });
    }

    await orderItem.update({ productId: null });

    logger.info('Product link removed', {
      orderItemId: id,
      orderNumber: orderItem.order?.orderNumber
    });

    res.json({
      success: true,
      message: 'Product link removed successfully'
    });
  } catch (error) {
    logger.error('Unlink item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlink order item'
    });
  }
};

/**
 * Get product suggestions for a specific order item
 */
const getProductSuggestions = async (req, res) => {
  try {
    const { id } = req.params;

    const orderItem = await OrderItem.findByPk(id);

    if (!orderItem) {
      return res.status(404).json({
        success: false,
        message: 'Order item not found'
      });
    }

    const linkingService = new ProductOrderLinkingService();
    const suggestions = await linkingService.findProductMatches(orderItem);

    res.json({
      success: true,
      data: {
        orderItem,
        suggestions
      }
    });
  } catch (error) {
    logger.error('Get product suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get product suggestions'
    });
  }
};

module.exports = {
  getUnlinkedItems,
  getLinkingStats,
  runRetroactiveLinking,
  manualLinkItem,
  unlinkItem,
  getProductSuggestions
};
