"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("PlatformCategories", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      platformType: {
        type: Sequelize.ENUM(
          "trendyol",
          "hepsiburada",
          "n11",
          "pazarama",
          "amazon"
        ),
        allowNull: false,
      },
      platformCategoryId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      parentId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      level: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      path: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      isLeaf: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      fieldDefinitions: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      requiredFields: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      commissionRate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      vatRate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      restrictions: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      metadata: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      lastSyncAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      syncStatus: {
        type: Sequelize.ENUM("pending", "syncing", "completed", "failed"),
        defaultValue: "pending",
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
    await queryInterface.addIndex("PlatformCategories", ["userId"]);
    await queryInterface.addIndex("PlatformCategories", ["platformType"]);
    await queryInterface.addIndex("PlatformCategories", ["platformCategoryId"]);
    await queryInterface.addIndex("PlatformCategories", ["parentId"]);
    await queryInterface.addIndex("PlatformCategories", ["isActive"]);
    await queryInterface.addIndex("PlatformCategories", ["isLeaf"]);
    await queryInterface.addIndex(
      "PlatformCategories",
      ["platformType", "platformCategoryId"],
      {
        unique: true,
      }
    );
    await queryInterface.addIndex("PlatformCategories", [
      "platformType",
      "userId",
    ]);
    await queryInterface.addIndex("PlatformCategories", ["level"]);
    await queryInterface.addIndex("PlatformCategories", ["syncStatus"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("PlatformCategories");
  },
};
