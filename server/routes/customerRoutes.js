const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { auth } = require('../middleware/auth');
const CustomerService = require('../services/CustomerService');
const {
  Order,
  OrderItem,
  PlatformConnection,
  ShippingDetail
} = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// Apply authentication middleware to all routes
router.use(auth);

// POST /api/customers/sync - Extract customers from orders and save to database
router.post('/sync', async (req, res) => {
  try {
    logger.info('Starting customer sync', { userId: req.user.id });

    // Extract customers from orders
    await CustomerService.extractAndSaveCustomersFromOrders();

    // Get updated statistics
    const stats = await CustomerService.getCustomerStats();

    res.json({
      success: true,
      message: 'Customers synchronized successfully',
      data: stats
    });
  } catch (error) {
    logger.error('Error syncing customers', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to sync customers',
      error: error.message
    });
  }
});

// GET /api/customers/stats - Get customer statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await CustomerService.getCustomerStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching customer stats', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer statistics',
      error: error.message
    });
  }
});

// GET /api/customers - Get all customers with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      customerType = 'all',
      riskLevel = 'all',
      sortBy = 'totalSpent',
      sortOrder = 'desc'
    } = req.query;

    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    logger.info('Fetching customers with analytics', {
      userId: req.user.id,
      page,
      limit,
      search,
      customerType,
      riskLevel,
      sortBy,
      sortOrder
    });

    // Use CustomerService to get customers with analytics
    const result = await CustomerService.getCustomersWithAnalytics({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      customerType,
      riskLevel,
      sortBy,
      sortOrder
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customers',
      error: error.message
    });
  }
});

// GET /api/customers/:id - Get single customer
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Extract customer info from the ID (since we're generating synthetic IDs)
    // We'll need to get customer by name/email combination
    const { name, email } = req.query;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required'
      });
    }

    // Find customer by getting their order data
    const customerOrders = await Order.findAll({
      where: {
        userId: req.user.id,
        customerName: name,
        ...(email && { customerEmail: email })
      },
      include: [
        {
          model: OrderItem,
          as: 'items'
        },
        {
          model: PlatformConnection,
          as: 'platformConnection'
        }
      ],
      order: [['orderDate', 'DESC']]
    });

    if (!customerOrders || customerOrders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const latestOrder = customerOrders[0];

    // Parse shipping address
    let address = {};
    try {
      if (latestOrder.shippingAddress) {
        address =
          typeof latestOrder.shippingAddress === 'string'
            ? JSON.parse(latestOrder.shippingAddress)
            : latestOrder.shippingAddress;
      }
    } catch (error) {
      logger.warn('Failed to parse shipping address', { error: error.message });
    }

    // Calculate customer metrics
    const totalSpent = customerOrders.reduce(
      (sum, order) => sum + parseFloat(order.totalAmount),
      0
    );
    const orderCount = customerOrders.length;
    const lastOrderDate = new Date(latestOrder.orderDate);
    const firstOrderDate = new Date(
      customerOrders[customerOrders.length - 1].orderDate
    );
    const daysSinceLastOrder =
      (new Date() - lastOrderDate) / (1000 * 60 * 60 * 24);
    const status = daysSinceLastOrder > 90 ? 'inactive' : 'active';

    const customer = {
      id: id,
      name: latestOrder.customerName,
      email: latestOrder.customerEmail || '',
      phone: latestOrder.customerPhone || '',
      address: {
        street: address.address1 || address.street || '',
        city: address.city || '',
        state: address.state || address.district || '',
        zipCode: address.postalCode || address.zipCode || '',
        country: address.country || 'Turkey'
      },
      status: status,
      orderCount: orderCount,
      totalSpent: totalSpent,
      createdAt: firstOrderDate,
      updatedAt: lastOrderDate
    };

    res.json({
      success: true,
      customer
    });
  } catch (error) {
    logger.error('Error fetching customer:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer',
      error: error.message
    });
  }
});

// POST /api/customers - Create new customer (Not applicable for order-based customers)
router.post('/', async (req, res) => {
  try {
    res.status(400).json({
      success: false,
      message:
        'Customers are automatically created from orders. Please create an order instead.'
    });
  } catch (error) {
    logger.error('Error creating customer:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating customer',
      error: error.message
    });
  }
});

// PUT /api/customers/:id - Update customer (Limited to certain fields)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.query;
    const updateData = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required'
      });
    }

    // Update customer information in all their orders
    const updateFields = {};
    if (updateData.phone) {updateFields.customerPhone = updateData.phone;}
    if (updateData.email && updateData.email !== email)
    {updateFields.customerEmail = updateData.email;}
    if (updateData.name && updateData.name !== name)
    {updateFields.customerName = updateData.name;}

    if (Object.keys(updateFields).length > 0) {
      await Order.update(updateFields, {
        where: {
          userId: req.user.id,
          customerName: name,
          ...(email && { customerEmail: email })
        }
      });
    }

    logger.info('Customer updated successfully', {
      customerId: id,
      updatedFields: Object.keys(updateFields)
    });

    res.json({
      success: true,
      message: 'Customer updated successfully'
    });
  } catch (error) {
    logger.error('Error updating customer:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating customer',
      error: error.message
    });
  }
});

// DELETE /api/customers/:id - Delete customer (Not recommended for order-based customers)
router.delete('/:id', async (req, res) => {
  try {
    res.status(400).json({
      success: false,
      message:
        'Cannot delete customers as they are derived from orders. Customer data will be removed when all associated orders are deleted.'
    });
  } catch (error) {
    logger.error('Error deleting customer:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting customer',
      error: error.message
    });
  }
});

// GET /api/customers/:id/orders - Get customer orders
router.get('/:id/orders', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.query;
    const { page = 1, limit = 20 } = req.query;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required'
      });
    }

    // Get customer orders with pagination
    const whereCondition = {
      userId: req.user.id,
      customerName: name
    };

    if (email) {
      whereCondition.customerEmail = email;
    }

    const { count, rows: orders } = await Order.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: OrderItem,
          as: 'items'
        },
        {
          model: PlatformConnection,
          as: 'platformConnection',
          attributes: ['platformType', 'name']
        }
      ],
      order: [['orderDate', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No orders found for this customer'
      });
    }

    // Transform orders for frontend
    const transformedOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.orderStatus,
      total: parseFloat(order.totalAmount),
      currency: order.currency,
      platform: order.platformConnection?.platformType || 'unknown',
      createdAt: order.orderDate,
      items: order.items.map((item) => ({
        name: item.productName || item.productTitle,
        quantity: item.quantity,
        price: parseFloat(item.unitPrice || item.amount),
        total: parseFloat(item.totalPrice || item.amount)
      }))
    }));

    const totalPages = Math.ceil(count / parseInt(limit));

    res.json({
      success: true,
      orders: transformedOrders,
      customer: {
        id: id,
        name: orders[0].customerName,
        email: orders[0].customerEmail,
        phone: orders[0].customerPhone
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages
      }
    });
  } catch (error) {
    logger.error('Error fetching customer orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer orders',
      error: error.message
    });
  }
});

// GET /api/customers/by-email/:email - Get customer by email with orders
router.get('/by-email/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    logger.info('Fetching customer by email', {
      userId: req.user.id,
      email: email
    });

    // Use CustomerService to get customer with orders
    const customer = await CustomerService.getCustomerByEmail(email);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    logger.error('Error fetching customer by email:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer',
      error: error.message
    });
  }
});

module.exports = router;
