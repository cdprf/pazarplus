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
const path = require('path');
const fs = require('fs');
const { DataTypes } = require('sequelize');

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
  try {
    logger.info('Starting migration to generic platform models');
    
    // For SQLite, we need to handle table modification differently
    const queryInterface = sequelize.getQueryInterface();
    
    // Check if backup table exists and drop it if it does
    try {
      await sequelize.query('DROP TABLE IF EXISTS PlatformConnections_backup;');
    } catch (error) {
      logger.info('No backup table to drop');
    }
    
    // Create backup of existing table
    await sequelize.query('CREATE TABLE PlatformConnections_backup AS SELECT * FROM PlatformConnections;');
    
    // Drop the existing table
    await queryInterface.dropTable('PlatformConnections');
    
    // Create new table with all columns including templateId
    await queryInterface.createTable('PlatformConnections', {
      id: {
        type: sequelize.Sequelize.UUID,
        primaryKey: true
      },
      userId: {
        type: sequelize.Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      platformType: {
        type: sequelize.Sequelize.STRING,
        allowNull: false
      },
      platformName: {
        type: sequelize.Sequelize.STRING,
        allowNull: false
      },
      name: {
        type: sequelize.Sequelize.STRING,
        allowNull: false
      },
      credentials: {
        type: sequelize.Sequelize.JSON,
        allowNull: false
      },
      status: {
        type: sequelize.Sequelize.STRING,
        defaultValue: 'pending'
      },
      settings: {
        type: sequelize.Sequelize.JSON
      },
      isActive: {
        type: sequelize.Sequelize.BOOLEAN,
        defaultValue: true
      },
      lastSyncAt: {
        type: sequelize.Sequelize.DATE
      },
      syncStatus: {
        type: sequelize.Sequelize.STRING
      },
      templateId: {
        type: sequelize.Sequelize.UUID,
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
    });

    // Copy data from backup table with explicit column names
    await sequelize.query(`
      INSERT INTO PlatformConnections (
        id, userId, platformType, platformName, name, credentials, 
        status, settings, isActive, lastSyncAt, syncStatus,
        createdAt, updatedAt, templateId
      )
      SELECT 
        id, userId, platformType, platformName, name, credentials,
        status, settings, isActive, lastSyncAt, syncStatus,
        createdAt, updatedAt, NULL as templateId
      FROM PlatformConnections_backup
    `);

    // Drop the backup table
    await sequelize.query('DROP TABLE PlatformConnections_backup;');

    // Create all necessary indexes
    await queryInterface.addIndex('PlatformConnections', ['userId'], {
      name: 'platform_connections_user_id'
    });
    await queryInterface.addIndex('PlatformConnections', ['platformType'], {
      name: 'platform_connections_platform_type'
    });
    await queryInterface.addIndex('PlatformConnections', ['status'], {
      name: 'platform_connections_status'
    });
    await queryInterface.addIndex('PlatformConnections', ['isActive'], {
      name: 'platform_connections_is_active'
    });
    await queryInterface.addIndex('PlatformConnections', ['lastSyncAt'], {
      name: 'platform_connections_last_sync_at'
    });
    await queryInterface.addIndex('PlatformConnections', ['templateId'], {
      name: 'platform_connections_template_id'
    });

    const transaction = await sequelize.transaction();
    try {
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
      
      // Create index on templateId
      try {
        await sequelize.getQueryInterface().addIndex('PlatformConnections', ['templateId'], {
          name: 'platform_connections_template_id',
          transaction
        });
      } catch (error) {
        // Index might already exist, which is fine
        logger.info('templateId index may already exist:', error.message);
      }
      
      logger.info('Migration to generic platform models completed successfully');
      await transaction.commit();
      
      return { success: true, message: 'Successfully migrated to generic platform models' };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    logger.error(`Migration failed: ${error.message}`, { error });
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
      },
      deletedAt: {
        type: sequelize.Sequelize.DATE,
        allowNull: true
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
    await sequelize.getQueryInterface().addIndex('platform_data', ['deletedAt'], { transaction });
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
      },
      deletedAt: {
        type: sequelize.Sequelize.DATE,
        allowNull: true
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
    await sequelize.getQueryInterface().addIndex('platform_attributes', ['deletedAt'], { transaction });
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
      },
      deletedAt: {
        type: sequelize.Sequelize.DATE,
        allowNull: true
      }
    }, { transaction });
    
    // Add indexes
    await sequelize.getQueryInterface().addIndex('platform_schemas', ['platformType', 'entityType', 'version'], {
      unique: true,
      transaction
    });
    await sequelize.getQueryInterface().addIndex('platform_schemas', ['isActive'], { transaction });
    await sequelize.getQueryInterface().addIndex('platform_schemas', ['deletedAt'], { transaction });
  }
  
  if (!tables.includes('orders')) {
    logger.info('Creating orders table');
    await sequelize.getQueryInterface().createTable('orders', {
      id: {
        type: sequelize.Sequelize.UUID,
        defaultValue: sequelize.Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: sequelize.Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      platformType: {
        type: sequelize.Sequelize.STRING,
        allowNull: false
      },
      platformOrderId: {
        type: sequelize.Sequelize.STRING,
        allowNull: false
      },
      status: {
        type: sequelize.Sequelize.STRING,
        allowNull: false
      },
      data: {
        type: sequelize.Sequelize.JSON,
        allowNull: false
      },
      createdAt: {
        type: sequelize.Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: sequelize.Sequelize.DATE,
        allowNull: false
      },
      deletedAt: {
        type: sequelize.Sequelize.DATE,
        allowNull: true
      }
    }, { transaction });
    
    // Add indexes
    await sequelize.getQueryInterface().addIndex('orders', ['userId'], { transaction });
    await sequelize.getQueryInterface().addIndex('orders', ['platformType'], { transaction });
    await sequelize.getQueryInterface().addIndex('orders', ['platformOrderId'], { transaction });
    await sequelize.getQueryInterface().addIndex('orders', ['status'], { transaction });
    await sequelize.getQueryInterface().addIndex('orders', ['deletedAt'], { transaction });
  }
}

