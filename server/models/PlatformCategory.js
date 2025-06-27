const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PlatformCategory = sequelize.define(
    "PlatformCategory",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      platformType: {
        type: DataTypes.ENUM(
          "trendyol",
          "hepsiburada",
          "n11",
          "pazarama",
          "amazon",
          "csv",
          "shopify",
          "woocommerce",
          "magento"
        ),
        allowNull: false,
        comment: "Platform type",
      },
      platformCategoryId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "Platform-specific category ID",
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Category name",
      },
      parentId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "Parent category ID for hierarchy",
      },
      path: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment:
          "Full category path (e.g., 'Electronics > Phones > Smartphones')",
      },
      level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Category hierarchy level",
      },
      isLeaf: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Whether this is a leaf category",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "Whether this category is active",
      },
      fieldDefinitions: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
        comment: "Field definitions for this category",
      },
      requiredFields: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        comment: "Required fields for this category",
      },
      commissionRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: "Commission rate for this category",
      },
      vatRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: "VAT rate for this category",
      },
      restrictions: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
        comment: "Category restrictions",
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
        comment: "Additional metadata",
      },
      lastSyncAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Last sync timestamp",
      },
      syncStatus: {
        type: DataTypes.ENUM("pending", "syncing", "completed", "failed"),
        allowNull: false,
        defaultValue: "pending",
        comment: "Sync status",
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "User who owns this category data",
      },
    },
    {
      tableName: "platform_categories",
      timestamps: true,
      indexes: [
        {
          fields: ["platformType"],
        },
        {
          fields: ["platformCategoryId"],
        },
        {
          fields: ["parentId"],
        },
        {
          fields: ["level"],
        },
        {
          fields: ["isActive"],
        },
        {
          fields: ["lastSyncAt"],
        },
        {
          unique: true,
          fields: ["platformType", "platformCategoryId"],
          name: "platform_categories_platform_category_unique",
        },
        {
          fields: ["platformType", "parentId"],
          name: "platform_categories_platform_parent_idx",
        },
      ],
    }
  );

  PlatformCategory.associate = function (models) {
    // Self-referencing association for category hierarchy
    PlatformCategory.hasMany(PlatformCategory, {
      foreignKey: "parentId",
      sourceKey: "platformCategoryId",
      as: "children",
    });

    PlatformCategory.belongsTo(PlatformCategory, {
      foreignKey: "parentId",
      targetKey: "platformCategoryId",
      as: "parent",
    });

    // Association with User
    PlatformCategory.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });
  };

  // Class methods
  PlatformCategory.getCategoryHierarchy = async function (
    platformType,
    categoryId
  ) {
    const category = await this.findOne({
      where: { platformType, categoryId },
      include: [
        {
          model: this,
          as: "children",
          include: [
            {
              model: this,
              as: "children",
            },
          ],
        },
      ],
    });

    return category;
  };

  PlatformCategory.getCategoryPath = async function (platformType, categoryId) {
    const buildPath = async (catId, path = []) => {
      const category = await this.findOne({
        where: { platformType, categoryId: catId },
      });

      if (!category) return path;

      path.unshift(category.categoryName);

      if (category.parentCategoryId) {
        return buildPath(category.parentCategoryId, path);
      }

      return path;
    };

    return buildPath(categoryId);
  };

  return PlatformCategory;
};
