const { PlatformCategory } = require('../models');
const logger = require('../utils/logger');
const PlatformServiceFactory = require('../modules/order-management/services/platforms/platformServiceFactory');

class PlatformCategoryService {
  /**
   * Sync categories from a specific platform
   */
  static async syncCategories(platformType, userId) {
    try {
      logger.info(
        `Starting category sync for ${platformType} - User: ${userId}`
      );

      // Get platform service
      const platformService = PlatformServiceFactory.getService(platformType);
      if (!platformService || !platformService.getCategories) {
        throw new Error(
          `Category sync not supported for platform: ${platformType}`
        );
      }

      // Mark sync as starting
      await this.updateSyncStatus(platformType, userId, 'syncing');

      // Fetch categories from platform
      const platformCategories = await platformService.getCategories();

      if (!platformCategories || !Array.isArray(platformCategories)) {
        throw new Error(`Invalid category data received from ${platformType}`);
      }

      // Process and save categories
      const syncStats = await this.processCategories(
        platformCategories,
        platformType,
        userId
      );

      // Mark sync as completed
      await this.updateSyncStatus(platformType, userId, 'completed');

      logger.info(`Category sync completed for ${platformType}:`, syncStats);

      return {
        success: true,
        platform: platformType,
        stats: syncStats,
        syncedAt: new Date()
      };
    } catch (error) {
      logger.error(`Error syncing categories for ${platformType}:`, error);

      // Mark sync as failed
      await this.updateSyncStatus(
        platformType,
        userId,
        'failed',
        error.message
      );

      throw error;
    }
  }

  /**
   * Process and save categories to database
   */
  static async processCategories(categories, platformType, userId) {
    const stats = {
      total: categories.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };

    try {
      // Build category hierarchy
      const categoryMap = new Map();
      const rootCategories = [];

      // First pass: Create category map
      categories.forEach((cat) => {
        categoryMap.set(cat.id, {
          ...cat,
          children: [],
          level: 0
        });
      });

      // Second pass: Build hierarchy
      categories.forEach((cat) => {
        const category = categoryMap.get(cat.id);
        if (cat.parentId && categoryMap.has(cat.parentId)) {
          const parent = categoryMap.get(cat.parentId);
          parent.children.push(category);
          category.level = parent.level + 1;
        } else {
          rootCategories.push(category);
        }
      });

      // Third pass: Save categories with hierarchy info
      const processCategory = async (category, path = []) => {
        try {
          const currentPath = [...path, category.name];

          // Check if category exists
          const existingCategory = await PlatformCategory.findOne({
            where: {
              platformType,
              platformCategoryId: category.id.toString(),
              userId
            }
          });

          const categoryData = {
            platformType,
            platformCategoryId: category.id.toString(),
            name: category.name,
            parentId: category.parentId?.toString() || null,
            level: category.level,
            path: currentPath.join(' > '),
            isLeaf: category.children.length === 0,
            isActive: category.status !== 'inactive',
            fieldDefinitions: category.fieldDefinitions || {},
            requiredFields: category.requiredFields || [],
            commissionRate: category.commissionRate || null,
            vatRate: category.vatRate || null,
            restrictions: category.restrictions || {},
            metadata: {
              originalData: category,
              syncedAt: new Date()
            },
            lastSyncAt: new Date(),
            syncStatus: 'completed',
            userId
          };

          if (existingCategory) {
            await existingCategory.update(categoryData);
            stats.updated++;
          } else {
            await PlatformCategory.create(categoryData);
            stats.created++;
          }

          // Process children
          for (const child of category.children) {
            await processCategory(child, currentPath);
          }
        } catch (error) {
          logger.error(`Error processing category ${category.id}:`, error);
          stats.errors++;
        }
      };

      // Process all root categories
      for (const rootCategory of rootCategories) {
        await processCategory(rootCategory);
      }
    } catch (error) {
      logger.error('Error processing categories:', error);
      throw error;
    }

    return stats;
  }

  /**
   * Update sync status for platform categories
   */
  static async updateSyncStatus(platformType, userId, status, error = null) {
    try {
      const updateData = {
        syncStatus: status,
        lastSyncAt: new Date()
      };

      if (error) {
        updateData.metadata = {
          syncError: error,
          errorAt: new Date()
        };
      }

      await PlatformCategory.update(updateData, {
        where: {
          platformType,
          userId
        }
      });
    } catch (err) {
      logger.error('Error updating sync status:', err);
    }
  }

