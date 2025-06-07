// This file configures order processing services for the Order Management Service.
// It includes methods for finding consolidation candidates, consolidating orders, creating batch shipments,
// and processing webhook notifications from various platforms.

const {
  Order,
  OrderItem,
  User,
  PlatformConnection,
  ShippingDetail,
  Product,
  FinancialTransaction,
} = require("../../../models");
const { Op } = require("sequelize");
const logger = require("../../../utils/logger");
const sequelize = require("../../../config/database");

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
        statuses = ["new", "processing"],
        maxDaysDifference = 3,
        sameAddressOnly = true,
      } = options;

      // Find all eligible orders
      const orders = await Order.findAll({
        where: {
          userId,
          orderStatus: statuses,
        },
        include: [
          { model: ShippingDetail, as: "shippingDetail" },
          {
            model: OrderItem,
            as: "items",
            include: [{ model: Product, as: "product" }],
          },
        ],
        order: [["orderDate", "ASC"]],
      });

      // Group orders by customer email or name for potential consolidation
      const customerGroups = {};

      orders.forEach((order) => {
        // Skip orders without shipping details if sameAddressOnly is true
        if (sameAddressOnly && !order.shippingDetail) return;

        const customerKey = order.customerEmail || order.customerName;
        if (!customerKey) return;

        if (!customerGroups[customerKey]) {
          customerGroups[customerKey] = [];
        }

        customerGroups[customerKey].push(order);
      });

      // Filter groups to only include those with multiple orders
      const consolidationGroups = [];

      Object.keys(customerGroups).forEach((customerKey) => {
        const customerOrders = customerGroups[customerKey];

        // Only process customers with multiple orders
        if (customerOrders.length <= 1) return;

        // Sort orders by date
        customerOrders.sort(
          (a, b) => new Date(a.orderDate) - new Date(b.orderDate)
        );

        // Group orders within the time window
        const timeGroups = [];
        let currentGroup = [customerOrders[0]];

        for (let i = 1; i < customerOrders.length; i++) {
          const prevOrder = customerOrders[i - 1];
          const currentOrder = customerOrders[i];

          const daysDifference = this._daysBetweenDates(
            new Date(prevOrder.orderDate),
            new Date(currentOrder.orderDate)
          );

          // Check if addresses match if sameAddressOnly is true
          let addressesMatch = true;
          if (
            sameAddressOnly &&
            prevOrder.shippingDetail &&
            currentOrder.shippingDetail
          ) {
            addressesMatch = this._compareAddresses(
              prevOrder.shippingDetail,
              currentOrder.shippingDetail
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
        timeGroups.forEach((group) => {
          if (group.length > 1) {
            consolidationGroups.push({
              customer: customerKey,
              orders: group,
              totalItems: group.reduce(
                (sum, order) => sum + order.OrderItems.length,
                0
              ),
              platforms: [...new Set(group.map((order) => order.platformId))],
            });
          }
        });
      });

      return consolidationGroups;
    } catch (error) {
      logger.error("Error finding consolidation candidates:", error);
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
        throw new Error("At least two orders are required for consolidation");
      }

      // Find all orders to consolidate
      const orders = await Order.findAll({
        where: { id: orderIds },
        include: [
          {
            model: OrderItem,
            as: "items",
            include: [{ model: Product, as: "product" }],
          },
          { model: ShippingDetail, as: "shippingDetail" },
        ],
      });

      if (orders.length !== orderIds.length) {
        throw new Error("One or more orders not found");
      }

      // Ensure all orders can be consolidated (same customer, valid status)
      const customerEmails = [...new Set(orders.map((o) => o.customerEmail))];
      const customerNames = [...new Set(orders.map((o) => o.customerName))];

      if (customerEmails.length > 1 && customerNames.length > 1) {
        throw new Error("Cannot consolidate orders from different customers");
      }

      const invalidStatusOrders = orders.filter(
        (o) => !["new", "processing"].includes(o.status)
      );

      if (invalidStatusOrders.length > 0) {
        throw new Error(
          `Orders with IDs ${invalidStatusOrders
            .map((o) => o.id)
            .join(", ")} have invalid status for consolidation`
        );
      }

      // Calculate consolidated totals with currency conversion
      const totals = await this._calculateConsolidatedTotals(orders);

      // Create a consolidated order
      const primaryOrder = orders[0];
      const consolidatedOrderData = {
        userId: primaryOrder.userId,
        platformId: primaryOrder.platformId, // Use primary order's platform
        platformOrderId: `CONSOLIDATED-${Math.random()
          .toString(36)
          .substring(2, 10)}`,
        customerName: primaryOrder.customerName,
        customerEmail: primaryOrder.customerEmail,
        status: "consolidated",
        orderDate: new Date(),
        totalAmount: totals.totalAmount,
        subtotal: totals.subtotal,
        taxAmount: totals.taxTotal,
        shippingAmount: totals.shippingTotal,
        currency: totals.currency,
        notes: `Consolidated from orders: ${orderIds.join(", ")}`,
        isConsolidated: true,
        consolidatedOrderIds: JSON.stringify(orderIds),
        metadata: {
          originalCurrencies: totals.originalCurrencies,
          consolidation: {
            date: new Date(),
            orderIds,
            reason: "customer_consolidation",
          },
        },
      };

      // Create the consolidated order
      const consolidatedOrder = await sequelize.transaction(async (t) => {
        const newOrder = await Order.create(consolidatedOrderData, {
          transaction: t,
        });

        // Copy shipping details from primary order
        if (primaryOrder.shippingDetail) {
          const shippingData = { ...primaryOrder.shippingDetail.toJSON() };
          delete shippingData.id;
          delete shippingData.createdAt;
          delete shippingData.updatedAt;

          shippingData.orderId = newOrder.id;
          await ShippingDetail.create(shippingData, { transaction: t });
        }

        // Copy and convert items from all orders
        for (const order of orders) {
          if (order.items && order.items.length > 0) {
            for (const item of order.items) {
              let convertedUnitPrice = item.unitPrice;
              let convertedTotalPrice = item.totalPrice;

              // Convert prices if needed
              if (order.currency !== totals.currency) {
                const conversionRate = await this._getConversionRate(
                  order.currency,
                  totals.currency
                );
                convertedUnitPrice *= conversionRate;
                convertedTotalPrice *= conversionRate;
              }

              await OrderItem.create(
                {
                  orderId: newOrder.id,
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice: convertedUnitPrice,
                  totalPrice: convertedTotalPrice,
                  currency: totals.currency,
                  taxAmount: item.taxAmount,
                  taxRate: item.taxRate,
                  notes: `From original order: ${order.id}`,
                  metadata: {
                    originalCurrency: order.currency,
                    originalUnitPrice: item.unitPrice,
                    originalTotalPrice: item.totalPrice,
                  },
                },
                { transaction: t }
              );
            }
          }

          // Update original order
          await order.update(
            {
              status: "consolidated",
              consolidatedToOrderId: newOrder.id,
              metadata: {
                ...order.metadata,
                consolidation: {
                  date: new Date(),
                  consolidatedOrderId: newOrder.id,
                },
              },
            },
            { transaction: t }
          );
        }

        return newOrder;
      });

      // Return the full consolidated order with items
      return await Order.findByPk(consolidatedOrder.id, {
        include: [
          {
            model: OrderItem,
            as: "items",
            include: [{ model: Product, as: "product" }],
          },
          { model: ShippingDetail, as: "shippingDetail" },
        ],
      });
    } catch (error) {
      logger.error("Error consolidating orders:", error);
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
        statuses = ["new", "processing"],
        groupBy = "destination", // 'customer', 'platform', 'destination'
      } = options;

      // Find eligible orders
      const orders = await Order.findAll({
        where: {
          userId,
          orderStatus: statuses,
          isConsolidated: {
            [Op.or]: [false, null], // Only include non-consolidated orders
          },
        },
        include: [
          { model: ShippingDetail, as: "shippingDetail" },
          { model: OrderItem, as: "items" },
        ],
      });

      if (orders.length === 0) {
        return [];
      }

      // Group orders based on criteria
      const batches = [];

      if (groupBy === "customer") {
        // Group by customer
        const customerGroups = {};

        orders.forEach((order) => {
          const key = order.customerEmail || order.customerName;
          if (!key) return;

          if (!customerGroups[key]) {
            customerGroups[key] = [];
          }

          customerGroups[key].push(order);
        });

        Object.keys(customerGroups).forEach((key) => {
          if (customerGroups[key].length > 0) {
            batches.push({
              batchKey: `CUSTOMER-${key}`,
              batchType: "customer",
              orders: customerGroups[key],
              totalOrders: customerGroups[key].length,
              totalItems: customerGroups[key].reduce(
                (sum, order) => sum + order.OrderItems.length,
                0
              ),
            });
          }
        });
      } else if (groupBy === "platform") {
        // Group by platform
        const platformGroups = {};

        orders.forEach((order) => {
          const key = order.platformId;
          if (!key) return;

          if (!platformGroups[key]) {
            platformGroups[key] = [];
          }

          platformGroups[key].push(order);
        });

        Object.keys(platformGroups).forEach((key) => {
          if (platformGroups[key].length > 0) {
            batches.push({
              batchKey: `PLATFORM-${key}`,
              batchType: "platform",
              orders: platformGroups[key],
              totalOrders: platformGroups[key].length,
              totalItems: platformGroups[key].reduce(
                (sum, order) => sum + order.OrderItems.length,
                0
              ),
            });
          }
        });
      } else {
        // Group by destination (city/state/country)
        const destinationGroups = {};

        orders.forEach((order) => {
          if (!order.shippingDetail) return;

          const shipping = order.shippingDetail;
          const key =
            `${shipping.country}-${shipping.state}-${shipping.city}`.toLowerCase();

          if (!destinationGroups[key]) {
            destinationGroups[key] = [];
          }

          destinationGroups[key].push(order);
        });

        Object.keys(destinationGroups).forEach((key) => {
          if (destinationGroups[key].length > 0) {
            const sample = destinationGroups[key][0].shippingDetail;
            batches.push({
              batchKey: `DEST-${sample.city}-${sample.state}-${sample.country}`,
              batchType: "destination",
              destination: {
                city: sample.city,
                state: sample.state,
                country: sample.country,
              },
              orders: destinationGroups[key],
              totalOrders: destinationGroups[key].length,
              totalItems: destinationGroups[key].reduce(
                (sum, order) => sum + order.OrderItems.length,
                0
              ),
            });
          }
        });
      }

      return batches;
    } catch (error) {
      logger.error("Error creating batch shipments:", error);
      throw error;
    }
  }

  /**
   * Create batch shipments with transaction support and rollback
   * @param {Object} options - Batch options
   * @returns {Array} - Array of created batches
   */
  async createBatchShipmentsWithRollback(options = {}) {
    const transaction = await sequelize.transaction();

    try {
      const batches = await this.createBatchShipments(options);

      // Process each batch and create shipment records
      for (const batch of batches) {
        const batchRecord = await BatchShipment.create(
          {
            batchKey: batch.batchKey,
            batchType: batch.batchType,
            status: "PENDING",
            userId: options.userId,
            totalOrders: batch.totalOrders,
            totalItems: batch.totalItems,
            metadata: {
              destination: batch.destination,
              platforms: batch.orders.map((o) => o.platformId).filter(Boolean),
            },
          },
          { transaction }
        );

        // Link orders to batch
        await Promise.all(
          batch.orders.map((order) =>
            order.update(
              {
                batchId: batchRecord.id,
                status: "in_batch",
              },
              { transaction }
            )
          )
        );
      }

      await transaction.commit();
      return batches;
    } catch (error) {
      await transaction.rollback();
      logger.error("Error in batch shipment creation:", error);
      throw error;
    }
  }

  /**
   * Update payment status for an order
   * @param {String} orderId - Order ID
   * @param {String} paymentStatus - New payment status
   * @param {Object} paymentData - Additional payment data
   * @returns {Object} Update result
   */
  async updatePaymentStatus(orderId, paymentStatus, paymentData = {}) {
    const transaction = await sequelize.transaction();

    try {
      const order = await Order.findByPk(orderId, { transaction });

      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      const oldPaymentStatus = order.paymentStatus;

      // Update order payment status
      await order.update(
        {
          paymentStatus,
          lastPaymentUpdate: new Date(),
          paymentMetadata: {
            ...order.paymentMetadata,
            ...paymentData,
            statusHistory: [
              ...(order.paymentMetadata?.statusHistory || []),
              {
                from: oldPaymentStatus,
                to: paymentStatus,
                date: new Date(),
                reason: paymentData.reason || "",
              },
            ],
          },
        },
        { transaction }
      );

      // Create payment transaction record
      await FinancialTransaction.create(
        {
          orderId,
          type: this._getTransactionType(paymentStatus),
          amount: paymentData.amount || order.totalAmount,
          currency: paymentData.currency || order.currency,
          status: this._mapPaymentToTransactionStatus(paymentStatus),
          metadata: paymentData,
        },
        { transaction }
      );

      // If payment is completed, update order status if needed
      if (paymentStatus === "completed" && order.status === "pending") {
        await order.update(
          {
            status: "processing",
          },
          { transaction }
        );
      }

      await transaction.commit();

      return {
        success: true,
        order,
        message: `Payment status updated to ${paymentStatus}`,
      };
    } catch (error) {
      await transaction.rollback();
      logger.error(
        `Error updating payment status for order ${orderId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Map payment status to transaction status
   * @private
   */
  _mapPaymentToTransactionStatus(paymentStatus) {
    const statusMap = {
      pending: "pending",
      completed: "completed",
      failed: "failed",
      refunded: "completed",
      partially_refunded: "completed",
      cancelled: "cancelled",
    };
    return statusMap[paymentStatus] || "pending";
  }

  /**
   * Get transaction type based on payment status
   * @private
   */
  _getTransactionType(paymentStatus) {
    const typeMap = {
      completed: "payment",
      refunded: "refund",
      partially_refunded: "partial_refund",
      cancelled: "cancellation",
    };
    return typeMap[paymentStatus] || "payment";
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
        throw new Error("Missing webhook data or platform type");
      }

      // Handle different webhook types based on platform
      let result = { success: false };

      switch (platformType.toLowerCase()) {
        case "trendyol":
          result = await this._processTrendyolWebhook(data);
          break;
        case "hepsiburada":
          result = await this._processHepsiburadaWebhook(data);
          break;
        case "n11":
          result = await this._processN11Webhook(data);
          break;
        // Add more platform handlers as needed
        default:
          throw new Error(`Unsupported platform type: ${platformType}`);
      }

      return result;
    } catch (error) {
      logger.error("Error processing webhook notification:", error);
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
    const postalCode1 = (address1.postalCode || "").trim().replace(/\s+/g, "");
    const postalCode2 = (address2.postalCode || "").trim().replace(/\s+/g, "");

    if (postalCode1 && postalCode2 && postalCode1 === postalCode2) {
      return true;
    }

    // Compare city, state, country
    const city1 = (address1.city || "").trim().toLowerCase();
    const city2 = (address2.city || "").trim().toLowerCase();

    const state1 = (address1.state || "").trim().toLowerCase();
    const state2 = (address2.state || "").trim().toLowerCase();

    const country1 = (address1.country || "").trim().toLowerCase();
    const country2 = (address2.country || "").trim().toLowerCase();

    // City, state, and country must match
    return city1 === city2 && state1 === state2 && country1 === country2;
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
        throw new Error("Invalid webhook format");
      }

      // Find the order in our system
      const order = await Order.findOne({
        where: {
          platformOrderId: data.orderId,
          platformId: { [Op.ne]: null }, // Ensure it has a platform ID
        },
      });

      if (!order) {
        logger.warn(`Order not found for Trendyol webhook: ${data.orderId}`);
        return {
          success: false,
          message: "Order not found in system",
          event: data.event,
        };
      }

      // Update order based on event type
      switch (data.event.toLowerCase()) {
        case "order_created":
          // Update if we already have it but with different status
          if (order.status !== "new") {
            order.status = "new";
            await order.save();
          }
          break;

        case "order_shipped":
          order.status = "shipped";
          if (data.trackingNumber) {
            order.trackingNumber = data.trackingNumber;
          }
          await order.save();
          break;

        case "order_cancelled":
          order.status = "cancelled";
          if (data.cancellationReason) {
            order.cancellationReason = data.cancellationReason;
          }
          order.cancellationDate = new Date();
          await order.save();
          break;

        case "order_delivered":
          order.status = "delivered";
          order.deliveryDate = new Date();
          await order.save();
          break;

        default:
          logger.info(`Unhandled Trendyol event type: ${data.event}`);
          return {
            success: false,
            message: `Unhandled event type: ${data.event}`,
            orderId: order.id,
          };
      }

      return {
        success: true,
        message: `Successfully processed ${data.event} event`,
        orderId: order.id,
        status: order.status,
      };
    } catch (error) {
      logger.error("Error processing Trendyol webhook:", error);
      throw error;
    }
  }

  /**
   * Process Hepsiburada webhook notification
   * @private
   * @param {Object} data - Webhook data
   * @returns {Object} - Processing result
   */
  async _processHepsiburadaWebhook(data) {
    try {
      if (!data.event || !data.orderId) {
        throw new Error("Invalid Hepsiburada webhook format");
      }

      const order = await Order.findOne({
        where: {
          externalOrderId: data.orderId,
          platformType: "hepsiburada",
        },
      });

      if (!order) {
        logger.warn(`Order not found for Hepsiburada webhook: ${data.orderId}`);
        return {
          success: false,
          message: "Order not found in system",
          event: data.event,
        };
      }

      switch (data.event.toLowerCase()) {
        case "created":
          if (order.status !== "new") {
            order.status = "new";
            await order.save();
          }
          break;

        case "packaging":
          order.status = "processing";
          await order.save();
          break;

        case "shipped":
          order.status = "shipped";
          if (data.cargoTrackingNumber) {
            order.trackingNumber = data.cargoTrackingNumber;
          }
          if (data.cargoTrackingUrl) {
            order.trackingUrl = data.cargoTrackingUrl;
          }
          await order.save();
          break;

        case "delivered":
          order.status = "delivered";
          order.deliveryDate = new Date();
          await order.save();
          break;

        case "cancelled":
          order.status = "cancelled";
          order.cancellationReason = data.reason || "";
          order.cancellationDate = new Date();
          await order.save();
          break;

        case "returned":
          order.status = "returned";
          order.returnReason = data.reason || "";
          order.returnDate = new Date();
          await order.save();
          break;

        default:
          logger.info(`Unhandled Hepsiburada event type: ${data.event}`);
          return {
            success: false,
            message: `Unhandled event type: ${data.event}`,
            orderId: order.id,
          };
      }

      return {
        success: true,
        message: `Successfully processed ${data.event} event`,
        orderId: order.id,
        status: order.status,
      };
    } catch (error) {
      logger.error("Error processing Hepsiburada webhook:", error);
      throw error;
    }
  }

  /**
   * Process N11 webhook notification
   * @private
   * @param {Object} data - Webhook data
   * @returns {Object} - Processing result
   */
  async _processN11Webhook(data) {
    try {
      if (!data.event || !data.orderId) {
        throw new Error("Invalid N11 webhook format");
      }

      const order = await Order.findOne({
        where: {
          externalOrderId: data.orderId,
          platformType: "n11",
        },
      });

      if (!order) {
        logger.warn(`Order not found for N11 webhook: ${data.orderId}`);
        return {
          success: false,
          message: "Order not found in system",
          event: data.event,
        };
      }

      switch (data.event.toLowerCase()) {
        case "new":
          if (order.status !== "new") {
            order.status = "new";
            await order.save();
          }
          break;

        case "accepted":
        case "picking":
          order.status = "processing";
          await order.save();
          break;

        case "shipped":
          order.status = "shipped";
          if (data.shipmentInfo) {
            order.trackingNumber = data.shipmentInfo.trackingNumber;
            order.trackingUrl = data.shipmentInfo.trackingUrl;
            order.carrierName = data.shipmentInfo.carrierName;
          }
          await order.save();
          break;

        case "delivered":
          order.status = "delivered";
          order.deliveryDate = new Date();
          await order.save();
          break;

        case "rejected":
        case "cancelled":
          order.status = "cancelled";
          order.cancellationReason = data.reason || "";
          order.cancellationDate = new Date();
          await order.save();
          break;

        case "returned":
          order.status = "returned";
          order.returnReason = data.reason || "";
          order.returnDate = new Date();
          await order.save();
          break;

        default:
          logger.info(`Unhandled N11 event type: ${data.event}`);
          return {
            success: false,
            message: `Unhandled event type: ${data.event}`,
            orderId: order.id,
          };
      }

      return {
        success: true,
        message: `Successfully processed ${data.event} event`,
        orderId: order.id,
        status: order.status,
      };
    } catch (error) {
      logger.error("Error processing N11 webhook:", error);
      throw error;
    }
  }

  /**
   * Calculate consolidated totals including tax and currency conversion
   * @private
   * @param {Array<Order>} orders - Orders to consolidate
   * @returns {Object} Consolidated totals
   */
  async _calculateConsolidatedTotals(orders) {
    const currencies = [...new Set(orders.map((o) => o.currency))];
    let primaryCurrency = currencies[0];
    let requiresConversion = currencies.length > 1;

    // If we have multiple currencies, convert everything to the primary currency
    let subtotal = 0;
    let taxTotal = 0;
    let shippingTotal = 0;

    for (const order of orders) {
      if (requiresConversion && order.currency !== primaryCurrency) {
        const conversionRate = await this._getConversionRate(
          order.currency,
          primaryCurrency
        );
        subtotal += parseFloat(order.totalAmount) * conversionRate;
        taxTotal += parseFloat(order.taxAmount || 0) * conversionRate;
        shippingTotal += parseFloat(order.shippingAmount || 0) * conversionRate;
      } else {
        subtotal += parseFloat(order.totalAmount);
        taxTotal += parseFloat(order.taxAmount || 0);
        shippingTotal += parseFloat(order.shippingAmount || 0);
      }
    }

    return {
      subtotal,
      taxTotal,
      shippingTotal,
      totalAmount: subtotal + taxTotal + shippingTotal,
      currency: primaryCurrency,
      originalCurrencies: currencies,
    };
  }

  /**
   * Get currency conversion rate
   * @private
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @returns {number} Conversion rate
   */
  async _getConversionRate(fromCurrency, toCurrency) {
    // Here you would typically call your forex rate provider
    // For now, we're using a simple implementation
    const rates = {
      TRY: { USD: 0.037, EUR: 0.034 },
      USD: { TRY: 39.2, EUR: 0.92 },
      EUR: { TRY: 45.5, USD: 1.09 },
    };

    if (fromCurrency === toCurrency) return 1;

    const rate = rates[fromCurrency]?.[toCurrency];
    if (!rate) {
      throw new Error(
        `No conversion rate available for ${fromCurrency} to ${toCurrency}`
      );
    }

    return rate;
  }
}

module.exports = new OrderProcessorService();
