"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // First, check the current column type
      const tableDescription = await queryInterface.describeTable("orders");
      const currentUserIdColumn = tableDescription.userId;

      console.log("Current userId column type:", currentUserIdColumn.type);

      // If it's already UUID, we don't need to do anything
      if (currentUserIdColumn.type.toLowerCase().includes("uuid")) {
        console.log("userId column is already UUID type, skipping migration");
        await transaction.commit();
        return;
      }

      // Check if we have any data in the orders table
      const orderCount = await queryInterface.sequelize.query(
        "SELECT COUNT(*) as count FROM orders;",
        {
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      const hasData = orderCount[0].count > 0;
      console.log(`Found ${orderCount[0].count} orders in the table`);

      if (hasData) {
        // If there's data, we need to be more careful
        // First, let's see if the current data can be converted
        const sampleData = await queryInterface.sequelize.query(
          "SELECT userId FROM orders LIMIT 5;",
          {
            type: Sequelize.QueryTypes.SELECT,
            transaction,
          }
        );

        console.log(
          "Sample userId values:",
          sampleData.map((row) => row.userId)
        );

        // Check if any of the userIds are already UUIDs (36 characters with hyphens)
        const hasUuidData = sampleData.some(
          (row) =>
            typeof row.userId === "string" &&
            row.userId.length === 36 &&
            row.userId.includes("-")
        );

        if (hasUuidData) {
          console.log("Data contains UUID values, proceeding with type change");
        } else {
          console.log(
            "Data contains non-UUID values, this may require data migration"
          );
          // For now, we'll attempt the conversion and see what happens
        }
      }

      // Remove the foreign key constraint temporarily
      console.log("Removing foreign key constraint...");
      await queryInterface.removeConstraint("orders", "orders_userId_fkey", {
        transaction,
      });

      // Change the column type to UUID
      console.log("Changing userId column type to UUID...");
      await queryInterface.changeColumn(
        "orders",
        "userId",
        {
          type: Sequelize.UUID,
          allowNull: false,
        },
        { transaction }
      );

      // Re-add the foreign key constraint
      console.log("Re-adding foreign key constraint...");
      await queryInterface.addConstraint("orders", {
        fields: ["userId"],
        type: "foreign key",
        name: "orders_userId_fkey",
        references: {
          table: "users",
          field: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        transaction,
      });

      console.log("Successfully migrated orders.userId to UUID type");
      await transaction.commit();
    } catch (error) {
      console.error("Error migrating orders.userId column:", error);
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log("Rolling back orders.userId column type change...");

      // Remove the foreign key constraint
      await queryInterface.removeConstraint("orders", "orders_userId_fkey", {
        transaction,
      });

      // Change back to INTEGER (this will lose data if there are actual UUIDs)
      await queryInterface.changeColumn(
        "orders",
        "userId",
        {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        { transaction }
      );

      // Re-add the foreign key constraint
      await queryInterface.addConstraint("orders", {
        fields: ["userId"],
        type: "foreign key",
        name: "orders_userId_fkey",
        references: {
          table: "users",
          field: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        transaction,
      });

      await transaction.commit();
      console.log("Successfully rolled back orders.userId to INTEGER type");
    } catch (error) {
      console.error("Error rolling back orders.userId column:", error);
      await transaction.rollback();
      throw error;
    }
  },
};
