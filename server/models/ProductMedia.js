const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ProductMedia = sequelize.define(
    "ProductMedia",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "Products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      variantId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "product_variants",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "If this media is specific to a variant",
      },
      type: {
        type: DataTypes.ENUM("image", "gif", "video", "document"),
        allowNull: false,
        comment: "Type of media file",
      },
      url: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "URL to the media file",
      },
      thumbnailUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "URL to thumbnail version",
      },
      filename: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Stored filename",
      },
      originalName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Original filename",
      },
      mimeType: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "MIME type of the file",
      },
      size: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: "File size in bytes",
      },
      dimensions: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Width and height for images/videos",
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Duration in seconds for videos",
      },
      isPrimary: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Primary media for the product/variant",
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Display order",
      },
      platformSpecific: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
        comment: "Platform-specific media settings",
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
        comment: "Additional metadata (dimensions, colors, etc.)",
      },
      altText: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Alt text for accessibility",
      },
      caption: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Media caption",
      },
      tags: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        comment: "Tags for media categorization",
      },
      platform: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment:
          "Platform where this media is used (e.g., 'trendyol', 'hepsiburada', 'n11')",
      },
      status: {
        type: DataTypes.ENUM(
          "active",
          "inactive",
          "processing",
          "failed",
          "archived"
        ),
        allowNull: false,
        defaultValue: "active",
        comment: "Media status",
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "User who owns this media",
      },
    },
    {
      tableName: "ProductMedias",
      timestamps: true,
      indexes: [
        {
          fields: ["productId"],
        },
        {
          fields: ["variantId"],
        },
        {
          fields: ["type"],
        },
        {
          fields: ["isPrimary"],
        },
        {
          fields: ["productId", "sortOrder"],
          name: "product_media_sort_order_idx",
        },
      ],
      hooks: {
        beforeCreate: (media) => {
          // Auto-generate alt text if not provided
          if (!media.altText && media.filename) {
            media.altText = media.filename.replace(/\.[^/.]+$/, "");
          }
        },
        afterCreate: async (media) => {
          // If this is set as primary, unset others
          if (media.isPrimary) {
            const whereClause = {
              productId: media.productId,
              id: { [sequelize.Sequelize.Op.ne]: media.id },
            };

            // Add variantId condition only if it's defined
            if (media.variantId !== null && media.variantId !== undefined) {
              whereClause.variantId = media.variantId;
            } else {
              whereClause.variantId = { [sequelize.Sequelize.Op.is]: null };
            }

            await ProductMedia.update(
              { isPrimary: false },
              { where: whereClause }
            );
          }
        },
      },
    }
  );

  ProductMedia.associate = function (models) {
    ProductMedia.belongsTo(models.Product, {
      foreignKey: "productId",
      as: "product",
    });

    ProductMedia.belongsTo(models.ProductVariant, {
      foreignKey: "variantId",
      as: "variant",
    });

    ProductMedia.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });
  };

  return ProductMedia;
};
