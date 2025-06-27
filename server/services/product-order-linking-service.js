const {
  Product,
  OrderItem,
  Order,
  TrendyolProduct,
  HepsiburadaProduct,
  N11Product,
  sequelize,
} = require("../models");
const { Op } = require("sequelize");
const logger = require("../utils/logger");

/**
 * Product-Order Linking Service
 * Handles linking products with order items using various matching strategies
 */
class ProductOrderLinkingService {
  constructor() {
    this.matchingStrategies = [
      "exactSKU",
      "exactBarcode",
      "platformProductId",
      "fuzzyTitle",
      "partialSKU",
      "barcodeVariations",
    ];

    this.matchingStats = {
      exactSKU: 0,
      exactBarcode: 0,
      platformProductId: 0,
      fuzzyTitle: 0,
      partialSKU: 0,
      barcodeVariations: 0,
      unmatched: 0,
    };

    this.lastMatchStrategy = null;
  }

  /**
   * Link products with existing unlinked order items
   * @param {string} userId - User ID to process orders for
   * @param {Object} options - Options for linking process
   * @returns {Promise<Object>} Linking results
   */
  async linkExistingOrders(userId, options = {}) {
    const {
      connectionId = null,
      platform = null,
      batchSize = 100,
      dryRun = false,
    } = options;

    try {
      logger.info(`Starting product-order linking for user ${userId}`, {
        userId,
        connectionId,
        platform,
        dryRun,
      });

      // Get unlinked order items
      const unlinkedItems = await this.getUnlinkedOrderItems(userId, {
        connectionId,
        platform,
      });

      if (unlinkedItems.length === 0) {
        return {
          success: true,
          message: "No unlinked order items found",
          totalProcessed: 0,
          linked: 0,
          stats: this.matchingStats,
        };
      }

      logger.info(`Found ${unlinkedItems.length} unlinked order items`);

      // Get user's products for matching
      const userProducts = await this.getUserProducts(userId);

      if (userProducts.length === 0) {
        return {
          success: true,
          message: "No products found for user",
          totalProcessed: unlinkedItems.length,
          linked: 0,
          stats: this.matchingStats,
        };
      }

      // Process in batches
      let totalLinked = 0;
      let totalProcessed = 0;

      for (let i = 0; i < unlinkedItems.length; i += batchSize) {
        const batch = unlinkedItems.slice(i, i + batchSize);
        const batchResults = await this.processBatch(
          batch,
          userProducts,
          dryRun
        );

        totalLinked += batchResults.linked;
        totalProcessed += batchResults.processed;

        logger.info(
          `Processed batch ${Math.floor(i / batchSize) + 1}: ${
            batchResults.linked
          }/${batchResults.processed} linked`
        );
      }

      return {
        success: true,
        message: `Linked ${totalLinked} out of ${totalProcessed} order items`,
        totalProcessed,
        linked: totalLinked,
        unlinked: totalProcessed - totalLinked,
        stats: this.matchingStats,
      };
    } catch (error) {
      logger.error("Error in linkExistingOrders:", error);
      throw error;
    }
  }

  /**
   * Link products for incoming order items during order creation
   * @param {Array} orderItems - Array of order item data
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Enhanced order items with productId
   */
  async linkIncomingOrderItems(orderItems, userId) {
    try {
      if (!Array.isArray(orderItems) || orderItems.length === 0) {
        return orderItems;
      }

      // Get user's products
      const userProducts = await this.getUserProducts(userId);

      if (userProducts.length === 0) {
        logger.warn(
          `No products found for user ${userId} to link with incoming order items`
        );
        return orderItems;
      }

      // Process each order item
      const enhancedItems = [];
      let linkedCount = 0;

      for (const item of orderItems) {
        const matchedProduct = await this.findMatchingProduct(
          item,
          userProducts
        );

        if (matchedProduct) {
          item.productId = matchedProduct.id;
          linkedCount++;
          logger.debug(
            `Linked order item "${item.title}" to product "${matchedProduct.name}"`
          );
        }

        enhancedItems.push(item);
      }

      logger.info(
        `Linked ${linkedCount}/${orderItems.length} incoming order items to products`
      );
      return enhancedItems;
    } catch (error) {
      logger.error("Error in linkIncomingOrderItems:", error);
      // Return original items if linking fails
      return orderItems;
    }
  }

