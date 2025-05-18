'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    try {
      // First, remove any existing single-column unique constraint on platformId
      // We need to find the constraint name to drop it
      const tableInfo = await queryInterface.describeTable('orders');
      
      // SQLite handles constraints differently, so we need a different approach
      // We'll recreate the table without the constraint, then add a composite constraint
      
      // Step 1: Create a temporary table with the correct schema (including composite constraint)
      await queryInterface.createTable('orders_temp', {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false
        },
        externalOrderId: {
          type: Sequelize.STRING,
          allowNull: false
        },
        platformId: {
          type: Sequelize.UUID,
          allowNull: false
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false
        },
        customerName: {
          type: Sequelize.STRING,
          allowNull: false
        },
        customerEmail: {
          type: Sequelize.STRING,
          allowNull: true
        },
        customerPhone: {
          type: Sequelize.STRING,
          allowNull: true
        },
        orderDate: {
          type: Sequelize.DATE,
          allowNull: false
        },
        totalAmount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        currency: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'USD'
        },
        status: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'new'
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        paymentMethod: {
          type: Sequelize.STRING,
          allowNull: true
        },
        paymentStatus: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'pending'
        },
        shippingMethod: {
          type: Sequelize.STRING,
          allowNull: true
        },
        shippingDetailId: {
          type: Sequelize.UUID,
          allowNull: true
        },
        rawData: {
          type: Sequelize.JSON,
          allowNull: true
        },
        lastSyncedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        connectionId: {
          type: Sequelize.UUID,
          allowNull: true
        },
        archived: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        }
      });
      
      // Step 2: Add the composite unique constraint to temp table
      await queryInterface.addConstraint('orders_temp', {
        fields: ['externalOrderId', 'platformId'],
        type: 'unique',
        name: 'orders_externalOrderId_platformId_unique'
      });
      
      // Step 3: Copy data from the original table to the temp table
      await queryInterface.sequelize.query(
        `INSERT INTO orders_temp SELECT * FROM orders;`
      );
      
      // Step 4: Drop the original table
      await queryInterface.dropTable('orders');
      
      // Step 5: Rename the temp table to the original table name
      await queryInterface.renameTable('orders_temp', 'orders');
      
      // Step 6: Re-add indexes that were lost
      await queryInterface.addIndex('orders', ['userId']);
      await queryInterface.addIndex('orders', ['status']);
      await queryInterface.addIndex('orders', ['orderDate']);
      
      console.log('Successfully fixed unique constraints on orders table');
      
    } catch (error) {
      console.error('Error fixing unique constraints:', error);
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    // We don't need a down migration as we don't want to go back to the incorrect state
    console.log('This migration cannot be reverted as it fixes a data integrity issue');
  }
};
