"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Add missing columns to customer_questions table

      // Product related fields
      await queryInterface.addColumn(
        "customer_questions",
        "product_main_id",
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "customer_questions",
        "product_sku",
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "customer_questions",
        "product_stock_code",
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "customer_questions",
        "product_image_url",
        {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "customer_questions",
        "product_web_url",
        {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        { transaction }
      );

      // Order related fields
      await queryInterface.addColumn(
        "customer_questions",
        "order_number",
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "customer_questions",
        "line_item_id",
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      );

      // Question metadata fields
      await queryInterface.addColumn(
        "customer_questions",
        "public",
        {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "customer_questions",
        "creation_date",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "customer_questions",
        "answered_date",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "customer_questions",
        "answered_date_message",
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "customer_questions",
        "expire_date",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "customer_questions",
        "last_modified_at",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction }
      );

      // Subject/Category fields
      await queryInterface.addColumn(
        "customer_questions",
        "subject_id",
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "customer_questions",
        "subject_description",
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      );

      // Merchant fields
      await queryInterface.addColumn(
        "customer_questions",
        "merchant_id",
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "customer_questions",
        "merchant_name",
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      );

      // Report/Rejection fields
      await queryInterface.addColumn(
        "customer_questions",
        "reported_date",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "customer_questions",
        "report_reason",
        {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "customer_questions",
        "rejected_date",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "customer_questions",
        "reason",
        {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        { transaction }
      );

      // Internal management fields
      await queryInterface.addColumn(
        "customer_questions",
        "question_hash",
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "customer_questions",
        "similar_questions_count",
        {
          type: Sequelize.INTEGER,
          defaultValue: 0,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "customer_questions",
        "assigned_to",
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "customer_questions",
        "tags",
        {
          type: Sequelize.JSON,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "customer_questions",
        "raw_data",
        {
          type: Sequelize.JSON,
          allowNull: true,
        },
        { transaction }
      );

      // Add missing customer_email field (commonly used in queries)
      await queryInterface.addColumn(
        "customer_questions",
        "customer_email",
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      );

      // Create indexes for frequently queried fields
      await queryInterface.addIndex(
        "customer_questions",
        ["platform", "platform_question_id"],
        {
          unique: true,
          name: "customer_questions_platform_question_unique",
          transaction,
        }
      );

      await queryInterface.addIndex("customer_questions", ["customer_name"], {
        name: "customer_questions_customer_name_idx",
        transaction,
      });

      await queryInterface.addIndex("customer_questions", ["customer_email"], {
        name: "customer_questions_customer_email_idx",
        transaction,
      });

      await queryInterface.addIndex(
        "customer_questions",
        ["status", "creation_date"],
        {
          name: "customer_questions_status_creation_date_idx",
          transaction,
        }
      );

      await queryInterface.addIndex("customer_questions", ["question_hash"], {
        name: "customer_questions_question_hash_idx",
        transaction,
      });

      await queryInterface.addIndex("customer_questions", ["assigned_to"], {
        name: "customer_questions_assigned_to_idx",
        transaction,
      });

      await queryInterface.addIndex("customer_questions", ["expire_date"], {
        name: "customer_questions_expire_date_idx",
        transaction,
      });

      await transaction.commit();
      console.log(
        "✅ Successfully added missing columns to customer_questions table"
      );
    } catch (error) {
      await transaction.rollback();
      console.error(
        "❌ Error adding columns to customer_questions table:",
        error
      );
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Remove indexes first
      const indexes = [
        "customer_questions_platform_question_unique",
        "customer_questions_customer_name_idx",
        "customer_questions_customer_email_idx",
        "customer_questions_status_creation_date_idx",
        "customer_questions_question_hash_idx",
        "customer_questions_assigned_to_idx",
        "customer_questions_expire_date_idx",
      ];

      for (const indexName of indexes) {
        try {
          await queryInterface.removeIndex("customer_questions", indexName, {
            transaction,
          });
        } catch (error) {
          console.warn(`Index ${indexName} might not exist:`, error.message);
        }
      }

      // Remove added columns
      const columnsToRemove = [
        "product_main_id",
        "product_sku",
        "product_stock_code",
        "product_image_url",
        "product_web_url",
        "order_number",
        "line_item_id",
        "public",
        "creation_date",
        "answered_date",
        "answered_date_message",
        "expire_date",
        "last_modified_at",
        "subject_id",
        "subject_description",
        "merchant_id",
        "merchant_name",
        "reported_date",
        "report_reason",
        "rejected_date",
        "reason",
        "question_hash",
        "similar_questions_count",
        "assigned_to",
        "tags",
        "raw_data",
        "customer_email",
      ];

      for (const column of columnsToRemove) {
        try {
          await queryInterface.removeColumn("customer_questions", column, {
            transaction,
          });
        } catch (error) {
          console.warn(`Column ${column} might not exist:`, error.message);
        }
      }

      await transaction.commit();
      console.log(
        "✅ Successfully removed added columns from customer_questions table"
      );
    } catch (error) {
      await transaction.rollback();
      console.error(
        "❌ Error removing columns from customer_questions table:",
        error
      );
      throw error;
    }
  },
};
