'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Add missing columns that exist in model but not in database
      const tableInfo = await queryInterface.describeTable('reply_templates');

      if (!tableInfo.lastUsed) {
        await queryInterface.addColumn('reply_templates', 'lastUsed', {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'When this template was last used'
        });
        console.log('Added lastUsed column');
      }

      if (!tableInfo.isAutoSuggest) {
        await queryInterface.addColumn('reply_templates', 'isAutoSuggest', {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          comment: 'Whether to auto-suggest this template based on keywords'
        });
        console.log('Added isAutoSuggest column');
      }

      if (!tableInfo.rating) {
        await queryInterface.addColumn('reply_templates', 'rating', {
          type: Sequelize.DECIMAL(3, 2),
          allowNull: true,
          comment: 'Average rating of this template effectiveness'
        });
        console.log('Added rating column');
      }

      if (!tableInfo.ratingCount) {
        await queryInterface.addColumn('reply_templates', 'ratingCount', {
          type: Sequelize.INTEGER,
          defaultValue: 0
        });
        console.log('Added ratingCount column');
      }

      console.log(
        'Successfully added missing columns to reply_templates table'
      );
    } catch (error) {
      console.error('Error adding missing columns:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Remove added columns
      await queryInterface.removeColumn('reply_templates', 'lastUsed');
      await queryInterface.removeColumn('reply_templates', 'isAutoSuggest');
      await queryInterface.removeColumn('reply_templates', 'rating');
      await queryInterface.removeColumn('reply_templates', 'ratingCount');

      console.log(
        'Successfully removed added columns from reply_templates table'
      );
    } catch (error) {
      console.error('Error removing columns:', error.message);
      throw error;
    }
  }
};
