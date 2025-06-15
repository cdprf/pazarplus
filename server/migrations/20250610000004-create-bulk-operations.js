"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("BulkOperations", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      type: {
        type: Sequelize.ENUM(
          "product_import",
          "product_export",
          "price_update",
          "stock_update",
          "category_update",
          "media_upload",
          "platform_publish",
          "platform_sync",
          "variant_creation",
          "bulk_delete"
        ),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM(
          "pending",
          "processing",
          "completed",
          "failed",
          "cancelled",
          "partial"
        ),
        defaultValue: "pending",
      },
      totalItems: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      processedItems: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      successfulItems: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      failedItems: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      progress: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0.0,
      },
      configuration: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      filters: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      results: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      errors: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      warnings: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      metadata: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      startedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      estimatedCompletionAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      processingTimeMs: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      fileUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      resultFileUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
    });

    // Add indexes for better performance
    await queryInterface.addIndex("BulkOperations", ["userId"]);
    await queryInterface.addIndex("BulkOperations", ["type"]);
    await queryInterface.addIndex("BulkOperations", ["status"]);
    await queryInterface.addIndex("BulkOperations", ["userId", "type"]);
    await queryInterface.addIndex("BulkOperations", ["userId", "status"]);
    await queryInterface.addIndex("BulkOperations", ["createdAt"]);
    await queryInterface.addIndex("BulkOperations", ["startedAt"]);
    await queryInterface.addIndex("BulkOperations", ["completedAt"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("BulkOperations");
  },
};
