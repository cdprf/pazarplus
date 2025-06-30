'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add missing columns to background_tasks table
    
    // Add priority column with enum
    await queryInterface.addColumn('background_tasks', 'priority', {
      type: Sequelize.ENUM('low', 'normal', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'normal'
    });

    // Add logs column
    await queryInterface.addColumn('background_tasks', 'logs', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: []
    });

    // Add metadata column
    await queryInterface.addColumn('background_tasks', 'metadata', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {}
    });

    // Add estimatedDuration column
    await queryInterface.addColumn('background_tasks', 'estimatedDuration', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Estimated duration in seconds'
    });

    // Add actualDuration column
    await queryInterface.addColumn('background_tasks', 'actualDuration', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Actual duration in seconds'
    });

    // Add pausedAt column
    await queryInterface.addColumn('background_tasks', 'pausedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Add cancelledAt column
    await queryInterface.addColumn('background_tasks', 'cancelledAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Add timeoutAt column
    await queryInterface.addColumn('background_tasks', 'timeoutAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Add parentTaskId column
    await queryInterface.addColumn('background_tasks', 'parentTaskId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'background_tasks',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add dependsOnTaskIds column
    await queryInterface.addColumn('background_tasks', 'dependsOnTaskIds', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: []
    });

    // Add deletedAt column for soft deletes
    await queryInterface.addColumn('background_tasks', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Update progress column to be INTEGER instead of JSON
    await queryInterface.changeColumn('background_tasks', 'progress', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    // Update status enum to include all required values
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_background_tasks_status" ADD VALUE IF NOT EXISTS 'pending';
      ALTER TYPE "enum_background_tasks_status" ADD VALUE IF NOT EXISTS 'queued';
      ALTER TYPE "enum_background_tasks_status" ADD VALUE IF NOT EXISTS 'running';
      ALTER TYPE "enum_background_tasks_status" ADD VALUE IF NOT EXISTS 'paused';
      ALTER TYPE "enum_background_tasks_status" ADD VALUE IF NOT EXISTS 'cancelled';
      ALTER TYPE "enum_background_tasks_status" ADD VALUE IF NOT EXISTS 'timeout';
    `);

    // Add indexes for better performance
    await queryInterface.addIndex('background_tasks', ['priority']);
    await queryInterface.addIndex('background_tasks', ['parentTaskId']);
    await queryInterface.addIndex('background_tasks', ['status', 'scheduledFor']);
    await queryInterface.addIndex('background_tasks', ['userId', 'status']);
    await queryInterface.addIndex('background_tasks', ['taskType', 'status']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove added columns
    await queryInterface.removeColumn('background_tasks', 'priority');
    await queryInterface.removeColumn('background_tasks', 'logs');
    await queryInterface.removeColumn('background_tasks', 'metadata');
    await queryInterface.removeColumn('background_tasks', 'estimatedDuration');
    await queryInterface.removeColumn('background_tasks', 'actualDuration');
    await queryInterface.removeColumn('background_tasks', 'pausedAt');
    await queryInterface.removeColumn('background_tasks', 'cancelledAt');
    await queryInterface.removeColumn('background_tasks', 'timeoutAt');
    await queryInterface.removeColumn('background_tasks', 'parentTaskId');
    await queryInterface.removeColumn('background_tasks', 'dependsOnTaskIds');
    await queryInterface.removeColumn('background_tasks', 'deletedAt');

    // Revert progress column back to JSON
    await queryInterface.changeColumn('background_tasks', 'progress', {
      type: Sequelize.JSON,
      allowNull: true
    });

    // Remove indexes
    await queryInterface.removeIndex('background_tasks', ['priority']);
    await queryInterface.removeIndex('background_tasks', ['parentTaskId']);
    await queryInterface.removeIndex('background_tasks', ['status', 'scheduledFor']);
    await queryInterface.removeIndex('background_tasks', ['userId', 'status']);
    await queryInterface.removeIndex('background_tasks', ['taskType', 'status']);
    
    // Drop the priority enum
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_background_tasks_priority";');
  }
};
