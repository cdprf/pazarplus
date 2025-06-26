const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add variant detection fields to products table
    await queryInterface.addColumn("products", "variantType", {
      type: DataTypes.ENUM(
        "color",
        "size",
        "model",
        "feature",
        "mixed",
        "unknown"
      ),
      allowNull: true,
      comment: "Type of variant (color, size, etc.)",
    });

    await queryInterface.addColumn("products", "variantValue", {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Specific variant value (e.g., "Red" for color variant)',
    });

    await queryInterface.addColumn("products", "parentProductId", {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "products",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      comment: "Parent product ID for variants",
    });

    await queryInterface.addColumn("products", "variantDetectionConfidence", {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 1,
      },
      comment: "Confidence score of variant detection (0.0 - 1.0)",
    });

    await queryInterface.addColumn("products", "variantDetectionSource", {
      type: DataTypes.ENUM(
        "auto",
        "manual",
        "platform",
        "sku_analysis",
        "text_analysis"
      ),
      allowNull: true,
      comment: "Source of variant detection",
    });

    if (!(await columnExists("products", "lastVariantDetectionAt"))) {
      await queryInterface.addColumn("products", "lastVariantDetectionAt", {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Last time variant detection was run on this product",
      });
    }

    if (!(await columnExists("products", "sourcePlatform"))) {
      await queryInterface.addColumn("products", "sourcePlatform", {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: "Platform where this product was originally sourced from",
      });
    }

    // Add indexes for the new fields
    await queryInterface.addIndex("products", ["isVariant"], {
      name: "products_is_variant_idx",
    });

    await queryInterface.addIndex("products", ["isMainProduct"], {
      name: "products_is_main_product_idx",
    });

    await queryInterface.addIndex("products", ["variantGroupId"], {
      name: "products_variant_group_id_idx",
    });

    await queryInterface.addIndex("products", ["parentProductId"], {
      name: "products_parent_product_id_idx",
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex("products", "products_is_variant_idx");
    await queryInterface.removeIndex(
      "products",
      "products_is_main_product_idx"
    );
    await queryInterface.removeIndex(
      "products",
      "products_variant_group_id_idx"
    );
    await queryInterface.removeIndex(
      "products",
      "products_parent_product_id_idx"
    );

    // Remove columns
    await queryInterface.removeColumn("products", "isVariant");
    await queryInterface.removeColumn("products", "isMainProduct");
    await queryInterface.removeColumn("products", "variantGroupId");
    await queryInterface.removeColumn("products", "variantType");
    await queryInterface.removeColumn("products", "variantValue");
    await queryInterface.removeColumn("products", "parentProductId");
    await queryInterface.removeColumn("products", "variantDetectionConfidence");
    await queryInterface.removeColumn("products", "variantDetectionSource");
    await queryInterface.removeColumn("products", "lastVariantDetectionAt");
  },
};