async function createPlatformSchemas(platformType, transaction) {
  // Define the model if it doesn't exist
  const PlatformSchema = sequelize.define('PlatformSchema', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    platformType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    version: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '1.0.0'
    },
    schema: {
      type: DataTypes.JSON,
      allowNull: false
    },
    mappings: {
      type: DataTypes.JSON,
      allowNull: true
    },
    transformations: {
      type: DataTypes.JSON,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'platform_schemas',
    timestamps: true
  });

  // Check if schemas already exist for this platform and entity type
  const existingProductSchema = await PlatformSchema.findOne({
    where: {
      platformType,
      entityType: 'product',
      version: '1.0.0'
    },
    transaction
  });

  const existingOrderSchema = await PlatformSchema.findOne({
    where: {
      platformType,
      entityType: 'order',
      version: '1.0.0'
    },
    transaction
  });

  // Create schema for product if it doesn't exist
  if (!existingProductSchema) {
    await PlatformSchema.create({
      platformType,
      entityType: 'product',
      version: '1.0.0',
      schema: getPlatformSchema(platformType, 'product'),
      mappings: getPlatformMapping(platformType, 'product'),
      transformations: null,
      isActive: true,
      description: `Schema for ${platformType} products`
    }, { transaction });
  }
  
  // Create schema for order if it doesn't exist
  if (!existingOrderSchema) {
    await PlatformSchema.create({
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
  // Check if source table exists first
  const tables = await sequelize.getQueryInterface().showAllTables();
  if (!tables.includes(sourceTable)) {
    logger.info(`Source table ${sourceTable} does not exist, skipping migration for ${platformType} ${entityType}s`);
    return;
  }
  
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