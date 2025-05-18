'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('HepsiburadaOrders', {
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
      packageNumber: {
        type: Sequelize.STRING,
        allowNull: false
      },
      merchantId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      customerId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      orderNumber: {
        type: Sequelize.STRING,
        allowNull: true
      },
      referenceNumber: {
        type: Sequelize.STRING,
        allowNull: true
      },
      cargoCompany: {
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
      paymentType: {
        type: Sequelize.STRING,
        allowNull: true
      },
      shippingAddressJson: {
        type: Sequelize.JSON,
        allowNull: true
      },
      billingAddressJson: {
        type: Sequelize.JSON,
        allowNull: true
      },
      invoiceAddressJson: {
        type: Sequelize.JSON,
        allowNull: true
      },
      platformStatus: {
        type: Sequelize.STRING,
        allowNull: true
      },
      paymentStatus: {
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
    await queryInterface.addIndex('HepsiburadaOrders', ['orderId']);
    await queryInterface.addIndex('HepsiburadaOrders', ['packageNumber']);
    await queryInterface.addIndex('HepsiburadaOrders', ['orderNumber']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('HepsiburadaOrders');
  }
};