// filepath: /Users/Username/Desktop/Soft/pazar+/services/order-management/src/database/migrations/20250520_migrate_to_generic_platform_models.js
/**
 * Migration script to convert platform-specific data models (TrendyolProduct, HepsiburadaProduct, etc.)
 * to the new generic platform data model approach.
 * 
 * This creates new platform-agnostic tables and migrates existing data.
 * 
 * @date May 20, 2025
 */

const logger = require('../../utils/logger');
const { sequelize } = require('../../config/database');
const { QueryTypes } = require('sequelize');

// Mapping for platform-specific tables to normalize to the generic approach
const PLATFORM_MAPPINGS = {
  'trendyol': {
    productTable: 'TrendyolProducts',
    orderTable: 'TrendyolOrders',
    entityIdFields: {
      product: 'productId',
      order: 'orderId'
    },
    externalIdFields: {
      product: 'externalProductId',
      order: 'orderNumber'
    }
  },
  'hepsiburada': {
    productTable: 'HepsiburadaProducts',
    orderTable: 'HepsiburadaOrders',
    entityIdFields: {
      product: 'productId',
      order: 'orderId'
    },
    externalIdFields: {
      product: 'externalProductId',
      order: 'orderNumber'
    }
  }
  // Add more platforms as needed
};

// Common indexed fields to extract for each entity type
const INDEXED_FIELD_MAPPINGS = {
  product: {
    status: ['status', 'salesStatus', 'approvalStatus'],
    approvalStatus: ['approved', 'approvalStatus'],
    platformPrice: ['platformListingPrice', 'platformPrice', 'listPrice', 'price'],
    platformQuantity: ['platformStockQuantity', 'quantity', 'stock'],
  },
  order: {
    status: ['platformStatus', 'status'],
  }
};

async function up() {
  const transaction = await sequelize.transaction();
  
  try {
    logger.info('Starting migration to generic platform models');
    
    // Check if new tables exist, create if they don't
    await createNewTablesIfNeeded(transaction);
    
    // For each platform, migrate products and orders
    for (const [platformType, mapping] of Object.entries(PLATFORM_MAPPINGS)) {
      logger.info(`Migrating ${platformType} data to generic models`);
      
      // Create schema records for validation
      await createPlatformSchemas(platformType, transaction);
      
      // Migrate products
      await migrateEntityData(
        platformType, 
        'product', 
        mapping.productTable, 
        mapping.entityIdFields.product,
        mapping.externalIdFields.product,
        transaction
      );
      
      // Migrate orders
      await migrateEntityData(
        platformType, 
        'order', 
        mapping.orderTable, 
        mapping.entityIdFields.order,
        mapping.externalIdFields.order,
        transaction
      );
    }
    
    logger.info('Migration to generic platform models completed successfully');
    await transaction.commit();
    
    return { success: true, message: 'Successfully migrated to generic platform models' };
  } catch (error) {
    logger.error(`Migration failed: ${error.message}`, { error });
    await transaction.rollback();
    
    return { success: false, message: `Migration failed: ${error.message}` };
  }
}

async function down() {
  // This migration is not designed to be reversible automatically
  // Data would need to be manually migrated back to platform-specific tables
  logger.warn('Down migration not supported for generic platform model migration');
  
  return { success: false, message: 'Down migration not supported for this migration' };
}

