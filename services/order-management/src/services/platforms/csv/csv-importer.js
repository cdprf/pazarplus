// src/services/platforms/csv/csv-importer.js

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Order } = require('../../../models/order');
const { OrderItem } = require('../../../models/orderItem');
const { ShippingDetail } = require('../../../models/shippingDetail');
const { PlatformConnection } = require('../../../models/platform-connection.model');
const logger = require('../../../utils/logger');

class CSVImporterService {
  constructor(connectionId) {
    this.connectionId = connectionId;
    this.connection = null;
    this.uploadDir = path.join(__dirname, '../../../uploads');
    
    // Create upload directory if it doesn't exist
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async initialize() {
    try {
      this.connection = await PlatformConnection.findByPk(this.connectionId);
      
      if (!this.connection) {
        throw new Error(`Platform connection with ID ${this.connectionId} not found`);
      }

      return true;
    } catch (error) {
      logger.error(`Failed to initialize CSV importer: ${error.message}`, { error, connectionId: this.connectionId });
      throw new Error(`Failed to initialize CSV importer: ${error.message}`);
    }
  }

  async testConnection() {
    try {
      await this.initialize();
      
      return {
        success: true,
        message: 'Connection successful',
        data: {
          platform: 'csv',
          connectionId: this.connectionId,
          status: 'active'
        }
      };
    } catch (error) {
      logger.error(`CSV importer connection test failed: ${error.message}`, { error, connectionId: this.connectionId });
      
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Process uploaded CSV file and import orders
   * @param {Object} file - Uploaded file object
   * @param {Object} options - Import options
   * @returns {Object} - Import result
   */
  async importOrdersFromCSV(file, options = {}) {
    try {
      await this.initialize();
      
      // Define column mappings (can be customized by user in the future)
      const columnMap = options.columnMap || this.getDefaultColumnMap();
      
      // Save file to upload directory
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.originalname}`;
      const filePath = path.join(this.uploadDir, fileName);
      
      // Create write stream and pipe file buffer to it
      await new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(filePath);
        writeStream.write(file.buffer);
        writeStream.end();
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      
      // Parse CSV file
      const results = [];
      
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv({
            skipLines: options.skipHeader ? 1 : 0,
            headers: options.hasHeaders,
            separator: options.delimiter || ',',
            trim: true
          }))
          .on('data', (data) => results.push(data))
          .on('end', resolve)
          .on('error', reject);
      });
      
      // Group rows by order ID to handle multiple items per order
      const orderMap = new Map();
      
      for (const row of results) {
        const orderId = this.getValueFromMapping(row, columnMap.orderId);
        
        if (!orderId) {
          logger.warn('Skipping row with no order ID', { row });
          continue;
        }
        
        if (!orderMap.has(orderId)) {
          orderMap.set(orderId, {
            orderData: {
              platformOrderId: orderId,
              platformId: 'csv',
              connectionId: this.connectionId,
              orderDate: this.parseDate(this.getValueFromMapping(row, columnMap.orderDate)),
              orderStatus: this.getValueFromMapping(row, columnMap.orderStatus) || 'new',
              totalAmount: parseFloat(this.getValueFromMapping(row, columnMap.totalAmount)) || 0,
              currency: this.getValueFromMapping(row, columnMap.currency) || 'TRY',
              customerName: this.getValueFromMapping(row, columnMap.customerName),
              customerEmail: this.getValueFromMapping(row, columnMap.customerEmail),
              customerPhone: this.getValueFromMapping(row, columnMap.customerPhone),
              notes: this.getValueFromMapping(row, columnMap.notes),
              rawData: JSON.stringify(row)
            },
            shippingData: {
              recipientName: this.getValueFromMapping(row, columnMap.recipientName) || this.getValueFromMapping(row, columnMap.customerName),
              address: this.getValueFromMapping(row, columnMap.address),
              city: this.getValueFromMapping(row, columnMap.city),
              state: this.getValueFromMapping(row, columnMap.state),
              postalCode: this.getValueFromMapping(row, columnMap.postalCode),
              country: this.getValueFromMapping(row, columnMap.country) || 'Turkey',
              phone: this.getValueFromMapping(row, columnMap.phone) || this.getValueFromMapping(row, columnMap.customerPhone),
              email: this.getValueFromMapping(row, columnMap.email) || this.getValueFromMapping(row, columnMap.customerEmail),
              shippingMethod: this.getValueFromMapping(row, columnMap.shippingMethod)
            },
            items: []
          });
        }
        
        // Add item to order
        orderMap.get(orderId).items.push({
          platformProductId: this.getValueFromMapping(row, columnMap.productId),
          sku: this.getValueFromMapping(row, columnMap.sku),
          barcode: this.getValueFromMapping(row, columnMap.barcode),
          title: this.getValueFromMapping(row, columnMap.productTitle),
          quantity: parseInt(this.getValueFromMapping(row, columnMap.quantity)) || 1,
          price: parseFloat(this.getValueFromMapping(row, columnMap.price)) || 0,
          currency: this.getValueFromMapping(row, columnMap.currency) || 'TRY',
          variantInfo: this.getValueFromMapping(row, columnMap.variantInfo),
          rawData: JSON.stringify(row)
        });
      }
      
      // Create orders in database
      const importedOrders = [];
      let failedOrders = 0;
      
      for (const [orderId, orderData] of orderMap.entries()) {
        try {
          // Check if order already exists
          const existingOrder = await Order.findOne({
            where: {
              platformOrderId: orderId,
              platformId: 'csv',
              connectionId: this.connectionId
            }
          });
          
          if (existingOrder && !options.overwriteExisting) {
            logger.info(`Skipping existing order: ${orderId}`);
            continue;
          }
          
          // Create or update shipping details
          let shippingDetail;
          
          if (existingOrder && existingOrder.shippingDetailId) {
            shippingDetail = await ShippingDetail.findByPk(existingOrder.shippingDetailId);
            await shippingDetail.update(orderData.shippingData);
          } else {
            shippingDetail = await ShippingDetail.create(orderData.shippingData);
          }
          
          // Create or update order
          let order;
          
          if (existingOrder) {
            order = existingOrder;
            orderData.orderData.shippingDetailId = shippingDetail.id;
            await order.update(orderData.orderData);
            
            // Delete existing items
            await OrderItem.destroy({
              where: { orderId: order.id }
            });
          } else {
            orderData.orderData.shippingDetailId = shippingDetail.id;
            order = await Order.create(orderData.orderData);
          }
          
          // Create order items
          for (const item of orderData.items) {
            await OrderItem.create({
              orderId: order.id,
              ...item
            });
          }
          
          importedOrders.push(order);
        } catch (error) {
          logger.error(`Failed to import order ${orderId}: ${error.message}`, { error, orderId });
          failedOrders++;
        }
      }
      
      // Clean up temporary file
      fs.unlinkSync(filePath);
      
      return {
        success: true,
        message: `Successfully imported ${importedOrders.length} orders. Failed to import ${failedOrders} orders.`,
        data: {
          importedCount: importedOrders.length,
          failedCount: failedOrders,
          totalRowsProcessed: results.length
        }
      };
    } catch (error) {
      logger.error(`Failed to import orders from CSV: ${error.message}`, { error, connectionId: this.connectionId });
      
      return {
        success: false,
        message: `Failed to import orders from CSV: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Get value from row using column mapping
   * @param {Object} row - CSV row
   * @param {String} mapping - Column mapping
   * @returns {String} - Value from row
   */
  getValueFromMapping(row, mapping) {
    if (!mapping) return null;
    return row[mapping];
  }

  /**
   * Parse date value from string
   * @param {String} dateString - Date string
   * @returns {Date} - Parsed date
   */
  parseDate(dateString) {
    if (!dateString) return new Date();
    
    try {
      // Try to parse as ISO date
      const date = new Date(dateString);
      
      // Check if valid date
      if (isNaN(date.getTime())) {
        // If not valid, try different formats
        // Common formats: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
        const formats = [
          { regex: /^(\d{2})\/(\d{2})\/(\d{4})$/, fn: (m) => new Date(m[3], m[2] - 1, m[1]) }, // DD/MM/YYYY
          { regex: /^(\d{2})\/(\d{2})\/(\d{4})$/, fn: (m) => new Date(m[3], m[1] - 1, m[2]) }, // MM/DD/YYYY
          { regex: /^(\d{4})-(\d{2})-(\d{2})$/, fn: (m) => new Date(m[1], m[2] - 1, m[3]) }, // YYYY-MM-DD
        ];
        
        for (const format of formats) {
          const match = dateString.match(format.regex);
          if (match) {
            const parsedDate = format.fn(match);
            if (!isNaN(parsedDate.getTime())) {
              return parsedDate;
            }
          }
        }
        
        // If all parsing attempts fail, return current date
        logger.warn(`Failed to parse date: ${dateString}`);
        return new Date();
      }
      
      return date;
    } catch (error) {
      logger.warn(`Failed to parse date: ${dateString}`, { error });
      return new Date();
    }
  }

  /**
   * Get default column mappings
   * @returns {Object} - Default column mappings
   */
  getDefaultColumnMap() {
    return {
      // Order fields
      orderId: 'order_id',
      orderDate: 'order_date',
      orderStatus: 'status',
      totalAmount: 'total_amount',
      currency: 'currency',
      customerName: 'customer_name',
      customerEmail: 'customer_email',
      customerPhone: 'customer_phone',
      notes: 'notes',
      
      // Shipping fields
      recipientName: 'recipient_name',
      address: 'shipping_address',
      city: 'city',
      state: 'state',
      postalCode: 'postal_code',
      country: 'country',
      phone: 'phone',
      email: 'email',
      shippingMethod: 'shipping_method',
      
      // Product fields
      productId: 'product_id',
      sku: 'sku',
      barcode: 'barcode',
      productTitle: 'product_title',
      quantity: 'quantity',
      price: 'price',
      variantInfo: 'variant_info'
    };
  }

  /**
   * Get column mapping templates for different platforms
   * @returns {Object} - Column mapping templates
   */
  getColumnMappingTemplates() {
    return {
      generic: this.getDefaultColumnMap(),
      trendyol: {
        orderId: 'OrderNumber',
        orderDate: 'OrderDate',
        orderStatus: 'Status',
        totalAmount: 'TotalPrice',
        currency: 'Currency',
        customerName: 'CustomerFullName',
        customerEmail: 'CustomerEmail',
        customerPhone: 'ShipmentAddress.PhoneNumber',
        notes: 'Note',
        
        recipientName: 'ShipmentAddress.FullName',
        address: 'ShipmentAddress.Address',
        city: 'ShipmentAddress.City',
        state: 'ShipmentAddress.District',
        postalCode: 'ShipmentAddress.PostalCode',
        country: 'Country',
        phone: 'ShipmentAddress.PhoneNumber',
        
        productId: 'ProductId',
        sku: 'MerchantSku',
        barcode: 'Barcode',
        productTitle: 'ProductName',
        quantity: 'Quantity',
        price: 'Price',
        variantInfo: 'VariantFeatures'
      },
      hepsiburada: {
        orderId: 'OrderId',
        orderDate: 'OrderDate',
        orderStatus: 'Status',
        totalAmount: 'TotalPrice',
        currency: 'Currency',
        customerName: 'CustomerName',
        customerEmail: 'CustomerEmail',
        
        recipientName: 'ShippingAddress.FullName',
        address: 'ShippingAddress.Address',
        city: 'ShippingAddress.City',
        state: 'ShippingAddress.District',
        postalCode: 'ShippingAddress.PostalCode',
        phone: 'ShippingAddress.Phone',
        
        productId: 'ProductId',
        sku: 'MerchantSku',
        barcode: 'Barcode',
        productTitle: 'ProductName',
        quantity: 'Quantity',
        price: 'Price',
        variantInfo: 'Properties'
      },
      n11: {
        orderId: 'orderNumber',
        orderDate: 'orderDate',
        orderStatus: 'status',
        totalAmount: 'totalAmount',
        currency: 'currency',
        customerName: 'buyer.fullName',
        
        recipientName: 'shippingAddress.fullName',
        address: 'shippingAddress.address',
        city: 'shippingAddress.city',
        state: 'shippingAddress.district',
        postalCode: 'shippingAddress.postalCode',
        phone: 'shippingAddress.phoneNumber',
        
        productId: 'productId',
        sku: 'sellerSku',
        productTitle: 'productTitle',
        quantity: 'quantity',
        price: 'price'
      }
    };
  }

  /**
   * Validate uploaded CSV file
   * @param {Object} file - Uploaded file
   * @param {Object} options - Validation options
   * @returns {Object} - Validation result
   */
  async validateCSVFile(file, options = {}) {
    try {
      // Save file to upload directory for validation
      const timestamp = Date.now();
      const fileName = `${timestamp}_validation_${file.originalname}`;
      const filePath = path.join(this.uploadDir, fileName);
      
      // Create write stream and pipe file buffer to it
      await new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(filePath);
        writeStream.write(file.buffer);
        writeStream.end();
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      
      // Parse CSV file (just headers and a few rows for validation)
      const results = [];
      const maxRowsToValidate = options.maxRowsToValidate || 5;
      let rowCount = 0;
      
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv({
            skipLines: options.skipHeader ? 1 : 0,
            headers: options.hasHeaders,
            separator: options.delimiter || ',',
            trim: true
          }))
          .on('data', (data) => {
            if (rowCount < maxRowsToValidate) {
              results.push(data);
              rowCount++;
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });
      
      // Clean up temporary file
      fs.unlinkSync(filePath);
      
      // Get headers
      const headers = results.length > 0 ? Object.keys(results[0]) : [];
      
      // If no data, return error
      if (results.length === 0) {
        return {
          success: false,
          message: 'CSV file contains no data',
          data: {
            headers: [],
            sampleRows: []
          }
        };
      }
      
      // Check for required fields based on column mapping
      const columnMap = options.columnMap || this.getDefaultColumnMap();
      const requiredFields = ['orderId', 'productTitle', 'quantity'];
      const missingFields = [];
      
      for (const field of requiredFields) {
        const mappedColumn = columnMap[field];
        if (!mappedColumn || !headers.includes(mappedColumn)) {
          missingFields.push(field);
        }
      }
      
      return {
        success: missingFields.length === 0,
        message: missingFields.length === 0 
          ? 'CSV file is valid' 
          : `CSV file is missing required fields: ${missingFields.join(', ')}`,
        data: {
          headers,
          sampleRows: results,
          missingFields,
          rowCount
        }
      };
    } catch (error) {
      logger.error(`Failed to validate CSV file: ${error.message}`, { error });
      
      return {
        success: false,
        message: `Failed to validate CSV file: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Update order status (not supported for CSV platform)
   */
  async updateOrderStatus(orderId, newStatus) {
    // CSV platform does not support order status updates
    return {
      success: false,
      message: 'Order status updates are not supported for CSV platform',
    };
  }

  /**
   * Sync orders (not applicable for CSV platform)
   */
  async syncOrdersFromDate(startDate, endDate = new Date()) {
    return {
      success: false,
      message: 'Order sync is not supported for CSV platform. Please upload a new CSV file to import orders.',
    };
  }

  /**
   * Fetch orders (not applicable for CSV platform)
   */
  async fetchOrders(params = {}) {
    return {
      success: false,
      message: 'Fetching orders is not supported for CSV platform. Please upload a new CSV file to import orders.',
      data: []
    };
  }
}

module.exports = CSVImporterService;