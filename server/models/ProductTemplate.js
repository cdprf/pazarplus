const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ProductTemplate = sequelize.define(
    "ProductTemplate",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [1, 255],
        },
      },
      platformType: {
        type: DataTypes.ENUM(
          "trendyol",
          "hepsiburada",
          "n11",
          "pazarama",
          "amazon",
          "global"
        ),
        allowNull: true,
        comment: "Platform-specific template or global",
      },
      categoryId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Platform category ID",
      },
      categoryName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Human-readable category name",
      },
      fieldMappings: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
        comment: "Field mapping configuration for the template",
      },
      requiredFields: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        comment: "List of required fields for this template",
      },
      validationRules: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
        comment: "Validation rules for fields",
      },
      conditionalFields: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
        comment: "Conditional fields configuration",
      },
      defaultValues: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
        comment: "Default values for fields",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "Whether this template is active",
      },
      version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: "Template version for updates",
      },
      parentTemplateId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "ProductTemplates",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        comment: "Parent template for inheritance",
      },
      usage_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Number of times this template has been used",
      },
      last_used: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Last time this template was used",
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
        comment: "User who owns this template",
      },
    },
    {
      tableName: "ProductTemplates",
      timestamps: true,
      indexes: [
        {
          fields: ["platformType"],
        },
        {
          fields: ["categoryId"],
        },
        {
          fields: ["isActive"],
        },
        {
          unique: true,
          fields: ["platformType", "categoryId", "version"],
          name: "product_templates_platform_category_version_unique",
        },
      ],
    }
  );

  ProductTemplate.associate = function (models) {
    ProductTemplate.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });

    ProductTemplate.hasMany(models.Product, {
      foreignKey: "templateId",
      as: "products",
    });

    // Self-referencing for template inheritance
    ProductTemplate.belongsTo(models.ProductTemplate, {
      foreignKey: "parentTemplateId",
      as: "parentTemplate",
    });

    ProductTemplate.hasMany(models.ProductTemplate, {
      foreignKey: "parentTemplateId",
      as: "childTemplates",
    });
  };

  return ProductTemplate;
};
