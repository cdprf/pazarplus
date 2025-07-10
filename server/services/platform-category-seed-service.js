const { PlatformCategory } = require('../models');
const logger = require('../utils/logger');

/**
 * Platform Category Seeder Service
 * Seeds sample platform categories for testing
 */
class PlatformCategorySeedService {
  /**
   * Seed platform categories for testing
   */
  static async seedCategories(userId) {
    try {
      logger.info(`Seeding platform categories for user ${userId}`);

      // Trendyol categories
      const trendyolCategories = [
        {
          platformCategoryId: '1',
          name: 'Kadın',
          path: 'Kadın',
          platform: 'trendyol',
          parentId: null,
          hasChildren: true,
          isActive: true,
          userId
        },
        {
          platformCategoryId: '2',
          name: 'Giyim',
          path: 'Kadın > Giyim',
          platform: 'trendyol',
          parentId: '1',
          hasChildren: true,
          isActive: true,
          userId
        },
        {
          platformCategoryId: '3',
          name: 'Bluz',
          path: 'Kadın > Giyim > Bluz',
          platform: 'trendyol',
          parentId: '2',
          hasChildren: false,
          isActive: true,
          userId
        },
        {
          platformCategoryId: '4',
          name: 'Elbise',
          path: 'Kadın > Giyim > Elbise',
          platform: 'trendyol',
          parentId: '2',
          hasChildren: false,
          isActive: true,
          userId
        },
        {
          platformCategoryId: '10',
          name: 'Erkek',
          path: 'Erkek',
          platform: 'trendyol',
          parentId: null,
          hasChildren: true,
          isActive: true,
          userId
        },
        {
          platformCategoryId: '456',
          name: 'Elektronik',
          path: 'Elektronik',
          platform: 'trendyol',
          parentId: null,
          hasChildren: true,
          isActive: true,
          userId
        },
        {
          platformCategoryId: '457',
          name: 'Telefon & Aksesuar',
          path: 'Elektronik > Telefon & Aksesuar',
          platform: 'trendyol',
          parentId: '456',
          hasChildren: false,
          isActive: true,
          userId
        }
      ];

      // Hepsiburada categories
      const hepsiburadaCategories = [
        {
          platformCategoryId: '100',
          name: 'Elektronik',
          path: 'Elektronik',
          platform: 'hepsiburada',
          parentId: null,
          hasChildren: true,
          isActive: true,
          userId
        },
        {
          platformCategoryId: '101',
          name: 'Bilgisayar/Tablet',
          path: 'Elektronik > Bilgisayar/Tablet',
          platform: 'hepsiburada',
          parentId: '100',
          hasChildren: true,
          isActive: true,
          userId
        },
        {
          platformCategoryId: '102',
          name: 'Laptop',
          path: 'Elektronik > Bilgisayar/Tablet > Laptop',
          platform: 'hepsiburada',
          parentId: '101',
          hasChildren: false,
          isActive: true,
          userId
        },
        {
          platformCategoryId: '200',
          name: 'Moda',
          path: 'Moda',
          platform: 'hepsiburada',
          parentId: null,
          hasChildren: true,
          isActive: true,
          userId
        },
        {
          platformCategoryId: '201',
          name: 'Kadın Giyim',
          path: 'Moda > Kadın Giyim',
          platform: 'hepsiburada',
          parentId: '200',
          hasChildren: false,
          isActive: true,
          userId
        }
      ];

      // N11 categories
      const n11Categories = [
        {
          platformCategoryId: '1000',
          name: 'Bilgisayar',
          path: 'Bilgisayar',
          platform: 'n11',
          parentId: null,
          hasChildren: true,
          isActive: true,
          userId
        },
        {
          platformCategoryId: '1001',
          name: 'Notebook',
          path: 'Bilgisayar > Notebook',
          platform: 'n11',
          parentId: '1000',
          hasChildren: false,
          isActive: true,
          userId
        },
        {
          platformCategoryId: '2000',
          name: 'Giyim & Moda',
          path: 'Giyim & Moda',
          platform: 'n11',
          parentId: null,
          hasChildren: true,
          isActive: true,
          userId
        },
        {
          platformCategoryId: '2001',
          name: 'Kadın',
          path: 'Giyim & Moda > Kadın',
          platform: 'n11',
          parentId: '2000',
          hasChildren: true,
          isActive: true,
          userId
        },
        {
          platformCategoryId: '2002',
          name: 'Kadın Giyim',
          path: 'Giyim & Moda > Kadın > Kadın Giyim',
          platform: 'n11',
          parentId: '2001',
          hasChildren: false,
          isActive: true,
          userId
        }
      ];

      const allCategories = [
        ...trendyolCategories,
        ...hepsiburadaCategories,
        ...n11Categories
      ];

      // Insert categories using upsert to avoid duplicates
      for (const category of allCategories) {
        await PlatformCategory.upsert(category, {
          where: {
            platformCategoryId: category.platformCategoryId,
            platform: category.platform,
            userId: category.userId
          }
        });
      }

      logger.info(
        `Successfully seeded ${allCategories.length} platform categories`
      );

      return {
        success: true,
        message: `Seeded ${allCategories.length} platform categories`,
        counts: {
          trendyol: trendyolCategories.length,
          hepsiburada: hepsiburadaCategories.length,
          n11: n11Categories.length
        }
      };
    } catch (error) {
      logger.error('Error seeding platform categories:', error);
      throw error;
    }
  }

  /**
   * Clean existing categories for a user
   */
  static async cleanCategories(userId) {
    try {
      const deleted = await PlatformCategory.destroy({
        where: { userId }
      });

      logger.info(`Cleaned ${deleted} platform categories for user ${userId}`);
      return deleted;
    } catch (error) {
      logger.error('Error cleaning platform categories:', error);
      throw error;
    }
  }

  /**
   * Reseed categories (clean and seed)
   */
  static async reseedCategories(userId) {
    try {
      await this.cleanCategories(userId);
      return await this.seedCategories(userId);
    } catch (error) {
      logger.error('Error reseeding platform categories:', error);
      throw error;
    }
  }
}

module.exports = PlatformCategorySeedService;
