/**
 * Background Variant Detection Service
 *
 * This service runs automatic variant detection on products as a background task.
 * It processes products periodically and detects variants automatically.
 */

const logger = require("../utils/logger");
const { Product, PlatformData } = require("../models");
const { Op } = require("sequelize");
const EnhancedVariantDetector = require("./enhanced-variant-detector");

class BackgroundVariantDetectionService {
  constructor() {
    this.isRunning = false;
    this.processInterval = 5 * 60 * 1000; // 5 minutes
    this.batchSize = 10; // Process 10 products at a time
    this.maxProcessingTime = 2 * 60 * 1000; // 2 minutes max per batch
    this.intervalId = null;

    // Configuration
    this.config = {
      minConfidenceThreshold: 0.5, // Only update if confidence is above 50%
      maxRetries: 3,
      processOnCreate: true, // Auto-process new products
      processOnUpdate: true, // Auto-process updated products
      reprocessInterval: 24 * 60 * 60 * 1000, // Reprocess once per day
    };
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
    logger.info("Starting background variant detection service", {
      interval: this.processInterval,
      batchSize: this.batchSize,
      confidenceThreshold: this.config.minConfidenceThreshold,
    });

    // Start periodic processing
    this.intervalId = setInterval(() => {
      this.processProductBatch().catch((error) => {
        logger.error("Error in background variant detection batch:", error);
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
        await EnhancedVariantDetector.classifyProductVariantStatus(product);

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
      await EnhancedVariantDetector.updateProductVariantStatus(
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
      uptime: this.intervalId ? Date.now() - this.startTime : 0,
    };
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info(
      "Background variant detection service configuration updated",
      this.config
    );
  }
}

// Export singleton instance
const backgroundVariantDetectionService =
  new BackgroundVariantDetectionService();

module.exports = backgroundVariantDetectionService;
