"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log("🔄 Updating customer_questions status enum values...");

      // First, add the new enum values to the existing enum type
      await queryInterface.sequelize.query(
        "ALTER TYPE enum_customer_questions_status ADD VALUE IF NOT EXISTS 'WAITING_FOR_ANSWER';",
        { transaction }
      );

      await queryInterface.sequelize.query(
        "ALTER TYPE enum_customer_questions_status ADD VALUE IF NOT EXISTS 'ANSWERED';",
        { transaction }
      );

      await queryInterface.sequelize.query(
        "ALTER TYPE enum_customer_questions_status ADD VALUE IF NOT EXISTS 'REJECTED';",
        { transaction }
      );

      await queryInterface.sequelize.query(
        "ALTER TYPE enum_customer_questions_status ADD VALUE IF NOT EXISTS 'AUTO_CLOSED';",
        { transaction }
      );

      // Update existing data to use new enum values (mapping old to new)
      await queryInterface.sequelize.query(
        `UPDATE customer_questions SET status = 'WAITING_FOR_ANSWER' WHERE status = 'new' OR status = 'pending';`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `UPDATE customer_questions SET status = 'ANSWERED' WHERE status = 'answered';`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `UPDATE customer_questions SET status = 'REJECTED' WHERE status = 'ignored';`,
        { transaction }
      );

      await transaction.commit();
      console.log(
        "✅ Successfully updated customer_questions status enum values"
      );
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Error updating status enum values:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log("🔄 Reverting customer_questions status enum values...");

      // Revert data mappings
      await queryInterface.sequelize.query(
        `UPDATE customer_questions SET status = 'new' WHERE status = 'WAITING_FOR_ANSWER';`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `UPDATE customer_questions SET status = 'answered' WHERE status = 'ANSWERED';`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `UPDATE customer_questions SET status = 'ignored' WHERE status = 'REJECTED';`,
        { transaction }
      );

      // Note: We cannot remove enum values in PostgreSQL, they are permanent once added

      await transaction.commit();
      console.log(
        "✅ Successfully reverted customer_questions status mappings"
      );
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Error reverting status enum values:", error);
      throw error;
    }
  },
};
