const express = require('express');
const logger = require("../utils/logger");
const { body, param, query } = require('express-validator');
const router = express.Router();
const { auth } = require('../middleware/auth');
const PlatformVariantController = require('../controllers/platform-variant-controller');

/**
 * Get platform field definitions
 */
router.get(
  '/platforms/:platform/fields',
  auth,
  param('platform').isIn(['trendyol', 'hepsiburada', 'n11']),
  query('categoryId').optional().isString(),
  PlatformVariantController.getPlatformFields
);

/**
 * Get platform categories
 */
router.get(
  '/platforms/:platform/categories',
  auth,
  param('platform').isIn(['trendyol', 'hepsiburada', 'n11']),
  PlatformVariantController.getPlatformCategories
);

/**
 * Get product variants
 */
router.get(
  '/products/:productId/variants',
  auth,
  param('productId').isUUID(),
  PlatformVariantController.getProductVariants
);

/**
 * Create platform variant
 */
router.post(
  '/products/:productId/variants',
  auth,
  param('productId').isUUID(),
  body('platform').isIn(['trendyol', 'hepsiburada', 'n11']),
  body('platformSku').isString().isLength({ min: 1, max: 100 }),
  body('platformFields').isObject(),
  PlatformVariantController.createPlatformVariant
);

/**
 * Update platform variant
 */
router.put(
  '/variants/:variantId',
  auth,
  param('variantId').isUUID(),
  body('platformFields').optional().isObject(),
  body('isPublished').optional().isBoolean(),
  PlatformVariantController.updatePlatformVariant
);

/**
 * Delete platform variant
 */
router.delete(
  '/variants/:variantId',
  auth,
  param('variantId').isUUID(),
  PlatformVariantController.deletePlatformVariant
);

/**
 * Publish variant to platform
 */
router.post(
  '/variants/:variantId/publish',
  auth,
  param('variantId').isUUID(),
  PlatformVariantController.publishVariant
);

/**
 * Sync variant with platform
 */
router.post(
  '/variants/:variantId/sync',
  auth,
  param('variantId').isUUID(),
  PlatformVariantController.syncVariant
);

/**
 * Bulk operations
 */
router.post(
  '/variants/bulk/publish',
  auth,
  body('variantIds').isArray().notEmpty(),
  body('variantIds.*').isUUID(),
  PlatformVariantController.bulkPublishVariants
);

router.post(
  '/variants/bulk/sync',
  auth,
  body('variantIds').isArray().notEmpty(),
  body('variantIds.*').isUUID(),
  PlatformVariantController.bulkSyncVariants
);

/**
 * Seed platform categories for testing
 */
router.post(
  '/platforms/:platform/categories/seed',
  auth,
  param('platform').isIn(['trendyol', 'hepsiburada', 'n11', 'all']),
  async (req, res) => {
    try {
      const { platform } = req.params;
      const userId = req.user.id;

      const PlatformCategorySeedService = require('../services/platform-category-seed-service');

      if (platform === 'all') {
        const result = await PlatformCategorySeedService.reseedCategories(
          userId
        );
        res.json({
          success: true,
          message: 'Platform kategorileri başarıyla oluşturuldu',
          data: result
        });
      } else {
        // For specific platform, we'll just seed all for now
        const result = await PlatformCategorySeedService.seedCategories(userId);
        res.json({
          success: true,
          message: `${platform} kategorileri başarıyla oluşturuldu`,
          data: result
        });
      }
    } catch (error) {
      logger.error('Seed categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Kategoriler oluşturulamadı',
        error: error.message
      });
    }
  }
);

module.exports = router;
