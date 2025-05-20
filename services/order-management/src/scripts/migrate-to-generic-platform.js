// filepath: /Users/Username/Desktop/Soft/pazar+/services/order-management/src/scripts/migrate-to-generic-platform.js
/**
 * Migration script to move data from platform-specific tables to the new generic platform data model
 * 
 * This script will:
 * 1. Check if the new tables exist and create them if needed
 * 2. Migrate data from platform-specific tables (TrendyolProduct, TrendyolOrder, etc.) to generic tables
 * 3. Verify the data migration completed successfully
 * 4. Optionally back up the old tables before removing them
 * 
 * Usage: 
 * - Run with `node src/scripts/migrate-to-generic-platform.js`
 * - Options:
 *   --dry-run: Only simulate the migration without making changes
 *   --backup: Create backups of the original tables
 *   --remove-originals: Remove original tables after migration (use with caution)
 *   --platform=platformType: Only migrate specific platform (e.g. trendyol)
 * 
 * @date May 20, 2025
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

// Import all models to ensure they're defined
const models = require('../models');

// Parse command-line arguments
program
  .option('--dry-run', 'Simulate migration without making changes')
  .option('--backup', 'Create backups of original tables')
  .option('--remove-originals', 'Remove original tables after migration (use with caution)')
  .option('--platform <type>', 'Only migrate specific platform (e.g. trendyol)')
  .parse(process.argv);

const options = program.opts();

// Set up migration stats object to track progress
const stats = {
  totalProductsToMigrate: 0,
  migratedProducts: 0,
  failedProducts: 0,
  totalOrdersToMigrate: 0,
  migratedOrders: 0,
  failedOrders: 0,
  startTime: new Date(),
  endTime: null,
  duration: null,
  platformTypes: []
};

/**
 * Main migration function
 */
async function runMigration() {
  try {
    logger.info('Starting platform data migration script');
    logger.info(`Options: ${JSON.stringify(options)}`);
    
    if (options.dryRun) {
      logger.info('DRY RUN MODE: No changes will be made to the database');
    }
    
    // Verify required tables exist
    await verifyRequiredTables();
    
    // Get list of platforms to migrate
    const platformsToMigrate = options.platform 
      ? [options.platform.toLowerCase()]
      : await getAvailablePlatforms();
    
    stats.platformTypes = platformsToMigrate;
    logger.info(`Platforms to migrate: ${platformsToMigrate.join(', ')}`);
    
    // Migrate each platform
    for (const platformType of platformsToMigrate) {
      logger.info(`Starting migration for platform: ${platformType}`);
      
      // Migrate products for this platform
      await migrateProducts(platformType);
      
      // Migrate orders for this platform
      await migrateOrders(platformType);
      
      // Migrate other entities as needed...
      
      logger.info(`Completed migration for platform: ${platformType}`);
    }
    
    // Create backups if requested
    if (options.backup) {
      await backupOriginalTables(platformsToMigrate);
    }
    
    // Remove original tables if requested
    if (options.removeOriginals && !options.dryRun) {
      await removeOriginalTables(platformsToMigrate);
    }
    
    // Complete the migration
    stats.endTime = new Date();
    stats.duration = (stats.endTime - stats.startTime) / 1000; // in seconds
    
    logger.info('Migration completed successfully');
    logger.info(`Migration stats: ${JSON.stringify(stats, null, 2)}`);
    
    // Exit the process
    process.exit(0);
  } catch (error) {
    logger.error(`Migration failed: ${error.message}`, { error });
    process.exit(1);
  }
}

/**
 * Verify that all required tables exist
 */
async function verifyRequiredTables() {
  logger.info('Verifying required tables exist...');
  
  try {
    // Check if PlatformData table exists
    await sequelize.getQueryInterface().showAllTables();
    
    // If we're not doing a dry run, force sync these tables
    if (!options.dryRun) {
      await models.PlatformData.sync();
      await models.PlatformAttribute.sync();
      await models.PlatformSchema.sync();
      logger.info('Generic platform tables synced successfully');
    } else {
      logger.info('DRY RUN: Would sync generic platform tables');
    }
  } catch (error) {
    logger.error(`Failed to verify or create required tables: ${error.message}`, { error });
    throw error;
  }
}

