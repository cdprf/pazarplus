"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add missing columns to customer_replies table
    await queryInterface.addColumn("customer_replies", "platform", {
      type: Sequelize.ENUM("trendyol", "hepsiburada", "n11"),
      allowNull: false,
      defaultValue: "hepsiburada",
    });

    await queryInterface.addColumn("customer_replies", "reply_type", {
      type: Sequelize.ENUM("answer", "reject", "internal_note"),
      allowNull: false,
      defaultValue: "answer",
    });

    await queryInterface.addColumn("customer_replies", "from_type", {
      type: Sequelize.ENUM("merchant", "customer", "admin"),
      allowNull: false,
      defaultValue: "merchant",
    });

    await queryInterface.addColumn("customer_replies", "attachment_urls", {
      type: Sequelize.JSON,
      allowNull: true,
    });

    await queryInterface.addColumn("customer_replies", "submission_status", {
      type: Sequelize.ENUM("pending", "sent", "failed", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    });

    await queryInterface.addColumn("customer_replies", "error_message", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("customer_replies", "retry_count", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn("customer_replies", "last_retry_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("customer_replies", "platform_response", {
      type: Sequelize.JSON,
      allowNull: true,
    });

    // Remove default value after adding column
    await queryInterface.changeColumn("customer_replies", "platform", {
      type: Sequelize.ENUM("trendyol", "hepsiburada", "n11"),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove added columns
    await queryInterface.removeColumn("customer_replies", "platform");
    await queryInterface.removeColumn("customer_replies", "reply_type");
    await queryInterface.removeColumn("customer_replies", "from_type");
    await queryInterface.removeColumn("customer_replies", "attachment_urls");
    await queryInterface.removeColumn("customer_replies", "submission_status");
    await queryInterface.removeColumn("customer_replies", "error_message");
    await queryInterface.removeColumn("customer_replies", "retry_count");
    await queryInterface.removeColumn("customer_replies", "last_retry_at");
    await queryInterface.removeColumn("customer_replies", "platform_response");
  },
};
