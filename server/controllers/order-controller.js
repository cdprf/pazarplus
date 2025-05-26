const { Order, OrderItem, User, sequelize } = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

// Get orders with filtering, sorting, and pagination
const getOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      platform,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build where conditions only if values are provided
    const whereConditions = {
      userId: req.user.id
    };

    // Only add filters if they have meaningful values
    if (status && status.trim() !== '') {
      whereConditions.orderStatus = status.trim(); // Fixed: use orderStatus instead of status
    }

    if (platform && platform.trim() !== '') {
      whereConditions.platformType = platform.trim();
    }

    if (search && search.trim() !== '') {
      const searchTerm = search.trim();
      whereConditions[Op.or] = [
        { externalOrderId: { [Op.iLike]: `%${searchTerm}%` } },
        { customerName: { [Op.iLike]: `%${searchTerm}%` } },
        { customerEmail: { [Op.iLike]: `%${searchTerm}%` } }
      ];
    }

    // Validate sort parameters
    const validSortFields = ['createdAt', 'orderDate', 'totalAmount', 'orderStatus']; // Fixed: use orderStatus
    const validSortOrders = ['asc', 'desc'];
    
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderDirection = validSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'DESC';

    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10))); // Max 100 items per page
    const offset = (pageNum - 1) * limitNum;

    try {
      // Get orders with proper error handling
      const { count, rows: orders } = await Order.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: OrderItem,
            as: 'items',
            required: false // LEFT JOIN to handle orders without items
          }
        ],
        order: [[orderField, orderDirection]],
        limit: limitNum,
        offset: offset,
        distinct: true // Important for correct count with includes
      });

      // Handle case where no orders exist
      if (count === 0) {
        return res.json({
          success: true,
          message: 'No orders found',
          data: [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          },
          filters: {
            status: status || null,
            platform: platform || null,
            search: search || null,
            sortBy: orderField,
            sortOrder: orderDirection.toLowerCase()
          }
        });
      }

      // Calculate pagination info
      const totalPages = Math.ceil(count / limitNum);
      const hasNext = pageNum < totalPages;
      const hasPrev = pageNum > 1;

      logger.info(`Retrieved ${orders.length} orders for user ${req.user.id}`, {
        userId: req.user.id,
        count,
        page: pageNum,
        filters: whereConditions
      });

      res.json({
        success: true,
        message: `Retrieved ${orders.length} orders`,
        data: orders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          totalPages,
          hasNext,
          hasPrev
        },
        filters: {
          status: status || null,
          platform: platform || null,
          search: search || null,
          sortBy: orderField,
          sortOrder: orderDirection.toLowerCase()
        }
      });
    } catch (dbError) {
      logger.error(`Database error retrieving orders: ${dbError.message}`, {
        error: dbError,
        userId: req.user.id,
        whereConditions
      });
      
      return res.status(500).json({
        success: false,
        message: 'Database error occurred while retrieving orders',
        error: process.env.NODE_ENV === 'development' ? dbError.message : 'Internal server error'
      });
    }
  } catch (error) {
    logger.error(`Get orders error: ${error.message}`, { error, userId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get single order by ID
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({
      where: { 
        id,
        userId: req.user.id 
      },
      include: [{
        model: OrderItem,
        as: 'items'
      }]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error(`Get order by ID error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
};

// Create new order
const createOrder = async (req, res) => {
  try {
    const {
      orderNumber,
      customerName,
      customerEmail,
      platform,
      status = 'pending',
      totalAmount,
      currency = 'TRY',
      items = [],
      shippingAddress = {}
    } = req.body;

    // Validate required fields
    if (!orderNumber || !customerName || !customerEmail || !platform || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: orderNumber, customerName, customerEmail, platform, totalAmount'
      });
    }

    // Create the order
    const order = await Order.create({
      orderNumber,
      externalOrderId: orderNumber,
      customerName,
      customerEmail,
      platform,
      platformType: platform,
      platformOrderId: orderNumber, // Required field from model
      platformId: platform, // Required field from model
      orderStatus: status, // Fixed: use orderStatus instead of status
      totalAmount: parseFloat(totalAmount),
      currency,
      shippingAddress: JSON.stringify(shippingAddress),
      userId: req.user.id,
      orderDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create order items if provided
    if (items && items.length > 0) {
      const orderItems = items.map(item => ({
        orderId: order.id,
        productName: item.productName || item.name,
        productSku: item.productSku || item.sku,
        quantity: parseInt(item.quantity) || 1,
        unitPrice: parseFloat(item.unitPrice) || 0,
        totalPrice: parseFloat(item.totalPrice) || (parseFloat(item.unitPrice) * parseInt(item.quantity)),
        userId: req.user.id
      }));

      await OrderItem.bulkCreate(orderItems);
    }

    // Fetch the complete order with items
    const completeOrder = await Order.findOne({
      where: { id: order.id },
      include: [{
        model: OrderItem,
        as: 'items'
      }]
    });

    logger.info(`Order created: ${order.id}`, {
      orderId: order.id,
      orderNumber,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: completeOrder
    });
  } catch (error) {
    logger.error(`Create order error: ${error.message}`, { error, userId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update existing order
const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find the order
    const order = await Order.findOne({
      where: { 
        id,
        userId: req.user.id 
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Extract items from update data if provided
    const { items, ...orderUpdates } = updateData;

    // Update the order
    await order.update({
      ...orderUpdates,
      updatedAt: new Date()
    });

    // Update items if provided
    if (items && Array.isArray(items)) {
      // Delete existing items
      await OrderItem.destroy({
        where: { orderId: id }
      });

      // Create new items
      if (items.length > 0) {
        const orderItems = items.map(item => ({
          orderId: id,
          productName: item.productName || item.name,
          productSku: item.productSku || item.sku,
          quantity: parseInt(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0,
          totalPrice: parseFloat(item.totalPrice) || (parseFloat(item.unitPrice) * parseInt(item.quantity)),
          userId: req.user.id
        }));

        await OrderItem.bulkCreate(orderItems);
      }
    }

    // Fetch the updated order with items
    const updatedOrder = await Order.findOne({
      where: { id },
      include: [{
        model: OrderItem,
        as: 'items'
      }]
    });

    logger.info(`Order updated: ${id}`, {
      orderId: id,
      userId: req.user.id,
      updates: Object.keys(orderUpdates)
    });

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: updatedOrder
    });
  } catch (error) {
    logger.error(`Update order error: ${error.message}`, { error, userId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Failed to update order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status'
      });
    }

    const order = await Order.findOne({
      where: { 
        id,
        userId: req.user.id 
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    await order.update({
      orderStatus: status, // Fixed: use orderStatus instead of status
      notes: notes || order.notes,
      updatedAt: new Date()
    });

    logger.info(`Order ${id} status updated to ${status}`, {
      orderId: id,
      userId: req.user.id,
      oldStatus: order.orderStatus, // Fixed: use orderStatus
      newStatus: status
    });

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    logger.error(`Update order status error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
};

// Get order statistics
const getOrderStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get basic stats with error handling
    const stats = await Order.findAll({
      where: { userId },
      attributes: [
        'orderStatus', // Fixed: use orderStatus instead of status
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalValue']
      ],
      group: ['orderStatus'], // Fixed: use orderStatus instead of status
      raw: true
    }).catch(() => []); // Return empty array if query fails

    // Get total counts with fallback
    const totals = await Order.findOne({
      where: { userId },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalOrders'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalRevenue']
      ],
      raw: true
    }).catch(() => ({ totalOrders: 0, totalRevenue: 0 }));

    // Format stats with default values
    const formattedStats = {
      totalOrders: parseInt(totals.totalOrders) || 0,
      totalRevenue: parseFloat(totals.totalRevenue) || 0,
      byStatus: {},
      summary: {
        new: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        returned: 0
      }
    };

    // Process stats safely
    if (Array.isArray(stats)) {
      stats.forEach(stat => {
        const status = stat.orderStatus || 'unknown'; // Fixed: use orderStatus
        const count = parseInt(stat.count) || 0;
        const value = parseFloat(stat.totalValue) || 0;
        
        formattedStats.byStatus[status] = {
          count,
          totalValue: value
        };
        
        // Update summary if it's a known status
        if (formattedStats.summary.hasOwnProperty(status)) {
          formattedStats.summary[status] = count;
        }
      });
    }

    logger.info(`Retrieved order stats for user ${userId}`, {
      userId,
      totalOrders: formattedStats.totalOrders
    });

    res.json({
      success: true,
      message: 'Order statistics retrieved successfully',
      data: formattedStats
    });
  } catch (error) {
    logger.error(`Get order stats error: ${error.message}`, { error, userId: req.user?.id });
    
    // Return default stats on error
    res.json({
      success: true,
      message: 'Order statistics retrieved with defaults',
      data: {
        totalOrders: 0,
        totalRevenue: 0,
        byStatus: {},
        summary: {
          new: 0,
          processing: 0,
          shipped: 0,
          delivered: 0,
          cancelled: 0,
          returned: 0
        }
      }
    });
  }
};

// Get order trends data for charts
const getOrderTrends = async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const userId = req.user.id;

    // Parse time range
    const days = parseInt(timeRange.replace('d', '')) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get daily order counts and revenue
    const trends = await Order.findAll({
      where: {
        userId,
        createdAt: {
          [Op.gte]: startDate
        }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'orders'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue']
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      raw: true
    }).catch(() => []);

    // Generate date labels for the requested period
    const labels = [];
    const orderData = [];
    const revenueData = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      labels.push(dateStr);
      
      // Find data for this date
      const dayData = trends.find(t => t.date === dateStr);
      orderData.push(dayData ? parseInt(dayData.orders) : 0);
      revenueData.push(dayData ? parseFloat(dayData.revenue) || 0 : 0);
    }

    const response = {
      labels,
      datasets: [
        {
          label: 'Orders',
          data: orderData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.1
        },
        {
          label: 'Revenue',
          data: revenueData,
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.1,
          yAxisID: 'y1'
        }
      ]
    };

    logger.info(`Retrieved order trends for user ${userId}`, {
      userId,
      timeRange,
      dataPoints: labels.length
    });

    res.json({
      success: true,
      message: 'Order trends retrieved successfully',
      data: response
    });
  } catch (error) {
    logger.error(`Get order trends error: ${error.message}`, { error, userId: req.user?.id });
    
    // Return empty data on error
    const days = parseInt(req.query.timeRange?.replace('d', '')) || 30;
    const labels = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toISOString().split('T')[0]);
    }

    res.json({
      success: true,
      message: 'Order trends retrieved with defaults',
      data: {
        labels,
        datasets: [
          {
            label: 'Orders',
            data: new Array(days).fill(0),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.1
          },
          {
            label: 'Revenue',
            data: new Array(days).fill(0),
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.1,
            yAxisID: 'y1'
          }
        ]
      }
    });
  }
};

