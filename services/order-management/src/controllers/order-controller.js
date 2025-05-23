const express = require('express');
const { Order, OrderItem, ShippingDetail, Product, User, PlatformConnection } = require('../models');
const platformServiceFactory = require('../services/platforms/platformServiceFactory');
const logger = require('../utils/logger');
const wsService = require('../services/websocketService');
const { Op } = require('sequelize');

// Controller functions
async function getAllOrders(req, res) {
  try {
    const { id: userId } = req.user;
    const { 
      page = 1, 
      limit = 20, 
      status, 
      platform, 
      startDate, 
      endDate,
      customerId 
    } = req.query;
    
    const offset = (page - 1) * limit;
    const where = { userId };
    
    // Apply filters if provided
    if (status) where.status = status;
    if (platform) where.platformId = platform;
    if (customerId) where.customerId = customerId;
    
    // Apply date range filter if provided - using proper Sequelize operator syntax
    if (startDate && endDate) {
      where.orderDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    // Get orders with pagination and include related models
    const orders = await Order.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        { model: OrderItem, include: [Product] },
        { model: ShippingDetail },
        { model: PlatformConnection } // Changed from Platform to PlatformConnection
      ],
      order: [['orderDate', 'DESC']],
      distinct: true
    });
    
    return res.status(200).json({
      success: true,
      data: {
        orders: orders.rows,
        pagination: {
          total: orders.count,
          pages: Math.ceil(orders.count / limit),
          page: parseInt(page),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
}

async function createOrder(req, res) {
  try {
    // ...existing validation and creation code...
    
    const order = await Order.create(orderData);
    
    // Notify connected clients about the new order
    wsService.notifyNewOrder(order);
    
    return res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('Error creating order:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message
    });
  }
}

async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    
    const order = await Order.findByPk(id, {
      include: [
        { model: OrderItem, include: [Product] },
        { model: ShippingDetail },
        { model: PlatformConnection } // Changed from Platform to PlatformConnection
      ]
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order with ID ${id} not found`
      });
    }
    
    return res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error(`Error fetching order ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching order details',
      error: error.message
    });
  }
}

async function updateOrder(req, res) {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    await order.update(req.body);
    
    // Notify connected clients about the order update
    wsService.notifyOrderUpdate(order);
    
    return res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('Error updating order:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating order',
      error: error.message
    });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    const order = await Order.findByPk(id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order with ID ${id} not found`
      });
    }
    
    // Update order status
    order.status = status;
    if (notes) order.notes = notes;
    order.updatedAt = new Date();
    
    await order.save();
    
    return res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: order
    });
  } catch (error) {
    logger.error(`Error updating order ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Error updating order status',
      error: error.message
    });
  }
}

