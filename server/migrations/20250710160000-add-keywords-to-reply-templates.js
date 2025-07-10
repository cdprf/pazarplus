'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Add keywords column to reply_templates table
      await queryInterface.addColumn('reply_templates', 'keywords', {
        type: Sequelize.JSON,
        defaultValue: [],
        comment: 'Keywords that trigger this template suggestion'
      });

      console.log(
        'Successfully added keywords column to reply_templates table'
      );
    } catch (error) {
      console.error('Error adding keywords column:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Remove keywords column from reply_templates table
      await queryInterface.removeColumn('reply_templates', 'keywords');

      console.log(
        'Successfully removed keywords column from reply_templates table'
      );
    } catch (error) {
      console.error('Error removing keywords column:', error.message);
      throw error;
    }
  }
};
