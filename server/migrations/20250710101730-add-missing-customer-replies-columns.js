"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add missing columns to customer_replies table
    await queryInterface.addColumn("customer_replies", "created_by", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    });

    await queryInterface.addColumn("customer_replies", "creation_date", {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    });

    await queryInterface.addColumn("customer_replies", "sent_date", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("customer_replies", "has_private_info", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });

    await queryInterface.addColumn("customer_replies", "customer_feedback", {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    });

    await queryInterface.addColumn("customer_replies", "reject_reason", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("customer_replies", "attachments", {
      type: Sequelize.JSON,
      defaultValue: [],
    });

    await queryInterface.addColumn("customer_replies", "template_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "reply_templates",
        key: "id",
      },
    });

    await queryInterface.addColumn("customer_replies", "raw_data", {
      type: Sequelize.JSON,
      allowNull: true,
    });

    // Remove default value from creation_date after adding it
    await queryInterface.changeColumn("customer_replies", "creation_date", {
      type: Sequelize.DATE,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove added columns
    await queryInterface.removeColumn("customer_replies", "created_by");
    await queryInterface.removeColumn("customer_replies", "creation_date");
    await queryInterface.removeColumn("customer_replies", "sent_date");
    await queryInterface.removeColumn("customer_replies", "has_private_info");
    await queryInterface.removeColumn("customer_replies", "customer_feedback");
    await queryInterface.removeColumn("customer_replies", "reject_reason");
    await queryInterface.removeColumn("customer_replies", "attachments");
    await queryInterface.removeColumn("customer_replies", "template_id");
    await queryInterface.removeColumn("customer_replies", "raw_data");
  },
};