async function cancelOrder(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const order = await Order.findByPk(id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order with ID ${id} not found`
      });
    }
    
    await order.update({
      status: 'cancelled',
      cancellationReason: reason,
      cancelledAt: new Date()
    });
    
    // Notify connected clients about the order cancellation
    wsService.notifyOrderCancellation(order);
    
    return res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('Error cancelling order:', error);
    return res.status(500).json({
      success: false,
      message: 'Error cancelling order',
      error: error.message
    });
  }
}

async function syncOrders(req, res) {
  try {
    const { userId, platformIds } = req.body;
    
    // Validate user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User with ID ${userId} not found`
      });
    }
    
    // Get all platforms for the user if platformIds not specified
    let platforms;
    if (platformIds && platformIds.length > 0) {
      platforms = await PlatformConnection.findAll({ // Changed from Platform to PlatformConnection
        where: {
          id: platformIds,
          userId
        }
      });
    } else {
      platforms = await PlatformConnection.findAll({ // Changed from Platform to PlatformConnection
        where: { userId }
      });
    }
    
    if (platforms.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No connected platforms found'
      });
    }
    
    // Track sync results for each platform
    const syncResults = [];
    
    // Process each platform
    for (const platform of platforms) {
      try {
        // Get platform service
        const platformService = PlatformServiceFactory.getPlatformService();
        
        if (!platformService) {
          syncResults.push({
            platformId: platform.id,
            platformName: platform.name,
            success: false,
            error: `Unsupported platform type: ${platform.type}`
          });
          continue;
        }
        
        // Initialize connection with platform credentials
        await platformService.initialize(platform.credentials);
        
        // Get orders from platform
        const orders = await platformService.getOrders({
          startDate: req.body.startDate,
          endDate: req.body.endDate,
          status: req.body.orderStatus
        });
        
        // Save or update orders in the database
        let newOrderCount = 0;
        let updatedOrderCount = 0;
        
        for (const orderData of orders) {
          // Check if order already exists
          const [order, created] = await Order.findOrCreate({
            where: { 
              platformOrderId: orderData.platformOrderId,
              platformId: platform.id 
            },
            defaults: {
              userId,
              platformId: platform.id,
              platformOrderId: orderData.platformOrderId,
              customerName: orderData.customerName,
              customerEmail: orderData.customerEmail,
              status: orderData.status,
              orderDate: orderData.orderDate,
              totalAmount: orderData.totalAmount,
              currency: orderData.currency
            }
          });
          
          if (created) {
            newOrderCount++;
            
            // Create order items
            if (orderData.items && orderData.items.length > 0) {
              for (const item of orderData.items) {
                // Find or create product
                const [product] = await Product.findOrCreate({
                  where: { 
                    platformProductId: item.platformProductId,
                    platformId: platform.id
                  },
                  defaults: {
                    name: item.name,
                    sku: item.sku,
                    platformProductId: item.platformProductId,
                    platformId: platform.id
                  }
                });
                
                // Create order item
                await OrderItem.create({
                  orderId: order.id,
                  productId: product.id,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: item.totalPrice
                });
              }
            }
            
            // Create shipping details if available
            if (orderData.shipping) {
              await ShippingDetail.create({
                orderId: order.id,
                recipientName: orderData.shipping.recipientName,
                addressLine1: orderData.shipping.addressLine1,
                addressLine2: orderData.shipping.addressLine2,
                city: orderData.shipping.city,
                state: orderData.shipping.state,
                postalCode: orderData.shipping.postalCode,
                country: orderData.shipping.country,
                phone: orderData.shipping.phone
              });
            }
          } else {
            // Update existing order if needed
            if (order.status !== orderData.status) {
              order.status = orderData.status;
              await order.save();
              updatedOrderCount++;
            }
          }
        }
        
        syncResults.push({
          platformId: platform.id,
          platformName: platform.name,
          success: true,
          newOrders: newOrderCount,
          updatedOrders: updatedOrderCount,
          totalProcessed: orders.length
        });
        
      } catch (error) {
        logger.error(`Error syncing orders from platform ${platform.id}:`, error);
        syncResults.push({
          platformId: platform.id,
          platformName: platform.name,
          success: false,
          error: error.message
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Order synchronization complete',
      data: syncResults
    });
    
  } catch (error) {
    logger.error('Error in order sync process:', error);
    return res.status(500).json({
      success: false,
      message: 'Error synchronizing orders',
      error: error.message
    });
  }
}

