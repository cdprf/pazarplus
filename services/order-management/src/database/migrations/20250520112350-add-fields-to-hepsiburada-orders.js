'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new fields to HepsiburadaOrders table
    await queryInterface.addColumn('HepsiburadaOrders', 'deliveryAddressJson', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Stores the deliveryAddress from the new API format'
    });

    await queryInterface.addColumn('HepsiburadaOrders', 'invoiceDetailsJson', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Stores the invoice details including tax information'
    });

    await queryInterface.addColumn('HepsiburadaOrders', 'customerJson', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Stores customer information from the API'
    });

    await queryInterface.addColumn('HepsiburadaOrders', 'createdDate', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('HepsiburadaOrders', 'orderDate', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove added columns in reverse order for rollback
    await queryInterface.removeColumn('HepsiburadaOrders', 'orderDate');
    await queryInterface.removeColumn('HepsiburadaOrders', 'createdDate');
    await queryInterface.removeColumn('HepsiburadaOrders', 'customerJson');
    await queryInterface.removeColumn('HepsiburadaOrders', 'invoiceDetailsJson');
    await queryInterface.removeColumn('HepsiburadaOrders', 'deliveryAddressJson');
  }
};