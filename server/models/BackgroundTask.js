const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const BackgroundTask = sequelize.define(
    "BackgroundTask",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
      },
      platformConnectionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "platform_connections",
          key: "id",
        },
      },
      taskType: {
        type: DataTypes.ENUM(
          "order_fetching",
          "product_sync",
          "inventory_sync",
          "bulk_operation"
        ),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(
          "pending",
          "running",
          "completed",
          "failed",
          "stopped"
        ),
        defaultValue: "pending",
      },
      config: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Task configuration parameters",
      },
      progress: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Task progress information",
      },
      result: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Task execution results",
      },
      error: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Error message if task failed",
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      stoppedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      scheduledFor: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "When the task is scheduled to run",
      },
      retryCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      maxRetries: {
        type: DataTypes.INTEGER,
        defaultValue: 3,
      },
    },
    {
      tableName: "background_tasks",
      timestamps: true,
      indexes: [
        {
          fields: ["userId"],
        },
        {
          fields: ["status"],
        },
        {
          fields: ["taskType"],
        },
        {
          fields: ["platformConnectionId"],
        },
        {
          fields: ["createdAt"],
        },
      ],
    }
  );

  BackgroundTask.associate = (models) => {
    BackgroundTask.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });

    BackgroundTask.belongsTo(models.PlatformConnection, {
      foreignKey: "platformConnectionId",
      as: "platformConnection",
    });
  };

  return BackgroundTask;
};
