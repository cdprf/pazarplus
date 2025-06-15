/**
 * Product Intelligence Controller
 *
 * Handles API requests for the Unified Product Intelligence Service
 * Integrates Enhanced SKU Classification with Variant Detection capabilities
 *
 * @author AI Assistant
 * @version 1.0.0
 */

const logger = require("../utils/logger");
const { Product, ProductVariant, PlatformData } = require("../models");
const UnifiedProductIntelligenceService = require("../services/unified-product-intelligence-service");

class ProductIntelligenceController {
  constructor() {
    this.intelligenceService = new UnifiedProductIntelligenceService();
  }

  /**
   * Perform comprehensive product intelligence analysis
   */
  async analyzeProducts(req, res) {
    try {
      const { products, options = {} } = req.body;
      const userId = req.user.id;

      logger.info(
        `Starting unified product intelligence analysis for ${products.length} products (User: ${userId})`
      );

      const startTime = Date.now();

      const results = await this.intelligenceService.analyzeProducts(products, {
        ...options,
        userId,
      });

      const processingTime = Date.now() - startTime;

      if (results.success) {
        logger.info(
          `Product intelligence analysis completed in ${processingTime}ms`
        );

        res.json({
          success: true,
          data: {
            ...results,
            processingTime,
          },
          message: `Successfully analyzed ${products.length} products`,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error("Product intelligence analysis failed:", results.error);

        res.status(500).json({
          success: false,
          message: "Analysis failed",
          error: results.error,
        });
      }
    } catch (error) {
      logger.error("Product intelligence analysis error:", error);

      res.status(500).json({
        success: false,
        message: "Internal server error during analysis",
        error: error.message,
      });
    }
  }

  /**
   * Get user's products formatted for intelligence analysis
   */
  async getUserProducts(req, res) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 100;
      const includeVariants = req.query.includeVariants !== "false";
      const includePlatformData = req.query.includePlatformData !== "false";

      logger.info(
        `Fetching products for intelligence analysis (User: ${userId})`
      );

      // Build include clause based on options
      const include = [];

      if (includeVariants) {
        include.push({
          model: ProductVariant,
          as: "variants",
          required: false,
        });
      }

      if (includePlatformData) {
        include.push({
          model: PlatformData,
          as: "platformData",
          required: false,
        });
      }

      // Fetch products from database
      const products = await Product.findAll({
        where: { userId },
        include,
        limit,
        order: [["updatedAt", "DESC"]],
      });

      // Transform products to intelligence service format
      const formattedProducts = products.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        category: product.category,
        price: product.price,
        description: product.description,
        variants:
          product.variants?.map((variant) => ({
            id: variant.id,
            name: variant.name,
            sku: variant.sku,
            barcode: variant.barcode,
            attributes: variant.attributes,
            price: variant.price,
          })) || [],
        platformData:
          product.platformData?.map((pd) => ({
            platformType: pd.platformType,
            data: pd.data,
            externalId: pd.externalId,
          })) || [],
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      }));

      res.json({
        success: true,
        data: {
          products: formattedProducts,
          metadata: {
            totalProducts: formattedProducts.length,
            includeVariants,
            includePlatformData,
            limit,
          },
        },
        message: `Retrieved ${formattedProducts.length} products for analysis`,
      });
    } catch (error) {
      logger.error("User products retrieval error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to retrieve user products",
        error: error.message,
      });
    }
  }

  /**
   * Perform batch analysis on user's products
   */
  async batchAnalyze(req, res) {
    try {
      const userId = req.user.id;
      const { filters = {}, analysisTypes = ["all"], options = {} } = req.body;

      logger.info(
        `Starting batch analysis for user products (User: ${userId})`
      );

      // Get user's products with filters
      const whereClause = { userId };

      // Apply filters
      if (filters.category) {
        whereClause.category = filters.category;
      }
      if (filters.status) {
        whereClause.status = filters.status;
      }
      if (filters.search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${filters.search}%` } },
          { sku: { [Op.iLike]: `%${filters.search}%` } },
          { barcode: { [Op.iLike]: `%${filters.search}%` } },
        ];
      }

      const products = await Product.findAll({
        where: whereClause,
        include: [
          {
            model: ProductVariant,
            as: "variants",
            required: false,
          },
          {
            model: PlatformData,
            as: "platformData",
            required: false,
          },
        ],
        limit: filters.limit || 1000,
        order: [["updatedAt", "DESC"]],
      });

      if (products.length === 0) {
        return res.json({
          success: true,
          data: {
            message: "No products found matching criteria",
            analysisResults: null,
          },
          message: "No products to analyze",
        });
      }

      // Transform to intelligence service format
      const formattedProducts = products.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        category: product.category,
        price: product.price,
        description: product.description,
        variants:
          product.variants?.map((v) => ({
            id: v.id,
            name: v.name,
            sku: v.sku,
            barcode: v.barcode,
            attributes: v.attributes,
            price: v.price,
          })) || [],
      }));

      // Perform comprehensive analysis
      const batchResults = {
        totalProducts: formattedProducts.length,
        analysisTypes,
        results: {},
        processingTime: 0,
      };

      const startTime = Date.now();

      // Run different types of analysis based on request
      if (analysisTypes.includes("all") || analysisTypes.includes("variants")) {
        logger.info("Running variant pattern detection...");
        batchResults.results.variants =
          await this.intelligenceService.detectVariantPatterns(
            formattedProducts,
            { ...options, userId }
          );
      }

      if (analysisTypes.includes("all") || analysisTypes.includes("naming")) {
        logger.info("Running naming pattern detection...");
        batchResults.results.naming =
          await this.intelligenceService.detectNamingPatterns(
            formattedProducts,
            { ...options, userId }
          );
      }

      if (
        analysisTypes.includes("all") ||
        analysisTypes.includes("classification")
      ) {
        logger.info("Running classification pattern detection...");
        batchResults.results.classification =
          await this.intelligenceService.detectClassificationPatterns(
            formattedProducts,
            { ...options, userId }
          );
      }

      if (
        analysisTypes.includes("all") ||
        analysisTypes.includes("suggestions")
      ) {
        logger.info("Generating intelligent suggestions...");

        // Generate suggestions based on analysis results
        const analysisResults = {
          products: formattedProducts,
          variants: batchResults.results.variants,
          naming: batchResults.results.naming,
          classification: batchResults.results.classification,
        };

        batchResults.results.suggestions = {
          merging: await this.intelligenceService.generateMergingSuggestions(
            analysisResults,
            { ...options, userId }
          ),
          classification:
            await this.intelligenceService.generateClassificationSuggestions(
              analysisResults,
              { ...options, userId }
            ),
          patterns: await this.intelligenceService.generatePatternSuggestions(
            analysisResults,
            { ...options, userId }
          ),
          optimization:
            await this.intelligenceService.generateOptimizationSuggestions(
              analysisResults,
              { ...options, userId }
            ),
        };
      }

      batchResults.processingTime = Date.now() - startTime;

      logger.info(
        `Batch analysis completed for ${formattedProducts.length} products in ${batchResults.processingTime}ms (User: ${userId})`
      );

      res.json({
        success: true,
        data: batchResults,
        message: `Successfully analyzed ${formattedProducts.length} products`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Batch analysis error:", error);

      res.status(500).json({
        success: false,
        message: "Batch analysis failed",
        error: error.message,
      });
    }
  }

  /**
   * Detect variant patterns in products
   */
  async detectVariantPatterns(req, res) {
    try {
      const { products, options = {} } = req.body;
      const userId = req.user.id;

      logger.info(
        `Detecting variant patterns for ${products.length} products (User: ${userId})`
      );

      const variantResults =
        await this.intelligenceService.detectVariantPatterns(products, {
          ...options,
          userId,
        });

      res.json({
        success: true,
        data: variantResults,
        message: `Detected ${
          variantResults.detected_groups?.length || 0
        } variant groups`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Variant pattern detection error:", error);

      res.status(500).json({
        success: false,
        message: "Variant pattern detection failed",
        error: error.message,
      });
    }
  }

  /**
   * Detect naming patterns in products
   */
  async detectNamingPatterns(req, res) {
    try {
      const { products, options = {} } = req.body;
      const userId = req.user.id;

      logger.info(
        `Detecting naming patterns for ${products.length} products (User: ${userId})`
      );

      const namingResults = await this.intelligenceService.detectNamingPatterns(
        products,
        { ...options, userId }
      );

      res.json({
        success: true,
        data: namingResults,
        message: `Analyzed naming patterns for ${products.length} products`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Naming pattern detection error:", error);

      res.status(500).json({
        success: false,
        message: "Naming pattern detection failed",
        error: error.message,
      });
    }
  }

  /**
   * Generate intelligent suggestions
   */
  async generateSuggestions(req, res) {
    try {
      const { analysisResults, suggestionType, options = {} } = req.body;
      const userId = req.user.id;

      logger.info(`Generating ${suggestionType} suggestions (User: ${userId})`);

      let suggestions;
      let message;

      switch (suggestionType) {
        case "merging":
          suggestions =
            await this.intelligenceService.generateMergingSuggestions(
              analysisResults,
              { ...options, userId }
            );
          message = `Generated ${
            suggestions.suggestions?.length || 0
          } merging suggestions`;
          break;

        case "classification":
          suggestions =
            await this.intelligenceService.generateClassificationSuggestions(
              analysisResults,
              { ...options, userId }
            );
          message = `Generated ${
            suggestions.suggestions?.length || 0
          } classification suggestions`;
          break;

        case "patterns":
          suggestions =
            await this.intelligenceService.generatePatternSuggestions(
              analysisResults,
              { ...options, userId }
            );
          message = `Generated ${
            suggestions.suggestions?.length || 0
          } pattern suggestions`;
          break;

        case "optimization":
          suggestions =
            await this.intelligenceService.generateOptimizationSuggestions(
              analysisResults,
              { ...options, userId }
            );
          message = `Generated ${
            suggestions.suggestions?.length || 0
          } optimization suggestions`;
          break;

        default:
          return res.status(400).json({
            success: false,
            message:
              "Invalid suggestion type. Must be one of: merging, classification, patterns, optimization",
          });
      }

      res.json({
        success: true,
        data: suggestions,
        message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Suggestions generation error:", error);

      res.status(500).json({
        success: false,
        message: "Suggestions generation failed",
        error: error.message,
      });
    }
  }

  /**
   * Get service statistics
   */
  async getStatistics(req, res) {
    try {
      const userId = req.user.id;

      res.json({
        success: true,
        data: {
          statistics: this.intelligenceService.statistics,
          config: this.intelligenceService.config,
          service_info: {
            version: "1.0.0",
            name: "Unified Product Intelligence Service",
            features: [
              "Enhanced SKU Classification",
              "Intelligent Product Merging",
              "Variant Pattern Detection",
              "Naming Pattern Analysis",
              "Classification Pattern Analysis",
              "Intelligent Suggestions Generation",
              "Optimization Recommendations",
              "Similarity Matching",
              "Confidence Scoring",
              "Batch Processing",
            ],
          },
          user_info: {
            userId: userId,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Statistics retrieval error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to retrieve statistics",
        error: error.message,
      });
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(req, res) {
    res.json({
      success: true,
      service: "Unified Product Intelligence Service",
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      capabilities: [
        "Enhanced SKU Classification",
        "Variant Pattern Detection",
        "Naming Pattern Analysis",
        "Classification Pattern Analysis",
        "Intelligent Suggestions",
        "Optimization Recommendations",
        "Batch Processing",
        "User Learning",
      ],
    });
  }

  /**
   * Learn from user feedback
   */
  async learnFromFeedback(req, res) {
    try {
      const { identifier, correctClassification, userFeedback } = req.body;
      const userId = req.user.id;

      // Use the SKU classifier's learning capability
      await this.intelligenceService.skuClassifier.learnFromClassification(
        identifier,
        {
          type: correctClassification,
          confidence: 1.0, // User feedback is considered high confidence
          feedback: userFeedback,
          userId: userId,
        }
      );

      this.intelligenceService.statistics.learning_updates++;

      logger.info(
        `Learning update: ${identifier} -> ${correctClassification} (User: ${userId})`
      );

      res.json({
        success: true,
        message: "Learning update applied successfully",
        data: {
          identifier,
          learned_classification: correctClassification,
          user_feedback: userFeedback,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Learning update error:", error);

      res.status(500).json({
        success: false,
        message: "Learning update failed",
        error: error.message,
      });
    }
  }
}

module.exports = new ProductIntelligenceController();
