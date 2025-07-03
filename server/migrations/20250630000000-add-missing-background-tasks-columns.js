"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First check what columns exist
    const tableDescription = await queryInterface.describeTable(
      "background_tasks"
    );
    console.log(
      "Existing columns in background_tasks:",
      Object.keys(tableDescription)
    );

    // Add missing columns if they don't exist
    const columnsToAdd = [
      {
        name: "priority",
        definition: {
          type: Sequelize.ENUM("low", "normal", "high", "urgent"),
          allowNull: false,
          defaultValue: "normal",
        },
      },
      {
        name: "estimatedDuration",
        definition: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: "Estimated duration in seconds",
        },
      },
      {
        name: "actualDuration",
        definition: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: "Actual duration in seconds",
        },
      },
      {
        name: "startedAt",
        definition: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      },
      {
        name: "completedAt",
        definition: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      },
      {
        name: "pausedAt",
        definition: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      },
      {
        name: "cancelledAt",
        definition: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      },
      {
        name: "scheduledFor",
        definition: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      },
      {
        name: "timeoutAt",
        definition: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      },
      {
        name: "retryCount",
        definition: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        name: "maxRetries",
        definition: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 3,
        },
      },
      {
        name: "parentTaskId",
        definition: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "background_tasks",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
      },
      {
        name: "dependsOnTaskIds",
        definition: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [],
        },
      },
      {
        name: "metadata",
        definition: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: {},
        },
      },
      {
        name: "logs",
        definition: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [],
        },
      },
    ];

    // Create ENUM types first if they don't exist
    try {
      await queryInterface.sequelize.query(
        "CREATE TYPE enum_background_tasks_priority AS ENUM ('low', 'normal', 'high', 'urgent')"
      );
    } catch (error) {
      console.log("Priority enum already exists");
    }

    // Add missing columns one by one
    for (const column of columnsToAdd) {
      if (!tableDescription[column.name]) {
        console.log(`Adding column: ${column.name}`);
        try {
          await queryInterface.addColumn(
            "background_tasks",
            column.name,
            column.definition
          );
        } catch (error) {
          console.log(`Failed to add column ${column.name}:`, error.message);
        }
      } else {
        console.log(`Column ${column.name} already exists`);
      }
    }

    // Add indexes for better performance (only if not already present)
    const indexes = [
      { fields: ["userId"] },
      { fields: ["status"] },
      { fields: ["taskType"] },
      { fields: ["priority"] },
      { fields: ["platformConnectionId"] },
      { fields: ["scheduledFor"] },
      { fields: ["createdAt"] },
      { fields: ["parentTaskId"] },
      { fields: ["status", "scheduledFor"] },
      { fields: ["userId", "status"] },
      { fields: ["taskType", "status"] },
    ];

    for (const index of indexes) {
      try {
        await queryInterface.addIndex("background_tasks", index);
      } catch (error) {
        console.log(`Index already exists or failed:`, error.message);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove added columns (in reverse order to avoid dependency issues)
    const columnsToRemove = [
      "logs",
      "metadata",
      "dependsOnTaskIds",
      "parentTaskId",
      "maxRetries",
      "retryCount",
      "timeoutAt",
      "scheduledFor",
      "cancelledAt",
      "pausedAt",
      "completedAt",
      "startedAt",
      "actualDuration",
      "estimatedDuration",
      "priority",
    ];

    for (const column of columnsToRemove) {
      try {
        await queryInterface.removeColumn("background_tasks", column);
      } catch (error) {
        console.log(`Failed to remove column ${column}:`, error.message);
      }
    }

    // Drop the enum type
    try {
      await queryInterface.sequelize.query(
        "DROP TYPE IF EXISTS enum_background_tasks_priority;"
      );
    } catch (error) {
      console.log("Failed to drop priority enum:", error.message);
    }
  },
};
