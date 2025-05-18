'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('TrendyolOrders', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      orderId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Orders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      orderNumber: {
        type: Sequelize.STRING,
        allowNull: false
      },
      cargoProviderName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      cargoTrackingNumber: {
        type: Sequelize.STRING,
        allowNull: true
      },
      cargoTrackingUrl: {
        type: Sequelize.STRING,
        allowNull: true 
      },
      customerFirstName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      customerLastName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      customerEmail: {
        type: Sequelize.STRING,
        allowNull: true
      },
      shipmentAddressJson: {
        type: Sequelize.JSON,
        allowNull: true
      },
      invoiceAddressJson: {
        type: Sequelize.JSON,
        allowNull: true
      },
      deliveryAddressJson: {
        type: Sequelize.JSON,
        allowNull: true
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      platformStatus: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create indexes
    await queryInterface.addIndex('TrendyolOrders', ['orderId']);
    await queryInterface.addIndex('TrendyolOrders', ['orderNumber']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('TrendyolOrders');
  }
};