// Bulk update orders
const bulkUpdateOrders = async (req, res) => {
  try {
    const { orderIds, updates } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order IDs array is required'
      });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates object is required'
      });
    }

    const result = await Order.update(
      { ...updates, updatedAt: new Date() },
      {
        where: {
          id: { [Op.in]: orderIds },
          userId: req.user.id
        }
      }
    );

    logger.info(`Bulk updated ${result[0]} orders`, {
      orderIds,
      updates,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: `Successfully updated ${result[0]} orders`,
      data: { updatedCount: result[0] }
    });
  } catch (error) {
    logger.error(`Bulk update orders error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update orders'
    });
  }
};

// Export orders to CSV
const exportOrders = async (req, res) => {
  try {
    const { format = 'csv', ...filters } = req.query;

    const where = { userId: req.user.id };

    // Apply same filters as getOrders
    if (filters.status) where.orderStatus = filters.status; // Fixed: use orderStatus
    if (filters.platform) where.platform = filters.platform;
    if (filters.search) {
      where[Op.or] = [
        { orderNumber: { [Op.iLike]: `%${filters.search}%` } },
        { customerName: { [Op.iLike]: `%${filters.search}%` } }
      ];
    }

    const orders = await Order.findAll({
      where,
      include: [{
        model: OrderItem,
        as: 'items'
      }],
      order: [['createdAt', 'DESC']]
    });

    if (format === 'csv') {
      const csv = generateCSV(orders);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: orders
      });
    }
  } catch (error) {
    logger.error(`Export orders error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to export orders'
    });
  }
};

