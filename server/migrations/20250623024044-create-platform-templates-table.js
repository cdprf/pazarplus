"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log("Starting migration: Create platform_templates table");

    // Create platform_templates table
    await queryInterface.createTable("platform_templates", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
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
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      platform: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      category: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      subcategory: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      requiredFields: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: "[]",
      },
      optionalFields: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: "[]",
      },
      fieldValidations: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: "{}",
      },
      learnedFromProducts: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: "[]",
      },
      lastLearningUpdate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      learningConfidence: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
        defaultValue: 0.0,
      },
      defaultValues: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: "{}",
      },
      fieldMappings: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: "{}",
      },
      conditionalFields: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: "{}",
      },
      platformApiVersion: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      platformCategoryId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      platformCategoryPath: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      preProcessingRules: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: "[]",
      },
      postProcessingRules: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: "[]",
      },
      mediaRequirements: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: "{}",
      },
      usageCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      successRate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      version: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "1.0.0",
      },
      parentTemplateId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "platform_templates",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      autoDiscovery: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      discoveryPatterns: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: "[]",
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

    // Create indexes for platform_templates
    await queryInterface.addIndex("platform_templates", ["userId"], {
      name: "platform_templates_user_id_idx",
    });
    await queryInterface.addIndex("platform_templates", ["platform"], {
      name: "platform_templates_platform_idx",
    });
    await queryInterface.addIndex("platform_templates", ["category"], {
      name: "platform_templates_category_idx",
    });
    await queryInterface.addIndex("platform_templates", ["isActive"], {
      name: "platform_templates_is_active_idx",
    });
    await queryInterface.addIndex(
      "platform_templates",
      ["platform", "category"],
      {
        name: "platform_templates_platform_category_idx",
      }
    );

    console.log("Finished migration: Created platform_templates table");
  },

  async down(queryInterface, Sequelize) {
    console.log("Starting rollback: Drop platform_templates table");

    await queryInterface.dropTable("platform_templates");

    console.log("Finished rollback: Dropped platform_templates table");
  },
};
