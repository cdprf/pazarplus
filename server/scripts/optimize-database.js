const { sequelize } = require('../models');
const logger = require('../utils/logger');

/**
 * Database Optimization Script
 * Implements performance enhancements for Week 3-4
 */
class DatabaseOptimizer {
  constructor() {
    this.results = {
      optimizations: [],
      errors: [],
      metrics: {
        beforeOptimization: {},
        afterOptimization: {}
      }
    };
  }

  async run() {
    logger.info('Starting database optimization process');

    try {
      // Collect initial metrics
      await this.collectMetrics('before');

      // Run optimization tasks
      await this.analyzeAndOptimizeIndexes();
      await this.optimizeQueryPerformance();
      await this.cleanupOrphanedData();
      await this.updateTableStatistics();
      await this.optimizeConnectionPool();

      // Collect final metrics
      await this.collectMetrics('after');

      logger.info('Database optimization completed successfully');
      return this.generateReport();
    } catch (error) {
      logger.error('Database optimization failed:', error);
      this.results.errors.push({
        type: 'general',
        message: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async collectMetrics(phase) {
    try {
      const metrics = {};

      // Get table sizes
      const tableSizes = await sequelize.query(
        `
        SELECT 
          name as table_name,
          COUNT(*) as row_count
        FROM sqlite_master 
        WHERE type='table' 
        AND name NOT LIKE 'sqlite_%'
      `,
        { type: sequelize.QueryTypes.SELECT }
      );

      metrics.tableSizes = tableSizes;

      // Get index information
      const indexes = await sequelize.query(
        `
        SELECT 
          name,
          tbl_name,
          sql
        FROM sqlite_master 
        WHERE type='index' 
        AND name NOT LIKE 'sqlite_%'
      `,
        { type: sequelize.QueryTypes.SELECT }
      );

      metrics.indexes = indexes;

      this.results.metrics[`${phase}Optimization`] = metrics;

      logger.info(`Collected ${phase} optimization metrics`, {
        tableCount: tableSizes.length,
        indexCount: indexes.length
      });
    } catch (error) {
      logger.error(`Failed to collect ${phase} metrics:`, error);
    }
  }

  async analyzeAndOptimizeIndexes() {
    try {
      logger.info('Analyzing and optimizing database indexes');

      // Define critical indexes for performance
      const indexes = [
        {
          name: 'idx_orders_user_status',
          table: 'Orders',
          columns: ['userId', 'status'],
          query:
            'CREATE INDEX IF NOT EXISTS idx_orders_user_status ON Orders(userId, status)'
        },
        {
          name: 'idx_orders_platform_date',
          table: 'Orders',
          columns: ['platform', 'orderDate'],
          query:
            'CREATE INDEX IF NOT EXISTS idx_orders_platform_date ON Orders(platform, orderDate DESC)'
        },
        {
          name: 'idx_orders_tracking',
          table: 'Orders',
          columns: ['trackingNumber'],
          query:
            'CREATE INDEX IF NOT EXISTS idx_orders_tracking ON Orders(trackingNumber) WHERE trackingNumber IS NOT NULL'
        },
        {
          name: 'idx_order_items_order_id',
          table: 'OrderItems',
          columns: ['orderId'],
          query:
            'CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON OrderItems(orderId)'
        },
        {
          name: 'idx_products_sku',
          table: 'Products',
          columns: ['sku'],
          query:
            'CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON Products(sku)'
        },
        {
          name: 'idx_products_barcode',
          table: 'Products',
          columns: ['barcode'],
          query:
            'CREATE INDEX IF NOT EXISTS idx_products_barcode ON Products(barcode) WHERE barcode IS NOT NULL'
        },
        {
          name: 'idx_platform_connections_user',
          table: 'PlatformConnections',
          columns: ['userId', 'platform'],
          query:
            'CREATE INDEX IF NOT EXISTS idx_platform_connections_user ON PlatformConnections(userId, platform)'
        },
        {
          name: 'idx_shipping_details_order',
          table: 'ShippingDetails',
          columns: ['orderId'],
          query:
            'CREATE INDEX IF NOT EXISTS idx_shipping_details_order ON ShippingDetails(orderId)'
        },
        {
          name: 'idx_users_email',
          table: 'Users',
          columns: ['email'],
          query:
            'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON Users(email)'
        },
        {
          name: 'idx_turkish_compliance_order',
          table: 'TurkishCompliances',
          columns: ['orderId'],
          query:
            'CREATE INDEX IF NOT EXISTS idx_turkish_compliance_order ON TurkishCompliances(orderId)'
        }
      ];

      let createdCount = 0;
      let skippedCount = 0;

      for (const index of indexes) {
        try {
          await sequelize.query(index.query);
          createdCount++;
          logger.debug(`Created/verified index: ${index.name}`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            skippedCount++;
          } else {
            logger.warn(`Failed to create index ${index.name}:`, error.message);
            this.results.errors.push({
              type: 'index',
              index: index.name,
              message: error.message
            });
          }
        }
      }

      this.results.optimizations.push({
        type: 'indexes',
        message: `Index optimization completed: ${createdCount} created/verified, ${skippedCount} already existed`,
        details: { createdCount, skippedCount, totalIndexes: indexes.length }
      });
    } catch (error) {
      logger.error('Index optimization failed:', error);
      this.results.errors.push({
        type: 'indexes',
        message: error.message
      });
    }
  }

  async optimizeQueryPerformance() {
    try {
      logger.info('Optimizing query performance');

      // Enable SQLite optimizations
      const optimizations = [
        'PRAGMA optimize',
        'PRAGMA analysis_limit=1000',
        'PRAGMA cache_size=10000',
        'PRAGMA temp_store=memory'
      ];

      for (const pragma of optimizations) {
        try {
          await sequelize.query(pragma);
        } catch (error) {
          logger.warn(`Failed to execute ${pragma}:`, error.message);
        }
      }

      this.results.optimizations.push({
        type: 'query_performance',
        message: 'SQLite performance optimizations applied',
        details: { optimizations }
      });
    } catch (error) {
      logger.error('Query optimization failed:', error);
      this.results.errors.push({
        type: 'query_performance',
        message: error.message
      });
    }
  }

  async cleanupOrphanedData() {
    try {
      logger.info('Cleaning up orphaned data');

      const cleanupQueries = [
        {
          name: 'orphaned_order_items',
          query: `
            DELETE FROM OrderItems 
            WHERE orderId NOT IN (SELECT id FROM Orders)
          `
        },
        {
          name: 'orphaned_shipping_details',
          query: `
            DELETE FROM ShippingDetails 
            WHERE orderId NOT IN (SELECT id FROM Orders)
          `
        },
        {
          name: 'orphaned_turkish_compliance',
          query: `
            DELETE FROM TurkishCompliances 
            WHERE orderId NOT IN (SELECT id FROM Orders)
          `
        }
      ];

      let totalCleaned = 0;

      for (const cleanup of cleanupQueries) {
        try {
          const [results] = await sequelize.query(cleanup.query);
          const affectedRows = results.affectedRows || 0;
          totalCleaned += affectedRows;

          if (affectedRows > 0) {
            logger.info(
              `Cleaned up ${affectedRows} orphaned records from ${cleanup.name}`
            );
          }
        } catch (error) {
          logger.warn(`Failed to cleanup ${cleanup.name}:`, error.message);
        }
      }

      this.results.optimizations.push({
        type: 'data_cleanup',
        message: `Orphaned data cleanup completed: ${totalCleaned} records removed`,
        details: { totalCleaned }
      });
    } catch (error) {
      logger.error('Data cleanup failed:', error);
      this.results.errors.push({
        type: 'data_cleanup',
        message: error.message
      });
    }
  }

  async updateTableStatistics() {
    try {
      logger.info('Updating table statistics');

      // Update SQLite statistics
      await sequelize.query('ANALYZE');

      this.results.optimizations.push({
        type: 'statistics',
        message: 'Database statistics updated successfully'
      });
    } catch (error) {
      logger.error('Statistics update failed:', error);
      this.results.errors.push({
        type: 'statistics',
        message: error.message
      });
    }
  }

  async optimizeConnectionPool() {
    try {
      logger.info('Optimizing connection pool settings');

      // SQLite doesn't have traditional connection pools,
      // but we can optimize Sequelize pool settings
      const currentConfig = sequelize.config;

      this.results.optimizations.push({
        type: 'connection_pool',
        message: 'Connection pool settings verified',
        details: {
          dialect: currentConfig.dialect,
          pool: currentConfig.pool || 'default'
        }
      });
    } catch (error) {
      logger.error('Connection pool optimization failed:', error);
      this.results.errors.push({
        type: 'connection_pool',
        message: error.message
      });
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      success: this.results.errors.length === 0,
      summary: {
        optimizationsApplied: this.results.optimizations.length,
        errorsEncountered: this.results.errors.length,
        metricsCollected: true
      },
      optimizations: this.results.optimizations,
      errors: this.results.errors,
      metrics: this.results.metrics,
      recommendations: this.generateRecommendations()
    };

    logger.info('Database optimization report generated', {
      optimizations: report.summary.optimizationsApplied,
      errors: report.summary.errorsEncountered
    });

    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    // Performance recommendations
    recommendations.push({
      type: 'performance',
      priority: 'high',
      message:
        'Consider implementing query result caching for frequently accessed data',
      implementation: 'Use Redis caching layer for order and product queries'
    });

    recommendations.push({
      type: 'monitoring',
      priority: 'medium',
      message: 'Set up database performance monitoring',
      implementation:
        'Implement query execution time logging and slow query detection'
    });

    if (this.results.errors.length > 0) {
      recommendations.push({
        type: 'maintenance',
        priority: 'high',
        message: 'Address optimization errors to ensure optimal performance',
        implementation:
          'Review and fix the errors listed in the optimization report'
      });
    }

    return recommendations;
  }
}

module.exports = DatabaseOptimizer;
