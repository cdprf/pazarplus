"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create background_tasks table
    await queryInterface.createTable("background_tasks", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      platformConnectionId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "platform_connections",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      taskType: {
        type: Sequelize.ENUM(
          "order_fetching",
          "product_sync",
          "inventory_sync",
          "bulk_operation",
          "analytics_update",
          "customer_sync",
          "shipping_label_generation",
          "report_generation",
          "data_export",
          "data_import"
        ),
        allowNull: false,
      },
      priority: {
        type: Sequelize.ENUM("low", "normal", "high", "urgent"),
        allowNull: false,
        defaultValue: "normal",
      },
      status: {
        type: Sequelize.ENUM(
          "pending",
          "queued",
          "running",
          "completed",
          "failed",
          "cancelled",
          "paused",
          "timeout"
        ),
        allowNull: false,
        defaultValue: "pending",
      },
      config: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      progress: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 100,
        },
      },
      result: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      logs: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      estimatedDuration: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "Estimated duration in seconds",
      },
      actualDuration: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "Actual duration in seconds",
      },
      startedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      pausedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cancelledAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      scheduledFor: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      timeoutAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      retryCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      maxRetries: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
      },
      parentTaskId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "background_tasks",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      dependsOnTaskIds: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Add indexes for better performance
    await queryInterface.addIndex("background_tasks", ["userId"]);
    await queryInterface.addIndex("background_tasks", ["status"]);
    await queryInterface.addIndex("background_tasks", ["taskType"]);
    await queryInterface.addIndex("background_tasks", ["priority"]);
    await queryInterface.addIndex("background_tasks", ["platformConnectionId"]);
    await queryInterface.addIndex("background_tasks", ["scheduledFor"]);
    await queryInterface.addIndex("background_tasks", ["createdAt"]);
    await queryInterface.addIndex("background_tasks", ["parentTaskId"]);
    await queryInterface.addIndex("background_tasks", [
      "status",
      "scheduledFor",
    ]);
    await queryInterface.addIndex("background_tasks", ["userId", "status"]);
    await queryInterface.addIndex("background_tasks", ["taskType", "status"]);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the table
    await queryInterface.dropTable("background_tasks");

    // Drop the enums
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_background_tasks_taskType";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_background_tasks_priority";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_background_tasks_status";'
    );
  },
};