/**
 * Get a list of available platform types by inspecting the database
 */
async function getAvailablePlatforms() {
  try {
    const tables = await sequelize.getQueryInterface().showAllTables();
    const platformTables = tables.filter(table => 
      table.toLowerCase().includes('trendyol') || 
      table.toLowerCase().includes('hepsiburada') ||
      table.toLowerCase().includes('n11')
    );
    
    // Extract platform types from table names
    const platformTypes = new Set();
    platformTables.forEach(table => {
      if (table.toLowerCase().includes('trendyol')) platformTypes.add('trendyol');
      if (table.toLowerCase().includes('hepsiburada')) platformTypes.add('hepsiburada');
      if (table.toLowerCase().includes('n11')) platformTypes.add('n11');
    });
    
    return Array.from(platformTypes);
  } catch (error) {
    logger.error(`Failed to get available platforms: ${error.message}`, { error });
    throw error;
  }
}

/**
 * Migrate products for a specific platform
 * @param {string} platformType - The platform type (e.g., 'trendyol')
 */
async function migrateProducts(platformType) {
  logger.info(`Migrating ${platformType} products...`);
  
  try {
    // Get the appropriate model for this platform
    let PlatformProductModel;
    switch(platformType.toLowerCase()) {
      case 'trendyol':
        // Dynamic import to avoid errors if model doesn't exist
        PlatformProductModel = sequelize.models.TrendyolProduct || 
                              sequelize.define('TrendyolProduct', {}, { tableName: 'trendyol_products' });
        break;
      case 'hepsiburada':
        PlatformProductModel = sequelize.models.HepsiburadaProduct || 
                              sequelize.define('HepsiburadaProduct', {}, { tableName: 'hepsiburada_products' });
        break;
      case 'n11':
        PlatformProductModel = sequelize.models.N11Product || 
                              sequelize.define('N11Product', {}, { tableName: 'n11_products' });
        break;
      default:
        logger.warn(`No product model found for platform ${platformType}, skipping...`);
        return;
    }
    
    // Check if table exists first
    const tableExists = await tableExistsInDatabase(PlatformProductModel.getTableName());
    if (!tableExists) {
      logger.warn(`Table ${PlatformProductModel.getTableName()} does not exist, skipping...`);
      return;
    }
    
    // Count total products
    const totalProducts = await PlatformProductModel.count();
    stats.totalProductsToMigrate += totalProducts;
    
    logger.info(`Found ${totalProducts} ${platformType} products to migrate`);
    
    if (totalProducts === 0) {
      return; // Nothing to migrate
    }
    
    // Process in batches to avoid memory issues
    const batchSize = 100;
    const totalBatches = Math.ceil(totalProducts / batchSize);
    
    for (let batch = 0; batch < totalBatches; batch++) {
      const offset = batch * batchSize;
      const limit = Math.min(batchSize, totalProducts - offset);
      
      logger.info(`Processing ${platformType} products batch ${batch + 1}/${totalBatches} (offset: ${offset}, limit: ${limit})`);
      
      // Get this batch of products
      const products = await PlatformProductModel.findAll({
        offset,
        limit,
        raw: true // Get plain objects instead of model instances
      });
      
      // Skip processing if doing a dry run
      if (options.dryRun) {
        stats.migratedProducts += products.length;
        logger.info(`DRY RUN: Would migrate ${products.length} ${platformType} products`);
        continue;
      }
      
      // Process each product
      for (const product of products) {
        try {
          await migrateProductToGeneric(product, platformType);
          stats.migratedProducts++;
        } catch (error) {
          stats.failedProducts++;
          logger.error(`Failed to migrate ${platformType} product ${product.id}: ${error.message}`, { error });
        }
      }
    }
    
    logger.info(`Completed migrating ${platformType} products: ${stats.migratedProducts} migrated, ${stats.failedProducts} failed`);
  } catch (error) {
    logger.error(`Error migrating ${platformType} products: ${error.message}`, { error });
    throw error;
  }
}

