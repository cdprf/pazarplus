"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("enhanced_product_media", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      mainProductId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "main_products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        field: "main_product_id",
      },
      variantId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "platform_variants",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        field: "variant_id",
      },
      type: {
        type: Sequelize.ENUM("image", "gif", "video", "document"),
        allowNull: false,
      },
      url: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      thumbnailUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: "thumbnail_url",
      },
      filename: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      originalName: {
        type: Sequelize.STRING,
        allowNull: true,
        field: "original_name",
      },
      path: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      size: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      mimetype: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      altText: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: "alt_text",
      },
      caption: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      isPrimary: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_primary",
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "sort_order",
      },
      width: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      height: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      duration: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      processedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: "processed_at",
      },
      status: {
        type: Sequelize.ENUM("uploading", "processing", "ready", "failed"),
        allowNull: false,
        defaultValue: "uploading",
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
        field: "user_id",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: "created_at",
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: "updated_at",
      },
    });

    // Add indexes
    await queryInterface.addIndex("enhanced_product_media", [
      "main_product_id",
    ]);
    await queryInterface.addIndex("enhanced_product_media", ["variant_id"]);
    await queryInterface.addIndex("enhanced_product_media", ["type"]);
    await queryInterface.addIndex("enhanced_product_media", ["is_primary"]);
    await queryInterface.addIndex("enhanced_product_media", ["status"]);
    await queryInterface.addIndex("enhanced_product_media", ["user_id"]);
    await queryInterface.addIndex(
      "enhanced_product_media",
      ["main_product_id", "sort_order"],
      {
        name: "enhanced_product_media_sort_order_idx",
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("enhanced_product_media");
  },
};
