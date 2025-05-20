// filepath: /Users/Username/Desktop/Soft/pazar+/services/order-management/src/services/platforms/genericPlatformService.js
/**
 * Generic Platform Service
 * 
 * This service provides a generic implementation for working with platform data
 * using our new generic data models (PlatformData, PlatformAttribute, PlatformSchema).
 * It handles validation, mapping, and CRUD operations for any supported platform.
 */
const { Op } = require('sequelize');
const { sequelize, models } = require('../../config/database');
const { PlatformData, PlatformAttribute, PlatformSchema, Product, Order } = models;
const logger = require('../../utils/logger');
const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true });

class GenericPlatformService {
  /**
   * Create a generic platform service for a specific platform connection
   * @param {Object} connection - The platform connection from the database
   */
  constructor(connection) {
    this.connection = connection;
    this.platformType = connection.platformType.toLowerCase();
    this.userId = connection.userId;
    this.apiConfig = connection.config || {};
    this.logger = logger.child({
      service: 'GenericPlatformService',
      platformType: this.platformType,
      connectionId: connection.id
    });
  }

  /**
   * Test platform connection by validating required credentials and making a test API call
   * @returns {Object} Test result
   */
  async testConnection() {
    try {
      // Get platform-specific implementation details
      const implementation = await this._getPlatformImplementation();
      
      if (!implementation) {
        throw new Error(`No implementation found for platform type: ${this.platformType}`);
      }
      
      // Use the platform implementation to test connection
      if (typeof implementation.testConnection === 'function') {
        return await implementation.testConnection(this.apiConfig);
      }
      
      // If no specific implementation, check if all required fields are present
      const missingFields = this._validateRequiredFields();
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      return { 
        success: true,
        message: 'Connection validated successfully'
      };
    } catch (error) {
      this.logger.error('Connection test failed', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate connection has all required fields based on platform type
   * @returns {Array} Missing required fields
   * @private
   */
  _validateRequiredFields() {
    // Get required fields based on platform type
    const platformConfig = getSupportedPlatforms().find(p => 
      p.type.toLowerCase() === this.platformType
    );
    
    if (!platformConfig) {
      throw new Error(`Unsupported platform type: ${this.platformType}`);
    }
    
    const requiredFields = platformConfig.requiredFields
      .filter(field => field.required)
      .map(field => field.name);
    
    // Check which required fields are missing
    const missingFields = requiredFields.filter(field => 
      !this.apiConfig[field] || this.apiConfig[field].trim() === ''
    );
    
    return missingFields;
  }

  /**
   * Get platform-specific implementation if available
   * @returns {Object|null} Platform-specific implementation or null
   * @private
   */
  async _getPlatformImplementation() {
    try {
      // Try to dynamically import platform-specific implementation
      const PlatformImpl = require(`./${this.platformType}Implementation`);
      return new PlatformImpl(this.connection);
    } catch (error) {
      this.logger.debug(`No platform-specific implementation found for ${this.platformType}`, { error: error.message });
      return null;
    }
  }

  /**
   * Get schema for a platform entity type
   * @param {String} entityType - The entity type (product, order, etc.)
   * @returns {Object|null} Schema object or null if not found
   * @private
   */
  async _getSchema(entityType) {
    const schema = await PlatformSchema.findOne({
      where: {
        platformType: this.platformType,
        entityType,
        isActive: true
      },
      order: [['version', 'DESC']]
    });
    
    return schema ? schema.schema : null;
  }

  /**
   * Validate entity data against its schema
   * @param {Object} data - The entity data to validate
   * @param {String} entityType - The entity type (product, order, etc.)
   * @returns {Object} Validation result
   * @private
   */
  async _validateData(data, entityType) {
    const schema = await this._getSchema(entityType);
    
    if (!schema) {
      return { 
        valid: false,
        errors: [`No schema found for ${this.platformType} ${entityType}`]
      };
    }
    
    // Compile and validate schema using Ajv
    const validate = ajv.compile(schema);
    const valid = validate(data);
    
    if (!valid) {
      return {
        valid: false,
        errors: validate.errors
      };
    }
    
    return { valid: true };
  }

  /**
   * Apply mappings to transform data between platform and internal format
   * @param {Object} data - The data to transform
   * @param {String} entityType - The entity type (product, order, etc.)
   * @param {String} direction - The mapping direction ('toInternal' or 'toExternal')
   * @returns {Object} Transformed data
   * @private
   */
  async _applyMappings(data, entityType, direction = 'toInternal') {
    const schemaRecord = await PlatformSchema.findOne({
      where: {
        platformType: this.platformType,
        entityType,
        isActive: true
      },
      order: [['version', 'DESC']]
    });
    
    if (!schemaRecord || !schemaRecord.mappings) {
      return data;
    }
    
    const mappings = schemaRecord.mappings[direction] || {};
    const result = {};
    
    if (direction === 'toInternal') {
      // Map from platform format to internal format
      Object.entries(mappings).forEach(([internalField, platformField]) => {
        if (typeof platformField === 'string') {
          // Simple direct mapping
          result[internalField] = this._getNestedValue(data, platformField);
        } else if (typeof platformField === 'object' && platformField.transform) {
          // Custom transformation with function name
          result[internalField] = this._executeTransform(
            platformField.transform, 
            this._getNestedValue(data, platformField.field || '')
          );
        }
      });
      
      // Include unmapped fields
      return { ...data, ...result };
    } else {
      // Map from internal format to platform format
      Object.entries(mappings).forEach(([platformField, internalField]) => {
        if (typeof internalField === 'string') {
          // Simple direct mapping
          this._setNestedValue(result, platformField, this._getNestedValue(data, internalField));
        } else if (typeof internalField === 'object' && internalField.transform) {
          // Custom transformation with function name
          this._setNestedValue(
            result,
            platformField,
            this._executeTransform(
              internalField.transform, 
              this._getNestedValue(data, internalField.field || '')
            )
          );
        }
      });
      
      return result;
    }
  }
  
  /**
   * Get a nested value from an object using dot notation
   * @param {Object} obj - The object to get value from
   * @param {String} path - The path to the value using dot notation
   * @returns {*} The value
   * @private
   */
  _getNestedValue(obj, path) {
    if (!path) return obj;
    return path.split('.').reduce((o, i) => (o && o[i] !== undefined) ? o[i] : null, obj);
  }
  
  /**
   * Set a nested value in an object using dot notation
   * @param {Object} obj - The object to set value in
   * @param {String} path - The path to the value using dot notation
   * @param {*} value - The value to set
   * @private
   */
  _setNestedValue(obj, path, value) {
    if (!path) return;
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }
  
  /**
   * Execute a named transformation function
   * @param {String} transformName - The name of the transformation function
   * @param {*} value - The value to transform
   * @returns {*} Transformed value
   * @private
   */
  _executeTransform(transformName, value) {
    const transformations = {
      toBoolean: val => !!val,
      toNumber: val => Number(val),
      toString: val => String(val),
      toDate: val => new Date(val),
      toUpperCase: val => val ? val.toUpperCase() : val,
      toLowerCase: val => val ? val.toLowerCase() : val,
      // Add more transformations as needed
    };
    
    if (transformName && transformations[transformName]) {
      return transformations[transformName](value);
    }
    
    return value;
  }

  /**
   * Create searchable attributes for an entity
   * @param {String} entityId - The entity ID
   * @param {Object} data - The entity data
   * @param {String} entityType - The entity type
   * @param {Transaction} transaction - Optional Sequelize transaction
   * @private
   */
  async _createAttributes(entityId, data, entityType, transaction) {
    // Get schema for this entity type
    const schemaRecord = await PlatformSchema.findOne({
      where: {
        platformType: this.platformType,
        entityType,
        isActive: true
      },
      order: [['version', 'DESC']],
      transaction
    });
    
    if (!schemaRecord || !schemaRecord.schema) {
      return;
    }
    
    // Get indexable properties from schema
    const indexableProps = {};
    
    if (schemaRecord.schema.properties) {
      Object.entries(schemaRecord.schema.properties).forEach(([key, prop]) => {
        if (prop.indexable) {
          indexableProps[key] = prop.type;
        }
      });
    }
    
    // Delete existing attributes first
    await PlatformAttribute.destroy({
      where: {
        entityId,
        entityType,
        platformType: this.platformType
      },
      transaction
    });
    
    // Create attributes for indexable properties
    const attributes = [];
    
    Object.entries(indexableProps).forEach(([key, type]) => {
      const value = this._getNestedValue(data, key);
      if (value !== undefined && value !== null) {
        let attributeObj = {
          entityId,
          entityType,
          platformType: this.platformType,
          attributeKey: key
        };
        
        // Set value in appropriate column based on type
        switch (type) {
          case 'string':
            attributeObj.stringValue = String(value);
            attributeObj.valueType = 'string';
            break;
          case 'number':
          case 'integer':
            attributeObj.numericValue = Number(value);
            attributeObj.valueType = 'number';
            break;
          case 'boolean':
            attributeObj.booleanValue = Boolean(value);
            attributeObj.valueType = 'boolean';
            break;
          case 'date':
          case 'datetime':
            attributeObj.dateValue = new Date(value);
            attributeObj.valueType = 'date';
            break;
          default:
            attributeObj.stringValue = String(value);
            attributeObj.valueType = 'string';
        }
        
        attributes.push(attributeObj);
      }
    });
    
    // Create attributes in bulk if there are any
    if (attributes.length > 0) {
      await PlatformAttribute.bulkCreate(attributes, { transaction });
    }
  }

  /**
   * Get product by ID from platform
   * @param {String} externalProductId - The product ID in the platform
   * @returns {Object} Product data
   */
  async getProductById(externalProductId) {
    try {
      // Try to get from database first
      const platformData = await PlatformData.findOne({
        where: {
          platformType: this.platformType,
          platformEntityId: externalProductId,
          entityType: 'product'
        }
      });
      
      if (platformData) {
        return {
          success: true,
          data: platformData.data
        };
      }
      
      // If not in database, try to get from platform API
      const implementation = await this._getPlatformImplementation();
      
      if (!implementation || typeof implementation.getProductById !== 'function') {
        throw new Error(`Get product API not implemented for ${this.platformType}`);
      }
      
      const result = await implementation.getProductById(externalProductId);
      
      // Store product data in database if successful
      if (result.success && result.data) {
        // Validate data against schema
        const validation = await this._validateData(result.data, 'product');
        
        if (!validation.valid) {
          this.logger.warn('Product data from API did not validate', { errors: validation.errors });
        }
        
        // Store in database regardless of validation (for debugging purposes)
        await this.saveProduct(result.data);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to get product ${externalProductId}`, { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save product data to database
   * @param {Object} productData - The product data from the platform
   * @returns {Object} Result of the operation
   */
  async saveProduct(productData) {
    const transaction = await sequelize.transaction();
    
    try {
      // Validate data against schema
      const validation = await this._validateData(productData, 'product');
      
      if (!validation.valid) {
        this.logger.warn('Product data validation failed', { errors: validation.errors });
      }
      
      // Apply mappings to get internal data
      const mappedData = await this._applyMappings(productData, 'product', 'toInternal');
      
      // Look for existing product by platform entity ID
      const platformEntityId = this._getProductExternalId(productData);
      
      let platformData = await PlatformData.findOne({
        where: {
          platformType: this.platformType,
          platformEntityId,
          entityType: 'product'
        },
        transaction
      });
      
      // Create or update associated product
      let product;
      let entityId;
      
      if (platformData && platformData.entityId) {
        // If platform data exists, get the associated product
        product = await Product.findByPk(platformData.entityId, { transaction });
        entityId = platformData.entityId;
      }
      
      // If product doesn't exist, create a new one
      if (!product) {
        product = await Product.create({
          name: mappedData.name || mappedData.title || `${this.platformType} Product`,
          sku: mappedData.sku || mappedData.merchantSku || mappedData.barcode || `${this.platformType}-${platformEntityId}`,
          description: mappedData.description || '',
          price: mappedData.price || 0,
          barcode: mappedData.barcode,
          userId: this.userId,
          metadata: {
            source: this.platformType,
            externalProductId: platformEntityId
          }
        }, { transaction });
        
        entityId = product.id;
      }
      
      // Create or update platform data
      if (platformData) {
        // Update existing
        await platformData.update({
          data: productData,
          status: mappedData.status || 'active',
          approvalStatus: mappedData.approvalStatus || 'pending',
          platformPrice: mappedData.price,
          platformQuantity: mappedData.quantity || mappedData.stock,
          hasError: validation.valid ? false : true,
          errorMessage: validation.valid ? null : JSON.stringify(validation.errors),
          lastSyncedAt: new Date()
        }, { transaction });
      } else {
        // Create new
        platformData = await PlatformData.create({
          entityId,
          entityType: 'product',
          platformType: this.platformType,
          platformEntityId,
          data: productData,
          status: mappedData.status || 'active',
          approvalStatus: mappedData.approvalStatus || 'pending',
          platformPrice: mappedData.price,
          platformQuantity: mappedData.quantity || mappedData.stock,
          hasError: validation.valid ? false : true,
          errorMessage: validation.valid ? null : JSON.stringify(validation.errors),
          lastSyncedAt: new Date()
        }, { transaction });
      }
      
      // Create searchable attributes
      await this._createAttributes(entityId, productData, 'product', transaction);
      
      // Commit the transaction
      await transaction.commit();
      
      return {
        success: true,
        data: {
          id: entityId,
          platformData: platformData.id
        }
      };
    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      
      this.logger.error('Failed to save product', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Extract the external product ID from product data
   * @param {Object} productData - The product data
   * @returns {String} External product ID
   * @private
   */
  _getProductExternalId(productData) {
    // Different platforms have different ID field names
    return productData.id || 
           productData.productId || 
           productData.sku || 
           productData.barcode ||
           productData.externalId;
  }

  /**
   * Sync products from platform
   * @param {Object} options - Sync options (filter, pagination, etc.)
   * @returns {Object} Sync result
   */
  async syncProducts(options = {}) {
    try {
      const implementation = await this._getPlatformImplementation();
      
      if (!implementation || typeof implementation.getProducts !== 'function') {
        throw new Error(`Product sync not implemented for ${this.platformType}`);
      }
      
      // Get products from platform API
      const result = await implementation.getProducts(options);
      
      if (!result.success || !result.data || !Array.isArray(result.data)) {
        throw new Error(result.error || 'Failed to get products from platform');
      }
      
      // Save each product
      const saveResults = {
        total: result.data.length,
        saved: 0,
        failed: 0,
        errors: []
      };
      
      for (const product of result.data) {
        const saveResult = await this.saveProduct(product);
        
        if (saveResult.success) {
          saveResults.saved++;
        } else {
          saveResults.failed++;
          saveResults.errors.push({
            product: this._getProductExternalId(product),
            error: saveResult.error
          });
        }
      }
      
      return {
        success: true,
        message: `Synced ${saveResults.saved} of ${saveResults.total} products`,
        data: saveResults
      };
    } catch (error) {
      this.logger.error('Product sync failed', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sync orders from platform
   * @param {Object} options - Sync options (dateRange, status, etc.)
   * @returns {Object} Sync result
   */
  async syncOrders(options = {}) {
    try {
      const implementation = await this._getPlatformImplementation();
      
      if (!implementation || typeof implementation.getOrders !== 'function') {
        throw new Error(`Order sync not implemented for ${this.platformType}`);
      }
      
      // Get orders from platform API
      const result = await implementation.getOrders(options);
      
      if (!result.success || !result.data || !Array.isArray(result.data)) {
        throw new Error(result.error || 'Failed to get orders from platform');
      }
      
      // Save each order
      const saveResults = {
        total: result.data.length,
        saved: 0,
        failed: 0,
        errors: []
      };
      
      for (const order of result.data) {
        try {
          await this.saveOrder(order);
          saveResults.saved++;
        } catch (error) {
          saveResults.failed++;
          saveResults.errors.push({
            order: order.id || order.orderNumber,
            error: error.message
          });
        }
      }
      
      return {
        success: true,
        message: `Synced ${saveResults.saved} of ${saveResults.total} orders`,
        data: saveResults
      };
    } catch (error) {
      this.logger.error('Order sync failed', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save order data to database
   * @param {Object} orderData - The order data from the platform
   * @returns {Object} Result of the operation
   */
  async saveOrder(orderData) {
    const transaction = await sequelize.transaction();
    
    try {
      // Validate data against schema
      const validation = await this._validateData(orderData, 'order');
      
      if (!validation.valid) {
        this.logger.warn('Order data validation failed', { errors: validation.errors });
      }
      
      // Apply mappings to get internal data
      const mappedData = await this._applyMappings(orderData, 'order', 'toInternal');
      
      // Extract order details
      const externalOrderId = orderData.id || orderData.orderNumber || orderData.orderCode;
      const orderNumber = orderData.orderNumber || externalOrderId;
      const orderDate = mappedData.orderDate || new Date();
      const status = mappedData.status || 'pending';
      
      // Look for existing order by platform entity ID
      let platformData = await PlatformData.findOne({
        where: {
          platformType: this.platformType,
          platformEntityId: externalOrderId,
          entityType: 'order'
        },
        transaction
      });
      
      // Create or update associated order
      let order;
      let entityId;
      
      if (platformData && platformData.entityId) {
        // If platform data exists, get the associated order
        order = await Order.findByPk(platformData.entityId, { transaction });
        entityId = platformData.entityId;
      }
      
      // If order doesn't exist, create a new one
      if (!order) {
        order = await Order.create({
          externalOrderId: orderNumber,
          orderDate,
          status,
          userId: this.userId,
          platformType: this.platformType,
          connectionId: this.connection.id,
          totalAmount: mappedData.totalAmount || 0,
          customerName: mappedData.customerName,
          customerEmail: mappedData.customerEmail,
          customerPhone: mappedData.customerPhone,
          metadata: {
            source: this.platformType,
            platformOrderId: externalOrderId
          }
        }, { transaction });
        
        entityId = order.id;
        
        // Create order items if available
        if (mappedData.items && Array.isArray(mappedData.items)) {
          // Import related models
          const { OrderItem } = models;
          
          for (const item of mappedData.items) {
            await OrderItem.create({
              orderId: entityId,
              productId: item.productId,
              sku: item.sku || item.merchantSku,
              barcode: item.barcode,
              name: item.name || item.title,
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || item.price || 0,
              totalPrice: item.totalPrice || (item.unitPrice * item.quantity) || 0,
              metadata: {
                platformData: item
              }
            }, { transaction });
          }
        }
        
        // Create shipping details if available
        if (mappedData.shipping) {
          // Import related models
          const { ShippingDetail } = models;
          
          await ShippingDetail.create({
            orderId: entityId,
            recipientName: mappedData.shipping.recipientName,
            phone: mappedData.shipping.phone,
            addressLine1: mappedData.shipping.addressLine1,
            addressLine2: mappedData.shipping.addressLine2,
            city: mappedData.shipping.city,
            state: mappedData.shipping.state,
            postalCode: mappedData.shipping.postalCode,
            country: mappedData.shipping.country || 'TR',
            instructions: mappedData.shipping.instructions,
            carrierName: mappedData.shipping.carrierName,
            trackingNumber: mappedData.shipping.trackingNumber,
            shippingMethod: mappedData.shipping.shippingMethod
          }, { transaction });
        }
      } else {
        // Update order details if it already exists
        await order.update({
          status,
          totalAmount: mappedData.totalAmount || order.totalAmount,
          lastSyncedAt: new Date()
        }, { transaction });
      }
      
      // Create or update platform data
      if (platformData) {
        // Update existing
        await platformData.update({
          data: orderData,
          status,
          lastSyncedAt: new Date()
        }, { transaction });
      } else {
        // Create new
        platformData = await PlatformData.create({
          entityId,
          entityType: 'order',
          platformType: this.platformType,
          platformEntityId: externalOrderId,
          data: orderData,
          status,
          lastSyncedAt: new Date()
        }, { transaction });
      }
      
      // Create searchable attributes
      await this._createAttributes(entityId, orderData, 'order', transaction);
      
      // Commit the transaction
      await transaction.commit();
      
      return {
        success: true,
        data: {
          id: entityId,
          platformData: platformData.id
        }
      };
    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      
      this.logger.error('Failed to save order', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update order status on platform
   * @param {String} orderId - The order ID in our system
   * @param {String} status - The new status
   * @returns {Object} Update result
   */
  async updateOrderStatus(orderId, status) {
    try {
      // Get order info from our database
      const order = await Order.findByPk(orderId);
      
      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }
      
      // Get platform data for this order
      const platformData = await PlatformData.findOne({
        where: {
          entityId: orderId,
          entityType: 'order',
          platformType: this.platformType
        }
      });
      
      if (!platformData) {
        throw new Error(`No platform data found for order: ${orderId}`);
      }
      
      const externalOrderId = platformData.platformEntityId;
      
      // Get platform-specific implementation
      const implementation = await this._getPlatformImplementation();
      
      if (!implementation || typeof implementation.updateOrderStatus !== 'function') {
        throw new Error(`Update order status not implemented for ${this.platformType}`);
      }
      
      // Update status on platform
      const result = await implementation.updateOrderStatus(externalOrderId, status);
      
      if (result.success) {
        // Update status in our database
        await order.update({ status });
        
        // Update platform data
        const updatedData = { ...platformData.data, status };
        await platformData.update({
          data: updatedData,
          status,
          lastSyncedAt: new Date()
        });
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to update order status for ${orderId}`, { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = GenericPlatformService;

/**
 * Get supported platforms with their required connection parameters
 * This function is duplicated from platformService.js to avoid circular dependencies
 * @returns {Array} List of supported platforms and their configuration
 */
function getSupportedPlatforms() {
  return [
    {
      type: 'trendyol',
      name: 'Trendyol',
      logo: '/images/platforms/trendyol.png',
      requiredFields: [
        { name: 'apiKey', type: 'string', label: 'API Key', required: true },
        { name: 'apiSecret', type: 'password', label: 'API Secret', required: true },
        { name: 'sellerId', type: 'string', label: 'Seller ID', required: true },
        { name: 'apiUrl', type: 'string', label: 'API URL', required: false, default: 'https://api.trendyol.com/sapigw' }
      ],
      description: 'Connect to Trendyol marketplace to sync orders and inventory.'
    },
    // Add more platforms with their configurations as needed
  ];
}