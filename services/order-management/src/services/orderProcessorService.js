// This file configures order processing services for the Order Management Service.
// It includes methods for finding consolidation candidates, consolidating orders, creating batch shipments,
// and processing webhook notifications from various platforms.

const { Order, OrderItem, ShippingDetail, Product } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Order Processor Service
 * Handles order consolidation, batch processing, and order workflows
 */
class OrderProcessorService {
  
  /**
   * Find orders from the same customer that can be consolidated
   * @param {Object} options - Consolidation options
   * @param {String} options.userId - User ID to find orders for
   * @param {String[]} options.statuses - Array of order statuses to consider
   * @param {Number} options.maxDaysDifference - Maximum days between orders to consolidate
   * @param {Boolean} options.sameAddressOnly - Only consolidate orders with same shipping address
   * @returns {Array} - Array of order groups that can be consolidated
   */
  async findConsolidationCandidates(options = {}) {
    try {
      const {
        userId,
        statuses = ['NEW', 'PROCESSING'],
        maxDaysDifference = 3,
        sameAddressOnly = true
      } = options;
      
      // Find all eligible orders
      const orders = await Order.findAll({
        where: {
          userId,
          status: statuses
        },
        include: [
          { model: ShippingDetail },
          { model: OrderItem, include: [Product] }
        ],
        order: [['orderDate', 'ASC']]
      });
      
      // Group orders by customer email or name for potential consolidation
      const customerGroups = {};
      
      orders.forEach(order => {
        // Skip orders without shipping details if sameAddressOnly is true
        if (sameAddressOnly && !order.ShippingDetail) return;
        
        const customerKey = order.customerEmail || order.customerName;
        if (!customerKey) return;
        
        if (!customerGroups[customerKey]) {
          customerGroups[customerKey] = [];
        }
        
        customerGroups[customerKey].push(order);
      });
      
      // Filter groups to only include those with multiple orders
      const consolidationGroups = [];
      
      Object.keys(customerGroups).forEach(customerKey => {
        const customerOrders = customerGroups[customerKey];
        
        // Only process customers with multiple orders
        if (customerOrders.length <= 1) return;
        
        // Sort orders by date
        customerOrders.sort((a, b) => new Date(a.orderDate) - new Date(b.orderDate));
        
        // Group orders within the time window
        const timeGroups = [];
        let currentGroup = [customerOrders[0]];
        
        for (let i = 1; i < customerOrders.length; i++) {
          const prevOrder = customerOrders[i-1];
          const currentOrder = customerOrders[i];
          
          const daysDifference = this._daysBetweenDates(
            new Date(prevOrder.orderDate),
            new Date(currentOrder.orderDate)
          );
          
          // Check if addresses match if sameAddressOnly is true
          let addressesMatch = true;
          if (sameAddressOnly && prevOrder.ShippingDetail && currentOrder.ShippingDetail) {
            addressesMatch = this._compareAddresses(
              prevOrder.ShippingDetail,
              currentOrder.ShippingDetail
            );
          }
          
          if (daysDifference <= maxDaysDifference && addressesMatch) {
            // Add to current group if within time window and addresses match
            currentGroup.push(currentOrder);
          } else {
            // Start a new group if time window exceeded or addresses don't match
            if (currentGroup.length > 1) {
              timeGroups.push([...currentGroup]);
            }
            currentGroup = [currentOrder];
          }
        }
        
        // Add the last group if it has multiple orders
        if (currentGroup.length > 1) {
          timeGroups.push(currentGroup);
        }
        
        // Add valid groups to the result
        timeGroups.forEach(group => {
          if (group.length > 1) {
            consolidationGroups.push({
              customer: customerKey,
              orders: group,
              totalItems: group.reduce((sum, order) => sum + order.OrderItems.length, 0),
              platforms: [...new Set(group.map(order => order.platformId))]
            });
          }
        });
      });
      
      return consolidationGroups;
    } catch (error) {
      logger.error('Error finding consolidation candidates:', error);
      throw error;
    }
  }
  
