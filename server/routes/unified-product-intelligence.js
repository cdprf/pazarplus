/**
 * Unified Product Intelligence API Routes
 *
 * Provides API endpoints for the integrated product intelligence system
 * that combines Enhanced SKU Classification with Product Merge Logic
 *
 * @author AI Assistant
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { auth } = require('../middleware/auth');
const { body, query, param } = require('express-validator');
const validationMiddleware = require('../middleware/validation-middleware');
const { jsonResponseMiddleware } = require('../utils/json-serializer');

// Import the unified service
const UnifiedProductIntelligenceService = require('../services/unified-product-intelligence-service');

// Initialize service instance
const intelligenceService = new UnifiedProductIntelligenceService();

/**
 * @route GET /api/product-intelligence/health
 * @desc Health check endpoint
 * @access Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Unified Product Intelligence Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    capabilities: [
      'Enhanced SKU Classification',
      'Variant Pattern Detection',
      'Naming Pattern Analysis',
      'Classification Pattern Analysis',
      'Intelligent Suggestions',
      'Optimization Recommendations',
      'Batch Processing',
      'User Learning'
    ]
  });
});

// Apply authentication to all other routes
router.use(auth);

// Apply JSON serialization middleware to prevent circular references
router.use(jsonResponseMiddleware);

/**
 * @route POST /api/product-intelligence/analyze
 * @desc Perform comprehensive product intelligence analysis
 * @access Private
 */