/**
 * Sync orders for a specific platform by ID
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
async function syncOrdersByPlatform(req, res) {
  try {
    const { id } = req.params; // Platform connection ID
    const userId = req.user.id; // Get user ID from auth middleware
    
    // Find the platform connection
    const platformConnection = await PlatformConnection.findOne({
      where: {
        id: id,
        userId: userId
      }
    });
    
    if (!platformConnection) {
      return res.status(404).json({
        success: false,
        message: `Platform connection with ID ${id} not found or doesn't belong to the user`
      });
    }
    
    // Create the platform service instance using the factory
    const platformService = await platformServiceFactory.createService(id);
    
    // Set date range for sync
    const now = new Date();
    const startDate = req.body.startDate 
      ? new Date(req.body.startDate) 
      : new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // Default to last 7 days
    
    const endDate = req.body.endDate 
      ? new Date(req.body.endDate) 
      : now;
    
    // Sync orders from the platform
    let syncResult;
    try {
      syncResult = await platformService.syncOrdersFromDate(startDate, endDate);
    } catch (syncError) {
      logger.error(`Error during sync operation: ${syncError.message}`, { error: syncError });
      
      // Check if this is a duplicate order error (SequelizeUniqueConstraintError)
      if (syncError.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          message: 'Some orders are already synced and could not be imported again',
          error: {
            name: 'SequelizeUniqueConstraintError',
            fields: syncError.fields
          }
        });
      }
      
      throw syncError; // Re-throw other errors to be caught by the outer catch block
    }
    
    // Update platform connection last sync time
    await platformConnection.update({
      lastSyncAt: now
    });
    
    // Successful sync
    return res.status(200).json({
      success: true,
      message: `Successfully synced orders from ${platformConnection.name}`,
      data: syncResult
    });
    
  } catch (error) {
    logger.error(`Error syncing orders from platform connection ${req.params.id}: ${error.message}`, 
      { error, connectionId: req.params.id }
    );
    return res.status(500).json({
      success: false,
      message: 'Error syncing orders',
      error: error.message
    });
  }
}

async function getOrderStats(req, res) {
  try {
    const [newOrders, processingOrders, shippedOrders, totalOrders] = await Promise.all([
      Order.count({ where: { status: 'new' } }),
      Order.count({ where: { status: 'processing' } }),
      Order.count({ where: { status: 'shipped' } }),
      Order.count()
    ]);

    // Get platform connection stats
    const platforms = await PlatformConnection.findAndCountAll({ // Changed from Platform to PlatformConnection
      attributes: ['status']
    });

    const platformStats = {
      active: platforms.rows.filter(p => p.status === 'active').length,
      error: platforms.rows.filter(p => p.status === 'error').length,
      total: platforms.count
    };

    return res.status(200).json({
      success: true,
      data: {
        newOrders,
        processingOrders,
        shippedOrders,
        totalOrders,
        platforms: platformStats
      }
    });
  } catch (error) {
    logger.error('Error fetching order stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching order stats',
      error: error.message
    });
  }
}

/**
 * Import a direct Hepsiburada order payload
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
async function importHepsiburadaOrder(req, res) {
  try {
    const orderData = req.body;
    const { connectionId } = req.query;
    
    if (!orderData || !orderData.orderId || !orderData.orderNumber) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order data: Missing required fields'
      });
    }
    
    if (!connectionId) {
      return res.status(400).json({
        success: false,
        message: 'Platform connection ID is required'
      });
    }

    // Get the Hepsiburada service for this connection
    const HepsiburadaService = require('../services/platforms/hepsiburada/hepsiburada-service');
    const hepsiburadaService = new HepsiburadaService(connectionId);
    
    try {
      // Process the order data
      const result = await hepsiburadaService.processDirectOrderPayload(orderData);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      // Notify via websocket about the new order
      if (result.data) {
        wsService.notifyNewOrder(result.data);
      }
      
      return res.status(200).json({
        success: true,
        message: 'Order imported successfully',
        data: result.data
      });
    } catch (processError) {
      // Handle unique constraint violations
      if (processError.name === 'SequelizeUniqueConstraintError') {
        logger.warn(`Unique constraint violation during Hepsiburada order import: ${orderData.orderNumber || orderData.orderId}`, {
          error: processError,
          orderNumber: orderData.orderNumber,
          orderId: orderData.orderId,
          connectionId: connectionId
        });
        
        return res.status(409).json({
          success: false,
          message: 'This order already exists in the system',
          error: {
            name: 'SequelizeUniqueConstraintError',
            fields: processError.fields || {},
            orderNumber: orderData.orderNumber,
            orderId: orderData.orderId
          }
        });
      }
      
      // Handle other specific error for "Could not find order that caused constraint violation"
      if (processError.message && processError.message.includes('Could not find order')) {
        logger.error(`Order lookup failure after constraint violation: ${orderData.orderNumber || orderData.orderId}`, {
          error: processError,
          orderNumber: orderData.orderNumber,
          orderId: orderData.orderId,
          connectionId: connectionId
        });
        
        return res.status(409).json({
          success: false,
          message: 'Order appears to exist but could not be located for update',
          error: {
            name: 'OrderLookupError',
            orderNumber: orderData.orderNumber,
            orderId: orderData.orderId
          }
        });
      }
      
      // Re-throw other errors to be caught by outer catch
      throw processError;
    }
  } catch (error) {
    logger.error(`Failed to import Hepsiburada order: ${error.message}`, { 
      error, 
      userId: req.user.id,
      body: req.body.orderNumber || req.body.orderId
    });
    
    return res.status(500).json({
      success: false,
      message: `Failed to import order: ${error.message}`,
      error: error.message
    });
  }
}

/**
 * Get order trends data for charts
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
async function getOrderTrends(req, res) {
  try {
    const { period = 'week', platform, compareWithPrevious = 'true' } = req.query;
    const shouldCompare = compareWithPrevious === 'true';
    
    // Determine date ranges based on the period
    const now = new Date();
    let startDate, endDate;
    let previousStartDate, previousEndDate;
    let groupByFormat;
    
    switch (period) {
      case 'year':
        // Last 12 months
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        previousStartDate = new Date(now.getFullYear() - 1, now.getMonth() - 11, 1);
        previousEndDate = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0);
        groupByFormat = 'month'; // Group by month
        break;
        
      case 'month':
        // Last 30 days
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        endDate = now;
        previousStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 59);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        groupByFormat = 'day'; // Group by day
        break;
        
      default: // week
        // Last 7 days
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        endDate = now;
        previousStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        groupByFormat = 'day'; // Group by day
    }
    
    // Set times to beginning/end of day for consistent comparisons
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    if (shouldCompare) {
      previousStartDate.setHours(0, 0, 0, 0);
      previousEndDate.setHours(23, 59, 59, 999);
    }
    
    // Prepare the where clause
    const where = {
      orderDate: {
        [Op.between]: [startDate, endDate]
      }
    };
    
    // Add platform filter if provided
    if (platform) {
      where.platformId = platform;
    }
    
    // Fetch orders for the current period
    const orders = await Order.findAll({
      where,
      attributes: [
        'id', 
        'orderDate', 
        'status',
        'totalAmount'
      ],
      order: [['orderDate', 'ASC']]
    });
    
    // Group orders by date
    const groupedData = groupOrdersByDate(orders, groupByFormat);
    
    // Process previous period if comparison is requested
    let previousGroupedData = null;
    if (shouldCompare) {
      const previousWhere = { ...where };
      previousWhere.orderDate = {
        [Op.between]: [previousStartDate, previousEndDate]
      };
      
      const previousOrders = await Order.findAll({
        where: previousWhere,
        attributes: [
          'id', 
          'orderDate', 
          'status',
          'totalAmount'
        ],
        order: [['orderDate', 'ASC']]
      });
      
      previousGroupedData = groupOrdersByDate(previousOrders, groupByFormat);
    }
    
    // Format the response data
    const trendData = formatTrendData(groupedData, previousGroupedData, period);
    
    return res.status(200).json({
      success: true,
      data: trendData
    });
    
  } catch (error) {
    logger.error(`Failed to get order trends: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to get order trends',
      error: error.message
    });
  }
}

/**
 * Group orders by date according to the specified format
 * @param {Array} orders - The array of orders
 * @param {String} groupByFormat - The date format to group by ('day' or 'month')
 * @returns {Object} - Grouped orders by date
 */
