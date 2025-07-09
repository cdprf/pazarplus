/**
 * Background Variant Detection Service
 *
 * This service runs automatic variant detection on products as a background task.
 * It processes products periodically and detects variants automatically.
 */

const logger = require("../utils/logger");
const { Product, PlatformData } = require("../models");
const { Op } = require("sequelize");
const VariantDetector = require("./variant-detector");
const fs = require("fs");
const path = require("path");

class BackgroundVariantDetectionService {
  constructor() {
    this.isRunning = false;
    this.processInterval = 5 * 60 * 1000; // 5 minutes
    this.batchSize = 10; // Process 10 products at a time
    this.maxProcessingTime = 2 * 60 * 1000; // 2 minutes max per batch
    this.intervalId = null;
    this.startTime = null;

    // Status tracking
    this.lastRunTime = null;
    this.totalProcessed = 0;
    this.lastBatchSize = 0;
    this.lastError = null;
    this.processingErrors = 0;

    // Configuration file path
    this.configPath = path.join(
      __dirname,
      "../data/variant-detection-config.json"
    );

    // Load configuration from file or use defaults
    this.config = this.loadConfigFromFile();
  }

  /**
   * Load configuration from file
   */
  loadConfigFromFile() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.configPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, "utf8");
        const savedConfig = JSON.parse(configData);
        logger.info(
          "Loaded variant detection configuration from file",
          savedConfig
        );
        return savedConfig;
      }
    } catch (error) {
      logger.warn(
        "Failed to load configuration from file, using defaults",
        error
      );
    }

    // Return default configuration
    return {
      minConfidenceThreshold: 0.5, // Only update if confidence is above 50%
      maxRetries: 3,
      processOnCreate: true, // Auto-process new products
      processOnUpdate: true, // Auto-process updated products
      reprocessInterval: 24 * 60 * 60 * 1000, // Reprocess once per day
      enableAutoDetection: true,
      enableSKUAnalysis: true,
      enablePlatformDataAnalysis: true,
      enableTextAnalysis: true,
      colorPatterns: [
        "(?:color|colour|renk):\\s*([^,;]+)",
        "(?:^|\\s)(black|white|red|blue|green|yellow|pink|purple|orange|gray|grey|brown)(?:\\s|$)",
      ],
      sizePatterns: [
        "(?:size|beden):\\s*([^,;]+)",
        "(?:^|\\s)(xs|s|m|l|xl|xxl|xxxl|\\d+)(?:\\s|$)",
      ],
      modelPatterns: ["(?:model|tip):\\s*([^,;]+)"],
      structuredPatterns: [],
      customPatterns: [],
    };
  }

  /**
   * Save configuration to file
   */
  saveConfigToFile() {
    try {
      const dataDir = path.dirname(this.configPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      logger.info("Saved variant detection configuration to file");
    } catch (error) {
      logger.error("Failed to save configuration to file", error);
    }
  }

  /**
   * Start the background variant detection service
   */
  start() {
    if (this.isRunning) {
      logger.warn("Background variant detection service is already running");
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();
    this.lastError = null;

    logger.info("Starting background variant detection service", {
      interval: this.processInterval,
      batchSize: this.batchSize,
      confidenceThreshold: this.config.minConfidenceThreshold,
    });

    // Start periodic processing
    this.intervalId = setInterval(() => {
      this.processProductBatch().catch((error) => {
        logger.error("Error in background variant detection batch:", error);
        this.lastError = error.message;
        this.processingErrors++;
      });
    }, this.processInterval);

    // Process any pending products immediately
    setTimeout(() => {
      this.processProductBatch().catch((error) => {
        logger.error("Error in initial variant detection batch:", error);
      });
    }, 5000); // Wait 5 seconds after startup
  }

  /**
   * Stop the background variant detection service
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.startTime = null;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info("Background variant detection service stopped");
  }

  /**
   * Process a batch of products for variant detection
   */
  async processProductBatch() {
    if (!this.isRunning) {
      return;
    }

    const startTime = Date.now();
    logger.debug("Starting background variant detection batch");

    try {
      // Find products that need variant detection
      const products = await this.findProductsNeedingDetection();

      if (products.length === 0) {
        logger.debug("No products found needing variant detection");
        return;
      }

      logger.info(
        `Processing ${products.length} products for variant detection`
      );

      const results = {
        processed: 0,
        updated: 0,
        errors: 0,
        skipped: 0,
      };

      // Process products in smaller chunks to avoid overwhelming the system
      for (const product of products) {
        if (!this.isRunning) {
          break; // Stop if service was stopped
        }

        try {
          const result = await this.processProduct(product);
          if (result.updated) {
            results.updated++;
          } else if (result.skipped) {
            results.skipped++;
          }
          results.processed++;

          // Check if we've been processing too long
          if (Date.now() - startTime > this.maxProcessingTime) {
            logger.warn(
              "Background variant detection batch timeout, stopping current batch"
            );
            break;
          }
        } catch (error) {
          logger.error(
            `Error processing product ${product.id} for variant detection:`,
            error
          );
          results.errors++;
        }
      }

      const duration = Date.now() - startTime;

      // Update tracking stats
      this.lastRunTime = Date.now();
      this.totalProcessed += results.processed;
      this.lastBatchSize = results.processed;

      logger.info("Background variant detection batch completed", {
        duration: `${duration}ms`,
        ...results,
      });
    } catch (error) {
      logger.error("Error in background variant detection batch:", error);
    }
  }

  /**
   * Find products that need variant detection
   */
  async findProductsNeedingDetection() {
    try {
      const cutoffTime = new Date(Date.now() - this.config.reprocessInterval);

      const products = await Product.findAll({
        where: {
          [Op.or]: [
            // Products never processed
            { lastVariantDetectionAt: null },
            // Products processed long ago
            { lastVariantDetectionAt: { [Op.lt]: cutoffTime } },
            // Products with low confidence that might benefit from reprocessing
            {
              [Op.and]: [
                {
                  variantDetectionConfidence: {
                    [Op.lt]: this.config.minConfidenceThreshold,
                  },
                },
                {
                  lastVariantDetectionAt: {
                    [Op.lt]: new Date(Date.now() - 60 * 60 * 1000),
                  },
                }, // At least 1 hour ago
              ],
            },
          ],
        },
        include: [
          {
            model: PlatformData,
            as: "platformData",
            required: false,
          },
        ],
        limit: this.batchSize,
        order: [
          ["lastVariantDetectionAt", "ASC NULLS FIRST"], // Process never-processed first
          ["updatedAt", "DESC"], // Then most recently updated
        ],
      });

      return products;
    } catch (error) {
      // Handle specific database errors gracefully
      if (
        error.name === "SequelizeDatabaseError" &&
        error.original?.code === "42P01"
      ) {
        logger.warn(
          "Database tables not yet created, skipping variant detection"
        );
        return [];
      }

      logger.error("Error finding products needing variant detection:", error);
      return [];
    }
  }

  /**
   * Process a single product for variant detection
   */
  async processProduct(product) {
    try {
      logger.debug(
        `Processing product for variant detection: ${product.name} (${product.id})`
      );

      // Run variant classification
      const classificationResult =
        await VariantDetector.classifyProductVariantStatus(product);

      if (!classificationResult.success) {
        return {
          updated: false,
          skipped: false,
          error: "Classification failed",
        };
      }

      const classification = classificationResult.classification;

      // Only update if confidence is above threshold
      if (classification.confidence < this.config.minConfidenceThreshold) {
        logger.debug(
          `Skipping product ${product.id} - confidence too low: ${classification.confidence}`
        );

        // Still update the lastVariantDetectionAt to avoid reprocessing too soon
        await Product.update(
          { lastVariantDetectionAt: new Date() },
          { where: { id: product.id } }
        );

        return { updated: false, skipped: true, reason: "Low confidence" };
      }

      // Check if the classification has actually changed
      const hasChanged = this.hasClassificationChanged(product, classification);

      if (!hasChanged) {
        logger.debug(
          `Skipping product ${product.id} - no significant changes detected`
        );

        // Update timestamp to show it was processed
        await Product.update(
          { lastVariantDetectionAt: new Date() },
          { where: { id: product.id } }
        );

        return { updated: false, skipped: true, reason: "No changes" };
      }

      // Update the product with new variant status
      await VariantDetector.updateProductVariantStatus(
        product.id,
        classification
      );

      logger.info(`Updated variant status for product: ${product.name}`, {
        productId: product.id,
        isVariant: classification.isVariant,
        isMainProduct: classification.isMainProduct,
        variantType: classification.variantType,
        confidence: classification.confidence,
      });

      return { updated: true, skipped: false };
    } catch (error) {
      logger.error(`Error processing product ${product.id}:`, error);
      throw error;
    }
  }

  /**
   * Check if the classification has significantly changed
   */
  hasClassificationChanged(product, newClassification) {
    const current = {
      isVariant: product.isVariant || false,
      isMainProduct: product.isMainProduct || false,
      variantType: product.variantType,
      variantValue: product.variantValue,
      confidence: product.variantDetectionConfidence || 0,
    };

    const new_ = {
      isVariant: newClassification.isVariant || false,
      isMainProduct: newClassification.isMainProduct || false,
      variantType: newClassification.variantType,
      variantValue: newClassification.variantValue,
      confidence: newClassification.confidence || 0,
    };

    // Check for significant changes
    const hasStatusChange =
      current.isVariant !== new_.isVariant ||
      current.isMainProduct !== new_.isMainProduct;
    const hasTypeChange = current.variantType !== new_.variantType;
    const hasValueChange = current.variantValue !== new_.variantValue;
    const hasConfidenceImprovement = new_.confidence > current.confidence + 0.1; // 10% improvement

    return (
      hasStatusChange ||
      hasTypeChange ||
      hasValueChange ||
      hasConfidenceImprovement
    );
  }

  /**
   * Process a specific product immediately (for new/updated products)
   */
  async processProductImmediate(productId, userId) {
    try {
      const product = await Product.findOne({
        where: { id: productId, userId },
        include: [
          {
            model: PlatformData,
            as: "platformData",
            required: false,
          },
        ],
      });

      if (!product) {
        logger.warn(`Product not found for immediate processing: ${productId}`);
        return;
      }

      logger.info(
        `Processing product immediately: ${product.name} (${productId})`
      );
      const result = await this.processProduct(product);

      if (result.updated) {
        logger.info(
          `Immediate variant detection completed for product: ${product.name}`
        );
      }

      return result;
    } catch (error) {
      logger.error(
        `Error in immediate product processing for ${productId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      processInterval: this.processInterval,
      batchSize: this.batchSize,
      config: this.config,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      lastRunTime: this.lastRunTime,
      totalProcessed: this.totalProcessed,
      lastBatchSize: this.lastBatchSize,
      lastError: this.lastError,
      processingErrors: this.processingErrors,
      nextRunEstimate:
        this.isRunning && this.lastRunTime
          ? this.lastRunTime + this.processInterval
          : null,
    };
  }

  /**
   * Get current service configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.saveConfigToFile(); // Save to file immediately
    logger.info(
      "Background variant detection service configuration updated and saved",
      this.config
    );
  }
}

// Export singleton instance
const backgroundVariantDetectionService =
  new BackgroundVariantDetectionService();

module.exports = backgroundVariantDetectionService;