  /**
   * Get categories for a platform with hierarchy
   */
  static async getCategoriesWithHierarchy(platformType, userId, options = {}) {
    try {
      const {
        includeInactive = false,
        maxLevel = null,
        search = null,
        leafOnly = false
      } = options;

      const whereClause = {
        platformType,
        userId
      };

      if (!includeInactive) {
        whereClause.isActive = true;
      }

      if (maxLevel !== null) {
        whereClause.level = { [require('sequelize').Op.lte]: maxLevel };
      }

      if (search) {
        whereClause.name = {
          [require('sequelize').Op.iLike]: `%${search}%`
        };
      }

      if (leafOnly) {
        whereClause.isLeaf = true;
      }

      const categories = await PlatformCategory.findAll({
        where: whereClause,
        order: [
          ['level', 'ASC'],
          ['name', 'ASC']
        ]
      });

      // Build hierarchy
      return this.buildCategoryHierarchy(categories);
    } catch (error) {
      logger.error('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Build category hierarchy from flat list
   */
  static buildCategoryHierarchy(categories) {
    const categoryMap = new Map();
    const rootCategories = [];

    // Create map for quick lookup
    categories.forEach((cat) => {
      categoryMap.set(cat.platformCategoryId, {
        ...cat.toJSON(),
        children: []
      });
    });

    // Build hierarchy
    categories.forEach((cat) => {
      const category = categoryMap.get(cat.platformCategoryId);
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        const parent = categoryMap.get(cat.parentId);
        parent.children.push(category);
      } else {
        rootCategories.push(category);
      }
    });

    return rootCategories;
  }

  /**
   * Get category field definitions for template creation
   */
  static async getCategoryFields(platformType, categoryId, userId) {
    try {
      const category = await PlatformCategory.findOne({
        where: {
          platformType,
          platformCategoryId: categoryId,
          userId
        }
      });

      if (!category) {
        throw new Error(`Category not found: ${categoryId}`);
      }

      return {
        category: category.toJSON(),
        fields: category.fieldDefinitions || {},
        requiredFields: category.requiredFields || [],
        restrictions: category.restrictions || {}
      };
    } catch (error) {
      logger.error('Error fetching category fields:', error);
      throw error;
    }
  }

  /**
   * Map product to category fields
   */
  static mapProductToCategory(product, categoryFields) {
    try {
      const { fields, requiredFields } = categoryFields;
      const mapping = {};
      const missing = [];
      const errors = [];

      // Map required fields
      requiredFields.forEach((fieldName) => {
        const fieldDef = fields[fieldName];
        if (!fieldDef) {
          errors.push(`Field definition missing: ${fieldName}`);
          return;
        }

        // Try to map from product data
        const value = this.extractProductValue(product, fieldName, fieldDef);
        if (value !== null && value !== undefined) {
          mapping[fieldName] = value;
        } else {
          missing.push(fieldName);
        }
      });

      // Map optional fields
      Object.keys(fields).forEach((fieldName) => {
        if (!requiredFields.includes(fieldName)) {
          const fieldDef = fields[fieldName];
          const value = this.extractProductValue(product, fieldName, fieldDef);
          if (value !== null && value !== undefined) {
            mapping[fieldName] = value;
          }
        }
      });

      return {
        mapping,
        missing,
        errors,
        isComplete: missing.length === 0 && errors.length === 0
      };
    } catch (error) {
      logger.error('Error mapping product to category:', error);
      throw error;
    }
  }

  /**
   * Extract product value for category field
   */
  static extractProductValue(product, fieldName, fieldDef) {
    try {
      // Common field mappings
      const fieldMappings = {
        title: product.name,
        name: product.name,
        description: product.description,
        price: product.price,
        currency: product.currency || 'TRY',
        brand: product.brand,
        model: product.model,
        sku: product.sku,
        barcode: product.barcode,
        weight: product.weight,
        dimensions: product.dimensions,
        category: product.category,
        tags: product.tags,
        images: product.images
      };

      // Try direct mapping first
      if (fieldMappings[fieldName.toLowerCase()]) {
        return fieldMappings[fieldName.toLowerCase()];
      }

      // Try product attributes
      if (product.attributes && product.attributes[fieldName]) {
        return product.attributes[fieldName];
      }

      // Try various naming conventions
      const variations = [
        fieldName,
        fieldName.toLowerCase(),
        fieldName.toUpperCase(),
        fieldName.replace(/[_-]/g, ''),
        fieldName.replace(/([A-Z])/g, '_$1').toLowerCase()
      ];

      for (const variation of variations) {
        if (product[variation] !== undefined) {
          return product[variation];
        }
      }

      return null;
    } catch (error) {
      logger.error(`Error extracting value for field ${fieldName}:`, error);
      return null;
    }
  }

  /**
   * Get sync status for all platforms
   */
  static async getSyncStatus(userId) {
    try {
      const { sequelize } = require('../models');

      const syncStats = await sequelize.query(
        `
        SELECT 
          "platformType",
          "syncStatus",
          COUNT(*) as "categoryCount",
          MAX("lastSyncAt") as "lastSyncAt"
        FROM "PlatformCategories"
        WHERE "userId" = :userId
        GROUP BY "platformType", "syncStatus"
        ORDER BY "platformType", "syncStatus"
      `,
        {
          replacements: { userId },
          type: sequelize.QueryTypes.SELECT
        }
      );

      // Group by platform
      const statusByPlatform = {};
      syncStats.forEach((stat) => {
        if (!statusByPlatform[stat.platformType]) {
          statusByPlatform[stat.platformType] = {
            total: 0,
            completed: 0,
            failed: 0,
            pending: 0,
            syncing: 0,
            lastSyncAt: null
          };
        }

        const platform = statusByPlatform[stat.platformType];
        platform.total += parseInt(stat.categoryCount);
        platform[stat.syncStatus] = parseInt(stat.categoryCount);

        if (
          !platform.lastSyncAt ||
          new Date(stat.lastSyncAt) > new Date(platform.lastSyncAt)
        ) {
          platform.lastSyncAt = stat.lastSyncAt;
        }
      });

      return statusByPlatform;
    } catch (error) {
      logger.error('Error fetching sync status:', error);
      throw error;
    }
  }
}

module.exports = PlatformCategoryService;
