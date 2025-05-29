"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if columns exist before adding them
    const tableDescription = await queryInterface.describeTable(
      "usage_records"
    );

    if (!tableDescription.overageAllowed) {
      await queryInterface.addColumn("usage_records", "overageAllowed", {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: "Whether overage is allowed for this metric",
      });
    }

    if (!tableDescription.overageRate) {
      await queryInterface.addColumn("usage_records", "overageRate", {
        type: Sequelize.DECIMAL(10, 4),
        defaultValue: 0,
        allowNull: false,
        comment: "Cost per unit over limit (in minor currency units)",
      });
    }

    if (!tableDescription.lastResetAt) {
      await queryInterface.addColumn("usage_records", "lastResetAt", {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
        comment: "When usage was last reset",
      });
    }

    if (!tableDescription.metadata) {
      await queryInterface.addColumn("usage_records", "metadata", {
        type: Sequelize.JSON,
        defaultValue: {},
        allowNull: true,
        comment: "Additional usage tracking metadata",
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("usage_records", "overageAllowed");
    await queryInterface.removeColumn("usage_records", "overageRate");
    await queryInterface.removeColumn("usage_records", "lastResetAt");
    await queryInterface.removeColumn("usage_records", "metadata");
  },
};