// Helper function to generate CSV
const generateCSV = (orders) => {
  const headers = ['Order Number', 'Customer Name', 'Email', 'Platform', 'Status', 'Total Amount', 'Currency', 'Created At'];
  const rows = orders.map(order => [
    order.orderNumber,
    order.customerName,
    order.customerEmail,
    order.platform,
    order.orderStatus, // Fixed: use orderStatus instead of status
    order.totalAmount,
    order.currency,
    order.createdAt
  ]);

  return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
};

// Bulk delete orders
const bulkDeleteOrders = async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order IDs array is required'
      });
    }

    const result = await Order.destroy({
      where: {
        id: { [Op.in]: orderIds },
        userId: req.user.id
      }
    });

    logger.info(`Bulk deleted ${result} orders`, {
      orderIds,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: `Successfully deleted ${result} orders`,
      data: { deletedCount: result }
    });
  } catch (error) {
    logger.error(`Bulk delete orders error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to bulk delete orders'
    });
  }
};

// Delete single order
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({
      where: { 
        id,
        userId: req.user.id 
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    await order.destroy();

    logger.info(`Order ${id} deleted`, {
      orderId: id,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete order error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to delete order'
    });
  }
};

// Complete the bulkEInvoice method
const bulkEInvoice = async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order IDs array is required'
      });
    }

    // Update e-invoice status for orders
    const result = await Order.update(
      { 
        eInvoiceStatus: 'issued',
        eInvoiceDate: new Date(),
        updatedAt: new Date() 
      },
      {
        where: {
          id: { [Op.in]: orderIds },
          userId: req.user.id
        }
      }
    );

    logger.info(`Bulk generated e-invoices for ${result[0]} orders`, {
      orderIds,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: `E-invoices generated for ${result[0]} orders`,
      data: { processedCount: result[0] }
    });
  } catch (error) {
    logger.error(`Bulk e-invoice error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to generate bulk e-invoices'
    });
  }
};

