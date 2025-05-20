const { Op } = require('sequelize');
const { Order, OrderItem, ShippingDetail, PlatformConnection, HepsiburadaOrder, sequelize } = require('../../../models');
const logger = require('../../../utils/logger');
const BasePlatformService = require('../base/BasePlatformService');

class HepsiburadaService extends BasePlatformService {
  constructor(connectionId) {
    super(connectionId);
    this.apiUrl = 'https://oms-external.hepsiburada.com';
    this.merchantId = null;
  }

  /**
   * Get the platform type
   * @returns {string} Platform type identifier
   */
  getPlatformType() {
    return 'hepsiburada';
  }

  /**
   * Setup Axios instance with appropriate headers and config
   * Implementation of abstract method from BasePlatformService
   */
  async setupAxiosInstance() {
    const credentials = this.decryptCredentials(this.connection.credentials);
    const { merchantId, apiSecret } = credentials;
    
    if (!merchantId || !apiSecret) {
      throw new Error('Missing required Hepsiburada credentials. Merchant ID and API Secret are required.');
    }
    
    // Create Basic auth header with merchantId:apiSecret
    const authString = Buffer.from(`${merchantId}:${apiSecret}`).toString('base64');
    
    this.axiosInstance = await this.createAxiosInstance({
      baseURL: this.apiUrl,
      headers: {
        'Authorization': `Basic ${authString}`,
        'User-Agent': 'sentosyazilim_dev',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    this.merchantId = merchantId;
    return true;
  }

  /**
   * Create an Axios instance - helper method for setupAxiosInstance
   * @param {Object} config - Axios configuration 
   * @returns {Object} Axios instance
   */
  async createAxiosInstance(config) {
    const axios = require('axios');
    return axios.create(config);
  }

  /**
   * Override decryptCredentials for Hepsiburada-specific format
   * @param {string|object} encryptedCredentials 
   * @returns {object} Decrypted credentials
   */
  decryptCredentials(encryptedCredentials) {
    try {
      // Use the parent implementation for basic parsing
      const credentials = super.decryptCredentials(encryptedCredentials);
      
      // Make sure we have the required fields
      if (!credentials.storeId && !credentials.merchantId) {
        throw new Error('Missing required credentials: merchantId or storeId');
      }
      
      return {
        merchantId: credentials.storeId || credentials.merchantId,
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret
      };
    } catch (error) {
      logger.error(`Failed to decrypt Hepsiburada credentials: ${error.message}`, { error });
      throw new Error('Failed to decrypt credentials');
    }
  }

  // Keep existing methods but remove duplicated ones that are already in BasePlatformService

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
      
      let order = orderData;
      
      // If this is an order detail response (from getOrderDetails), use it directly
      if (orderData.orderId && orderData.orderNumber && orderData.items) {
        // This is already an order detail format
        order = orderData;
      } 
      // If this is a package format (from fetchOrders), transform it
      else if (orderData.id && orderData.packageNumber) {
        // Fetch full order details if we only have the package info
        const orderDetailsResponse = await this.getOrderDetails(orderData.items[0].orderNumber);
        
        if (orderDetailsResponse.success && orderDetailsResponse.data) {
          order = orderDetailsResponse.data;
        }
      }
      
      const items = order.items || [];
      
      // Extract shipping details based on data format
      let recipientName, address, city, town, postalCode, email, phoneNumber;
      
      if (order.deliveryAddress) {
        // New order detail format
        recipientName = order.deliveryAddress.name || '';
        address = order.deliveryAddress.address || '';
        city = order.deliveryAddress.city || '';
        town = order.deliveryAddress.town || '';
        postalCode = order.deliveryAddress.postalCode || '';
        email = order.deliveryAddress.email || '';
        phoneNumber = order.deliveryAddress.phoneNumber || '';
      } else if (order.shippingAddress) {
        // Older order detail format
        recipientName = order.shippingAddress.name || '';
        address = order.shippingAddress.address || '';
        city = order.shippingAddress.city || '';
        town = order.shippingAddress.town || '';
        postalCode = order.shippingAddress.postalCode || '';
        email = order.shippingAddress.email || '';
        phoneNumber = order.shippingAddress.phoneNumber || '';
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
      
      // If phone number is empty, try to extract from items
      if (!phoneNumber && items.length > 0 && items[0].shippingAddress && items[0].shippingAddress.phoneNumber) {
        phoneNumber = items[0].shippingAddress.phoneNumber;
      }
      
      // As a last resort, try to extract phone from address text using regex
      if (!phoneNumber) {
        phoneNumber = this.extractPhoneNumber(order);
      }
      
      // Get order number - ensure we have a valid value
      const platformOrderId = order.orderId || (items.length > 0 ? items[0].orderId : '') || '';
      
      if (!platformOrderId) {
        logger.error('Missing platform order ID in Hepsiburada order data', { orderData });
        return {
          success: false,
          message: 'Missing platform order ID in order data',
          error: 'MISSING_PLATFORM_ORDER_ID'
        };
      }
      
      logger.debug(`Processing Hepsiburada order: ${platformOrderId}`);
      
      // Process orderNote field which could be an object in new API format
      let orderNotes = '';
      if (order.orderNote) {
        if (typeof order.orderNote === 'string') {
          orderNotes = order.orderNote;
        } else if (typeof order.orderNote === 'object') {
          // Convert object to string representation
          try {
            orderNotes = JSON.stringify(order.orderNote);
          } catch (e) {
            orderNotes = 'Order had notes in object format';
          }
        }
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
            notes: orderNotes,
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
          // First create the order record - fix field names to match model definition
          const normalizedOrder = await Order.create({
            externalOrderId: platformOrderId,
            platformType: 'hepsiburada',
            connectionId: this.connectionId,
            userId: this.connection.userId,
            customerName: order.customer?.name || recipientName,
            customerEmail: email,
            customerPhone: phoneNumber,
            orderDate: new Date(order.orderDate || Date.now()),
            totalAmount: items.reduce((sum, item) => {
              const itemTotal = parseFloat(item.totalPrice?.amount || 0);
              return sum + itemTotal;
            }, 0),
            currency: items[0]?.totalPrice?.currency || 'TRY',
            status: items[0]?.status ? this.mapOrderStatus(items[0].status) : 'new',
            notes: orderNotes, // Using our processed notes variable instead of direct order.orderNote
            paymentStatus: order.paymentStatus || 'pending',
            rawData: JSON.stringify(order),
            lastSyncedAt: new Date()
          }, { transaction: t });
          
          // Create shipping detail with orderId and correct address field
          const shippingDetail = await ShippingDetail.create({
            orderId: normalizedOrder.id, // Add the orderId reference
            recipientName,
            address1: address, // Changed from address to address1
            address2: '', // Add empty address2
            city,
            state: town,
            postalCode,
            country: 'TR',
            phone: phoneNumber,
            email,
            shippingMethod: items[0]?.cargoCompany || order.cargoCompany || '',
            trackingNumber: items[0]?.trackingNumber || order.cargoTrackingNumber || '',
            trackingUrl: items[0]?.cargoTrackingUrl || order.cargoTrackingUrl || '',
            status: 'pending'
          }, { transaction: t });
          
          // Update the order to reference the shipping detail
          await normalizedOrder.update({
            shippingDetailId: shippingDetail.id
          }, { transaction: t });
          
          // Create Hepsiburada-specific order record
          await HepsiburadaOrder.create({
            orderId: normalizedOrder.id,
            packageNumber: order.packageNumber || platformOrderId,
            merchantId: order.merchantId || this.merchantId,
            customerId: order.customerId || order.customer?.customerId || '',
            orderNumber: order.orderNumber || platformOrderId,
            referenceNumber: order.referenceNumber || '',
            cargoCompany: items[0]?.cargoCompany || order.cargoCompany || '',
            cargoTrackingNumber: items[0]?.trackingNumber || order.trackingNumber || '',
            cargoTrackingUrl: items[0]?.cargoTrackingUrl || order.cargoTrackingUrl || '',
            paymentType: order.paymentType || '',
            // Use the new fields to store detailed information
            shippingAddressJson: order.shippingAddress || {
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
            // New fields to capture the JSON structure from API
            deliveryAddressJson: order.deliveryAddress || null,
            invoiceDetailsJson: order.invoice || null,
            customerJson: order.customer || null,
            platformStatus: order.status || items[0]?.status || '',
            paymentStatus: order.paymentStatus || '',
            createdDate: order.createdDate ? new Date(order.createdDate) : null,
            orderDate: order.orderDate ? new Date(order.orderDate) : null
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
        platformOrderId: Order?.orderNumber || Order?.packageNumber || 'unknown'
      });
      
      return {
        success: false,
        message: `Failed to process order: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Extract phone number from order data - override parent method
   * Handles various formats and null cases in Hepsiburada API responses
   * @param {Object} order - The order object from Hepsiburada API
   * @returns {string} The extracted phone number or empty string if not available
   */
  extractPhoneNumber(order) {
    // Check various locations where phone might be available
    // First check direct phone field
    if (order.phoneNumber) {
      return order.phoneNumber;
    }
    
    // Check delivery address
    if (order.deliveryAddress && order.deliveryAddress.phoneNumber) {
      return order.deliveryAddress.phoneNumber;
    }
    
    // If none of the direct fields have a phone number, use the parent implementation
    // which handles general regex pattern matching
    return super.extractPhoneNumber(order);
  }

  /**
   * Map Hepsiburada order status to internal system status
   * @param {string} hepsiburadaStatus - Platform-specific status
   * @returns {string} Internal status
   */
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

  /**
   * Map internal status to Hepsiburada status
   * @param {string} internalStatus - Internal status
   * @returns {string} Hepsiburada status
   */
  mapToPlatformStatus(internalStatus) {
    const reverseStatusMap = {
      'new': 'Open',
      'processing': 'Picking',
      'shipped': 'Shipped',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled',
      'returned': 'Returned'
    };
    
    return reverseStatusMap[internalStatus] || 'Open';
  }

  // Alias for backward compatibility
  mapToHepsiburadaStatus(internalStatus) {
    return this.mapToPlatformStatus(internalStatus);
  }

  /**
   * Update order status on Hepsiburada platform
   * @param {string} orderId - Internal order ID
   * @param {string} newStatus - New status to set
   * @returns {Object} - Result of the status update operation
   */
  async updateOrderStatus(orderId, newStatus) {
    try {
      await this.initialize();
      
      const order = await Order.findByPk(orderId, {
        include: [{ model: HepsiburadaOrder }]
      });
      
      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }
      
      if (!order.HepsiburadaOrder) {
        throw new Error(`Hepsiburada order details not found for order ID ${orderId}`);
      }
      
      const hepsiburadaStatus = this.mapToPlatformStatus(newStatus);
      
      if (!hepsiburadaStatus) {
        throw new Error(`Cannot map status '${newStatus}' to Hepsiburada status`);
      }
      
      const packageNumber = order.HepsiburadaOrder.packageNumber;
      
      if (!packageNumber) {
        throw new Error('Package number not found in order details');
      }
      
      const url = `/packages/merchantid/${this.merchantId}/packagenumber/${packageNumber}/status`;
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.put(url, {
          status: hepsiburadaStatus
        })
      );
      
      // Update local order status
      await sequelize.transaction(async (t) => {
        await order.update({
          status: newStatus,
          lastSyncedAt: new Date()
        }, { transaction: t });
        
        await order.HepsiburadaOrder.update({
          platformStatus: hepsiburadaStatus
        }, { transaction: t });
      });
      
      return {
        success: true,
        message: `Order status updated to ${newStatus}`,
        data: order
      };
    } catch (error) {
      logger.error(`Failed to update order status on Hepsiburada: ${error.message}`, { 
        error, 
        orderId, 
        connectionId: this.connectionId 
      });
      
      return {
        success: false,
        message: `Failed to update order status: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Fetch products from Hepsiburada
   * @param {Object} params - Query parameters 
   * @returns {Promise<Object>} Result containing product data
   */
  async fetchProducts(params = {}) {
    try {
      await this.initialize();
      
      const defaultParams = {
        offset: 0,
        limit: 100
      };
      
      const queryParams = { ...defaultParams, ...params };
      const url = `/listings/merchantid/${this.merchantId}`;
      
      const response = await this.retryRequest(() => 
        this.axiosInstance.get(url, { params: queryParams })
      );
      
      if (!response.data || !Array.isArray(response.data)) {
        return {
          success: false,
          message: 'No product data returned from Hepsiburada',
          data: []
        };
      }
      
      return {
        success: true,
        message: `Successfully fetched ${response.data.length} products from Hepsiburada`,
        data: response.data,
        pagination: {
          offset: queryParams.offset,
          limit: queryParams.limit,
          totalCount: response.data.length
        }
      };
    } catch (error) {
      logger.error(`Failed to fetch products from Hepsiburada: ${error.message}`, { 
        error, 
        connectionId: this.connectionId 
      });
      
      return {
        success: false,
        message: `Failed to fetch products: ${error.message}`,
        error: error.response?.data || error.message,
        data: []
      };
    }
  }

  // We're using the BasePlatformService implementation for retryRequest and syncOrdersFromDate
}

module.exports = HepsiburadaService;