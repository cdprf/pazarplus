const TrendyolService = require('../modules/order-management/services/platforms/trendyol/trendyol-service');
const HepsiburadaService = require('../modules/order-management/services/platforms/hepsiburada/hepsiburada-service');
const N11Service = require('../modules/order-management/services/platforms/n11/n11-service');
const CategorySyncService = require('../services/CategorySyncService');
const logger = require('../utils/logger');

/**
 * Platform Product Controller
 * Handles product creation, updating, and management across all marketplace platforms
 */
class PlatformProductController {
  constructor() {
    this.logger = logger;
    this.categorySyncService = new CategorySyncService();
  }

  /**
   * Get user ID with development fallback
   * @param {Object} req - Express request object
   * @returns {string} User ID
   */
  getUserId(req) {
    let userId = req.user?.id;
    if (!userId) {
      // Development fallback - use an existing user with platform connections
      userId = '38d86fd2-bf87-4271-b49d-f1a7645ee4ef'; // User that has active connections
      this.logger.warn('⚠️ Using fallback user ID for development', {
        fallbackUserId: userId,
        originalUrl: req.originalUrl
      });
    }
    return userId;
  }

  /**
   * Create a single product on a specific platform
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createProduct(req, res) {
    try {
      const { platformId } = req.params;
      const { productData, connectionId } = req.body;
      const userId = this.getUserId(req);

      if (!productData) {
        return res.status(400).json({
          success: false,
          message: 'Product data is required'
        });
      }

      // Get the platform service
      const platformService = await this.getPlatformService(
        platformId,
        userId,
        connectionId
      );
      if (!platformService.success) {
        return res.status(400).json(platformService);
      }

      const service = platformService.service;

      // Validate product data based on platform
      const validation = service.validateProductData(productData);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Product data validation failed',
          errors: validation.errors,
          warnings: validation.warnings
        });
      }

      // Create the product
      const result = await service.createProduct(productData);

      if (result.success) {
        this.logger.info(`Product created successfully on ${platformId}`, {
          userId,
          platformId,
          productIdentifier:
            productData.barcode ||
            productData.merchantSku ||
            productData.productName
        });

        res.json({
          success: true,
          message: result.message,
          data: result.data,
          batchRequestId: result.batchRequestId,
          platformProductId: result.platformProductId
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }
    } catch (error) {
      this.logger.error(`❌ Error creating product: ${error.message}`, {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code
        },
        platformId: req.params.platformId,
        userId: req.user?.id || 'test-user',
        productData: {
          hasProductData: !!req.body.productData,
          productDataKeys: req.body.productData
            ? Object.keys(req.body.productData)
            : [],
          hasBarcode: !!req.body.productData?.barcode,
          hasSku: !!(
            req.body.productData?.merchantSku || req.body.productData?.stockCode
          ),
          hasTitle: !!(
            req.body.productData?.title || req.body.productData?.productName
          )
        },
        errorContext: {
          isValidationError:
            error.message?.includes('validation') ||
            error.message?.includes('required'),
          isAuthenticationError:
            error.message?.includes('auth') ||
            error.message?.includes('unauthorized'),
          isNetworkError:
            error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT',
          isPlatformServiceError: error.message?.includes('platform service'),
          isCredentialsError:
            error.message?.includes('credentials') ||
            error.message?.includes('decrypt')
        },
        requestInfo: {
          method: req.method,
          url: req.originalUrl,
          userAgent: req.headers['user-agent']?.substring(0, 50),
          contentType: req.headers['content-type']
        }
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error while creating product',
        error: error.message,
        errorType: error.name || 'UnknownError',
        platform: req.params.platformId
      });
    }
  }

  /**
   * Create multiple products on a specific platform (bulk creation)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createProductsBulk(req, res) {
    try {
      const { platformId } = req.params;
      const { productsData, connectionId } = req.body;
      const userId = req.user?.id || 'test-user'; // Fallback for testing without auth

      if (!productsData || !Array.isArray(productsData)) {
        return res.status(400).json({
          success: false,
          message: 'Products data must be an array'
        });
      }

      if (productsData.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Products data array cannot be empty'
        });
      }

      // Platform-specific limits
      const platformLimits = {
        trendyol: 1000,
        hepsiburada: 100, // Conservative limit, may need adjustment
        n11: 50 // Conservative limit, may need adjustment
      };

      const limit = platformLimits[platformId] || 100;
      if (productsData.length > limit) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${limit} products allowed per bulk request for ${platformId}`
        });
      }

      // Get the platform service
      const platformService = await this.getPlatformService(
        platformId,
        userId,
        connectionId
      );
      if (!platformService.success) {
        return res.status(400).json(platformService);
      }

      const service = platformService.service;

      // Validate all products before creating any
      const validationErrors = [];
      for (let i = 0; i < productsData.length; i++) {
        const validation = service.validateProductData(productsData[i]);
        if (!validation.isValid) {
          validationErrors.push({
            index: i,
            errors: validation.errors,
            warnings: validation.warnings
          });
        }
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Product data validation failed for some products',
          validationErrors
        });
      }

      // Create the products
      const result = await service.createProductsBulk(productsData);

      if (result.success) {
        this.logger.info(`Bulk products created on ${platformId}`, {
          userId,
          platformId,
          productCount: productsData.length
        });

        res.json({
          success: true,
          message: result.message,
          data: result.data,
          batchRequestId: result.batchRequestId
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }
    } catch (error) {
      this.logger.error(`Error creating products bulk: ${error.message}`, {
        error,
        platformId: req.params.platformId,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error while creating products',
        error: error.message
      });
    }
  }

  /**
   * Update a product on a specific platform
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateProduct(req, res) {
    try {
      const { platformId, productId } = req.params;
      const { updateData } = req.body;
      const userId = req.user?.id || 'test-user'; // Fallback for testing without auth

      if (!updateData) {
        return res.status(400).json({
          success: false,
          message: 'Update data is required'
        });
      }

      // Get the platform service
      const platformService = await this.getPlatformService(platformId, userId);
      if (!platformService.success) {
        return res.status(400).json(platformService);
      }

      const service = platformService.service;

      // Update the product
      const result = await service.updateProduct(productId, updateData);

      if (result.success) {
        this.logger.info(`Product updated successfully on ${platformId}`, {
          userId,
          platformId,
          productId
        });

        res.json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }
    } catch (error) {
      this.logger.error(`Error updating product: ${error.message}`, {
        error,
        platformId: req.params.platformId,
        productId: req.params.productId,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error while updating product',
        error: error.message
      });
    }
  }

  /**
   * Get batch request result for tracking product creation status (Trendyol specific)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getBatchRequestResult(req, res) {
    try {
      const { platformId, batchId } = req.params;
      const userId = req.user?.id || 'test-user'; // Fallback for testing without auth

      // This endpoint is primarily for Trendyol
      if (platformId !== 'trendyol') {
        return res.status(400).json({
          success: false,
          message:
            'Batch request tracking is only available for Trendyol platform'
        });
      }

      // Get the platform service
      const platformService = await this.getPlatformService(platformId, userId);
      if (!platformService.success) {
        return res.status(400).json(platformService);
      }

      const service = platformService.service;

      // Get batch result
      const result = await service.getBatchRequestResult(batchId);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }
    } catch (error) {
      this.logger.error(
        `Error getting batch request result: ${error.message}`,
        {
          error,
          platformId: req.params.platformId,
          batchId: req.params.batchId,
          userId: req.user?.id
        }
      );

      res.status(500).json({
        success: false,
        message: 'Internal server error while getting batch result',
        error: error.message
      });
    }
  }

  /**
   * Get product status from a specific platform
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProductStatus(req, res) {
    try {
      const { platformId, productId } = req.params;
      const userId = req.user?.id || 'test-user'; // Fallback for testing without auth

      // Get the platform service
      const platformService = await this.getPlatformService(platformId, userId);
      if (!platformService.success) {
        return res.status(400).json(platformService);
      }

      const service = platformService.service;

      // Check if the service has getProductStatus method
      if (typeof service.getProductStatus !== 'function') {
        return res.status(400).json({
          success: false,
          message: `Product status retrieval not implemented for ${platformId} platform`
        });
      }

      // Get product status
      const result = await service.getProductStatus(productId);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }
    } catch (error) {
      this.logger.error(`Error getting product status: ${error.message}`, {
        error,
        platformId: req.params.platformId,
        productId: req.params.productId,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error while getting product status',
        error: error.message
      });
    }
  }

  /**
   * Validate product data for a specific platform
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async validateProductData(req, res) {
    try {
      const { platformId } = req.params;
      const { productData } = req.body;
      const userId = req.user?.id || 'test-user'; // Fallback for testing without auth

      if (!productData) {
        return res.status(400).json({
          success: false,
          message: 'Product data is required'
        });
      }

      // Get the platform service
      const platformService = await this.getPlatformService(platformId, userId);
      if (!platformService.success) {
        return res.status(400).json(platformService);
      }

      const service = platformService.service;

      // Validate product data
      const validation = service.validateProductData(productData);

      res.json({
        success: true,
        message: 'Product data validation completed',
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings
      });
    } catch (error) {
      this.logger.error(`Error validating product data: ${error.message}`, {
        error,
        platformId: req.params.platformId,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error while validating product data',
        error: error.message
      });
    }
  }

  /**
   * Get platform categories (from database with auto-sync)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCategories(req, res) {
    try {
      const { platformId } = req.params;
      const { connectionId, forceRefresh } = req.query;
      const userId = this.getUserId(req);

      // Use the category sync service to get categories
      const categories = await this.categorySyncService.getCategories(
        platformId,
        userId,
        connectionId,
        true // auto-sync if no categories found
      );

      this.logger.info(`Categories fetched successfully for ${platformId}`, {
        userId,
        platformId,
        categoryCount: categories.length
      });

      res.json({
        success: true,
        data: categories,
        count: categories.length,
        source: 'database'
      });
    } catch (error) {
      this.logger.error(`❌ Error fetching categories: ${error.message}`, {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        platformId: req.params.platformId,
        userId: req.user?.id || 'e6b500f3-e877-45d4-9bf0-cb08137ebe5a'
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching categories',
        error: error.message,
        platform: req.params.platformId
      });
    }
  }

  /**
   * Get category attributes
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCategoryAttributes(req, res) {
    try {
      const { platformId, categoryId } = req.params;
      const { connectionId } = req.query;
      const userId = req.user?.id || 'e6b500f3-e877-45d4-9bf0-cb08137ebe5a'; // Fallback to dev user for testing

      // Get the platform service
      const platformService = await this.getPlatformService(
        platformId,
        userId,
        connectionId
      );
      if (!platformService.success) {
        return res.status(400).json(platformService);
      }

      const service = platformService.service;
      const attributes = await service.getCategoryAttributes(categoryId);

      this.logger.info(
        `Category attributes fetched successfully for ${platformId}`,
        {
          userId,
          platformId,
          categoryId,
          attributeCount: attributes.length
        }
      );

      res.json({
        success: true,
        data: attributes,
        count: attributes.length
      });
    } catch (error) {
      this.logger.error(
        `❌ Error fetching category attributes: ${error.message}`,
        {
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          platformId: req.params.platformId,
          categoryId: req.params.categoryId,
          userId: req.user?.id || 'e6b500f3-e877-45d4-9bf0-cb08137ebe5a'
        }
      );

      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching category attributes',
        error: error.message,
        platform: req.params.platformId
      });
    }
  }

  /**
   * Get platform-specific product fields
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProductFields(req, res) {
    try {
      const { platformId } = req.params;
      const { categoryId, connectionId } = req.query;
      const userId = req.user?.id || 'e6b500f3-e877-45d4-9bf0-cb08137ebe5a'; // Fallback to dev user for testing

      // Get the platform service
      const platformService = await this.getPlatformService(
        platformId,
        userId,
        connectionId
      );
      if (!platformService.success) {
        return res.status(400).json(platformService);
      }

      const service = platformService.service;
      const fields = await service.getProductFields(categoryId);

      this.logger.info(
        `Product fields fetched successfully for ${platformId}`,
        {
          userId,
          platformId,
          categoryId,
          requiredFieldsCount: fields.requiredFields?.length || 0,
          optionalFieldsCount: fields.optionalFields?.length || 0,
          categoryAttributesCount: fields.categoryAttributes?.length || 0
        }
      );

      res.json({
        success: true,
        data: fields
      });
    } catch (error) {
      this.logger.error(`❌ Error fetching product fields: ${error.message}`, {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        platformId: req.params.platformId,
        categoryId: req.query.categoryId,
        userId: req.user?.id || 'e6b500f3-e877-45d4-9bf0-cb08137ebe5a'
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching product fields',
        error: error.message,
        platform: req.params.platformId
      });
    }
  }

  /**
   * Helper method to get platform service instance
   * @param {string} platformId - Platform identifier
   * @param {string} userId - User ID
   * @param {number} connectionId - Optional direct connection ID
   * @returns {Promise<Object>} - Platform service result
   */
  async getPlatformService(platformId, userId, connectionId = null) {
    this.logger.info('🔍 Getting platform service', {
      platformId,
      userId: userId ? `${userId.substring(0, 8)}***` : 'missing',
      connectionId: connectionId || 'lookup by user',
      timestamp: new Date().toISOString()
    });

    try {
      const { PlatformConnection } = require('../models');

      let connection;

      if (connectionId) {
        // Direct connection lookup by ID
        this.logger.debug('🔗 Looking up connection by ID', {
          connectionId,
          platformId
        });

        connection = await PlatformConnection.findOne({
          where: {
            id: connectionId,
            platformType: platformId,
            isActive: true
          }
        });

        if (!connection) {
          this.logger.warn('⚠️ No connection found with provided ID', {
            connectionId,
            platformId
          });

          return {
            success: false,
            message: `No active ${platformId} connection found with ID ${connectionId}`,
            errorType: 'CONNECTION_NOT_FOUND'
          };
        }
      } else {
        // Lookup connection by user ID
        this.logger.debug('🔗 Searching for platform connection by user', {
          platformId,
          userId: userId ? `${userId.substring(0, 8)}***` : 'missing',
          searchCriteria: {
            platformType: platformId,
            isActive: true
          }
        });

        // Find the platform connection
        connection = await PlatformConnection.findOne({
          where: {
            userId: userId,
            platformType: platformId,
            isActive: true
          }
        });

        if (!connection) {
          this.logger.warn('⚠️ No active platform connection found', {
            platformId,
            userId: userId ? `${userId.substring(0, 8)}***` : 'missing',
            searchedFor: {
              platformType: platformId,
              isActive: true,
              userId: userId
            }
          });

          return {
            success: false,
            message: `No active ${platformId} connection found for user`,
            errorType: 'CONNECTION_NOT_FOUND'
          };
        }
      }

      this.logger.info('✅ Platform connection found', {
        platformId,
        userId: userId ? `${userId.substring(0, 8)}***` : 'missing',
        connectionId: connection.id,
        connectionCreated: connection.createdAt,
        hasCredentials: !!connection.credentials
      });

      // Create service instance based on platform
      let service;
      this.logger.debug('🏭 Creating platform service instance', {
        platformId: platformId.toLowerCase(),
        connectionId: connection.id
      });

      switch (platformId.toLowerCase()) {
      case 'trendyol':
        service = new TrendyolService(connection.id);
        this.logger.debug('✅ TrendyolService instance created', {
          connectionId: connection.id
        });
        break;
      case 'hepsiburada':
        service = new HepsiburadaService(connection.id);
        this.logger.debug('✅ HepsiburadaService instance created', {
          connectionId: connection.id
        });
        break;
      case 'n11':
        service = new N11Service(connection.id);
        this.logger.debug('✅ N11Service instance created', {
          connectionId: connection.id
        });
        break;
      default:
        this.logger.error('❌ Unsupported platform', {
          platformId,
          supportedPlatforms: ['trendyol', 'hepsiburada', 'n11']
        });
        return {
          success: false,
          message: `Unsupported platform: ${platformId}`,
          errorType: 'UNSUPPORTED_PLATFORM'
        };
      }

      this.logger.info('🎉 Platform service ready', {
        platformId,
        userId: userId ? `${userId.substring(0, 8)}***` : 'missing',
        connectionId: connection.id,
        serviceType: service.constructor.name
      });

      // Initialize the service to ensure it's ready for use
      this.logger.debug('🔧 Initializing platform service', {
        platformId,
        connectionId: connection.id
      });
      await service.initialize();

      this.logger.info('✅ Platform service initialized successfully', {
        platformId,
        connectionId: connection.id
      });

      return {
        success: true,
        service: service,
        connectionId: connection.id
      };
    } catch (error) {
      this.logger.error(`❌ Error getting platform service: ${error.message}`, {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code
        },
        platformId,
        userId: userId ? `${userId.substring(0, 8)}***` : 'missing',
        errorContext: {
          isDatabaseError: error.name?.includes('Sequelize'),
          isConnectionError:
            error.code === 'ECONNREFUSED' ||
            error.message?.includes('connection'),
          isModelError:
            error.message?.includes('model') ||
            error.message?.includes('require'),
          isCredentialsError: error.message?.includes('credentials'),
          isAuthError: error.message?.includes('auth')
        }
      });

      return {
        success: false,
        message: 'Failed to initialize platform service',
        error: error.message,
        errorType: error.name || 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Sync categories for a specific platform
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async syncCategories(req, res) {
    try {
      const { platformId } = req.params;
      const { connectionId, forceRefresh } = req.body;
      const userId = req.user?.id || 'e6b500f3-e877-45d4-9bf0-cb08137ebe5a';

      if (!connectionId) {
        return res.status(400).json({
          success: false,
          message: 'Connection ID is required for category sync'
        });
      }

      const result = await this.categorySyncService.syncPlatformCategories(
        platformId,
        userId,
        connectionId,
        forceRefresh === true
      );

      res.json({
        success: true,
        message: result.message,
        data: {
          platform: platformId,
          categoriesCount: result.categoriesCount,
          lastSync: result.lastSync
        }
      });
    } catch (error) {
      this.logger.error(
        `❌ Error syncing categories for ${req.params.platformId}:`,
        {
          error: error.message,
          stack: error.stack
        }
      );

      res.status(500).json({
        success: false,
        message: 'Failed to sync categories',
        error: error.message,
        platform: req.params.platformId
      });
    }
  }

  /**
   * Get category sync status for all platforms
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCategorySyncStatus(req, res) {
    try {
      const userId = req.user?.id || 'e6b500f3-e877-45d4-9bf0-cb08137ebe5a';

      const status = await this.categorySyncService.getSyncStatus(userId);

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      this.logger.error(`❌ Error getting category sync status:`, {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get category sync status',
        error: error.message
      });
    }
  }

  /**
   * Sync categories for all connected platforms
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async syncAllCategories(req, res) {
    try {
      const { connections, forceRefresh } = req.body;
      const userId = req.user?.id || 'e6b500f3-e877-45d4-9bf0-cb08137ebe5a';

      if (!connections || typeof connections !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Connections object is required { platform: connectionId }'
        });
      }

      const results = await this.categorySyncService.syncAllPlatforms(
        userId,
        connections,
        forceRefresh === true
      );

      const successCount = Object.values(results).filter(
        (r) => r.success
      ).length;
      const totalCount = Object.keys(results).length;

      res.json({
        success: successCount > 0,
        message: `Synced categories for ${successCount}/${totalCount} platforms`,
        data: results
      });
    } catch (error) {
      this.logger.error(`❌ Error syncing all categories:`, {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        message: 'Failed to sync categories for all platforms',
        error: error.message
      });
    }
  }

  /**
   * Get available categories from platform without importing
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAvailableCategories(req, res) {
    try {
      const { platformId } = req.params;
      const userId = this.getUserId(req);

      this.logger.info(
        `🔍 Fetching available categories for platform: ${platformId}`
      );

      // Get the platform service
      const platformService = await this.getPlatformService(platformId, userId);
      if (!platformService.success) {
        return res.status(400).json(platformService);
      }

      const service = platformService.service;

      // Fetch categories from the platform without storing them
      const categories = await service.getCategories();

      this.logger.info(
        `✅ Retrieved ${categories.length} available categories from ${platformId}`
      );

      res.json({
        success: true,
        data: categories,
        count: categories.length
      });
    } catch (error) {
      this.logger.error(
        `❌ Error fetching available categories for ${req.params.platformId}:`,
        {
          error: error.message,
          stack: error.stack
        }
      );

      res.status(500).json({
        success: false,
        message: 'Failed to fetch available categories',
        error: error.message
      });
    }
  }

  /**
   * Import selected categories with field mappings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async importCategories(req, res) {
    try {
      const { categories, fieldMappings = {} } = req.body;
      const userId = req.user?.id || 'e6b500f3-e877-45d4-9bf0-cb08137ebe5a';

      if (
        !categories ||
        !Array.isArray(categories) ||
        categories.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: 'Categories array is required and must not be empty'
        });
      }

      this.logger.info(
        `📥 Importing ${categories.length} categories with field mappings`
      );

      // Group categories by platform
      const categoriesByPlatform = categories.reduce((acc, category) => {
        if (!acc[category.platform]) {
          acc[category.platform] = [];
        }
        acc[category.platform].push(category);
        return acc;
      }, {});

      const results = [];

      // Import categories for each platform
      for (const [platformId, platformCategories] of Object.entries(
        categoriesByPlatform
      )) {
        try {
          const result =
            await this.categorySyncService.importCategoriesWithMapping(
              platformId,
              platformCategories,
              fieldMappings,
              userId
            );
          results.push({
            platform: platformId,
            success: true,
            imported: result.imported,
            count: platformCategories.length
          });
        } catch (error) {
          this.logger.error(
            `❌ Error importing categories for ${platformId}:`,
            error
          );
          results.push({
            platform: platformId,
            success: false,
            error: error.message,
            count: platformCategories.length
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const totalImported = results.reduce(
        (acc, r) => acc + (r.imported || 0),
        0
      );

      this.logger.info(
        `✅ Category import completed: ${totalImported} categories imported from ${successCount} platforms`
      );

      res.json({
        success: successCount > 0,
        message: `Imported ${totalImported} categories from ${successCount}/${results.length} platforms`,
        data: {
          results,
          totalImported,
          fieldMappings
        }
      });
    } catch (error) {
      this.logger.error(`❌ Error importing categories:`, {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        message: 'Failed to import categories',
        error: error.message
      });
    }
  }
}

module.exports = new PlatformProductController();