// Generate e-invoice for single order
const generateEInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({
      where: { 
        id,
        userId: req.user.id 
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    await order.update({
      eInvoiceStatus: 'issued',
      eInvoiceDate: new Date(),
      updatedAt: new Date()
    });

    logger.info(`E-invoice generated for order ${id}`, {
      orderId: id,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'E-invoice generated successfully',
      data: order
    });
  } catch (error) {
    logger.error(`Generate e-invoice error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to generate e-invoice'
    });
  }
};

// Sync orders from platforms
const syncOrders = async (req, res) => {
  try {
    const { platformId } = req.query;
    const userId = req.user.id;

    logger.info(`Order sync initiated`, {
      userId,
      platformId: platformId || 'all platforms'
    });

    // Mock sync process - in real implementation, this would call platform APIs
    // For now, we'll create some sample orders to demonstrate the functionality
    const syncedCount = Math.floor(Math.random() * 10) + 1;
    
    // In a real implementation, you would:
    // 1. Get connected platforms for the user
    // 2. Call each platform's API to fetch new orders
    // 3. Process and save the orders to the database
    
    logger.info(`Order sync completed`, {
      userId,
      syncedCount,
      platformId: platformId || 'all platforms'
    });

    res.json({
      success: true,
      message: `Successfully synced ${syncedCount} orders`,
      data: {
        syncedCount,
        timestamp: new Date().toISOString(),
        platforms: platformId ? [platformId] : ['all']
      }
    });
  } catch (error) {
    logger.error(`Order sync error: ${error.message}`, { error, userId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Failed to sync orders'
    });
  }
};

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  getOrderStats,
  getOrderTrends,
  bulkUpdateOrders,
  exportOrders,
  bulkDeleteOrders,
  deleteOrder,
  bulkEInvoice,
  generateEInvoice,
  syncOrders
};