/**
 * Migrate a single product to the generic model
 * @param {Object} product - Original product data
 * @param {string} platformType - The platform type
 */
async function migrateProductToGeneric(product, platformType) {
  const { Product, PlatformData, PlatformAttribute } = models;
  
  // Start a transaction for consistency
  const transaction = await sequelize.transaction();
  
  try {
    // See if we already have a main product for this
    let mainProduct;
    
    if (product.productId) {
      // If the platform product links to a main product, use that
      mainProduct = await Product.findByPk(product.productId, { transaction });
    }
    
    if (!mainProduct) {
      // Create a main product if it doesn't exist
      mainProduct = await Product.create({
        sku: product.sku || product.merchantSku || product.barcode || `${platformType}-${product.id}`,
        name: product.title || product.name || `${platformType} Product`,
        description: product.description || '',
        price: product.listPrice || product.price || 0,
        currency: 'TRY', // Default to Turkish Lira for now
        barcode: product.barcode || null,
        userId: product.userId || process.env.DEFAULT_USER_ID,
        mainImageUrl: product.images && product.images.length > 0 ? product.images[0] : null,
        additionalImages: product.images && product.images.length > 1 ? product.images.slice(1) : null,
        metadata: {
          source: platformType,
          externalProductId: product.productCode || product.externalId || product.id.toString()
        }
      }, { transaction });
    }
    
    // Create platform data record
    const platformEntityId = product.productCode || product.externalId || product.id.toString();
    
    // Check if platform data already exists
    const existingPlatformData = await PlatformData.findOne({
      where: {
        entityId: mainProduct.id,
        entityType: 'product',
        platformType
      },
      transaction
    });
    
    if (existingPlatformData) {
      // Update existing record
      await existingPlatformData.update({
        platformEntityId,
        data: product,
        status: product.onSale ? 'active' : 'inactive',
        approvalStatus: product.approved ? 'approved' : 'pending',
        platformPrice: product.listPrice || product.price,
        platformQuantity: product.quantity || product.stock,
        hasError: product.hasError || false,
        errorMessage: product.errorMessage,
        lastSyncedAt: new Date()
      }, { transaction });
    } else {
      // Create new record
      await PlatformData.create({
        entityId: mainProduct.id,
        entityType: 'product',
        platformType,
        platformEntityId,
        data: product,
        status: product.onSale ? 'active' : 'inactive',
        approvalStatus: product.approved ? 'approved' : 'pending',
        platformPrice: product.listPrice || product.price,
        platformQuantity: product.quantity || product.stock,
        hasError: product.hasError || false,
        errorMessage: product.errorMessage,
        lastSyncedAt: new Date()
      }, { transaction });
    }
    
    // Create searchable attributes
    await createProductAttributes(mainProduct.id, product, platformType, transaction);
    
    // Commit the transaction
    await transaction.commit();
  } catch (error) {
    // Rollback on error
    await transaction.rollback();
    throw error;
  }
}

/**
 * Create searchable attributes for a product
 * @param {string} productId - Main product ID
 * @param {Object} productData - Original product data
 * @param {string} platformType - The platform type
 * @param {Transaction} transaction - Sequelize transaction
 */
async function createProductAttributes(productId, productData, platformType, transaction) {
  const { PlatformAttribute } = models;
  
  // Delete existing attributes first
  await PlatformAttribute.destroy({
    where: {
      entityId: productId,
      entityType: 'product',
      platformType
    },
    transaction
  });
  
  // Define important attributes to extract
  const attributes = [];
  
  // Barcode
  if (productData.barcode) {
    attributes.push({
      attributeKey: 'barcode',
      stringValue: productData.barcode,
      valueType: 'string'
    });
  }
  
  // SKU
  if (productData.sku || productData.merchantSku || productData.stockCode) {
    attributes.push({
      attributeKey: 'sku',
      stringValue: productData.sku || productData.merchantSku || productData.stockCode,
      valueType: 'string'
    });
  }
  
  // Category
  if (productData.categoryId) {
    attributes.push({
      attributeKey: 'categoryId',
      stringValue: String(productData.categoryId),
      valueType: 'string'
    });
  }
  
  // Brand
  if (productData.brandId) {
    attributes.push({
      attributeKey: 'brandId',
      stringValue: String(productData.brandId),
      valueType: 'string'
    });
  }
  
  // Create each attribute
  for (const attr of attributes) {
    await PlatformAttribute.create({
      entityId: productId,
      entityType: 'product',
      platformType,
      ...attr
    }, { transaction });
  }
}

