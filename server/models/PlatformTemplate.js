const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

/**
 * Platform Template Model
 * Stores platform and category-specific field templates
 */
class PlatformTemplate extends Model {}

PlatformTemplate.init(
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
    platform: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [
          [
            "trendyol",
            "hepsiburada",
            "n11",
            "amazon",
            "gittigidiyor",
            "custom",
          ],
        ],
      },
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Platform-specific category this template applies to",
    },
    subcategory: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "More specific category targeting",
    },

    // Field Definitions
    requiredFields: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: "Array of required field definitions",
    },
    optionalFields: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: "Array of optional field definitions",
    },
    fieldValidations: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: "Validation rules for each field",
    },

    // Auto-learning Data
    learnedFromProducts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Number of products this template was learned from",
    },
    lastLearningUpdate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Last time auto-learning updated this template",
    },
    learningConfidence: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 1,
      },
      comment: "Confidence score for auto-learned fields",
    },

    // Template Configuration
    defaultValues: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: "Default values for template fields",
    },
    fieldMappings: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: "Mappings from main product fields to platform fields",
    },
    conditionalFields: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: "Fields that appear based on other field values",
    },

    // Platform-specific Configuration
    platformApiVersion: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Platform API version this template targets",
    },
    platformCategoryId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Platform's internal category ID",
    },
    platformCategoryPath: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: "Full category path in platform hierarchy",
    },

    // Validation and Processing Rules
    preProcessingRules: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: "Rules for preprocessing data before sending to platform",
    },
    postProcessingRules: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: "Rules for processing data received from platform",
    },

    // Media Requirements
    mediaRequirements: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: "Platform-specific media requirements and transformations",
    },

    // Usage Statistics
    usageCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Number of times this template has been used",
    },
    successRate: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true,
      comment: "Success rate of products using this template",
    },

    // Status and Versioning
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    version: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "1.0.0",
      comment: "Template version for change tracking",
    },
    parentTemplateId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "platform_templates",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      comment: "Parent template if this is a derived version",
    },

    // Auto-discovery Settings
    autoDiscovery: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "Whether this template participates in auto-discovery",
    },
    discoveryPatterns: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: "Patterns used for automatic template selection",
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
    },
  },
  {
    sequelize,
    modelName: "PlatformTemplate",
    tableName: "platform_templates",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["platform", "category", "subcategory", "userId"],
        name: "platform_templates_unique_category",
      },
      {
        fields: ["platform"],
      },
      {
        fields: ["category"],
      },
      {
        fields: ["isActive"],
      },
      {
        fields: ["autoDiscovery"],
      },
      {
        fields: ["userId"],
      },
      {
        fields: ["parentTemplateId"],
      },
    ],
    hooks: {
      afterUpdate: async (template) => {
        // Update usage statistics
        if (template.changed("usageCount")) {
          // Calculate success rate based on usage
          const { PlatformVariant } = require("./index");
          const variants = await PlatformVariant.findAll({
            where: { templateId: template.id },
          });

          const successfulVariants = variants.filter(
            (v) => v.syncStatus === "success"
          );
          const successRate =
            variants.length > 0
              ? successfulVariants.length / variants.length
              : 0;

          await template.update({ successRate }, { hooks: false });
        }
      },
    },
  }
);

// Static methods for template management
PlatformTemplate.findBestTemplate = async function (
  platform,
  category,
  productAttributes = {}
) {
  const templates = await this.findAll({
    where: {
      platform,
      category: category || null,
      isActive: true,
      autoDiscovery: true,
    },
    order: [
      ["learningConfidence", "DESC"],
      ["successRate", "DESC"],
      ["usageCount", "DESC"],
    ],
  });

  // Simple matching logic - can be enhanced
  return templates[0] || null;
};

PlatformTemplate.learnFromProduct = async function (
  platform,
  category,
  productData,
  userId
) {
  // Find or create template for this platform/category
  let template = await this.findOne({
    where: {
      platform,
      category: category || null,
      userId,
    },
  });

  if (!template) {
    template = await this.create({
      name: `Auto-learned ${platform} ${category || "General"} Template`,
      platform,
      category,
      userId,
      learnedFromProducts: 0,
    });
  }

  // Extract field patterns from product data
  const requiredFields = [];
  const optionalFields = [];

  // Analyze product data structure
  Object.keys(productData).forEach((key) => {
    if (productData[key] !== null && productData[key] !== undefined) {
      const fieldDef = {
        name: key,
        type: typeof productData[key],
        sample: productData[key],
      };

      // Determine if field is required based on platform knowledge
      if (["name", "price", "category"].includes(key)) {
        requiredFields.push(fieldDef);
      } else {
        optionalFields.push(fieldDef);
      }
    }
  });

  // Update template with learned data
  await template.update({
    requiredFields: this.mergeFieldDefinitions(
      template.requiredFields,
      requiredFields
    ),
    optionalFields: this.mergeFieldDefinitions(
      template.optionalFields,
      optionalFields
    ),
    learnedFromProducts: template.learnedFromProducts + 1,
    lastLearningUpdate: new Date(),
    learningConfidence: Math.min(1.0, template.learnedFromProducts / 10),
  });

  return template;
};

PlatformTemplate.mergeFieldDefinitions = function (existing, newFields) {
  const merged = [...existing];

  newFields.forEach((newField) => {
    const existingField = merged.find((f) => f.name === newField.name);
    if (!existingField) {
      merged.push(newField);
    } else {
      // Update existing field with new information
      existingField.samples = existingField.samples || [];
      if (!existingField.samples.includes(newField.sample)) {
        existingField.samples.push(newField.sample);
      }
    }
  });

  return merged;
};

// PlatformTemplate associations
PlatformTemplate.associate = function (models) {
  PlatformTemplate.belongsTo(models.User, {
    foreignKey: "userId",
    as: "user",
  });

  PlatformTemplate.belongsTo(models.PlatformTemplate, {
    foreignKey: "parentTemplateId",
    as: "parentTemplate",
  });

  PlatformTemplate.hasMany(models.PlatformTemplate, {
    foreignKey: "parentTemplateId",
    as: "childTemplates",
  });

  PlatformTemplate.hasMany(models.PlatformVariant, {
    foreignKey: "templateId",
    as: "variants",
  });
};

module.exports = PlatformTemplate;
