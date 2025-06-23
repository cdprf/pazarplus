const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const EnhancedProductMedia = sequelize.define(
    "EnhancedProductMedia",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      mainProductId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "main_products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "Main product this media belongs to",
      },
      variantId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "platform_variants",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment:
          "Platform variant this media is specific to (null for shared media)",
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
        allowNull: false,
        comment: "Original filename",
      },
      originalName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Original uploaded filename",
      },
      path: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "Relative path to the file",
      },
      size: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "File size in bytes",
      },
      mimetype: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "MIME type of the file",
      },
      altText: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Alternative text for accessibility",
      },
      caption: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Caption or description",
      },
      isPrimary: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Is this the primary media for the product/variant",
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Sort order for displaying media",
      },
      width: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Image/video width in pixels",
      },
      height: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Image/video height in pixels",
      },
      duration: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: "Video duration in seconds",
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: "Additional metadata (EXIF, processing info, etc.)",
      },
      processedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "When media processing was completed",
      },
      status: {
        type: DataTypes.ENUM("uploading", "processing", "ready", "failed"),
        allowNull: false,
        defaultValue: "uploading",
        comment: "Processing status of the media",
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
        comment: "User who uploaded this media",
      },
    },
    {
      tableName: "enhanced_product_media",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          fields: ["mainProductId"],
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
          fields: ["status"],
        },
        {
          fields: ["userId"],
        },
        {
          fields: ["mainProductId", "sortOrder"],
          name: "enhanced_product_media_sort_order_idx",
        },
      ],
      hooks: {
        beforeCreate: (media) => {
          // Auto-generate alt text if not provided
          if (!media.altText && media.originalName) {
            media.altText = media.originalName.replace(/\.[^/.]+$/, "");
          }
        },
        afterCreate: async (media) => {
          // If this is set as primary, unset others
          if (media.isPrimary) {
            const whereClause = {
              mainProductId: media.mainProductId,
              id: { [sequelize.Sequelize.Op.ne]: media.id },
            };

            // Add variantId condition
            if (media.variantId !== null && media.variantId !== undefined) {
              whereClause.variantId = media.variantId;
            } else {
              whereClause.variantId = { [sequelize.Sequelize.Op.is]: null };
            }

            await EnhancedProductMedia.update(
              { isPrimary: false },
              { where: whereClause }
            );
          }
        },
      },
    }
  );

  EnhancedProductMedia.associate = function (models) {
    // MainProduct association
    EnhancedProductMedia.belongsTo(models.MainProduct, {
      foreignKey: "mainProductId",
      as: "mainProduct",
    });
    models.MainProduct.hasMany(EnhancedProductMedia, {
      foreignKey: "mainProductId",
      as: "mediaAssets",
      onDelete: "CASCADE",
    });

    // PlatformVariant association
    EnhancedProductMedia.belongsTo(models.PlatformVariant, {
      foreignKey: "variantId",
      as: "variant",
    });
    models.PlatformVariant.hasMany(EnhancedProductMedia, {
      foreignKey: "variantId",
      as: "mediaAssets",
      onDelete: "CASCADE",
    });

    // User association
    EnhancedProductMedia.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });
    models.User.hasMany(EnhancedProductMedia, {
      foreignKey: "userId",
      as: "enhancedProductMedia",
      onDelete: "CASCADE",
    });
  };

  return EnhancedProductMedia;
};