router.post(
  '/analyze',
  [
    body('products')
      .isArray({ min: 1 })
      .withMessage('Products array is required'),
    body('options').optional().isObject(),
    validationMiddleware
  ],
  async (req, res) => {
    try {
      const { products, options = {} } = req.body;
      const userId = req.user.id;

      logger.info(
        `Starting unified product intelligence analysis for ${products.length} products (User: ${userId})`
      );

      const results = await intelligenceService.analyzeProducts(products, {
        ...options,
        userId
      });

      if (results.success) {
        logger.info(
          `Product intelligence analysis completed in ${results.processingTime}ms`
        );

        res.json({
          success: true,
          data: results,
          message: `Successfully analyzed ${products.length} products`
        });
      } else {
        logger.error('Product intelligence analysis failed:', results.error);

        res.status(500).json({
          success: false,
          message: 'Analysis failed',
          error: results.error
        });
      }
    } catch (error) {
      logger.error('Product intelligence analysis error:', error);

      res.status(500).json({
        success: false,
        message: 'Internal server error during analysis',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/product-intelligence/variants/detect
 * @desc Detect variant patterns in products
 * @access Private
 */
router.post(
  '/variants/detect',
  [
    body('products')
      .isArray({ min: 1 })
      .withMessage('Products array is required'),
    body('options').optional().isObject(),
    validationMiddleware
  ],
  async (req, res) => {
    try {
      const { products, options = {} } = req.body;
      const userId = req.user.id;

      logger.info(
        `Detecting variant patterns for ${products.length} products (User: ${userId})`
      );

      const variantResults = await intelligenceService.detectVariantPatterns(
        products,
        { ...options, userId }
      );

      res.json({
        success: true,
        data: variantResults,
        message: `Detected ${
          variantResults.detected_groups?.length || 0
        } variant groups`
      });
    } catch (error) {
      logger.error('Variant pattern detection error:', error);

      res.status(500).json({
        success: false,
        message: 'Variant pattern detection failed',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/product-intelligence/naming/patterns
 * @desc Detect naming patterns in products
 * @access Private
 */
router.post(
  '/naming/patterns',
  [
    body('products')
      .isArray({ min: 1 })
      .withMessage('Products array is required'),
    body('options').optional().isObject(),
    validationMiddleware
  ],
  async (req, res) => {
    try {
      const { products, options = {} } = req.body;
      const userId = req.user.id;

      logger.info(
        `Detecting naming patterns for ${products.length} products (User: ${userId})`
      );

      const namingResults = await intelligenceService.detectNamingPatterns(
        products,
        { ...options, userId }
      );

      res.json({
        success: true,
        data: namingResults,
        message: `Analyzed naming patterns for ${products.length} products`
      });
    } catch (error) {
      logger.error('Naming pattern detection error:', error);

      res.status(500).json({
        success: false,
        message: 'Naming pattern detection failed',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/product-intelligence/classification/patterns
 * @desc Detect classification patterns in products
 * @access Private
 */
router.post(
  '/classification/patterns',
  [
    body('products')
      .isArray({ min: 1 })
      .withMessage('Products array is required'),
    body('options').optional().isObject(),
    validationMiddleware
  ],
  async (req, res) => {
    try {
      const { products, options = {} } = req.body;
      const userId = req.user.id;

      logger.info(
        `Detecting classification patterns for ${products.length} products (User: ${userId})`
      );

      const classificationResults =
        await intelligenceService.detectClassificationPatterns(products, {
          ...options,
          userId
        });

      res.json({
        success: true,
        data: classificationResults,
        message: `Analyzed classification patterns for ${products.length} products`
      });
    } catch (error) {
      logger.error('Classification pattern detection error:', error);

      res.status(500).json({
        success: false,
        message: 'Classification pattern detection failed',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/product-intelligence/suggestions/merging
 * @desc Generate intelligent merging suggestions
 * @access Private
 */
router.post(
  '/suggestions/merging',
  [
    body('analysisResults')
      .isObject()
      .withMessage('Analysis results object is required'),
    body('options').optional().isObject(),
    validationMiddleware
  ],
  async (req, res) => {
    try {
      const { analysisResults, options = {} } = req.body;
      const userId = req.user.id;

      logger.info(`Generating merging suggestions (User: ${userId})`);

      const mergingSuggestions =
        await intelligenceService.generateMergingSuggestions(analysisResults, {
          ...options,
          userId
        });

      res.json({
        success: true,
        data: mergingSuggestions,
        message: `Generated ${
          mergingSuggestions.suggestions?.length || 0
        } merging suggestions`
      });
    } catch (error) {
      logger.error('Merging suggestions generation error:', error);

      res.status(500).json({
        success: false,
        message: 'Merging suggestions generation failed',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/product-intelligence/suggestions/classification
 * @desc Generate intelligent classification suggestions
 * @access Private
 */
router.post(
  '/suggestions/classification',
  [
    body('analysisResults')
      .isObject()
      .withMessage('Analysis results object is required'),
    body('options').optional().isObject(),
    validationMiddleware
  ],
  async (req, res) => {
    try {
      const { analysisResults, options = {} } = req.body;
      const userId = req.user.id;

      logger.info(`Generating classification suggestions (User: ${userId})`);

      const classificationSuggestions =
        await intelligenceService.generateClassificationSuggestions(
          analysisResults,
          { ...options, userId }
        );

      res.json({
        success: true,
        data: classificationSuggestions,
        message: `Generated ${
          classificationSuggestions.suggestions?.length || 0
        } classification suggestions`
      });
    } catch (error) {
      logger.error('Classification suggestions generation error:', error);

      res.status(500).json({
        success: false,
        message: 'Classification suggestions generation failed',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/product-intelligence/suggestions/patterns
 * @desc Generate intelligent pattern suggestions
 * @access Private
 */
router.post(
  '/suggestions/patterns',
  [
    body('analysisResults')
      .isObject()
      .withMessage('Analysis results object is required'),
    body('options').optional().isObject(),
    validationMiddleware
  ],
  async (req, res) => {
    try {
      const { analysisResults, options = {} } = req.body;
      const userId = req.user.id;

      logger.info(`Generating pattern suggestions (User: ${userId})`);

      const patternSuggestions =
        await intelligenceService.generatePatternSuggestions(analysisResults, {
          ...options,
          userId
        });

      res.json({
        success: true,
        data: patternSuggestions,
        message: `Generated ${
          patternSuggestions.suggestions?.length || 0
        } pattern suggestions`
      });
    } catch (error) {
      logger.error('Pattern suggestions generation error:', error);

      res.status(500).json({
        success: false,
        message: 'Pattern suggestions generation failed',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/product-intelligence/suggestions/optimization
 * @desc Generate intelligent optimization suggestions
 * @access Private
 */
router.post(
  '/suggestions/optimization',
  [
    body('analysisResults')
      .isObject()
      .withMessage('Analysis results object is required'),
    body('options').optional().isObject(),
    validationMiddleware
  ],
  async (req, res) => {
    try {
      const { analysisResults, options = {} } = req.body;
      const userId = req.user.id;

      logger.info(`Generating optimization suggestions (User: ${userId})`);

      const optimizationSuggestions =
        await intelligenceService.generateOptimizationSuggestions(
          analysisResults.products || [],
          analysisResults.classification || {},
          analysisResults.merging || {},
          analysisResults
        );

      res.json({
        success: true,
        data: optimizationSuggestions,
        message: `Generated ${
          optimizationSuggestions.suggestions?.length || 0
        } optimization suggestions`
      });
    } catch (error) {
      logger.error('Optimization suggestions generation error:', error);

      res.status(500).json({
        success: false,
        message: 'Optimization suggestions generation failed',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/product-intelligence/user/products
 * @desc Get user's products for intelligence analysis
 * @access Private
 */
router.get(
  '/user/products',
  [
    query('limit').optional().isInt({ min: 1, max: 1000 }),
    query('includeVariants').optional().isBoolean(),
    query('includePlatformData').optional().isBoolean(),
    validationMiddleware
  ],
  async (req, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 100;
      const includeVariants = req.query.includeVariants !== 'false';
      const includePlatformData = req.query.includePlatformData !== 'false';

      logger.info(
        `Fetching products for intelligence analysis (User: ${userId})`
      );

      const products = await intelligenceService.getUserProducts(userId, {
        limit: limit,
        includeVariants: includeVariants,
        includePlatformData: includePlatformData
      });

      res.json({
        success: true,
        data: {
          products,
          metadata: {
            totalProducts: products.length,
            includeVariants: includeVariants,
            includePlatformData: includePlatformData,
            limit: limit
          }
        },
        message: `Retrieved ${products.length} products for analysis`
      });
    } catch (error) {
      logger.error('User products retrieval error:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user products',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/product-intelligence/batch/analyze
 * @desc Perform batch analysis on user's products
 * @access Private
 */
router.post(
  '/batch/analyze',
  [
    body('filters').optional().isObject(),
    body('analysisTypes').optional().isArray(),
    body('options').optional().isObject(),
    validationMiddleware
  ],
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { filters = {}, analysisTypes = ['all'], options = {} } = req.body;

      logger.info(
        `Starting batch analysis for user products (User: ${userId})`
      );

      // Get user's products with filters
      const products = await intelligenceService.getUserProducts(userId, {
        limit: 1000,
        includeVariants: true,
        includePlatformData: true,
        ...filters
      });

      if (products.length === 0) {
        return res.json({
          success: true,
          data: {
            message: 'No products found matching criteria',
            analysisResults: null
          },
          message: 'No products to analyze'
        });
      }

      // Perform comprehensive analysis
      const batchResults = {
        totalProducts: products.length,
        analysisTypes,
        results: {}
      };

      // Run different types of analysis based on request
      if (analysisTypes.includes('all') || analysisTypes.includes('variants')) {
        logger.info('Running variant pattern detection...');
        batchResults.results.variants =
          await intelligenceService.detectVariantPatterns(products, {
            ...options,
            userId
          });
      }

      if (analysisTypes.includes('all') || analysisTypes.includes('naming')) {
        logger.info('Running naming pattern detection...');
        batchResults.results.naming =
          await intelligenceService.detectNamingPatterns(products, {
            ...options,
            userId
          });
      }

      if (
        analysisTypes.includes('all') ||
        analysisTypes.includes('classification')
      ) {
        logger.info('Running classification pattern detection...');
        batchResults.results.classification =
          await intelligenceService.classifyIdentifiers(products);
      }

      if (
        analysisTypes.includes('all') ||
        analysisTypes.includes('suggestions')
      ) {
        logger.info('Generating intelligent suggestions...');

        // First perform classification if not already done
        let classificationResults = batchResults.results.classification;
        if (!classificationResults) {
          logger.info('Performing classification for suggestions...');
          classificationResults = await intelligenceService.classifyIdentifiers(
            products
          );
        }

        // Perform product merging for merge suggestions
        logger.info('Performing product merging for suggestions...');
        const mergeResults = await intelligenceService.enhancedProductMerging(
          products,
          classificationResults
        );

        // Generate suggestions based on analysis results
        const analysisResults = {
          products,
          variants: batchResults.results.variants,
          naming: batchResults.results.naming,
          classification: classificationResults,
          merging: mergeResults
        };

        batchResults.results.suggestions = {
          merging: await intelligenceService.generateMergingSuggestions(
            mergeResults
          ),
          classification:
            await intelligenceService.generateClassificationSuggestions(
              classificationResults
            ),
          patterns: await intelligenceService.generatePatternSuggestions(
            analysisResults
          ),
          optimization:
            await intelligenceService.generateOptimizationSuggestions(
              products,
              classificationResults,
              mergeResults,
              analysisResults
            )
        };
      }

      logger.info(
        `Batch analysis completed for ${products.length} products (User: ${userId})`
      );

      res.json({
        success: true,
        data: batchResults,
        message: `Successfully analyzed ${products.length} products`
      });
    } catch (error) {
      logger.error('Batch analysis error:', error);

      res.status(500).json({
        success: false,
        message: 'Batch analysis failed',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/product-intelligence/classify
 * @desc Classify product identifiers (SKU vs Barcode)
 * @access Private
 */
router.post(
  '/classify',
  [
    body('products')
      .isArray({ min: 1 })
      .withMessage('Products array is required'),
    validationMiddleware
  ],
  async (req, res) => {
    try {
      const { products } = req.body;
      const userId = req.user.id;

      logger.info(
        `Classifying identifiers for ${products.length} products (User: ${userId})`
      );

      const classificationResults =
        await intelligenceService.classifyIdentifiers(products);

      res.json({
        success: true,
        data: classificationResults,
        message: `Successfully classified ${classificationResults.statistics.total_classified} identifiers`
      });
    } catch (error) {
      logger.error('Product classification error:', error);

      res.status(500).json({
        success: false,
        message: 'Classification failed',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/product-intelligence/merge
 * @desc Perform enhanced product merging
 * @access Private
 */
router.post(
  '/merge',
  [
    body('products')
      .isArray({ min: 1 })
      .withMessage('Products array is required'),
    body('options').optional().isObject(),
    validationMiddleware
  ],
  async (req, res) => {
    try {
      const { products, options = {} } = req.body;
      const userId = req.user.id;

      logger.info(
        `Performing enhanced product merging for ${products.length} products (User: ${userId})`
      );

      // First classify identifiers
      const classificationResults =
        await intelligenceService.classifyIdentifiers(products);

      // Then perform enhanced merging
      const mergeResults = await intelligenceService.enhancedProductMerging(
        products,
        classificationResults
      );

      res.json({
        success: true,
        data: {
          classification: classificationResults,
          merging: mergeResults
        },
        message: `Merged ${products.length} products into ${mergeResults.merged_products.length} unique products`
      });
    } catch (error) {
      logger.error('Product merging error:', error);

      res.status(500).json({
        success: false,
        message: 'Merging failed',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/product-intelligence/patterns
 * @desc Detect product patterns
 * @access Private
 */
router.post(
  '/patterns',
  [
    body('products')
      .isArray({ min: 1 })
      .withMessage('Products array is required'),
    body('classificationData').optional().isObject(),
    validationMiddleware
  ],
  async (req, res) => {
    try {
      const { products, classificationData = null } = req.body;
      const userId = req.user.id;

      logger.info(
        `Detecting product patterns for ${products.length} products (User: ${userId})`
      );

      // Group products first (simplified grouping for pattern detection)
      const groups = [{ products }]; // Single group for pattern detection

      const patternResults = await intelligenceService.detectProductPatterns(
        groups
      );

      res.json({
        success: true,
        data: patternResults,
        message: `Detected ${patternResults.statistics.patterns_detected} patterns`
      });
    } catch (error) {
      logger.error('Pattern detection error:', error);

      res.status(500).json({
        success: false,
        message: 'Pattern detection failed',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/product-intelligence/statistics
 * @desc Get service statistics
 * @access Private
 */
router.get('/statistics', async (req, res) => {
  try {
    const userId = req.user.id;

    res.json({
      success: true,
      data: {
        statistics: intelligenceService.statistics,
        config: intelligenceService.config,
        service_info: {
          version: '1.0.0',
          name: 'Unified Product Intelligence Service',
          features: [
            'Enhanced SKU Classification',
            'Intelligent Product Merging',
            'Variant Pattern Detection',
            'Naming Pattern Analysis',
            'Classification Pattern Analysis',
            'Intelligent Suggestions Generation',
            'Optimization Recommendations',
            'Similarity Matching',
            'Confidence Scoring',
            'Batch Processing'
          ]
        },
        user_info: {
          userId: userId
        }
      }
    });
  } catch (error) {
    logger.error('Statistics retrieval error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics',
      error: error.message
    });
  }
});

/**
 * @route POST /api/product-intelligence/configure
 * @desc Update service configuration
 * @access Private
 */
router.post(
  '/configure',
  [
    body('config').isObject().withMessage('Configuration object is required'),
    validationMiddleware
  ],
  async (req, res) => {
    try {
      const { config } = req.body;
      const userId = req.user.id;

      // Update configuration (merge with existing config)
      Object.assign(intelligenceService.config, config);

      logger.info(
        `Product intelligence service configuration updated (User: ${userId})`
      );

      res.json({
        success: true,
        data: {
          config: intelligenceService.config
        },
        message: 'Configuration updated successfully'
      });
    } catch (error) {
      logger.error('Configuration update error:', error);

      res.status(500).json({
        success: false,
        message: 'Configuration update failed',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/product-intelligence/learn
 * @desc Learn from user feedback to improve classifications
 * @access Private
 */
router.post(
  '/learn',
  [
    body('identifier').notEmpty().withMessage('Identifier is required'),
    body('correctClassification')
      .notEmpty()
      .withMessage('Correct classification is required'),
    body('userFeedback').optional().isString(),
    validationMiddleware
  ],
  async (req, res) => {
    try {
      const { identifier, correctClassification, userFeedback } = req.body;
      const userId = req.user.id;

      // Use the SKU classifier's learning capability
      await intelligenceService.skuClassifier.learnFromClassification(
        identifier,
        {
          type: correctClassification,
          confidence: 1.0, // User feedback is considered high confidence
          feedback: userFeedback,
          userId: userId
        }
      );

      intelligenceService.statistics.learning_updates++;

      logger.info(
        `Learning update: ${identifier} -> ${correctClassification} (User: ${userId})`
      );

      res.json({
        success: true,
        message: 'Learning update applied successfully',
        data: {
          identifier,
          learned_classification: correctClassification,
          user_feedback: userFeedback
        }
      });
    } catch (error) {
      logger.error('Learning update error:', error);

      res.status(500).json({
        success: false,
        message: 'Learning update failed',
        error: error.message
      });
    }
  }
);

module.exports = router;
