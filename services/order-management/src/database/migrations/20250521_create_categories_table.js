const logger = require('../../utils/logger');

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      logger.info('Creating categories table');
      
      await queryInterface.createTable('Categories', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          }
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        parentId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'Categories',
            key: 'id'
          }
        },
        path: {
          type: Sequelize.STRING,
          allowNull: false,
          comment: 'Full category path (e.g. Electronics/Phones/Smartphones)'
        },
        level: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Category depth level in hierarchy'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        metadata: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Additional category metadata'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true
        }
      });

      // Add indexes
      await queryInterface.addIndex('Categories', ['userId']);
      await queryInterface.addIndex('Categories', ['parentId']);
      await queryInterface.addIndex('Categories', ['path']);
      await queryInterface.addIndex('Categories', ['isActive']);
      await queryInterface.addIndex('Categories', ['deletedAt']);

      logger.info('Successfully created categories table');
      return Promise.resolve();
    } catch (error) {
      logger.error(`Migration failed: ${error.message}`, { error });
      return Promise.reject(error);
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.dropTable('Categories');
    } catch (error) {
      logger.error(`Rollback failed: ${error.message}`, { error });
      return Promise.reject(error);
    }
  }
};