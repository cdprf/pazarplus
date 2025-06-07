'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('orders', 'shippingTemplateId', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'ID of the linked shipping template for this order',
    });

    // Add index for better query performance
    await queryInterface.addIndex('orders', ['shippingTemplateId'], {
      name: 'orders_shipping_template_id_index'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    await queryInterface.removeIndex('orders', 'orders_shipping_template_id_index');
    
    // Remove column
    await queryInterface.removeColumn('orders', 'shippingTemplateId');
  }
};
