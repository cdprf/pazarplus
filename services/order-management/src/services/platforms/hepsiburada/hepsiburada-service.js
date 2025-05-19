const axios = require('axios');
const crypto = require('crypto');
const { Order } = require('../../../models/Order');
const { OrderItem } = require('../../../models/OrderItem');
const { ShippingDetail } = require('../../../models/ShippingDetail');
const { PlatformConnection } = require('../../../models/platform-connection.model');
const logger = require('../../../utils/logger');

class HepsiburadaService {
  constructor(connectionId) {
    this.connectionId = connectionId;
    this.connection = null;
    this.apiUrl = 'https://oms-external.hepsiburada.com';
    this.axiosInstance = null;
  }

  async initialize() {
    try {
      this.connection = await PlatformConnection.findByPk(this.connectionId);
      
      if (!this.connection) {
        throw new Error(`Platform connection with ID ${this.connectionId} not found`);
      }

      const credentials = this.decryptCredentials(this.connection.credentials);
      const { merchantId, apiKey } = credentials;
      
      // Set up axios instance with authentication from your snippet
      this.axiosInstance = axios.create({
        baseURL: this.apiUrl,
        headers: {
          'User-Agent': 'sentosyazilim_dev',
          'Authorization': `Basic ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      this.merchantId = merchantId;

      return true;
    } catch (error) {
      logger.error(`Failed to initialize Hepsiburada service: ${error.message}`, { error, connectionId: this.connectionId });
      throw new Error(`Failed to initialize Hepsiburada service: ${error.message}`);
    }
  }

  decryptCredentials(encryptedCredentials) {
    try {
      // Simple parse for development - in production would use proper decryption
      const credentials = JSON.parse(encryptedCredentials);
      return {
        merchantId: credentials.merchantId,
        apiKey: credentials.apiKey
      };
    } catch (error) {
      logger.error(`Failed to decrypt credentials: ${error.message}`);
      throw new Error('Failed to decrypt credentials');
    }
  }

  async testConnection() {
    try {
      await this.initialize();
      
      // Test the connection by fetching a small amount of data
      const url = `/packages/merchantid/${this.merchantId}?limit=1`;
      const response = await this.axiosInstance.get(url);
      
      return {
        success: true,
        message: 'Connection successful',
        data: {
          platform: 'hepsiburada',
          connectionId: this.connectionId,
          status: 'active'
        }
      };
    } catch (error) {
      logger.error(`Hepsiburada connection test failed: ${error.message}`, { error, connectionId: this.connectionId });
      
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  async fetchOrders(params = {}) {
    try {
      await this.initialize();
      
      const defaultParams = {
        offset: 0,
        limit: 100
      };
      
      const queryParams = { ...defaultParams, ...params };
      const url = `/packages/merchantid/${this.merchantId}`;
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.get(url, { params: queryParams })
      );
      
      if (!response.data || !Array.isArray(response.data)) {
        return {
          success: false,
          message: 'No order data returned from Hepsiburada',
          data: []
        };
      }
      
      const normalizedOrders = await this.normalizeOrders(response.data);
      
      return {
        success: true,
        message: `Successfully fetched ${normalizedOrders.length} orders from Hepsiburada`,
        data: normalizedOrders,
        pagination: {
          offset: queryParams.offset,
          limit: queryParams.limit,
          totalCount: response.data.length
        }
      };
    } catch (error) {
      logger.error(`Failed to fetch orders from Hepsiburada: ${error.message}`, { error, connectionId: this.connectionId });
      
      return {
        success: false,
        message: `Failed to fetch orders: ${error.message}`,
        error: error.response?.data || error.message,
        data: []
      };
    }
  }
  
  /**
   * Get detailed information for a specific order by its order number
   * @param {string} orderNumber - The Hepsiburada order number
   * @returns {Object} - Order details or error
   */
  async getOrderDetails(orderNumber) {
    try {
      await this.initialize();
      
      const url = `/orders/merchantid/${this.merchantId}/ordernumber/${orderNumber}`;
      
      logger.info(`Fetching order details from Hepsiburada: ${orderNumber}`);
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.get(url)
      );
      
      if (!response.data || !response.data.orderId) {
        return {
          success: false,
          message: 'Invalid order data returned from Hepsiburada',
          data: null
        };
      }
      
      return {
        success: true,
        message: 'Successfully fetched order details',
        data: response.data
      };
    } catch (error) {
      logger.error(`Failed to fetch order details from Hepsiburada: ${error.message}`, { 
        error, 
        connectionId: this.connectionId,
        orderNumber 
      });
      
      return {
        success: false,
        message: `Failed to fetch order details: ${error.message}`,
        error: error.response?.data || error.message,
        data: null
      };
    }
  }

  async normalizeOrders(hepsiburadaOrders) {
    try {
      const normalizedOrders = [];
      const { HepsiburadaOrder } = require('../../../models');
      
      for (const order of hepsiburadaOrders) {
        // Create shipping details from the order data
        const shippingDetail = await ShippingDetail.create({
          recipientName: order.recipientName || '',
          address: order.shippingAddressDetail || '',
          city: order.shippingCity || '',
          state: order.shippingTown || '',
          postalCode: order.billingPostalCode || '',
          country: order.shippingCountryCode || 'TR',
          phone: order.phoneNumber || '',
          email: order.email || '',
          shippingMethod: order.cargoCompany || ''
        });
        
        // Extract price information
        const totalAmount = order.totalPrice?.amount || 0;
        const currency = order.totalPrice?.currency || 'TRY';
        
        // Create the order record
        const normalizedOrder = await Order.create({
          platformOrderId: order.packageNumber || order.id,
          platformId: this.connection.platformId,
          connectionId: this.connectionId,
          orderDate: new Date(order.orderDate),
          orderStatus: this.mapOrderStatus(order.status),
          totalAmount: totalAmount,
          currency: currency,
          shippingDetailId: shippingDetail.id,
          customerName: order.customerName || order.recipientName || '',
          customerEmail: order.email || '',
          customerPhone: order.phoneNumber || '',
          notes: '',
          rawData: JSON.stringify(order)
        });
        
        // Create Hepsiburada-specific order record
        await HepsiburadaOrder.create({
          orderId: normalizedOrder.id,
          packageNumber: order.packageNumber || '',
          merchantId: order.merchantId || this.merchantId,
          customerId: order.customerId || '',
          orderNumber: order.orderNumber || order.packageNumber || '',
          referenceNumber: order.referenceNumber || '',
          cargoCompany: order.cargoCompany || '',
          cargoTrackingNumber: order.trackingNumber || '',
          cargoTrackingUrl: order.cargoTrackingUrl || '',
          paymentType: order.paymentType || '',
          shippingAddressJson: {
            name: order.recipientName,
            address: order.shippingAddressDetail,
            city: order.shippingCity,
            town: order.shippingTown,
            postalCode: order.shippingPostalCode
          },
          billingAddressJson: {
            name: order.billingName || order.recipientName,
            address: order.billingAddress || order.shippingAddressDetail,
            city: order.billingCity || order.shippingCity,
            town: order.billingTown || order.shippingTown,
            postalCode: order.billingPostalCode
          },
          platformStatus: order.status || '',
          paymentStatus: order.paymentStatus || ''
        });
        
        // Create order items
        if (order.items && Array.isArray(order.items)) {
          for (const item of order.items) {
            await OrderItem.create({
              orderId: normalizedOrder.id,
              platformProductId: item.lineItemId || '',
              sku: item.merchantSku || '',
              barcode: item.productBarcode || '',
              title: item.productName || '',
              quantity: parseInt(item.quantity) || 1,
              unitPrice: parseFloat(item.price?.amount) || 0,
              totalPrice: parseFloat(item.totalPrice?.amount) || 0,
              currency: item.price?.currency || 'TRY',
              variantInfo: item.properties ? JSON.stringify(item.properties) : null,
              weight: item.weight || 0,
              taxAmount: parseFloat(item.vat) || 0,
              taxRate: parseFloat(item.vatRate) || 0,
              rawData: JSON.stringify(item)
            });
          }
        }
        
        normalizedOrders.push(normalizedOrder);
      }
      
      return normalizedOrders;
    } catch (error) {
      logger.error(`Failed to normalize Hepsiburada orders: ${error.message}`, { error, connectionId: this.connectionId });
      throw error;
    }
  }

  /**
   * Process a direct order payload from Hepsiburada
   * Used when we receive direct API data or webhook payload
   * @param {Object} orderData - The raw order data from Hepsiburada
   * @returns {Object} - Processing result with the normalized order
   */
  async processDirectOrderPayload(orderData) {
    try {
      if (!this.connection) {
        await this.initialize();
      }
      
      const { HepsiburadaOrder, sequelize } = require('../../../models');
      let order = orderData;
      
      // If this is an order detail response (from getOrderDetails), use it directly
      if (orderData.orderId && orderData.orderNumber && orderData.items) {
        // This is already an order detail format
        order = orderData;
      } 
      // If this is a package format (from fetchOrders), transform it
      else if (orderData.id && orderData.packageNumber) {
        // Fetch full order details if we only have the package info
        const orderDetailsResponse = await this.getOrderDetails(orderData.packageNumber);
        
        if (orderDetailsResponse.success && orderDetailsResponse.data) {
          order = orderDetailsResponse.data;
        }
      }
      
      const items = order.items || [];
      
      // Extract shipping details based on data format
      let recipientName, address, city, town, postalCode, email, phoneNumber;
      
      if (order.deliveryAddress) {
        // Order detail format
        recipientName = order.deliveryAddress.name || '';
        address = order.deliveryAddress.address || '';
        city = order.deliveryAddress.city || '';
        town = order.deliveryAddress.town || '';
        postalCode = order.deliveryAddress.postalCode || '';
        email = order.deliveryAddress.email || '';
        phoneNumber = order.deliveryAddress.phoneNumber || '';
      } else {
        // Package format
        recipientName = order.recipientName || '';
        address = order.shippingAddressDetail || '';
        city = order.shippingCity || '';
        town = order.shippingTown || '';
        postalCode = order.billingPostalCode || '';
        email = order.email || '';
        phoneNumber = order.phoneNumber || '';
      }
      
      // Get order number - ensure we have a valid value
      const platformOrderId = order.orderNumber || order.packageNumber || order.orderId || '';
      
      if (!platformOrderId) {
        logger.error('Missing platform order ID in Hepsiburada order data', { orderData });
        return {
          success: false,
          message: 'Missing platform order ID in order data',
          error: 'MISSING_PLATFORM_ORDER_ID'
        };
      }
      
      logger.debug(`Processing Hepsiburada order: ${platformOrderId}`);
      
      // First check if this order already exists to avoid unique constraint violations
      const existingOrder = await Order.findOne({
        where: {
          externalOrderId: platformOrderId,
          connectionId: this.connectionId
        }
      });
      
      if (existingOrder) {
        logger.info(`Order ${platformOrderId} already exists in the database, updating instead of creating.`);
        
        // Get customer name from appropriate location
        let customerName = '';
        if (order.customer && order.customer.name) {
          customerName = order.customer.name;
        } else {
          customerName = order.customerName || recipientName;
        }
        
        // Get order status from appropriate field
        let status;
        if (items[0] && items[0].status) {
          status = this.mapOrderStatus(items[0].status);
        } else if (order.status) {
          status = this.mapOrderStatus(order.status);
        } else if (order.paymentStatus) {
          status = this.mapPaymentStatus(order.paymentStatus);
        } else {
          status = 'new';
        }
        
        // Update the existing order
        await sequelize.transaction(async (t) => {
          await existingOrder.update({
            status,
            customerName,
            customerEmail: email,
            customerPhone: phoneNumber,
            notes: order.orderNote || '',
            rawData: JSON.stringify(order)
          }, { transaction: t });
          
          // Update Hepsiburada-specific order data
          const existingHepsiburadaOrder = await HepsiburadaOrder.findOne({
            where: { orderId: existingOrder.id }
          });
          
          if (existingHepsiburadaOrder) {
            await existingHepsiburadaOrder.update({
              platformStatus: order.status || items[0]?.status || '',
              paymentStatus: order.paymentStatus || '',
              cargoCompany: items[0]?.cargoCompany || order.cargoCompany || '',
              cargoTrackingNumber: items[0]?.trackingNumber || order.trackingNumber || '',
              cargoTrackingUrl: items[0]?.cargoTrackingUrl || order.cargoTrackingUrl || ''
            }, { transaction: t });
          } else {
            // If Hepsiburada order record doesn't exist, create it
            await HepsiburadaOrder.create({
              orderId: existingOrder.id,
              packageNumber: order.packageNumber || platformOrderId,
              merchantId: order.merchantId || this.merchantId,
              customerId: order.customerId || order.customer?.id || '',
              orderNumber: platformOrderId,
              referenceNumber: order.referenceNumber || '',
              cargoCompany: items[0]?.cargoCompany || order.cargoCompany || '',
              cargoTrackingNumber: items[0]?.trackingNumber || order.trackingNumber || '',
              cargoTrackingUrl: items[0]?.cargoTrackingUrl || order.cargoTrackingUrl || '',
              paymentType: order.paymentType || '',
              shippingAddressJson: order.deliveryAddress || {
                name: recipientName,
                address: address,
                city: city,
                town: town,
                postalCode: postalCode
              },
              billingAddressJson: order.billingAddress || {
                name: order.billingName || recipientName,
                address: order.billingAddress || address,
                city: order.billingCity || city,
                town: order.billingTown || town,
                postalCode: order.billingPostalCode || postalCode
              },
              platformStatus: order.status || items[0]?.status || '',
              paymentStatus: order.paymentStatus || ''
            }, { transaction: t });
          }
        });
        
        return {
          success: true,
          message: 'Order updated successfully',
          data: existingOrder
        };
      }
      
      try {
        return await sequelize.transaction(async (t) => {
          // Create shipping detail
          const shippingDetail = await ShippingDetail.create({
            recipientName,
            address,
            city,
            state: town,
            postalCode,
            country: 'TR',
            phone: phoneNumber,
            email,
            shippingMethod: items[0]?.cargoCompany || order.cargoCompany || ''
          }, { transaction: t });
          
          // Get customer name from appropriate location
          let customerName = '';
          if (order.customer && order.customer.name) {
            customerName = order.customer.name;
          } else {
            customerName = order.customerName || recipientName;
          }
          
          // Get order status from appropriate field
          let status;
          if (items[0] && items[0].status) {
            status = this.mapOrderStatus(items[0].status);
          } else if (order.status) {
            status = this.mapOrderStatus(order.status);
          } else if (order.paymentStatus) {
            status = this.mapPaymentStatus(order.paymentStatus);
          } else {
            status = 'new';
          }
          
          // Calculate total from items if not directly available
          let totalAmount = 0;
          let currency = 'TRY';
          
          if (order.totalPrice) {
            totalAmount = parseFloat(order.totalPrice.amount) || 0;
            currency = order.totalPrice.currency || 'TRY';
          } else {
            // Calculate from items
            totalAmount = items.reduce((sum, item) => {
              const itemTotal = parseFloat(item.totalPrice?.amount || 0);
              return sum + itemTotal;
            }, 0);
            
            // Get currency from first item
            if (items[0] && items[0].totalPrice && items[0].totalPrice.currency) {
              currency = items[0].totalPrice.currency;
            }
          }
          
          // Create the order record - fix field names to match model definition
          const normalizedOrder = await Order.create({
            externalOrderId: platformOrderId,
            platformType: 'hepsiburada',
            connectionId: this.connectionId,
            userId: this.connection.userId,
            customerName,
            customerEmail: email,
            customerPhone: phoneNumber,
            orderDate: new Date(order.orderDate || Date.now()),
            totalAmount,
            currency,
            status,
            notes: order.orderNote || '',
            paymentStatus: order.paymentStatus || 'pending',
            rawData: JSON.stringify(order),
            lastSyncedAt: new Date()
          }, { transaction: t });
          
          // Create Hepsiburada-specific order record
          await HepsiburadaOrder.create({
            orderId: normalizedOrder.id,
            packageNumber: order.packageNumber || platformOrderId,
            merchantId: order.merchantId || this.merchantId,
            customerId: order.customerId || order.customer?.id || '',
            orderNumber: platformOrderId,
            referenceNumber: order.referenceNumber || '',
            cargoCompany: items[0]?.cargoCompany || order.cargoCompany || '',
            cargoTrackingNumber: items[0]?.trackingNumber || order.trackingNumber || '',
            cargoTrackingUrl: items[0]?.cargoTrackingUrl || order.cargoTrackingUrl || '',
            paymentType: order.paymentType || '',
            shippingAddressJson: order.deliveryAddress || {
              name: recipientName,
              address: address,
              city: city,
              town: town,
              postalCode: postalCode
            },
            billingAddressJson: order.billingAddress || {
              name: order.billingName || recipientName,
              address: order.billingAddress || address,
              city: order.billingCity || city,
              town: order.billingTown || town,
              postalCode: order.billingPostalCode || postalCode
            },
            platformStatus: order.status || items[0]?.status || '',
            paymentStatus: order.paymentStatus || ''
          }, { transaction: t });
          
          // Create order items
          for (const item of items) {
            // Get the right field names based on the format
            const sku = item.sku || item.merchantSKU || '';
            const name = item.name || item.productName || '';
            const barcode = item.productBarcode || '';
            const quantity = parseInt(item.quantity) || 1;
            
            // Get prices
            let unitPrice = 0;
            let totalPrice = 0;
            let taxAmount = 0;
            let taxRate = 0;
            
            if (item.unitPrice) {
              unitPrice = parseFloat(item.unitPrice.amount) || 0;
            } else if (item.price) {
              unitPrice = parseFloat(item.price.amount) || 0;
            }
            
            if (item.totalPrice) {
              totalPrice = parseFloat(item.totalPrice.amount) || 0;
            } else {
              totalPrice = unitPrice * quantity;
            }
            
            if (item.vat) {
              taxAmount = parseFloat(item.vat) || 0;
            }
            
            if (item.vatRate) {
              taxRate = parseFloat(item.vatRate) || 0;
            }
            
            await OrderItem.create({
              orderId: normalizedOrder.id,
              externalProductId: item.id || item.lineItemId || '',
              sku,
              name,
              quantity,
              unitPrice,
              totalPrice,
              currency: item.totalPrice?.currency || item.unitPrice?.currency || 'TRY',
              taxAmount,
              taxRate,
              rawData: JSON.stringify(item)
            }, { transaction: t });
          }
          
          return {
            success: true,
            message: 'Order processed successfully',
            data: normalizedOrder
          };
        });
      } catch (error) {
        // Check if it's a unique constraint error
        if (error.name === 'SequelizeUniqueConstraintError') {
          logger.warn(`Unique constraint violation for ${platformOrderId}, attempting to update instead`, {
            orderNumber: platformOrderId,
            connectionId: this.connectionId
          });
          
          // Try to find the order again - if there was a race condition, it might exist now
          const conflictOrder = await Order.findOne({
            where: {
              externalOrderId: platformOrderId,
              connectionId: this.connectionId
            },
            include: [{ model: ShippingDetail }]
          });
          
          if (conflictOrder) {
            logger.debug(`Found order ${platformOrderId} after constraint violation, updating it`);
            
            try {
              // Update the order that caused the conflict
              await sequelize.transaction(async (t) => {
                // Get order status from appropriate field
                let status;
                if (items[0] && items[0].status) {
                  status = this.mapOrderStatus(items[0].status);
                } else if (order.status) {
                  status = this.mapOrderStatus(order.status);
                } else {
                  status = 'new';
                }
                
                await conflictOrder.update({
                  status,
                  rawData: JSON.stringify(order),
                  lastSyncedAt: new Date()
                }, { transaction: t });
                
                // Also update the Hepsiburada-specific order data
                const existingHepsiburadaOrder = await HepsiburadaOrder.findOne({
                  where: { orderId: conflictOrder.id }
                });
                
                if (existingHepsiburadaOrder) {
                  await existingHepsiburadaOrder.update({
                    platformStatus: order.status || items[0]?.status || '',
                    paymentStatus: order.paymentStatus || '',
                    cargoCompany: items[0]?.cargoCompany || order.cargoCompany || '',
                    cargoTrackingNumber: items[0]?.trackingNumber || order.trackingNumber || '',
                    cargoTrackingUrl: items[0]?.cargoTrackingUrl || order.cargoTrackingUrl || ''
                  }, { transaction: t });
                } else {
                  // If no platform-specific record exists yet, create one
                  await HepsiburadaOrder.create({
                    orderId: conflictOrder.id,
                    packageNumber: order.packageNumber || platformOrderId,
                    merchantId: order.merchantId || this.merchantId,
                    customerId: order.customerId || order.customer?.id || '',
                    orderNumber: platformOrderId,
                    referenceNumber: order.referenceNumber || '',
                    cargoCompany: items[0]?.cargoCompany || order.cargoCompany || '',
                    cargoTrackingNumber: items[0]?.trackingNumber || order.trackingNumber || '',
                    cargoTrackingUrl: items[0]?.cargoTrackingUrl || order.cargoTrackingUrl || '',
                    paymentType: order.paymentType || '',
                    shippingAddressJson: order.deliveryAddress || {
                      name: recipientName,
                      address: address,
                      city: city,
                      town: town,
                      postalCode: postalCode
                    },
                    billingAddressJson: order.billingAddress || {
                      name: order.billingName || recipientName,
                      address: order.billingAddress || address,
                      city: order.billingCity || city,
                      town: order.billingTown || town,
                      postalCode: order.billingPostalCode || postalCode
                    },
                    platformStatus: order.status || items[0]?.status || '',
                    paymentStatus: order.paymentStatus || ''
                  }, { transaction: t });
                }
              });
              
              return {
                success: true,
                message: 'Order updated successfully (after constraint error)',
                data: conflictOrder
              };
            } catch (updateError) {
              logger.error(`Failed to update existing order after constraint violation for ${platformOrderId}: ${updateError.message}`, {
                error: updateError,
                orderNumber: platformOrderId
              });
              throw updateError;
            }
          } else {
            // We still can't find the order, which is strange because we just got a constraint violation
            // Let's retry with a slight delay in case there's a race condition or DB replication lag
            logger.warn(`Could not find order ${platformOrderId} after constraint violation, retrying after delay`);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Try one more time with only the fields we know exist
            const retryOrder = await Order.findOne({
              where: {
                externalOrderId: platformOrderId,
                connectionId: this.connectionId
              }
            });
            
            if (retryOrder) {
              logger.debug(`Found order ${platformOrderId} after retry, updating it`);
              
              await sequelize.transaction(async (t) => {
                // Fetch the latest status
                let status;
                if (items[0] && items[0].status) {
                  status = this.mapOrderStatus(items[0].status);
                } else if (order.status) {
                  status = this.mapOrderStatus(order.status);
                } else {
                  status = 'new';
                }
                
                await retryOrder.update({ 
                  status,
                  rawData: JSON.stringify(order),
                  lastSyncedAt: new Date()
                }, { transaction: t });
              });
              
              return {
                success: true,
                message: 'Order updated successfully (after retry)',
                data: retryOrder
              };
            }
            
            // If we still can't find it, log the error but don't fail the whole import
            logger.error(`Could not find order that caused constraint violation: ${platformOrderId}`, {
              orderData: JSON.stringify(order)
            });
            
            return {
              success: false,
              message: `Order with ID ${platformOrderId} appears to exist in the database but could not be located for update`,
              error: 'ORDER_LOOKUP_FAILED_AFTER_CONSTRAINT_VIOLATION'
            };
          }
        } else {
          // Not a constraint error, rethrow
          throw error;
        }
      }
    } catch (error) {
      logger.error(`Failed to process direct Hepsiburada order: ${error.message}`, { 
        error, 
        connectionId: this.connectionId,
        platformOrderId: order?.orderNumber || order?.packageNumber || 'unknown'
      });
      
      return {
        success: false,
        message: `Failed to process order: ${error.message}`,
        error: error.message
      };
    }
  }

  mapOrderStatus(hepsiburadaStatus) {
    const statusMap = {
      'Open': 'new',
      'Picking': 'processing',
      'Invoiced': 'processing',
      'Shipped': 'shipped',
      'Delivered': 'delivered',
      'Cancelled': 'cancelled',
      'Returned': 'returned'
    };
    
    return statusMap[hepsiburadaStatus] || 'new';
  }
  
  mapPaymentStatus(paymentStatus) {
    const statusMap = {
      'Received': 'new',
      'Pending': 'processing',
      'Completed': 'processing'
    };
    
    return statusMap[paymentStatus] || 'new';
  }

  async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
    let retries = 0;
    let lastError = null;
    
    while (retries < maxRetries) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (error.response && (error.response.status === 429 || error.response.status >= 500)) {
          retries++;
          logger.warn(`Retrying Hepsiburada API request (${retries}/${maxRetries}) after error: ${error.message}`);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, retries - 1)));
        } else {
          // Non-retryable error
          throw error;
        }
      }
    }
    
    // If we've exhausted retries
    throw lastError;
  }
}

module.exports = HepsiburadaService;