function groupOrdersByDate(orders, groupByFormat) {
  const grouped = {};
  
  orders.forEach(order => {
    const date = new Date(order.orderDate);
    let key;
    
    if (groupByFormat === 'month') {
      // Format: YYYY-MM (2023-01 for January 2023)
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } else {
      // Format: YYYY-MM-DD
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    
    if (!grouped[key]) {
      grouped[key] = {
        date: key,
        newOrders: 0,
        shippedOrders: 0,
        totalOrders: 0,
        revenue: 0
      };
    }
    
    grouped[key].totalOrders++;
    
    if (order.status === 'new') {
      grouped[key].newOrders++;
    } else if (order.status === 'shipped') {
      grouped[key].shippedOrders++;
    }
    
    // Add to revenue
    if (order.totalAmount) {
      grouped[key].revenue += parseFloat(order.totalAmount) || 0;
    }
  });
  
  return grouped;
}

/**
 * Format trend data for response
 * @param {Object} currentData - Grouped data for current period
 * @param {Object} previousData - Grouped data for previous period (optional)
 * @param {String} period - The time period ('week', 'month', 'year')
 * @returns {Array} - Formatted trend data
 */
function formatTrendData(currentData, previousData, period) {
  const result = [];
  
  // Get all dates in the range
  const dates = getDateRange(period);
  
  // Fill in the data for each date
  dates.forEach(dateStr => {
    const data = {
      date: dateStr,
      newOrders: (currentData[dateStr]?.newOrders || 0),
      shippedOrders: (currentData[dateStr]?.shippedOrders || 0),
      totalOrders: (currentData[dateStr]?.totalOrders || 0),
      revenue: (currentData[dateStr]?.revenue || 0).toFixed(2)
    };
    
    // Add previous period data if available
    if (previousData) {
      const previousIndex = Object.keys(previousData).findIndex(d => 
        d.substring(5) === dateStr.substring(5)
      );
      
      if (previousIndex !== -1) {
        const prevKey = Object.keys(previousData)[previousIndex];
        data.previousNewOrders = previousData[prevKey]?.newOrders || 0;
        data.previousShippedOrders = previousData[prevKey]?.shippedOrders || 0;
        data.previousTotalOrders = previousData[prevKey]?.totalOrders || 0;
        data.previousRevenue = (previousData[prevKey]?.revenue || 0).toFixed(2);
      } else {
        data.previousNewOrders = 0;
        data.previousShippedOrders = 0;
        data.previousTotalOrders = 0;
        data.previousRevenue = 0;
      }
    }
    
    result.push(data);
  });
  
  return result;
}

/**
 * Generate a date range array based on the period
 * @param {String} period - The time period ('week', 'month', 'year')
 * @returns {Array} - Array of date strings
 */
function getDateRange(period) {
  const result = [];
  const today = new Date();
  let start, end, dateFormat;
  
  switch (period) {
    case 'year':
      start = new Date(today.getFullYear(), today.getMonth() - 11, 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      dateFormat = 'month';
      break;
    case 'month':
      start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);
      end = today;
      dateFormat = 'day';
      break;
    default: // week
      start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
      end = today;
      dateFormat = 'day';
  }
  
  // Set to beginning of day
  start.setHours(0, 0, 0, 0);
  
  const current = new Date(start);
  
  while (current <= end) {
    let dateStr;
    
    if (dateFormat === 'month') {
      dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      current.setMonth(current.getMonth() + 1);
    } else {
      dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      current.setDate(current.getDate() + 1);
    }
    
    result.push(dateStr);
  }
  
  return result;
}

/**
 * Get order details with platform-specific data
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
async function getOrderWithPlatformDetails(req, res) {
  try {
    const { id } = req.params;
    const { TrendyolOrder, HepsiburadaOrder } = require('../models');
    
    // Find the order with all its associations
    const order = await Order.findByPk(id, {
      include: [
        { model: OrderItem, include: [Product] },
        { model: ShippingDetail },
        { model: PlatformConnection },
        { model: TrendyolOrder, as: 'trendyolDetails' },
        { model: HepsiburadaOrder }
      ]
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order with ID ${id} not found`
      });
    }
    
    // Convert the raw order data to a more usable form
    let orderData = order.toJSON();
    
    // Add a field to indicate the platform type for easier frontend handling
    orderData.platformDetailsType = order.platformType;
    
    // Depending on the platform type, include the appropriate details
    if (order.platformType === 'trendyol' && order.trendyolDetails) {
      orderData.platformDetails = order.trendyolDetails;
    } else if (order.platformType === 'hepsiburada' && order.HepsiburadaOrder) {
      orderData.platformDetails = order.HepsiburadaOrder;
    } else {
      // If no platform-specific details found
      orderData.platformDetails = null;
    }
    
    return res.status(200).json({
      success: true,
      data: orderData
    });
  } catch (error) {
    logger.error(`Error fetching order details with platform data ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching order details',
      error: error.message
    });
  }
}

module.exports = {
  getAllOrders,
  createOrder,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  cancelOrder,
  syncOrders,
  syncOrdersByPlatform,
  getOrderStats,
  importHepsiburadaOrder,
  getOrderTrends,
  getOrderWithPlatformDetails
};