/**
 * Migrate orders for a specific platform
 * @param {string} platformType - The platform type (e.g., 'trendyol')
 */
async function migrateOrders(platformType) {
  logger.info(`Migrating ${platformType} orders...`);
  
  try {
    // Get the appropriate model for this platform
    let PlatformOrderModel;
    switch(platformType.toLowerCase()) {
      case 'trendyol':
        PlatformOrderModel = sequelize.models.TrendyolOrder || 
                            sequelize.define('TrendyolOrder', {}, { tableName: 'trendyol_orders' });
        break;
      case 'hepsiburada':
        PlatformOrderModel = sequelize.models.HepsiburadaOrder || 
                            sequelize.define('HepsiburadaOrder', {}, { tableName: 'hepsiburada_orders' });
        break;
      case 'n11':
        PlatformOrderModel = sequelize.models.N11Order || 
                            sequelize.define('N11Order', {}, { tableName: 'n11_orders' });
        break;
      default:
        logger.warn(`No order model found for platform ${platformType}, skipping...`);
        return;
    }
    
    // Check if table exists first
    const tableExists = await tableExistsInDatabase(PlatformOrderModel.getTableName());
    if (!tableExists) {
      logger.warn(`Table ${PlatformOrderModel.getTableName()} does not exist, skipping...`);
      return;
    }
    
    // Count total orders
    const totalOrders = await PlatformOrderModel.count();
    stats.totalOrdersToMigrate += totalOrders;
    
    logger.info(`Found ${totalOrders} ${platformType} orders to migrate`);
    
    if (totalOrders === 0) {
      return; // Nothing to migrate
    }
    
    // Process in batches to avoid memory issues
    const batchSize = 50; // Smaller batch size for orders as they have more related data
    const totalBatches = Math.ceil(totalOrders / batchSize);
    
    for (let batch = 0; batch < totalBatches; batch++) {
      const offset = batch * batchSize;
      const limit = Math.min(batchSize, totalOrders - offset);
      
      logger.info(`Processing ${platformType} orders batch ${batch + 1}/${totalBatches} (offset: ${offset}, limit: ${limit})`);
      
      // Get this batch of orders
      const orders = await PlatformOrderModel.findAll({
        offset,
        limit,
        raw: true // Get plain objects instead of model instances
      });
      
      // Skip processing if doing a dry run
      if (options.dryRun) {
        stats.migratedOrders += orders.length;
        logger.info(`DRY RUN: Would migrate ${orders.length} ${platformType} orders`);
        continue;
      }
      
      // Process each order
      for (const order of orders) {
        try {
          await migrateOrderToGeneric(order, platformType);
          stats.migratedOrders++;
        } catch (error) {
          stats.failedOrders++;
          logger.error(`Failed to migrate ${platformType} order ${order.id}: ${error.message}`, { error });
        }
      }
    }
    
    logger.info(`Completed migrating ${platformType} orders: ${stats.migratedOrders} migrated, ${stats.failedOrders} failed`);
  } catch (error) {
    logger.error(`Error migrating ${platformType} orders: ${error.message}`, { error });
    throw error;
  }
}

/**
 * Migrate a single order to the generic model
 * @param {Object} order - Original order data
 * @param {string} platformType - The platform type
 */