  /**
   * Link products to order items during order import/creation
   * @param {Array} orderItems - Array of order items to process
   * @param {string|Object} userIdOrOptions - User ID or options object with userId
   * @param {Object} options - Additional options (transaction, etc.)
   * @returns {Promise<Object>} Linking results
   */
  async linkProductsToOrderItems(orderItems, userIdOrOptions, options = {}) {
    try {
      // Handle different parameter signatures for backward compatibility
      let userId;
      let linkingOptions = {};

      if (typeof userIdOrOptions === "string") {
        userId = userIdOrOptions;
        linkingOptions = options;
      } else if (
        typeof userIdOrOptions === "object" &&
        userIdOrOptions !== null
      ) {
        // If first parameter after orderItems is an options object
        if (userIdOrOptions.userId) {
          userId = userIdOrOptions.userId;
          linkingOptions = { ...userIdOrOptions, ...options };
        } else {
          // Try to extract userId from the first order item's order
          if (orderItems && orderItems.length > 0 && orderItems[0].order) {
            userId = orderItems[0].order.userId;
          }
          linkingOptions = { ...userIdOrOptions, ...options };
        }
      }

      if (!userId) {
        logger.warn("No userId provided for product linking", {
          orderItemsCount: orderItems?.length || 0,
        });
        return {
          success: false,
          error: "User ID is required for product linking",
          stats: {
            total: orderItems?.length || 0,
            linked: 0,
            unlinked: orderItems?.length || 0,
          },
        };
      }

      const { transaction, dryRun = false } = linkingOptions;
      const stats = { total: orderItems.length, linked: 0, unlinked: 0 };
      const linkedItems = [];
      const unlinkedItems = [];

      logger.info(
        `Starting product linking for ${orderItems.length} order items`,
        {
          userId,
          dryRun,
          hasTransaction: !!transaction,
        }
      );

      // Get user's products for matching
      const products = await this.getUserProducts(userId);

      if (!products || products.length === 0) {
        logger.warn(`No products found for user ${userId}`);
        return {
          success: true,
          stats: {
            total: orderItems.length,
            linked: 0,
            unlinked: orderItems.length,
          },
          linkedItems: [],
          unlinkedItems: orderItems,
          message: "No products available for linking",
        };
      }

      // Process each order item
      for (const orderItem of orderItems) {
        try {
          const matchedProduct = await this.findMatchingProduct(
            orderItem,
            products
          );

          if (matchedProduct) {
            // Link found
            const linkedItem = {
              ...orderItem,
              productId: matchedProduct.id,
              matchedProduct: {
                id: matchedProduct.id,
                name: matchedProduct.name,
                sku: matchedProduct.sku,
                barcode: matchedProduct.barcode,
              },
            };

            linkedItems.push(linkedItem);
            stats.linked++;

            logger.debug(
              `Linked order item "${orderItem.title}" to product "${matchedProduct.name}"`,
              {
                orderItemId: orderItem.id,
                productId: matchedProduct.id,
                strategy: this.lastMatchStrategy, // Track which strategy worked
              }
            );
          } else {
            // No match found
            unlinkedItems.push(orderItem);
            stats.unlinked++;

            logger.debug(
              `No product match found for order item "${orderItem.title}"`,
              {
                orderItemId: orderItem.id,
                sku: orderItem.sku,
                barcode: orderItem.barcode,
                platformProductId: orderItem.platformProductId,
              }
            );
          }
        } catch (itemError) {
          logger.error(
            `Error processing order item ${orderItem.id}:`,
            itemError
          );
          unlinkedItems.push(orderItem);
          stats.unlinked++;
        }
      }

      // Update order items with product links if not dry run
      if (!dryRun && linkedItems.length > 0) {
        const updatePromises = linkedItems.map((item) => {
          // Ensure the item has a valid ID before attempting update
          if (!item.id) {
            logger.warn(`Skipping update for order item without ID:`, {
              title: item.title,
              sku: item.sku,
              productId: item.productId,
            });
            return Promise.resolve();
          }

          const updateOptions = { where: { id: item.id } };
          if (transaction) {
            updateOptions.transaction = transaction;
          }

          return OrderItem.update({ productId: item.productId }, updateOptions);
        });

        await Promise.all(updatePromises);
      }

      const linkingRate =
        stats.total > 0 ? (stats.linked / stats.total) * 100 : 0;

      logger.info(
        `Product linking completed: ${stats.linked}/${
          stats.total
        } items linked (${linkingRate.toFixed(1)}%)`,
        {
          userId,
          dryRun,
          stats,
        }
      );

      return {
        success: true,
        stats,
        linkedItems,
        unlinkedItems,
        linkingRate: Math.round(linkingRate * 100) / 100,
        message: `Successfully linked ${stats.linked} out of ${stats.total} order items`,
      };
    } catch (error) {
      logger.error("Error in linkProductsToOrderItems:", error);
      return {
        success: false,
        error: error.message,
        stats: {
          total: orderItems?.length || 0,
          linked: 0,
          unlinked: orderItems?.length || 0,
        },
      };
    }
  }