  /**
   * Consolidate multiple orders into a single shipment
   * @param {Array} orderIds - Array of order IDs to consolidate
   * @returns {Object} - Consolidated order details
   */
  async consolidateOrders(orderIds) {
    try {
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length <= 1) {
        throw new Error('At least two orders are required for consolidation');
      }
      
      // Find all orders to consolidate
      const orders = await Order.findAll({
        where: { id: orderIds },
        include: [
          { model: OrderItem, include: [Product] },
          { model: ShippingDetail }
        ]
      });
      
      if (orders.length !== orderIds.length) {
        throw new Error('One or more orders not found');
      }
      
      // Ensure all orders can be consolidated (same customer, valid status)
      const customerEmails = [...new Set(orders.map(o => o.customerEmail))];
      const customerNames = [...new Set(orders.map(o => o.customerName))];
      
      if (customerEmails.length > 1 && customerNames.length > 1) {
        throw new Error('Cannot consolidate orders from different customers');
      }
      
      const invalidStatusOrders = orders.filter(o => 
        !['NEW', 'PROCESSING'].includes(o.status)
      );
      
      if (invalidStatusOrders.length > 0) {
        throw new Error(`Orders with IDs ${invalidStatusOrders.map(o => o.id).join(', ')} have invalid status for consolidation`);
      }
      
      // Create a consolidated order
      const primaryOrder = orders[0];
      const consolidatedOrderData = {
        userId: primaryOrder.userId,
        platformId: primaryOrder.platformId, // Use primary order's platform
        platformOrderId: `CONSOLIDATED-${Math.random().toString(36).substring(2, 10)}`,
        customerName: primaryOrder.customerName,
        customerEmail: primaryOrder.customerEmail,
        status: 'CONSOLIDATED',
        orderDate: new Date(),
        totalAmount: orders.reduce((sum, order) => sum + parseFloat(order.totalAmount || 0), 0),
        currency: primaryOrder.currency,
        notes: `Consolidated from orders: ${orderIds.join(', ')}`,
        isConsolidated: true,
        consolidatedOrderIds: JSON.stringify(orderIds)
      };
      
      // Create the consolidated order
      const consolidatedOrder = await Order.create(consolidatedOrderData);
      
      // Copy shipping details from primary order
      if (primaryOrder.ShippingDetail) {
        const shippingData = { ...primaryOrder.ShippingDetail.toJSON() };
        delete shippingData.id;
        delete shippingData.createdAt;
        delete shippingData.updatedAt;
        
        shippingData.orderId = consolidatedOrder.id;
        await ShippingDetail.create(shippingData);
      }
      
      // Copy all order items to the consolidated order
      for (const order of orders) {
        if (order.OrderItems && order.OrderItems.length > 0) {
          for (const item of order.OrderItems) {
            const itemData = {
              orderId: consolidatedOrder.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              notes: `From original order: ${order.id}`
            };
            
            await OrderItem.create(itemData);
          }
        }
        
        // Update original order status
        order.status = 'CONSOLIDATED';
        order.consolidatedToOrderId = consolidatedOrder.id;
        await order.save();
      }
      
      // Return the full consolidated order with items
      return await Order.findByPk(consolidatedOrder.id, {
        include: [
          { model: OrderItem, include: [Product] },
          { model: ShippingDetail }
        ]
      });
    } catch (error) {
      logger.error('Error consolidating orders:', error);
      throw error;
    }
  }
  
  /**
   * Create batch shipments based on various criteria
   * @param {Object} options - Batch options
   * @param {String} options.userId - User ID to find orders for
   * @param {String[]} options.statuses - Order statuses to consider
   * @param {String} options.groupBy - Grouping criteria ('customer', 'platform', 'destination')
   * @returns {Array} - Array of order batches
   */
  async createBatchShipments(options = {}) {
    try {
      const {
        userId,
        statuses = ['NEW', 'PROCESSING'],
        groupBy = 'destination' // 'customer', 'platform', 'destination'
      } = options;
      
      // Find eligible orders
      const orders = await Order.findAll({
        where: {
          userId,
          status: statuses,
          isConsolidated: {
            [Op.or]: [false, null] // Only include non-consolidated orders
          }
        },
        include: [
          { model: ShippingDetail },
          { model: OrderItem }
        ]
      });
      
      if (orders.length === 0) {
        return [];
      }
      
      // Group orders based on criteria
      const batches = [];
      
      if (groupBy === 'customer') {
        // Group by customer
        const customerGroups = {};
        
        orders.forEach(order => {
          const key = order.customerEmail || order.customerName;
          if (!key) return;
          
          if (!customerGroups[key]) {
            customerGroups[key] = [];
          }
          
          customerGroups[key].push(order);
        });
        
        Object.keys(customerGroups).forEach(key => {
          if (customerGroups[key].length > 0) {
            batches.push({
              batchKey: `CUSTOMER-${key}`,
              batchType: 'customer',
              orders: customerGroups[key],
              totalOrders: customerGroups[key].length,
              totalItems: customerGroups[key].reduce((sum, order) => sum + order.OrderItems.length, 0)
            });
          }
        });
      } else if (groupBy === 'platform') {
        // Group by platform
        const platformGroups = {};
        
        orders.forEach(order => {
          const key = order.platformId;
          if (!key) return;
          
          if (!platformGroups[key]) {
            platformGroups[key] = [];
          }
          
          platformGroups[key].push(order);
        });
        
        Object.keys(platformGroups).forEach(key => {
          if (platformGroups[key].length > 0) {
            batches.push({
              batchKey: `PLATFORM-${key}`,
              batchType: 'platform',
              orders: platformGroups[key],
              totalOrders: platformGroups[key].length,
              totalItems: platformGroups[key].reduce((sum, order) => sum + order.OrderItems.length, 0)
            });
          }
        });
      } else {
        // Group by destination (city/state/country)
        const destinationGroups = {};
        
        orders.forEach(order => {
          if (!order.ShippingDetail) return;
          
          const shipping = order.ShippingDetail;
          const key = `${shipping.country}-${shipping.state}-${shipping.city}`.toLowerCase();
          
          if (!destinationGroups[key]) {
            destinationGroups[key] = [];
          }
          
          destinationGroups[key].push(order);
        });
        
        Object.keys(destinationGroups).forEach(key => {
          if (destinationGroups[key].length > 0) {
            const sample = destinationGroups[key][0].ShippingDetail;
            batches.push({
              batchKey: `DEST-${sample.city}-${sample.state}-${sample.country}`,
              batchType: 'destination',
              destination: {
                city: sample.city,
                state: sample.state,
                country: sample.country
              },
              orders: destinationGroups[key],
              totalOrders: destinationGroups[key].length,
              totalItems: destinationGroups[key].reduce((sum, order) => sum + order.OrderItems.length, 0)
            });
          }
        });
      }
      
      return batches;
    } catch (error) {
      logger.error('Error creating batch shipments:', error);
      throw error;
    }
  }
  
  /**
   * Process webhook notification from platforms
   * @param {Object} data - Webhook data
   * @param {String} platformType - Platform type
   * @returns {Object} - Processing result
   */
  async processWebhookNotification(data, platformType) {
    try {
      if (!data || !platformType) {
        throw new Error('Missing webhook data or platform type');
      }
      
      // Handle different webhook types based on platform
      let result = { success: false };
      
      switch (platformType.toLowerCase()) {
        case 'trendyol':
          result = await this._processTrendyolWebhook(data);
          break;
        // Add more platform handlers as needed
        default:
          throw new Error(`Unsupported platform type: ${platformType}`);
      }
      
      return result;
    } catch (error) {
      logger.error('Error processing webhook notification:', error);
      throw error;
    }
  }
  
  /**
   * Calculate days between two dates
   * @private
   * @param {Date} date1 - First date
   * @param {Date} date2 - Second date
   * @returns {Number} - Number of days difference
   */
  _daysBetweenDates(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
    const diffDays = Math.round(Math.abs((date1 - date2) / oneDay));
    return diffDays;
  }
  
  /**
   * Compare two shipping addresses for similarity
   * @private
   * @param {Object} address1 - First address
   * @param {Object} address2 - Second address
   * @returns {Boolean} - True if addresses match
   */
  _compareAddresses(address1, address2) {
    // Normalize and compare postal codes
    const postalCode1 = (address1.postalCode || '').trim().replace(/\s+/g, '');
    const postalCode2 = (address2.postalCode || '').trim().replace(/\s+/g, '');
    
    if (postalCode1 && postalCode2 && postalCode1 === postalCode2) {
      return true;
    }
    
    // Compare city, state, country
    const city1 = (address1.city || '').trim().toLowerCase();
    const city2 = (address2.city || '').trim().toLowerCase();
    
    const state1 = (address1.state || '').trim().toLowerCase();
    const state2 = (address2.state || '').trim().toLowerCase();
    
    const country1 = (address1.country || '').trim().toLowerCase();
    const country2 = (address2.country || '').trim().toLowerCase();
    
    // City, state, and country must match
    return (
      city1 === city2 && 
      state1 === state2 && 
      country1 === country2
    );
  }
  
  /**
   * Process Trendyol webhook notification
   * @private
   * @param {Object} data - Webhook data
   * @returns {Object} - Processing result
   */
  async _processTrendyolWebhook(data) {
    try {
      // Handle different webhook events from Trendyol
      if (!data.event || !data.orderId) {
        throw new Error('Invalid webhook format');
      }
      
      // Find the order in our system
      const order = await Order.findOne({
        where: {
          platformOrderId: data.orderId,
          platformId: { [Op.ne]: null } // Ensure it has a platform ID
        }
      });
      
      if (!order) {
        logger.warn(`Order not found for Trendyol webhook: ${data.orderId}`);
        return {
          success: false,
          message: 'Order not found in system',
          event: data.event
        };
      }
      
      // Update order based on event type
      switch (data.event.toLowerCase()) {
        case 'order_created':
          // Update if we already have it but with different status
          if (order.status !== 'NEW') {
            order.status = 'NEW';
            await order.save();
          }
          break;
          
        case 'order_shipped':
          order.status = 'SHIPPED';
          if (data.trackingNumber) {
            order.trackingNumber = data.trackingNumber;
          }
          await order.save();
          break;
          
        case 'order_cancelled':
          order.status = 'CANCELLED';
          if (data.cancellationReason) {
            order.cancellationReason = data.cancellationReason;
          }
          order.cancellationDate = new Date();
          await order.save();
          break;
          
        case 'order_delivered':
          order.status = 'DELIVERED';
          order.deliveryDate = new Date();
          await order.save();
          break;
          
        default:
          logger.info(`Unhandled Trendyol event type: ${data.event}`);
          return {
            success: false,
            message: `Unhandled event type: ${data.event}`,
            orderId: order.id
          };
      }
      
      return {
        success: true,
        message: `Successfully processed ${data.event} event`,
        orderId: order.id,
        status: order.status
      };
    } catch (error) {
      logger.error('Error processing Trendyol webhook:', error);
      throw error;
    }
  }
}

module.exports = new OrderProcessorService();