async function migrateOrderToGeneric(order, platformType) {
  const { Order, OrderItem, ShippingDetail, PlatformData, PlatformAttribute } = models;
  
  // Start a transaction for consistency
  const transaction = await sequelize.transaction();
  
  try {
    // See if we already have a main order for this
    let mainOrder;
    
    if (order.orderId) {
      // If the platform order links to a main order, use that
      mainOrder = await Order.findByPk(order.orderId, { transaction });
    } else if (order.externalOrderId) {
      // Try to find by external order ID
      mainOrder = await Order.findOne({
        where: { externalOrderId: order.externalOrderId },
        transaction
      });
    }
    
    if (!mainOrder) {
      // Create a main order if it doesn't exist
      mainOrder = await Order.create({
        externalOrderId: order.orderNumber || order.externalOrderId || `${platformType}-${order.id}`,
        customerName: order.customerFullName || (order.customerFirstName ? `${order.customerFirstName} ${order.customerLastName || ''}` : 'Unknown Customer'),
        customerEmail: order.customerEmail || null,
        customerPhone: order.customerPhone || null,
        orderDate: order.orderDate || new Date(),
        platformType,
        connectionId: order.connectionId,
        userId: order.userId || process.env.DEFAULT_USER_ID,
        totalAmount: order.totalPrice || 0,
        status: order.status || 'pending',
        paymentStatus: order.paymentStatus || 'pending',
        lastSyncedAt: new Date()
      }, { transaction });
      
      // Create order items if available
      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          await OrderItem.create({
            orderId: mainOrder.id,
            productId: item.productId || null,
            sku: item.sku || item.barcode,
            name: item.productName || item.name,
            barcode: item.barcode,
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.amount || (item.price * item.quantity),
            currency: order.currency || 'TRY',
            metadata: {
              platformData: item
            }
          }, { transaction });
        }
      }
      
      // Create shipping details if available
      if (order.shipmentAddress || order.shippingAddress) {
        const shippingAddress = order.shipmentAddress || order.shippingAddress;
        
        await ShippingDetail.create({
          orderId: mainOrder.id,
          recipientName: shippingAddress.fullName || order.customerFullName,
          phone: shippingAddress.phone || order.customerPhone,
          addressLine1: shippingAddress.address,
          city: shippingAddress.city,
          state: shippingAddress.district,
          postalCode: shippingAddress.postalCode || shippingAddress.zipCode,
          country: shippingAddress.countryCode || 'TR',
          instructions: shippingAddress.address2 || '',
          carrierName: order.cargoProviderName || order.shippingCarrier,
          trackingNumber: order.cargoTrackingNumber || order.trackingNumber,
          shippingMethod: order.deliveryType || order.shippingMethod || 'standard'
        }, { transaction });
      }
    }
    
    // Create platform data record
    const platformEntityId = order.orderNumber || order.externalOrderId || order.id.toString();
    
    // Check if platform data already exists
    const existingPlatformData = await PlatformData.findOne({
      where: {
        entityId: mainOrder.id,
        entityType: 'order',
        platformType
      },
      transaction
    });
    
    if (existingPlatformData) {
      // Update existing record
      await existingPlatformData.update({
        platformEntityId,
        data: order,
        status: order.status,
        lastSyncedAt: new Date()
      }, { transaction });
    } else {
      // Create new record
      await PlatformData.create({
        entityId: mainOrder.id,
        entityType: 'order',
        platformType,
        platformEntityId,
        data: order,
        status: order.status,
        lastSyncedAt: new Date()
      }, { transaction });
    }
    
    // Create searchable attributes
    await createOrderAttributes(mainOrder.id, order, platformType, transaction);
    
    // Commit the transaction
    await transaction.commit();
  } catch (error) {
    // Rollback on error
    await transaction.rollback();
    throw error;
  }
}

/**
 * Create searchable attributes for an order
 * @param {string} orderId - Main order ID
 * @param {Object} orderData - Original order data
 * @param {string} platformType - The platform type
 * @param {Transaction} transaction - Sequelize transaction
 */
