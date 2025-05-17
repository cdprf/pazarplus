const express = require('express');
const { Order, OrderItem, ShippingDetail, Product, User, Platform } = require('../models');
const platformServiceFactory = require('../services/platforms/platformServiceFactory');
const logger = require('../utils/logger');

// Controller functions
async function getAllOrders(req, res) {
  try {
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
    const where = {};
    
    // Apply filters if provided
    if (status) where.status = status;
    if (platform) where.platformId = platform;
    if (customerId) where.customerId = customerId;
    
    // Apply date range filter if provided
    if (startDate && endDate) {
      where.orderDate = {
        $between: [new Date(startDate), new Date(endDate)]
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
        { model: Platform }
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

async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    
    const order = await Order.findByPk(id, {
      include: [
        { model: OrderItem, include: [Product] },
        { model: ShippingDetail },
        { model: Platform }
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
    
    // Soft delete the order
    order.status = 'CANCELLED';
    order.cancellationReason = reason || 'No reason provided';
    order.cancellationDate = new Date();
    
    await order.save();
    
    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        id: order.id,
        status: order.status,
        cancellationReason: order.cancellationReason,
        cancellationDate: order.cancellationDate
      }
    });
  } catch (error) {
    logger.error(`Error cancelling order ${req.params.id}:`, error);
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
      platforms = await Platform.findAll({
        where: {
          id: platformIds,
          userId
        }
      });
    } else {
      platforms = await Platform.findAll({
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
        const platformService = platformServiceFactory.getService(platform.type);
        
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

async function getOrderStats(req, res) {
  try {
    const [newOrders, processingOrders, shippedOrders, totalOrders] = await Promise.all([
      Order.count({ where: { status: 'new' } }),
      Order.count({ where: { status: 'processing' } }),
      Order.count({ where: { status: 'shipped' } }),
      Order.count()
    ]);

    // Get platform connection stats
    const platforms = await Platform.findAndCountAll({
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

module.exports = {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  syncOrders,
  getOrderStats
};