const { Sequelize, DataTypes } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Database Migration Service
 * Automatically creates all required tables when the server starts
 */
class DatabaseMigrationService {
  constructor(sequelize) {
    this.sequelize = sequelize;
    this.migrations = [];
  }

  /**
   * Define all table schemas
   */
  defineMigrations() {
    // Users table
    this.migrations.push({
      name: 'create_users_table',
      up: async (queryInterface) => {
        await queryInterface.createTable('users', {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
          },
          password: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          firstName: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          lastName: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          role: {
            type: DataTypes.ENUM('admin', 'user', 'manager'),
            defaultValue: 'user',
          },
          isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
          },
          lastLoginAt: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          emailVerifiedAt: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          resetPasswordToken: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          resetPasswordExpiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          billingPeriodStart: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          billingPeriodEnd: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          subscriptionStatus: {
            type: DataTypes.ENUM('active', 'inactive', 'trial', 'expired'),
            defaultValue: 'trial',
          },
          subscriptionTier: {
            type: DataTypes.ENUM('free', 'basic', 'premium', 'enterprise'),
            defaultValue: 'free',
          },
          createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
        });
      }
    });

    // Products table
    this.migrations.push({
      name: 'create_products_table',
      up: async (queryInterface) => {
        await queryInterface.createTable('products', {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          name: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          sku: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
          },
          barcode: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          description: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          category: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
          },
          costPrice: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
          },
          stockQuantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          minStockLevel: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
          },
          weight: {
            type: DataTypes.DECIMAL(8, 3),
            allowNull: true,
          },
          dimensions: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          images: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: [],
          },
          status: {
            type: DataTypes.ENUM('active', 'inactive', 'draft', 'discontinued'),
            defaultValue: 'draft',
          },
          platforms: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
          },
          attributes: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
          },
          tags: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: [],
          },
          userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          templateId: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          lastSyncedAt: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          hasVariants: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
          },
          variantAttributes: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: [],
          },
          sourcePlatform: {
            type: DataTypes.ENUM('manual', 'trendyol', 'hepsiburada', 'n11', 'csv', 'api'),
            defaultValue: 'manual',
          },
          isVariant: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
          },
          isMainProduct: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
          },
          variantGroupId: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          variantType: {
            type: DataTypes.ENUM('color', 'size', 'model', 'material', 'style', 'other'),
            allowNull: true,
          },
          variantValue: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          parentProductId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
              model: 'products',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          variantDetectionConfidence: {
            type: DataTypes.FLOAT,
            allowNull: true,
          },
          variantDetectionSource: {
            type: DataTypes.ENUM('manual', 'sku_analysis', 'text_analysis', 'platform_data', 'ml_model'),
            allowNull: true,
          },
          lastVariantDetectionAt: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
        });
      }
    });

    // Orders table
    this.migrations.push({
      name: 'create_orders_table',
      up: async (queryInterface) => {
        await queryInterface.createTable('orders', {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          orderNumber: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
          },
          platformOrderId: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          platform: {
            type: DataTypes.ENUM('trendyol', 'hepsiburada', 'n11', 'manual', 'api'),
            allowNull: false,
          },
          status: {
            type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'),
            defaultValue: 'pending',
          },
          totalAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
          },
          shippingCost: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0,
          },
          taxAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0,
          },
          discountAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0,
          },
          currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'TRY',
          },
          customerInfo: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          shippingAddress: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          billingAddress: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          paymentMethod: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          paymentStatus: {
            type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded', 'partially_refunded'),
            defaultValue: 'pending',
          },
          notes: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          platformData: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          orderDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          shippedAt: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          deliveredAt: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          lastSyncedAt: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
        });
      }
    });

    // Order Items table
    this.migrations.push({
      name: 'create_order_items_table',
      up: async (queryInterface) => {
        await queryInterface.createTable('order_items', {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          orderId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
              model: 'orders',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          productId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
              model: 'products',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          productName: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          productSku: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          platformProductId: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
          },
          unitPrice: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
          },
          totalPrice: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
          },
          discountAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0,
          },
          taxAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0,
          },
          attributes: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          platformData: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
        });
      }
    });

    // Background Tasks table
    this.migrations.push({
      name: 'create_background_tasks_table',
      up: async (queryInterface) => {
        await queryInterface.createTable('background_tasks', {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          taskType: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          status: {
            type: DataTypes.ENUM('pending', 'running', 'completed', 'failed', 'cancelled'),
            defaultValue: 'pending',
          },
          priority: {
            type: DataTypes.ENUM('urgent', 'high', 'normal', 'low'),
            defaultValue: 'normal',
          },
          payload: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          result: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          error: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          progress: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          retryCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
          },
          maxRetries: {
            type: DataTypes.INTEGER,
            defaultValue: 3,
          },
          userId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          platformConnectionId: {
            type: DataTypes.UUID,
            allowNull: true,
          },
          scheduledFor: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          startedAt: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          completedAt: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
        });
      }
    });

    // Platform Connections table
    this.migrations.push({
      name: 'create_platform_connections_table',
      up: async (queryInterface) => {
        await queryInterface.createTable('platform_connections', {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          platformType: {
            type: DataTypes.ENUM('trendyol', 'hepsiburada', 'n11'),
            allowNull: false,
          },
          platformName: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
          },
          credentials: {
            type: DataTypes.JSONB,
            allowNull: false,
          },
          settings: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
          },
          lastSyncAt: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          lastSyncStatus: {
            type: DataTypes.ENUM('success', 'partial', 'failed', 'pending'),
            allowNull: true,
          },
          syncStats: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
          },
          rateLimitInfo: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          errorCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
          },
          lastError: {
            type: DataTypes.TEXT,
            allowNull: true,
          },
          createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
        });
      }
    });

    // Platform Data table
    this.migrations.push({
      name: 'create_platform_data_table',
      up: async (queryInterface) => {
        await queryInterface.createTable('platform_data', {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          entityType: {
            type: DataTypes.ENUM('product', 'order', 'customer', 'category'),
            allowNull: false,
          },
          entityId: {
            type: DataTypes.UUID,
            allowNull: false,
          },
          platformType: {
            type: DataTypes.ENUM('trendyol', 'hepsiburada', 'n11'),
            allowNull: false,
          },
          platformEntityId: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          platformSku: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          platformPrice: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
          },
          platformQuantity: {
            type: DataTypes.INTEGER,
            allowNull: true,
          },
          status: {
            type: DataTypes.ENUM('active', 'inactive', 'pending', 'error'),
            defaultValue: 'pending',
          },
          lastSyncedAt: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          data: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
        });
      }
    });

    // Add more essential tables...
    this.addMoreTables();
  }

  addMoreTables() {
    // Customers table
    this.migrations.push({
      name: 'create_customers_table',
      up: async (queryInterface) => {
        await queryInterface.createTable('customers', {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          firstName: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          lastName: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          email: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          phone: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          address: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          platformCustomerIds: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
          },
          userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
        });
      }
    });

    // Shipping Details table
    this.migrations.push({
      name: 'create_shipping_details_table',
      up: async (queryInterface) => {
        await queryInterface.createTable('shipping_details', {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          orderId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
              model: 'orders',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          carrierName: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          trackingNumber: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          shippingMethod: {
            type: DataTypes.STRING,
            allowNull: true,
          },
          estimatedDelivery: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          actualDelivery: {
            type: DataTypes.DATE,
            allowNull: true,
          },
          shippingCost: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
          },
          status: {
            type: DataTypes.ENUM('pending', 'picked_up', 'in_transit', 'delivered', 'failed'),
            defaultValue: 'pending',
          },
          trackingEvents: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: [],
          },
          createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
        });
      }
    });

    // Settings table
    this.migrations.push({
      name: 'create_settings_table',
      up: async (queryInterface) => {
        await queryInterface.createTable('settings', {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          category: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          key: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          value: {
            type: DataTypes.JSONB,
            allowNull: true,
          },
          isGlobal: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
          },
          createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
          updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
          },
        });
      }
    });
  }

  /**
   * Check if a table exists
   */
  async tableExists(tableName) {
    try {
      const [results] = await this.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
        );
      `);
      return results[0].exists;
    } catch (error) {
      logger.warn(`Error checking if table ${tableName} exists:`, error.message);
      return false;
    }
  }

  /**
   * Run all migrations
   */
  async runMigrations() {
    try {
      logger.info('Starting database migrations...');
      
      // Initialize migrations
      this.defineMigrations();
      
      const queryInterface = this.sequelize.getQueryInterface();
      let migrationsRun = 0;
      
      for (const migration of this.migrations) {
        try {
          logger.info(`Running migration: ${migration.name}`);
          await migration.up(queryInterface);
          migrationsRun++;
          logger.info(`✅ Migration completed: ${migration.name}`);
        } catch (error) {
          if (error.name === 'SequelizeDatabaseError' && error.original?.code === '42P07') {
            logger.info(`⏭️  Table already exists, skipping: ${migration.name}`);
          } else {
            logger.error(`❌ Migration failed: ${migration.name}`, error);
            throw error;
          }
        }
      }
      
      logger.info(`🎉 Database migrations completed! ${migrationsRun} migrations processed.`);
      return true;
    } catch (error) {
      logger.error('Database migrations failed:', error);
      return false;
    }
  }

  /**
   * Create indexes for better performance
   */
  async createIndexes() {
    try {
      logger.info('Creating database indexes...');
      
      const indexes = [
        // Users indexes
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);',
        
        // Products indexes
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_user_id ON products(user_id);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_sku ON products(sku);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_status ON products(status);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_parent_id ON products(parent_product_id);',
        
        // Orders indexes
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_id ON orders(user_id);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_platform ON orders(platform);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status ON orders(status);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_order_date ON orders(order_date);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_platform_order_id ON orders(platform_order_id);',
        
        // Order Items indexes
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);',
        
        // Background Tasks indexes
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_background_tasks_status ON background_tasks(status);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_background_tasks_user_id ON background_tasks(user_id);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_background_tasks_priority ON background_tasks(priority);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_background_tasks_scheduled_for ON background_tasks(scheduled_for);',
        
        // Platform Data indexes
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_platform_data_entity ON platform_data(entity_type, entity_id);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_platform_data_platform_entity ON platform_data(platform_type, platform_entity_id);',
        
        // Platform Connections indexes
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_platform_connections_user_id ON platform_connections(user_id);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_platform_connections_platform_type ON platform_connections(platform_type);',
      ];
      
      for (const indexQuery of indexes) {
        try {
          await this.sequelize.query(indexQuery);
        } catch (error) {
          if (error.original?.code === '42P07') {
            // Index already exists, skip
            continue;
          }
          logger.warn('Index creation warning:', error.message);
        }
      }
      
      logger.info('✅ Database indexes created successfully');
    } catch (error) {
      logger.error('Error creating indexes:', error);
    }
  }
}

module.exports = DatabaseMigrationService;
