'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add enum type for the platform column
    await queryInterface.sequelize.query(`
      CREATE TYPE platform_enum AS ENUM (
        'trendyol',
        'hepsiburada',
        'n11',
        'pazarama',
        'amazon',
        'csv',
        'shopify',
        'woocommerce',
        'magento',
        'etsy',
        'ebay',
        'lazada',
        'jumia',
        'shopee',
        'aliexpress',
        'cimri',
        'akakce',
        'ciceksepeti',
        'idefix'
      );
    `).catch(error => {
      // Ignore if enum already exists
      if (error.message.includes('already exists')) {
        console.log('platform_enum type already exists');
      } else {
        throw error;
      }
    });

    // Add enum type for the severity column
    await queryInterface.sequelize.query(`
      CREATE TYPE severity_enum AS ENUM ('low', 'medium', 'high', 'critical');
    `).catch(error => {
      // Ignore if enum already exists
      if (error.message.includes('already exists')) {
        console.log('severity_enum type already exists');
      } else {
        throw error;
      }
    });

    // Add enum type for the resolution strategy column
    await queryInterface.sequelize.query(`
      CREATE TYPE resolution_strategy_enum AS ENUM ('accept_platform', 'keep_local', 'manual_merge', 'ignore');
    `).catch(error => {
      // Ignore if enum already exists
      if (error.message.includes('already exists')) {
        console.log('resolution_strategy_enum type already exists');
      } else {
        throw error;
      }
    });

    // 1. Add platform column
    await queryInterface.addColumn('platform_conflicts', 'platform', {
      type: 'platform_enum',
      allowNull: false,
      defaultValue: 'trendyol'
    }).catch(error => {
      if (error.message.includes('already exists')) {
        console.log('platform column already exists');
      } else {
        throw error;
      }
    });

    // 2. Add localEntityId column
    await queryInterface.addColumn('platform_conflicts', 'localEntityId', {
      type: Sequelize.STRING,
      allowNull: true
    }).catch(error => {
      if (error.message.includes('already exists')) {
        console.log('localEntityId column already exists');
      } else {
        throw error;
      }
    });

    // 3. Add severity column
    await queryInterface.addColumn('platform_conflicts', 'severity', {
      type: 'severity_enum',
      allowNull: true,
      defaultValue: 'medium'
    }).catch(error => {
      if (error.message.includes('already exists')) {
        console.log('severity column already exists');
      } else {
        throw error;
      }
    });

    // 4. Add autoResolvable column
    await queryInterface.addColumn('platform_conflicts', 'autoResolvable', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false
    }).catch(error => {
      if (error.message.includes('already exists')) {
        console.log('autoResolvable column already exists');
      } else {
        throw error;
      }
    });

    // 5. Add resolutionStrategy column
    await queryInterface.addColumn('platform_conflicts', 'resolutionStrategy', {
      type: 'resolution_strategy_enum',
      allowNull: true
    }).catch(error => {
      if (error.message.includes('already exists')) {
        console.log('resolutionStrategy column already exists');
      } else {
        throw error;
      }
    });

    // 6. Add resolutionData column
    await queryInterface.addColumn('platform_conflicts', 'resolutionData', {
      type: Sequelize.JSONB,
      allowNull: true
    }).catch(error => {
      if (error.message.includes('already exists')) {
        console.log('resolutionData column already exists');
      } else {
        throw error;
      }
    });

    // 7. Add resolutionNotes column
    await queryInterface.addColumn('platform_conflicts', 'resolutionNotes', {
      type: Sequelize.TEXT,
      allowNull: true
    }).catch(error => {
      if (error.message.includes('already exists')) {
        console.log('resolutionNotes column already exists');
      } else {
        throw error;
      }
    });

    // 8. Add syncSessionId column
    await queryInterface.addColumn('platform_conflicts', 'syncSessionId', {
      type: Sequelize.UUID,
      allowNull: true
    }).catch(error => {
      if (error.message.includes('already exists')) {
        console.log('syncSessionId column already exists');
      } else {
        throw error;
      }
    });

    // 9. Add detectedAt column
    await queryInterface.addColumn('platform_conflicts', 'detectedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: Sequelize.NOW
    }).catch(error => {
      if (error.message.includes('already exists')) {
        console.log('detectedAt column already exists');
      } else {
        throw error;
      }
    });

    // 10. Add lastUpdated column
    await queryInterface.addColumn('platform_conflicts', 'lastUpdated', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: Sequelize.NOW
    }).catch(error => {
      if (error.message.includes('already exists')) {
        console.log('lastUpdated column already exists');
      } else {
        throw error;
      }
    });

    // 11. Add metadata column
    await queryInterface.addColumn('platform_conflicts', 'metadata', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {}
    }).catch(error => {
      if (error.message.includes('already exists')) {
        console.log('metadata column already exists');
      } else {
        throw error;
      }
    });

    // Create the index that was failing
    await queryInterface.addIndex('platform_conflicts', ['platform', 'status'], {
      name: 'platform_conflicts_platform_status'
    }).catch(error => {
      if (error.message.includes('already exists')) {
        console.log('Index platform_conflicts_platform_status already exists');
      } else {
        throw error;
      }
    });
    
    // Create other indexes defined in the model
    await queryInterface.addIndex('platform_conflicts', ['conflictType', 'severity'], {
      name: 'platform_conflicts_conflictType_severity'
    }).catch(error => {
      if (error.message.includes('already exists')) {
        console.log('Index platform_conflicts_conflictType_severity already exists');
      } else {
        throw error;
      }
    });

    await queryInterface.addIndex('platform_conflicts', ['entityType', 'entityId'], {
      name: 'platform_conflicts_entityType_entityId'
    }).catch(error => {
      if (error.message.includes('already exists')) {
        console.log('Index platform_conflicts_entityType_entityId already exists');
      } else {
        throw error;
      }
    });

    await queryInterface.addIndex('platform_conflicts', ['syncSessionId'], {
      name: 'platform_conflicts_syncSessionId'
    }).catch(error => {
      if (error.message.includes('already exists')) {
        console.log('Index platform_conflicts_syncSessionId already exists');
      } else {
        throw error;
      }
    });

    await queryInterface.addIndex('platform_conflicts', ['detectedAt'], {
      name: 'platform_conflicts_detectedAt'
    }).catch(error => {
      if (error.message.includes('already exists')) {
        console.log('Index platform_conflicts_detectedAt already exists');
      } else {
        throw error;
      }
    });

    await queryInterface.addIndex('platform_conflicts', ['resolvedBy'], {
      name: 'platform_conflicts_resolvedBy'
    }).catch(error => {
      if (error.message.includes('already exists')) {
        console.log('Index platform_conflicts_resolvedBy already exists');
      } else {
        throw error;
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove all indexes
    await queryInterface.removeIndex('platform_conflicts', 'platform_conflicts_platform_status').catch(e => console.log('Failed to remove index:', e.message));
    await queryInterface.removeIndex('platform_conflicts', 'platform_conflicts_conflictType_severity').catch(e => console.log('Failed to remove index:', e.message));
    await queryInterface.removeIndex('platform_conflicts', 'platform_conflicts_entityType_entityId').catch(e => console.log('Failed to remove index:', e.message));
    await queryInterface.removeIndex('platform_conflicts', 'platform_conflicts_syncSessionId').catch(e => console.log('Failed to remove index:', e.message));
    await queryInterface.removeIndex('platform_conflicts', 'platform_conflicts_detectedAt').catch(e => console.log('Failed to remove index:', e.message));
    await queryInterface.removeIndex('platform_conflicts', 'platform_conflicts_resolvedBy').catch(e => console.log('Failed to remove index:', e.message));
    
    // Remove all added columns
    await queryInterface.removeColumn('platform_conflicts', 'platform').catch(e => console.log('Failed to remove column:', e.message));
    await queryInterface.removeColumn('platform_conflicts', 'localEntityId').catch(e => console.log('Failed to remove column:', e.message));
    await queryInterface.removeColumn('platform_conflicts', 'severity').catch(e => console.log('Failed to remove column:', e.message));
    await queryInterface.removeColumn('platform_conflicts', 'autoResolvable').catch(e => console.log('Failed to remove column:', e.message));
    await queryInterface.removeColumn('platform_conflicts', 'resolutionStrategy').catch(e => console.log('Failed to remove column:', e.message));
    await queryInterface.removeColumn('platform_conflicts', 'resolutionData').catch(e => console.log('Failed to remove column:', e.message));
    await queryInterface.removeColumn('platform_conflicts', 'resolutionNotes').catch(e => console.log('Failed to remove column:', e.message));
    await queryInterface.removeColumn('platform_conflicts', 'syncSessionId').catch(e => console.log('Failed to remove column:', e.message));
    await queryInterface.removeColumn('platform_conflicts', 'detectedAt').catch(e => console.log('Failed to remove column:', e.message));
    await queryInterface.removeColumn('platform_conflicts', 'lastUpdated').catch(e => console.log('Failed to remove column:', e.message));
    await queryInterface.removeColumn('platform_conflicts', 'metadata').catch(e => console.log('Failed to remove column:', e.message));
    
    // Drop enum types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS platform_enum;').catch(e => console.log('Failed to drop type:', e.message));
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS severity_enum;').catch(e => console.log('Failed to drop type:', e.message));
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS resolution_strategy_enum;').catch(e => console.log('Failed to drop type:', e.message));
  }
};