async function createNewTablesIfNeeded(transaction) {
  // Check if the new tables exist
  const tables = await sequelize.getQueryInterface().showAllTables();
  
  if (!tables.includes('platform_data')) {
    logger.info('Creating platform_data table');
    await sequelize.getQueryInterface().createTable('platform_data', {
      id: {
        type: sequelize.Sequelize.UUID,
        defaultValue: sequelize.Sequelize.UUIDV4,
        primaryKey: true
      },
      entityId: {
        type: sequelize.Sequelize.UUID,
        allowNull: false
      },
      entityType: {
        type: sequelize.Sequelize.STRING,
        allowNull: false
      },
      platformType: {
        type: sequelize.Sequelize.STRING,
        allowNull: false
      },
      platformEntityId: {
        type: sequelize.Sequelize.STRING,
        allowNull: true
      },
      data: {
        type: sequelize.Sequelize.JSON,
        allowNull: false
      },
      status: {
        type: sequelize.Sequelize.STRING,
        allowNull: true
      },
      approvalStatus: {
        type: sequelize.Sequelize.STRING,
        allowNull: true
      },
      platformPrice: {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      platformQuantity: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true
      },
      hasError: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      errorMessage: {
        type: sequelize.Sequelize.TEXT,
        allowNull: true
      },
      lastSyncedAt: {
        type: sequelize.Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        type: sequelize.Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: sequelize.Sequelize.DATE,
        allowNull: false
      }
    }, { transaction });
    
    // Add indexes
    await sequelize.getQueryInterface().addIndex('platform_data', ['entityId', 'entityType', 'platformType'], {
      unique: true,
      transaction
    });
    await sequelize.getQueryInterface().addIndex('platform_data', ['platformType', 'entityType'], { transaction });
    await sequelize.getQueryInterface().addIndex('platform_data', ['platformEntityId'], { transaction });
    await sequelize.getQueryInterface().addIndex('platform_data', ['status'], { transaction });
    await sequelize.getQueryInterface().addIndex('platform_data', ['approvalStatus'], { transaction });
    await sequelize.getQueryInterface().addIndex('platform_data', ['hasError'], { transaction });
    await sequelize.getQueryInterface().addIndex('platform_data', ['lastSyncedAt'], { transaction });
  }
  
  if (!tables.includes('platform_attributes')) {
    logger.info('Creating platform_attributes table');
    await sequelize.getQueryInterface().createTable('platform_attributes', {
      id: {
        type: sequelize.Sequelize.UUID,
        defaultValue: sequelize.Sequelize.UUIDV4,
        primaryKey: true
      },
      entityId: {
        type: sequelize.Sequelize.UUID,
        allowNull: false
      },
      entityType: {
        type: sequelize.Sequelize.STRING,
        allowNull: false
      },
      platformType: {
        type: sequelize.Sequelize.STRING,
        allowNull: false
      },
      attributeKey: {
        type: sequelize.Sequelize.STRING,
        allowNull: false
      },
      stringValue: {
        type: sequelize.Sequelize.STRING,
        allowNull: true
      },
      numericValue: {
        type: sequelize.Sequelize.DECIMAL(15, 6),
        allowNull: true
      },
      booleanValue: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: true
      },
      dateValue: {
        type: sequelize.Sequelize.DATE,
        allowNull: true
      },
      valueType: {
        type: sequelize.Sequelize.STRING,
        allowNull: false
      },
      createdAt: {
        type: sequelize.Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: sequelize.Sequelize.DATE,
        allowNull: false
      }
    }, { transaction });
    
    // Add indexes
    await sequelize.getQueryInterface().addIndex('platform_attributes', ['entityId', 'entityType'], { transaction });
    await sequelize.getQueryInterface().addIndex('platform_attributes', ['platformType'], { transaction });
    await sequelize.getQueryInterface().addIndex('platform_attributes', ['attributeKey'], { transaction });
    await sequelize.getQueryInterface().addIndex('platform_attributes', ['stringValue'], { transaction });
    await sequelize.getQueryInterface().addIndex('platform_attributes', ['numericValue'], { transaction });
    await sequelize.getQueryInterface().addIndex('platform_attributes', ['booleanValue'], { transaction });
    await sequelize.getQueryInterface().addIndex('platform_attributes', ['dateValue'], { transaction });
  }
  
  if (!tables.includes('platform_schemas')) {
    logger.info('Creating platform_schemas table');
    await sequelize.getQueryInterface().createTable('platform_schemas', {
      id: {
        type: sequelize.Sequelize.UUID,
        defaultValue: sequelize.Sequelize.UUIDV4,
        primaryKey: true
      },
      platformType: {
        type: sequelize.Sequelize.STRING,
        allowNull: false
      },
      entityType: {
        type: sequelize.Sequelize.STRING,
        allowNull: false
      },
      version: {
        type: sequelize.Sequelize.STRING,
        allowNull: false,
        defaultValue: '1.0.0'
      },
      schema: {
        type: sequelize.Sequelize.JSON,
        allowNull: false
      },
      mappings: {
        type: sequelize.Sequelize.JSON,
        allowNull: true
      },
      transformations: {
        type: sequelize.Sequelize.JSON,
        allowNull: true
      },
      isActive: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      description: {
        type: sequelize.Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: sequelize.Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: sequelize.Sequelize.DATE,
        allowNull: false
      }
    }, { transaction });
    
    // Add indexes
    await sequelize.getQueryInterface().addIndex('platform_schemas', ['platformType', 'entityType', 'version'], {
      unique: true,
      transaction
    });
    await sequelize.getQueryInterface().addIndex('platform_schemas', ['isActive'], { transaction });
  }
}