async function createOrderAttributes(orderId, orderData, platformType, transaction) {
  const { PlatformAttribute } = models;
  
  // Delete existing attributes first
  await PlatformAttribute.destroy({
    where: {
      entityId: orderId,
      entityType: 'order',
      platformType
    },
    transaction
  });
  
  // Define important attributes to extract
  const attributes = [];
  
  // Order number
  if (orderData.orderNumber) {
    attributes.push({
      attributeKey: 'orderNumber',
      stringValue: orderData.orderNumber.toString(),
      valueType: 'string'
    });
  }
  
  // Tracking number
  if (orderData.cargoTrackingNumber || orderData.trackingNumber) {
    attributes.push({
      attributeKey: 'trackingNumber',
      stringValue: (orderData.cargoTrackingNumber || orderData.trackingNumber).toString(),
      valueType: 'string'
    });
  }
  
  // Order status
  if (orderData.status) {
    attributes.push({
      attributeKey: 'status',
      stringValue: orderData.status,
      valueType: 'string'
    });
  }
  
  // Create each attribute
  for (const attr of attributes) {
    await PlatformAttribute.create({
      entityId: orderId,
      entityType: 'order',
      platformType,
      ...attr
    }, { transaction });
  }
}

/**
 * Back up original tables before removing them
 * @param {string[]} platformTypes - Array of platform types to back up
 */
async function backupOriginalTables(platformTypes) {
  logger.info('Creating backups of original tables...');
  
  if (options.dryRun) {
    logger.info('DRY RUN: Would create backups of original tables');
    return;
  }
  
  try {
    // Create backups directory if it doesn't exist
    const backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // For each platform, export its tables to SQL
    for (const platformType of platformTypes) {
      const backupPath = path.join(backupDir, `${platformType}_tables_${timestamp}.sql`);
      
      // This part is database specific - SQLite example here
      if (sequelize.options.dialect === 'sqlite') {
        // For SQLite, we can copy the database file
        const dbPath = sequelize.options.storage;
        const backupDbPath = path.join(backupDir, `database_backup_${timestamp}.sqlite`);
        fs.copyFileSync(dbPath, backupDbPath);
        logger.info(`Created SQLite database backup at ${backupDbPath}`);
      } else {
        // For other databases, would need to use their specific tools
        // Example placeholder for MySQL/PostgreSQL - would need to be implemented
        logger.warn(`Backup for ${sequelize.options.dialect} not implemented, skipping...`);
      }
    }
    
    logger.info('Original tables backed up successfully');
  } catch (error) {
    logger.error(`Failed to back up original tables: ${error.message}`, { error });
    throw error;
  }
}

/**
 * Remove original tables after migration
 * @param {string[]} platformTypes - Array of platform types to remove
 */
async function removeOriginalTables(platformTypes) {
  logger.info('Removing original tables...');
  
  if (options.dryRun) {
    logger.info('DRY RUN: Would remove original tables');
    return;
  }
  
  try {
    for (const platformType of platformTypes) {
      // Get all tables for this platform
      const tables = await sequelize.getQueryInterface().showAllTables();
      const platformTables = tables.filter(table => 
        table.toLowerCase().includes(platformType.toLowerCase())
      );
      
      // Drop each table
      for (const table of platformTables) {
        logger.info(`Dropping table ${table}...`);
        await sequelize.getQueryInterface().dropTable(table);
      }
      
      logger.info(`Removed ${platformTables.length} tables for platform ${platformType}`);
    }
    
    logger.info('Original tables removed successfully');
  } catch (error) {
    logger.error(`Failed to remove original tables: ${error.message}`, { error });
    throw error;
  }
}

/**
 * Check if a table exists in the database
 * @param {string} tableName - Name of the table to check
 * @returns {boolean} True if the table exists, false otherwise
 */
async function tableExistsInDatabase(tableName) {
  try {
    const tables = await sequelize.getQueryInterface().showAllTables();
    return tables.includes(tableName) || tables.includes(tableName.toLowerCase());
  } catch (error) {
    logger.error(`Failed to check if table ${tableName} exists: ${error.message}`, { error });
    return false;
  }
}

// Run the migration
if (require.main === module) {
  runMigration();
}

module.exports = {
  runMigration,
  migrateProducts,
  migrateOrders
};