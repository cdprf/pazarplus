const { PlatformCategory } = require("../models");
const TrendyolService = require("../modules/order-management/services/platforms/trendyol/trendyol-service");
const HepsiburadaService = require("../modules/order-management/services/platforms/hepsiburada/hepsiburada-service");
const N11Service = require("../modules/order-management/services/platforms/n11/n11-service");
const logger = require("../utils/logger");
const { Op } = require("sequelize");
const { sanitizePlatformType } = require("../utils/enum-validators");

/**
 * Service for synchronizing platform categories
 */
class CategorySyncService {
  constructor() {
    this.logger = logger;
    this.supportedPlatforms = ["trendyol", "hepsiburada", "n11"];
  }

  /**
   * Get platform service instance
   * @param {string} platform - Platform name
   * @param {string} userId - User ID
   * @param {string} connectionId - Connection ID (optional, will lookup by user if not provided)
   * @returns {Object} Platform service instance
   */
  async getPlatformService(platform, userId, connectionId) {
    try {
      const { PlatformConnection } = require("../models");

      let actualConnectionId = connectionId;

      // If no connectionId provided, look up by user and platform
      if (!actualConnectionId) {
        const connection = await PlatformConnection.findOne({
          where: {
            userId: userId,
            platformType: platform,
            isActive: true,
          },
        });

        if (!connection) {
          throw new Error(`No active ${platform} connection found for user`);
        }

        actualConnectionId = connection.id;
        this.logger.debug(`Found connection for ${platform}`, {
          userId,
          connectionId: actualConnectionId,
        });
      }

      let ServiceClass;

      switch (platform.toLowerCase()) {
        case "trendyol":
          ServiceClass = TrendyolService;
          break;
        case "hepsiburada":
          ServiceClass = HepsiburadaService;
          break;
        case "n11":
          ServiceClass = N11Service;
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      // Pass the connection ID (integer) as the first parameter, not userId
      const service = new ServiceClass(actualConnectionId);
      await service.initialize();
      return service;
    } catch (error) {
      this.logger.error(`Failed to initialize ${platform} service:`, error);
      throw error;
    }
  }

  /**
   * Sync categories for a specific platform
   * @param {string} platform - Platform name
   * @param {string} userId - User ID
   * @param {string} connectionId - Connection ID
   * @param {boolean} forceRefresh - Force refresh even if recently synced
   * @returns {Promise<Object>} Sync result
   */
  async syncPlatformCategories(
    platform,
    userId,
    connectionId,
    forceRefresh = false
  ) {
    try {
      // Validate platform type before database operations
      const sanitizedPlatform = sanitizePlatformType(platform);
      if (!sanitizedPlatform) {
        throw new Error(`Invalid platform type: ${platform}`);
      }

      this.logger.info(`Starting category sync for ${sanitizedPlatform}`, {
        userId,
        connectionId,
        forceRefresh,
      });

      // Check if we need to sync (avoid too frequent syncs)
      if (!forceRefresh) {
        const recentSync = await PlatformCategory.findOne({
          where: {
            platformType: sanitizedPlatform,
            updatedAt: {
              [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
            },
          },
          order: [["updatedAt", "DESC"]],
        });

        if (recentSync) {
          this.logger.info(
            `Categories for ${sanitizedPlatform} were synced recently, skipping`,
            {
              lastSync: recentSync.updatedAt,
            }
          );

          const existingCategories = await PlatformCategory.findAll({
            where: { platformType: sanitizedPlatform, isActive: true },
            order: [["name", "ASC"]],
          });

          return {
            success: true,
            message: "Categories are up to date",
            categoriesCount: existingCategories.length,
            lastSync: recentSync.updatedAt,
            categories: existingCategories,
          };
        }
      }

      // Get platform service
      const service = await this.getPlatformService(
        sanitizedPlatform,
        userId,
        connectionId
      );

      // Fetch categories from platform API
      const platformCategories = await service.getCategories();

      if (!platformCategories || platformCategories.length === 0) {
        throw new Error(`No categories received from ${sanitizedPlatform} API`);
      }

      this.logger.info(
        `Received ${platformCategories.length} categories from ${sanitizedPlatform}`,
        {
          sampleCategory: platformCategories[0],
        }
      );

      // Process and save categories
      const savedCategories = [];

      for (const platformCategory of platformCategories) {
        try {
          const categoryData = this.transformPlatformCategory(
            sanitizedPlatform,
            platformCategory,
            userId
          );

          const [category, created] = await PlatformCategory.upsert(
            categoryData,
            {
              where: {
                platformType: sanitizedPlatform,
                platformCategoryId: categoryData.platformCategoryId,
              },
            }
          );

          savedCategories.push(category);

          if (created) {
            this.logger.debug(`Created new category: ${categoryData.name}`);
          } else {
            this.logger.debug(
              `Updated existing category: ${categoryData.name}`
            );
          }
        } catch (categoryError) {
          this.logger.error(
            `Error processing category ${
              platformCategory.id || platformCategory.name
            }:`,
            {
              error: categoryError.message,
              category: platformCategory,
            }
          );
        }
      }

      this.logger.info(
        `Successfully synced ${savedCategories.length} categories for ${platform}`,
        {
          userId,
          platform,
        }
      );

      return {
        success: true,
        message: `Successfully synced ${savedCategories.length} categories`,
        categoriesCount: savedCategories.length,
        lastSync: new Date(),
        categories: savedCategories,
      };
    } catch (error) {
      this.logger.error(`Failed to sync categories for ${platform}:`, {
        error: error.message,
        stack: error.stack,
        userId,
        platform,
      });

      throw error;
    }
  }

  /**
   * Transform platform-specific category data to our standard format
   * @param {string} platform - Platform name
   * @param {Object} platformCategory - Platform category data
   * @param {string} userId - User ID
   * @returns {Object} Transformed category data
   */
  transformPlatformCategory(platform, platformCategory, userId) {
    const baseData = {
      platformType: platform,
      platformCategoryId: String(
        platformCategory.id || platformCategory.categoryId
      ),
      name: platformCategory.name || platformCategory.categoryName,
      parentId:
        platformCategory.parentId || platformCategory.parentCategoryId
          ? String(
              platformCategory.parentId || platformCategory.parentCategoryId
            )
          : null,
      isActive: true,
      userId: userId, // Add userId to base data to satisfy database constraint
      level: 0,
      isLeaf: false,
      fieldDefinitions: {},
      requiredFields: [],
      restrictions: {},
      metadata: {},
      syncStatus: "completed",
      lastSyncAt: new Date(),
    };

    // Platform-specific transformations (only use fields that exist)
    switch (platform) {
      case "trendyol":
        return {
          ...baseData,
          path: platformCategory.path || null,
          level: platformCategory.level || 0,
          isLeaf: platformCategory.leaf || false,
          fieldDefinitions: platformCategory.attributes || {},
          requiredFields: platformCategory.requiredAttributes || [],
          commissionRate: platformCategory.commissionRate || null,
        };

      case "hepsiburada":
        return {
          ...baseData,
          path: platformCategory.categoryPath || null,
          level: platformCategory.level || 0,
          isLeaf: !platformCategory.hasChildren,
          fieldDefinitions: platformCategory.attributes || {},
          requiredFields: platformCategory.mandatoryAttributes || [],
        };

      case "n11":
        return {
          ...baseData,
          path: platformCategory.fullPath || platformCategory.fullName || null,
          level: platformCategory.level || 0,
          isLeaf: platformCategory.isLeaf || !platformCategory.hasChildren,
          fieldDefinitions: platformCategory.attributes || {},
          requiredFields: platformCategory.requiredAttributes || [],
        };

      default:
        return baseData;
    }
  }

  /**
   * Get categories from database (with option to sync if needed)
   * @param {string} platform - Platform name
   * @param {string} userId - User ID
   * @param {string} connectionId - Connection ID
   * @param {boolean} autoSync - Auto sync if no categories found
   * @returns {Promise<Array>} Categories
   */
  async getCategories(platform, userId, connectionId, autoSync = true) {
    try {
      // Try to get from database first using raw query to avoid model issues
      const [categories] = await PlatformCategory.sequelize.query(
        `SELECT id, "platformType", "platformCategoryId", name, "parentId", path, level, "isLeaf", "isActive", "fieldDefinitions", "requiredFields", "commissionRate", "createdAt", "updatedAt"
         FROM platform_categories 
         WHERE "platformType" = :platform AND "isActive" = true 
         ORDER BY name ASC`,
        {
          replacements: { platform },
        }
      );

      // If no categories found and autoSync is enabled, sync from platform
      if (categories.length === 0 && autoSync) {
        this.logger.info(
          `No categories found for ${platform}, attempting auto-sync`
        );

        const syncResult = await this.syncPlatformCategories(
          platform,
          userId,
          connectionId
        );
        return syncResult.categories || [];
      }

      return categories;
    } catch (error) {
      this.logger.error(`Error getting categories for ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Sync categories for all platforms for a user
   * @param {string} userId - User ID
   * @param {Object} connections - Platform connections { platform: connectionId }
   * @param {boolean} forceRefresh - Force refresh all platforms
   * @returns {Promise<Object>} Sync results for all platforms
   */
  async syncAllPlatforms(userId, connections, forceRefresh = false) {
    const results = {};

    for (const platform of this.supportedPlatforms) {
      if (connections[platform]) {
        try {
          results[platform] = await this.syncPlatformCategories(
            platform,
            userId,
            connections[platform],
            forceRefresh
          );
        } catch (error) {
          results[platform] = {
            success: false,
            message: error.message,
            error: error.message,
          };
        }
      } else {
        results[platform] = {
          success: false,
          message: `No connection configured for ${platform}`,
          skipped: true,
        };
      }
    }

    return results;
  }

  /**
   * Get sync status for all platforms
   * @param {string} userId - User ID
   * @returns {Promise<Object} Sync status for each platform
   */
  async getSyncStatus(userId) {
    const status = {};

    for (const platform of this.supportedPlatforms) {
      // Use raw query to avoid model issues
      const [latestSyncArray] = await PlatformCategory.sequelize.query(
        `SELECT "platformType", "updatedAt" 
         FROM platform_categories 
         WHERE "platformType" = :platform 
         ORDER BY "updatedAt" DESC 
         LIMIT 1`,
        {
          replacements: { platform },
        }
      );

      const [categoryCountArray] = await PlatformCategory.sequelize.query(
        `SELECT COUNT(*) as count 
         FROM platform_categories 
         WHERE "platformType" = :platform AND "isActive" = true`,
        {
          replacements: { platform },
        }
      );

      const latestSync = latestSyncArray[0];
      const categoryCount = parseInt(categoryCountArray[0].count);

      status[platform] = {
        syncStatus: latestSync ? "completed" : "pending",
        lastSyncAt: latestSync?.updatedAt || null,
        categoryCount,
        needsSync:
          !latestSync ||
          new Date(latestSync.updatedAt) <
            new Date(Date.now() - 24 * 60 * 60 * 1000),
      };
    }

    return status;
  }

  /**
   * Import categories with field mappings
   * @param {string} platform - Platform name
   * @param {Array} categories - Categories to import
   * @param {Object} fieldMappings - Field mappings configuration
   * @param {string} userId - User ID
   * @returns {Object} Import result
   */
  async importCategoriesWithMapping(
    platform,
    categories,
    fieldMappings = {},
    userId
  ) {
    try {
      this.logger.info(
        `📥 Importing ${categories.length} categories for platform: ${platform}`
      );

      if (!this.supportedPlatforms.includes(platform)) {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      const importedCategories = [];
      const errors = [];

      for (const categoryData of categories) {
        try {
          // Apply field mappings if provided
          const mappedData = this.applyFieldMappings(
            categoryData,
            fieldMappings
          );

          // Check if category already exists
          const existingCategory = await PlatformCategory.findOne({
            where: {
              platform: platform,
              platformCategoryId:
                categoryData.platformCategoryId || categoryData.id,
              userId: userId,
            },
          });

          if (existingCategory) {
            this.logger.info(
              `⚠️ Category already exists: ${categoryData.name} (${categoryData.platformCategoryId})`
            );
            continue;
          }

          // Create new category record
          const newCategory = await PlatformCategory.create({
            platform: platform,
            platformCategoryId: mappedData.platformCategoryId || mappedData.id,
            name: mappedData.name,
            path: mappedData.path || mappedData.fullPath,
            level: mappedData.level || 0,
            parentId: mappedData.parentId,
            isLeaf: mappedData.isLeaf || false,
            isActive: mappedData.isActive !== false,
            commissionRate: mappedData.commissionRate,
            requiredFields: mappedData.requiredFields || [],
            fieldDefinitions: mappedData.fieldDefinitions || {},
            metadata: {
              ...mappedData,
              fieldMappings: fieldMappings,
              importedAt: new Date(),
            },
            userId: userId,
          });

          importedCategories.push(newCategory);
          this.logger.info(`✅ Imported category: ${newCategory.name}`);
        } catch (categoryError) {
          this.logger.error(
            `❌ Error importing category ${categoryData.name}:`,
            categoryError
          );
          errors.push({
            category: categoryData.name,
            error: categoryError.message,
          });
        }
      }

      this.logger.info(
        `✅ Import completed for ${platform}: ${importedCategories.length} categories imported, ${errors.length} errors`
      );

      return {
        imported: importedCategories.length,
        errors: errors.length,
        categories: importedCategories,
        errorDetails: errors,
      };
    } catch (error) {
      this.logger.error(
        `❌ Error importing categories for ${platform}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Apply field mappings to category data
   * @param {Object} categoryData - Original category data
   * @param {Object} fieldMappings - Field mappings configuration
   * @returns {Object} Mapped category data
   */
  applyFieldMappings(categoryData, fieldMappings) {
    const mappedData = { ...categoryData };

    // Apply field mappings if provided
    for (const [sourceField, targetField] of Object.entries(fieldMappings)) {
      if (categoryData[sourceField] !== undefined && targetField) {
        mappedData[targetField] = categoryData[sourceField];
        this.logger.debug(`🔄 Mapped field: ${sourceField} -> ${targetField}`);
      }
    }

    return mappedData;
  }
}

module.exports = CategorySyncService;