  /**
   * Get unlinked order items for a user
   * @param {string} userId - User ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} Unlinked order items
   */
  async getUnlinkedOrderItems(userId, filters = {}) {
    const where = {
      productId: null, // Items without product links
    };

    const orderWhere = {
      userId,
    };

    if (filters.connectionId) {
      orderWhere.connectionId = filters.connectionId;
    }

    if (filters.platform) {
      orderWhere.platform = filters.platform;
    }

    const orderItems = await OrderItem.findAll({
      where,
      include: [
        {
          model: Order,
          as: "order",
          where: orderWhere,
          attributes: ["id", "userId", "platform", "connectionId"],
        },
      ],
      attributes: [
        "id",
        "orderId",
        "productId",
        "platformProductId",
        "sku",
        "barcode",
        "title",
        "quantity",
        "price",
      ],
      order: [["createdAt", "DESC"]],
    });

    return orderItems;
  }

  /**
   * Get user's products for matching
   * @param {string} userId - User ID
   * @returns {Promise<Array>} User products
   */
  async getUserProducts(userId) {
    const products = await Product.findAll({
      where: { userId },
      attributes: ["id", "name", "sku", "barcode", "category", "stockQuantity"],
      include: [
        {
          model: TrendyolProduct,
          as: "trendyolProduct",
          attributes: ["trendyolProductId", "stockCode", "barcode"],
          required: false,
        },
        {
          model: HepsiburadaProduct,
          as: "hepsiburadaProduct",
          attributes: ["merchantSku", "barcode"],
          required: false,
        },
        {
          model: N11Product,
          as: "n11Product",
          attributes: ["n11ProductId", "sellerId", "barcode"],
          required: false,
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    return products;
  }

  /**
   * Process a batch of order items for linking
   * @param {Array} orderItems - Batch of order items
   * @param {Array} products - User products
   * @param {boolean} dryRun - Whether to actually update database
   * @returns {Promise<Object>} Batch results
   */
  async processBatch(orderItems, products, dryRun = false) {
    let linked = 0;
    const updates = [];

    for (const orderItem of orderItems) {
      const matchedProduct = await this.findMatchingProduct(
        orderItem,
        products
      );

      if (matchedProduct) {
        if (!dryRun) {
          updates.push({
            id: orderItem.id,
            productId: matchedProduct.id,
          });
        }
        linked++;

        logger.debug(
          `${dryRun ? "[DRY RUN] " : ""}Matched order item "${
            orderItem.title
          }" to product "${matchedProduct.name}"`
        );
      } else {
        this.matchingStats.unmatched++;
      }
    }

    // Perform bulk update if not dry run
    if (!dryRun && updates.length > 0) {
      const transaction = await sequelize.transaction();
      try {
        for (const update of updates) {
          await OrderItem.update(
            { productId: update.productId },
            {
              where: { id: update.id },
              transaction,
            }
          );
        }
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    }

    return {
      processed: orderItems.length,
      linked,
    };
  }

  /**
   * Find matching product for an order item using various strategies
   * @param {Object} orderItem - Order item to match
   * @param {Array} products - Available products
   * @returns {Promise<Object|null>} Matched product or null
   */
  async findMatchingProduct(orderItem, products) {
    this.lastMatchStrategy = null;

    // Strategy 1: Exact SKU match
    if (orderItem.sku) {
      const match = products.find(
        (p) => p.sku && p.sku.toLowerCase() === orderItem.sku.toLowerCase()
      );
      if (match) {
        this.matchingStats.exactSKU++;
        this.lastMatchStrategy = "exactSKU";
        return match;
      }
    }

    // Strategy 2: Exact barcode match
    if (orderItem.barcode) {
      const match = products.find(
        (p) => p.barcode && p.barcode === orderItem.barcode
      );
      if (match) {
        this.matchingStats.exactBarcode++;
        this.lastMatchStrategy = "exactBarcode";
        return match;
      }
    }

    // Strategy 3: Platform product ID match
    if (orderItem.platformProductId) {
      const match = products.find((p) => {
        // Check Trendyol product ID
        if (
          p.trendyolProduct &&
          p.trendyolProduct.trendyolProductId === orderItem.platformProductId
        ) {
          return true;
        }
        // Check Hepsiburada merchant SKU
        if (
          p.hepsiburadaProduct &&
          p.hepsiburadaProduct.merchantSku === orderItem.platformProductId
        ) {
          return true;
        }
        // Check N11 product ID or seller ID
        if (
          p.n11Product &&
          (p.n11Product.n11ProductId === orderItem.platformProductId ||
            p.n11Product.sellerId === orderItem.platformProductId)
        ) {
          return true;
        }
        return false;
      });

      if (match) {
        this.matchingStats.platformProductId++;
        this.lastMatchStrategy = "platformProductId";
        return match;
      }
    }

    // Strategy 4: Fuzzy title matching
    if (orderItem.title) {
      const match = this.findByFuzzyTitle(orderItem.title, products);
      if (match) {
        this.matchingStats.fuzzyTitle++;
        this.lastMatchStrategy = "fuzzyTitle";
        return match;
      }
    }

    // Strategy 5: Partial SKU match
    if (orderItem.sku) {
      const match = this.findByPartialSKU(orderItem.sku, products);
      if (match) {
        this.matchingStats.partialSKU++;
        this.lastMatchStrategy = "partialSKU";
        return match;
      }
    }

    // Strategy 6: Barcode variations (with/without check digits)
    if (orderItem.barcode) {
      const match = this.findByBarcodeVariations(orderItem.barcode, products);
      if (match) {
        this.matchingStats.barcodeVariations++;
        this.lastMatchStrategy = "barcodeVariations";
        return match;
      }
    }

    return null;
  }

  /**
   * Find product by fuzzy title matching
   * @param {string} orderTitle - Order item title
   * @param {Array} products - Available products
   * @returns {Object|null} Matched product or null
   */
  findByFuzzyTitle(orderTitle, products) {
    if (!orderTitle) return null;

    const normalizedOrderTitle = this.normalizeTitle(orderTitle);

    // First try exact normalized match
    let match = products.find(
      (p) => p.name && this.normalizeTitle(p.name) === normalizedOrderTitle
    );

    if (match) return match;

    // Then try similarity-based matching
    let bestMatch = null;
    let bestScore = 0;
    const minScore = 0.8; // 80% similarity threshold

    for (const product of products) {
      if (!product.name) continue;

      const score = this.calculateSimilarity(
        normalizedOrderTitle,
        this.normalizeTitle(product.name)
      );
      if (score > minScore && score > bestScore) {
        bestScore = score;
        bestMatch = product;
      }
    }

    return bestMatch;
  }

  /**
   * Find product by partial SKU matching
   * @param {string} orderSku - Order item SKU
   * @param {Array} products - Available products
   * @returns {Object|null} Matched product or null
   */
  findByPartialSKU(orderSku, products) {
    if (!orderSku) return null;

    const cleanOrderSku = orderSku.replace(/[-_\s]/g, "").toLowerCase();

    return products.find((p) => {
      if (!p.sku) return false;

      const cleanProductSku = p.sku.replace(/[-_\s]/g, "").toLowerCase();

      // Check if one SKU contains the other
      return (
        cleanOrderSku.includes(cleanProductSku) ||
        cleanProductSku.includes(cleanOrderSku)
      );
    });
  }

  /**
   * Find product by barcode variations
   * @param {string} orderBarcode - Order item barcode
   * @param {Array} products - Available products
   * @returns {Object|null} Matched product or null
   */
  findByBarcodeVariations(orderBarcode, products) {
    if (!orderBarcode) return null;

    // Generate barcode variations
    const variations = this.generateBarcodeVariations(orderBarcode);

    for (const variation of variations) {
      const match = products.find((p) => p.barcode === variation);
      if (match) return match;
    }

    return null;
  }

  /**
   * Generate barcode variations (with/without leading zeros, check digits, etc.)
   * @param {string} barcode - Original barcode
   * @returns {Array} Array of barcode variations
   */
  generateBarcodeVariations(barcode) {
    const variations = [barcode];

    // Remove leading zeros
    variations.push(barcode.replace(/^0+/, ""));

    // Add leading zeros for different lengths
    variations.push(barcode.padStart(8, "0"));
    variations.push(barcode.padStart(12, "0"));
    variations.push(barcode.padStart(13, "0"));
    variations.push(barcode.padStart(14, "0"));

    // Remove last digit (possible check digit)
    if (barcode.length > 1) {
      variations.push(barcode.slice(0, -1));
    }

    // Remove first digit
    if (barcode.length > 1) {
      variations.push(barcode.slice(1));
    }

    return [...new Set(variations)]; // Remove duplicates
  }

  /**
   * Normalize title for comparison
   * @param {string} title - Title to normalize
   * @returns {string} Normalized title
   */
  normalizeTitle(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove special characters
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score between 0 and 1
   */
  calculateSimilarity(str1, str2) {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;

    const distance = this.levenshteinDistance(str1, str2);
    return (maxLength - distance) / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Levenshtein distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Get linking statistics
   * @returns {Object} Current matching statistics
   */
  getStats() {
    return { ...this.matchingStats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    Object.keys(this.matchingStats).forEach((key) => {
      this.matchingStats[key] = 0;
    });
  }

  /**
   * Generate detailed linking report
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Detailed report
   */
  async generateLinkingReport(userId) {
    try {
      const [
        totalOrderItems,
        linkedOrderItems,
        unlinkedOrderItems,
        totalProducts,
        ordersWithoutProducts,
        productsWithoutOrders,
      ] = await Promise.all([
        // Total order items for user
        OrderItem.count({
          include: [
            {
              model: Order,
              as: "order",
              where: { userId },
            },
          ],
        }),

        // Linked order items
        OrderItem.count({
          where: { productId: { [Op.not]: null } },
          include: [
            {
              model: Order,
              as: "order",
              where: { userId },
            },
          ],
        }),

        // Unlinked order items
        OrderItem.count({
          where: { productId: null },
          include: [
            {
              model: Order,
              as: "order",
              where: { userId },
            },
          ],
        }),

        // Total products
        Product.count({ where: { userId } }),

        // Orders without any linked products
        Order.count({
          where: {
            userId,
            "$items.productId$": null,
          },
          include: [
            {
              model: OrderItem,
              as: "items",
              attributes: [],
            },
          ],
        }),

        // Products without any order items
        Product.count({
          where: {
            userId,
            "$orderItems.id$": null,
          },
          include: [
            {
              model: OrderItem,
              as: "orderItems",
              attributes: [],
              required: false,
            },
          ],
        }),
      ]);

      const linkingRate =
        totalOrderItems > 0 ? (linkedOrderItems / totalOrderItems) * 100 : 0;

      return {
        summary: {
          totalOrderItems,
          linkedOrderItems,
          unlinkedOrderItems,
          linkingRate: Math.round(linkingRate * 100) / 100,
          totalProducts,
          ordersWithoutProducts,
          productsWithoutOrders,
        },
        stats: this.getStats(),
        recommendations: this.generateRecommendations({
          totalOrderItems,
          linkedOrderItems,
          unlinkedOrderItems,
          totalProducts,
          ordersWithoutProducts,
          productsWithoutOrders,
          linkingRate,
        }),
      };
    } catch (error) {
      logger.error("Error generating linking report:", error);
      throw error;
    }
  }

  /**
   * Generate recommendations based on linking report
   * @param {Object} reportData - Report data
   * @returns {Array} Array of recommendations
   */
  generateRecommendations(reportData) {
    const recommendations = [];

    if (reportData.linkingRate < 50) {
      recommendations.push({
        type: "warning",
        title: "Low Product Linking Rate",
        message: `Only ${reportData.linkingRate}% of order items are linked to products. Consider improving product data quality.`,
        action: "Review and standardize SKU and barcode data",
      });
    }

    if (reportData.unlinkedOrderItems > 100) {
      recommendations.push({
        type: "action",
        title: "Many Unlinked Order Items",
        message: `${reportData.unlinkedOrderItems} order items are not linked to products.`,
        action: "Run automated product linking process",
      });
    }

    if (reportData.productsWithoutOrders > reportData.totalProducts * 0.3) {
      recommendations.push({
        type: "info",
        title: "Products Without Sales",
        message: `${reportData.productsWithoutOrders} products have no associated orders.`,
        action: "Review product catalog and remove obsolete products",
      });
    }

    return recommendations;
  }

  /**
   * Find potential product matches for a single order item
   * @param {Object} orderItem - The order item to find matches for
   * @returns {Promise<Array>} Array of potential product matches with scores
   */
  async findProductMatches(orderItem) {
    try {
      const matches = [];

      // Get all products to search through
      // First try to get userId from the order relationship
      let userId = null;
      if (orderItem.order && orderItem.order.userId) {
        userId = orderItem.order.userId;
      } else if (orderItem.orderId) {
        // Fetch the order to get userId
        const order = await Order.findByPk(orderItem.orderId);
        userId = order?.userId;
      }

      if (!userId) {
        logger.warn("Cannot find userId for order item", {
          orderItemId: orderItem.id,
        });
        return [];
      }

      const products = await Product.findAll({
        where: { userId },
      });

      if (!products || products.length === 0) {
        return [];
      }

      // Strategy 1: Exact SKU match
      if (orderItem.sku) {
        const exactSKUMatches = products.filter(
          (p) => p.sku && p.sku.toLowerCase() === orderItem.sku.toLowerCase()
        );
        exactSKUMatches.forEach((match) => {
          matches.push({
            ...match.toJSON(),
            matchStrategy: "exactSKU",
            confidence: 1.0,
            score: 1.0,
          });
        });
      }

      // Strategy 2: Exact barcode match
      if (orderItem.barcode) {
        const exactBarcodeMatches = products.filter(
          (p) => p.barcode && p.barcode === orderItem.barcode
        );
        exactBarcodeMatches.forEach((match) => {
          matches.push({
            ...match.toJSON(),
            matchStrategy: "exactBarcode",
            confidence: 0.95,
            score: 1.0,
          });
        });
      }

      // Strategy 3: Platform product ID match
      if (orderItem.platformProductId) {
        const platformMatches = products.filter((p) => {
          // Check Trendyol product ID
          if (
            p.trendyolProduct &&
            p.trendyolProduct.trendyolProductId === orderItem.platformProductId
          ) {
            return true;
          }
          // Check Hepsiburada merchant SKU
          if (
            p.hepsiburadaProduct &&
            p.hepsiburadaProduct.merchantSku === orderItem.platformProductId
          ) {
            return true;
          }
          // Check N11 product ID or seller ID
          if (
            p.n11Product &&
            (p.n11Product.n11ProductId === orderItem.platformProductId ||
              p.n11Product.sellerId === orderItem.platformProductId)
          ) {
            return true;
          }
          return false;
        });

        platformMatches.forEach((match) => {
          matches.push({
            ...match.toJSON(),
            matchStrategy: "platformProductId",
            confidence: 0.9,
            score: 1.0,
          });
        });
      }

      // Strategy 4: Fuzzy title matching
      if (orderItem.title) {
        const fuzzyMatches = this.findFuzzyTitleMatches(
          orderItem.title,
          products
        );
        fuzzyMatches.forEach((match) => {
          matches.push({
            ...match.product.toJSON(),
            matchStrategy: "fuzzyTitle",
            confidence: Math.min(match.score, 0.85),
            score: match.score,
          });
        });
      }

      // Strategy 5: Partial SKU matching
      if (orderItem.sku) {
        const partialSKUMatches = this.findPartialSKUMatches(
          orderItem.sku,
          products
        );
        partialSKUMatches.forEach((match) => {
          matches.push({
            ...match.product.toJSON(),
            matchStrategy: "partialSKU",
            confidence: Math.min(match.score * 0.7, 0.7),
            score: match.score,
          });
        });
      }

      // Strategy 6: Barcode variations
      if (orderItem.barcode) {
        const barcodeVariationMatches = this.findBarcodeVariationMatches(
          orderItem.barcode,
          products
        );
        barcodeVariationMatches.forEach((match) => {
          matches.push({
            ...match.toJSON(),
            matchStrategy: "barcodeVariations",
            confidence: 0.8,
            score: 1.0,
          });
        });
      }

      // Remove duplicates and sort by confidence
      const uniqueMatches = this._deduplicateMatches(matches);
      return uniqueMatches
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10); // Return top 10 matches
    } catch (error) {
      logger.error("Error finding product matches:", error);
      return [];
    }
  }

  /**
   * Find fuzzy title matches with scoring
   * @param {string} title - Title to search for
   * @param {Array} products - Products to search in
   * @returns {Array} Array of matches with scores
   */
  findFuzzyTitleMatches(title, products) {
    const matches = [];
    const normalizedTitle = this.normalizeTitle(title);

    products.forEach((product) => {
      if (product.title) {
        const normalizedProductTitle = this.normalizeTitle(product.title);
        const score = this.calculateSimilarity(
          normalizedTitle,
          normalizedProductTitle
        );

        if (score > 0.7) {
          // Only include matches with 70%+ similarity
          matches.push({
            product,
            score,
          });
        }
      }
    });

    return matches;
  }

  /**
   * Find partial SKU matches with scoring
   * @param {string} sku - SKU to search for
   * @param {Array} products - Products to search in
   * @returns {Array} Array of matches with scores
   */
  findPartialSKUMatches(sku, products) {
    const matches = [];
    const normalizedSKU = this.normalizeSKU(sku);

    products.forEach((product) => {
      if (product.sku) {
        const normalizedProductSKU = this.normalizeSKU(product.sku);

        // Check for partial matches
        if (
          normalizedSKU.includes(normalizedProductSKU) ||
          normalizedProductSKU.includes(normalizedSKU)
        ) {
          const score =
            Math.min(normalizedSKU.length, normalizedProductSKU.length) /
            Math.max(normalizedSKU.length, normalizedProductSKU.length);

          if (score > 0.6) {
            // Only include matches with 60%+ overlap
            matches.push({
              product,
              score,
            });
          }
        }
      }
    });

    return matches;
  }

  /**
   * Find barcode variation matches (handle leading zeros, check digits, etc.)
   * @param {string} barcode - Barcode to search for
   * @param {Array} products - Products to search in
   * @returns {Array} Array of matching products
   */
  findBarcodeVariationMatches(barcode, products) {
    const matches = [];
    const barcodeVariations = this.generateBarcodeVariations(barcode);

    products.forEach((product) => {
      if (product.barcode && barcodeVariations.includes(product.barcode)) {
        matches.push(product);
      }
    });

    return matches;
  }

  /**
   * Calculate confidence score based on strategy and match score
   * @param {string} strategy - The matching strategy used
   * @param {number} score - The raw match score
   * @returns {number} Confidence score between 0 and 1
   */
  _calculateConfidence(strategy, score) {
    const strategyWeights = {
      exactSKU: 1.0,
      exactBarcode: 0.95,
      platformProductId: 0.9,
      fuzzyTitle: Math.min(score, 0.85),
      partialSKU: Math.min(score * 0.7, 0.7),
      barcodeVariations: 0.8,
    };

    return strategyWeights[strategy] || 0.5;
  }

  /**
   * Normalize SKU for comparison
   * @param {string} sku - SKU to normalize
   * @returns {string} Normalized SKU
   */
  normalizeSKU(sku) {
    if (!sku || typeof sku !== "string") {
      return "";
    }
    return sku.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  /**
   * Remove duplicate product matches
   * @param {Array} matches - Array of product matches
   * @returns {Array} Deduplicated matches
   */
  _deduplicateMatches(matches) {
    const seen = new Set();
    return matches.filter((match) => {
      const key = match.id || match.productId;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}

module.exports = ProductOrderLinkingService;
