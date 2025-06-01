"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("platform_data", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      entityType: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Type of entity (product, order, etc.)",
      },
      entityId: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: "ID of the local entity",
      },
      platformType: {
        type: Sequelize.ENUM("trendyol", "n11", "hepsiburada"),
        allowNull: false,
        comment: "Platform type",
      },
      platformEntityId: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "ID of the entity on the platform",
      },
      platformSku: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Platform-specific SKU",
      },
      platformPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: "Price on the platform",
      },
      platformQuantity: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "Quantity available on the platform",
      },
      status: {
        type: Sequelize.ENUM("active", "inactive", "syncing", "error"),
        defaultValue: "active",
        comment: "Sync status",
      },
      lastSyncedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Last synchronization timestamp",
      },
      data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Additional platform-specific data",
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

    // Add indexes
    await queryInterface.addIndex(
      "platform_data",
      ["entityType", "entityId", "platformType"],
      {
        unique: true,
        name: "platform_data_unique_entity_platform",
      }
    );

    await queryInterface.addIndex(
      "platform_data",
      ["platformType", "platformEntityId"],
      {
        name: "platform_data_platform_entity",
      }
    );

    await queryInterface.addIndex(
      "platform_data",
      ["entityType", "platformType"],
      {
        name: "platform_data_entity_type_platform",
      }
    );

    await queryInterface.addIndex("platform_data", ["status"], {
      name: "platform_data_status",
    });

    await queryInterface.addIndex("platform_data", ["lastSyncedAt"], {
      name: "platform_data_last_synced",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("platform_data");
  },
};