async function createPlatformSchemas(platformType, transaction) {
  // Create schema for product
  await sequelize.models.PlatformSchema.create({
    platformType,
    entityType: 'product',
    version: '1.0.0',
    schema: getPlatformSchema(platformType, 'product'),
    mappings: getPlatformMapping(platformType, 'product'),
    transformations: null,
    isActive: true,
    description: `Schema for ${platformType} products`
  }, { transaction });
  
  // Create schema for order
  await sequelize.models.PlatformSchema.create({
    platformType,
    entityType: 'order',
    version: '1.0.0',
    schema: getPlatformSchema(platformType, 'order'),
    mappings: getPlatformMapping(platformType, 'order'),
    transformations: null,
    isActive: true,
    description: `Schema for ${platformType} orders`
  }, { transaction });
}

function getPlatformSchema(platformType, entityType) {
  // This would contain JSON schema definitions for each platform and entity
  // For simplicity, we'll return a basic schema here
  return {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' }
    }
  };
}

function getPlatformMapping(platformType, entityType) {
  // This would define mappings between platform fields and our internal fields
  // For simplicity, we'll return a basic mapping here
  return {
    id: 'id',
    name: 'name'
  };
}

async function migrateEntityData(platformType, entityType, sourceTable, entityIdField, externalIdField, transaction) {
  // Fetch data from the source table
  const sourceData = await sequelize.query(
    `SELECT * FROM "${sourceTable}"`,
    { 
      type: QueryTypes.SELECT,
      transaction
    }
  );
  
  logger.info(`Migrating ${sourceData.length} ${entityType}s from ${platformType}`);
  
  // Process and insert each record
  for (const item of sourceData) {
    try {
      // Extract indexed fields
      const indexedFields = extractIndexedFields(item, entityType);
      
      // Create platform data record
      await sequelize.models.PlatformData.create({
        entityId: item[entityIdField],
        entityType,
        platformType,
        platformEntityId: item[externalIdField],
        data: item,
        ...indexedFields,
        lastSyncedAt: item.lastSyncedAt || item.updatedAt || new Date(),
        hasError: item.hasError || false,
        errorMessage: item.errorMessage || null
      }, { transaction });
      
      // Extract searchable attributes for efficient querying
      await createSearchableAttributes(
        item, 
        item[entityIdField], 
        entityType, 
        platformType, 
        transaction
      );
    } catch (error) {
      logger.error(`Error migrating ${entityType} with ID ${item[entityIdField]}: ${error.message}`, { error });
      // Continue with next item instead of failing the entire migration
    }
  }
}

function extractIndexedFields(item, entityType) {
  const result = {};
  
  // Map fields according to our field mappings
  const mappings = INDEXED_FIELD_MAPPINGS[entityType];
  
  for (const [targetField, sourceFields] of Object.entries(mappings)) {
    // Try each possible source field in order until we find one that exists
    for (const sourceField of sourceFields) {
      if (item[sourceField] !== undefined) {
        result[targetField] = item[sourceField];
        break;
      }
    }
  }
  
  return result;
}

async function createSearchableAttributes(item, entityId, entityType, platformType, transaction) {
  // Identify important attributes that should be searchable
  // This is a simplified example - in a real implementation, you would
  // have specific logic for each platform and entity type
  const searchableAttrs = [];
  
  // For products
  if (entityType === 'product') {
    if (item.barcode) {
      searchableAttrs.push({
        key: 'barcode',
        value: item.barcode,
        type: 'string'
      });
    }
    
    if (item.stockCode || item.sku) {
      searchableAttrs.push({
        key: 'stockCode',
        value: item.stockCode || item.sku,
        type: 'string'
      });
    }
    
    if (item.categoryId) {
      searchableAttrs.push({
        key: 'categoryId',
        value: item.categoryId,
        type: typeof item.categoryId === 'number' ? 'number' : 'string'
      });
    }
  }
  
  // For orders
  if (entityType === 'order') {
    if (item.cargoTrackingNumber) {
      searchableAttrs.push({
        key: 'trackingNumber',
        value: item.cargoTrackingNumber,
        type: 'string'
      });
    }
    
    if (item.customerPhone) {
      searchableAttrs.push({
        key: 'customerPhone',
        value: item.customerPhone,
        type: 'string'
      });
    }
  }
  
  // Insert searchable attributes
  for (const attr of searchableAttrs) {
    await sequelize.models.PlatformAttribute.create({
      entityId,
      entityType,
      platformType,
      attributeKey: attr.key,
      stringValue: attr.type === 'string' ? attr.value : null,
      numericValue: attr.type === 'number' ? attr.value : null,
      booleanValue: attr.type === 'boolean' ? attr.value : null,
      dateValue: attr.type === 'date' ? attr.value : null,
      valueType: attr.type
    }, { transaction });
  }
}

module.exports = {
  up,
  down
};