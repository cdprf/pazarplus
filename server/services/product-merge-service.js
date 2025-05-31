/**
 * Product Merge Service
 * Handles fetching and merging products across multiple platforms
 */
const logger = require("../utils/logger");
const { Product, PlatformData, PlatformConnection } = require("../models");
const { Op } = require("sequelize");
const PlatformServiceFactory = require("../modules/order-management/services/platforms/platformServiceFactory");

class ProductMergeService {
  constructor() {
    this.platformTypes = ["trendyol", "hepsiburada", "n11"];
  }

  /**
   * Fetch products from all active integrations
   */
  async fetchAllProducts(userId, options = {}) {
    try {
      // Get all active platform connections for the user
      const connections = await PlatformConnection.findAll({
        where: {
          userId,
          isActive: true,
        },
      });

      if (connections.length === 0) {
        return {
          success: true,
          message: "No active platform connections found",
          data: [],
        };
      }

      // Track results from each platform
      const platformResults = [];
      const allProducts = [];
      const errors = [];

      // Fetch from each platform in parallel
      await Promise.all(
        connections.map(async (connection) => {
          try {
            // Create appropriate service for this platform
            const platformService = PlatformServiceFactory.createService(
              connection.platformType,
              connection.id
            );

            // Initialize service
            await platformService.initialize();

            // Fetch products
            if (platformService.fetchProducts) {
              const result = await platformService.fetchProducts(options);

              // Add source platform info to each product
              const productsWithSource = (result.data || []).map((product) => ({
                ...product,
                sourcePlatform: connection.platformType,
                connectionId: connection.id,
                connectionName: connection.name,
              }));

              platformResults.push({
                platform: connection.platformType,
                success: result.success,
                count: productsWithSource.length,
              });

              allProducts.push(...productsWithSource);
            } else {
              platformResults.push({
                platform: connection.platformType,
                success: false,
                error: "Platform does not support product fetching",
              });
            }
          } catch (error) {
            logger.error(
              `Error fetching products from ${connection.platformType}:`,
              error
            );
            errors.push({
              platform: connection.platformType,
              error: error.message,
            });

            platformResults.push({
              platform: connection.platformType,
              success: false,
              error: error.message,
            });
          }
        })
      );

      // Return all products from all platforms
      return {
        success: true,
        message: `Successfully fetched ${allProducts.length} products from ${
          platformResults.filter((r) => r.success).length
        } platforms`,
        data: allProducts,
        platformResults,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      logger.error("Failed to fetch products from integrations:", error);
      return {
        success: false,
        message: `Failed to fetch products: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Merge products from all platforms by identifying duplicates
   * @param {Array} products - Products from all platforms
   * @returns {Array} - Merged unique products
   */
  async mergeProducts(products) {
    // Group by potential identifiers
    const productGroups = {};

    // First pass - group by exact SKU match
    products.forEach((product) => {
      const sku = this.extractSku(product);
      if (sku) {
        if (!productGroups[sku]) {
          productGroups[sku] = [];
        }
        productGroups[sku].push(product);
      } else {
        // Products without SKU get their own group
        const uniqueKey = `nosku-${
          product.sourcePlatform
        }-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        productGroups[uniqueKey] = [product];
      }
    });

    // Second pass - try to group by barcode for products not already grouped by SKU
    const ungroupedByBarcode = [];
    products.forEach((product) => {
      // Skip products already grouped by SKU
      const sku = this.extractSku(product);
      if (sku && productGroups[sku].length > 1) return;

      // Try to group by barcode
      const barcode = this.extractBarcode(product);
      if (barcode) {
        // Check if a group with this barcode already exists
        let found = false;
        Object.keys(productGroups).forEach((key) => {
          // Skip if this is the product's own SKU group
          if (key === sku) return;

          const firstProductInGroup = productGroups[key][0];
          const groupBarcode = this.extractBarcode(firstProductInGroup);

          if (groupBarcode && groupBarcode === barcode) {
            // Add to this group
            productGroups[key].push(product);
            found = true;
          }
        });

        if (!found && (!sku || productGroups[sku].length <= 1)) {
          ungroupedByBarcode.push(product);
        }
      } else if (!sku) {
        ungroupedByBarcode.push(product);
      }
    });

    // Third pass - try to group by name similarity for products not grouped by SKU or barcode
    ungroupedByBarcode.forEach((product) => {
      const name = this.extractName(product);
      if (!name) return;

      let bestMatch = null;
      let bestSimilarity = 0.7; // Threshold for name similarity

      Object.keys(productGroups).forEach((key) => {
        const group = productGroups[key];
        const firstProductInGroup = group[0];
        const groupName = this.extractName(firstProductInGroup);

        if (groupName) {
          const similarity = this.calculateStringSimilarity(name, groupName);
          if (similarity > bestSimilarity) {
            bestMatch = key;
            bestSimilarity = similarity;
          }
        }
      });

      if (bestMatch) {
        productGroups[bestMatch].push(product);
      } else {
        // Create new group
        const uniqueKey = `name-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 9)}`;
        productGroups[uniqueKey] = [product];
      }
    });

    // Now merge each group into a single product
    const mergedProducts = Object.values(productGroups).map((group) =>
      this.createMergedProduct(group)
    );

    return mergedProducts;
  }

  /**
   * Create a merged product from a group of similar products
   */
  createMergedProduct(productGroup) {
    // Start with the product that has the most complete information
    let bestProduct = productGroup.reduce((best, current) => {
      const bestScore = this.calculateProductCompleteness(best);
      const currentScore = this.calculateProductCompleteness(current);
      return currentScore > bestScore ? current : best;
    }, productGroup[0]);

    // Create a base merged product
    const mergedProduct = {
      ...bestProduct,
      name: this.extractName(bestProduct),
      sku: this.extractSku(bestProduct),
      barcode: this.extractBarcode(bestProduct),
      description: this.extractDescription(bestProduct),
      price: this.extractPrice(bestProduct),
      stockQuantity: this.extractStockQuantity(bestProduct),
      images: this.extractImages(bestProduct),
      category: this.extractCategory(bestProduct),

      // Add sources information
      sources: productGroup.map((p) => ({
        platform: p.sourcePlatform,
        connectionId: p.connectionId,
        connectionName: p.connectionName,
        externalId: p.id || p.productCode || p.externalProductId,
        sku: this.extractSku(p),
        price: this.extractPrice(p),
        stockQuantity: this.extractStockQuantity(p),
      })),
    };

    // Merge additional images from all products in the group
    const allImages = new Set();
    productGroup.forEach((product) => {
      const images = this.extractImages(product);
      if (Array.isArray(images)) {
        images.forEach((img) => allImages.add(img));
      }
    });

    mergedProduct.images = Array.from(allImages);

    // Take highest stock quantity
    mergedProduct.stockQuantity = Math.max(
      ...productGroup.map((p) => this.extractStockQuantity(p) || 0)
    );

    return mergedProduct;
  }

  /**
   * Helper to calculate product completeness score
   * Higher score = more complete product information
   */
  calculateProductCompleteness(product) {
    let score = 0;
    if (this.extractName(product)) score += 10;
    if (this.extractSku(product)) score += 10;
    if (this.extractBarcode(product)) score += 8;
    if (this.extractDescription(product)) score += 6;
    if (this.extractPrice(product) > 0) score += 8;
    if (this.extractStockQuantity(product) > 0) score += 8;

    const images = this.extractImages(product);
    if (images && Array.isArray(images)) {
      score += Math.min(images.length * 5, 20); // Up to 20 points for images
    }

    if (this.extractCategory(product)) score += 6;

    return score;
  }

  /**
   * Calculate string similarity (simple implementation)
   * Returns a value between 0 and 1, where 1 is an exact match
   */
  calculateStringSimilarity(str1, str2) {
    // Convert to lowercase and remove special characters
    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

    const s1 = normalize(str1);
    const s2 = normalize(str2);

    // If strings are exactly the same
    if (s1 === s2) return 1;

    // If one string contains the other
    if (s1.includes(s2) || s2.includes(s1)) {
      return 0.8;
    }

    // Count matching characters
    let matches = 0;
    for (let i = 0; i < s1.length; i++) {
      if (s2.includes(s1[i])) matches++;
    }

    // Calculate similarity based on avg string length
    const avgLength = (s1.length + s2.length) / 2;
    return matches / avgLength;
  }

  /**
   * Extract standardized fields from platform-specific data structures
   */
  extractSku(product) {
    return (
      product.sku ||
      product.stockCode ||
      product.merchantSku ||
      product.sellerStockCode ||
      (product.rawData && product.rawData.sku)
    );
  }

  extractBarcode(product) {
    return (
      product.barcode ||
      product.barcodes?.[0] ||
      (product.rawData && product.rawData.barcode)
    );
  }

  extractName(product) {
    return (
      product.name ||
      product.title ||
      product.productName ||
      (product.rawData && product.rawData.name)
    );
  }

  extractDescription(product) {
    return (
      product.description ||
      product.productDescription ||
      (product.rawData && product.rawData.description)
    );
  }

  extractPrice(product) {
    const price =
      product.price ||
      product.listPrice ||
      product.salePrice ||
      (product.rawData && (product.rawData.price || product.rawData.listPrice));
    return parseFloat(price) || 0;
  }

  extractStockQuantity(product) {
    const quantity =
      product.stockQuantity ||
      product.quantity ||
      (product.rawData &&
        (product.rawData.stockQuantity || product.rawData.quantity));
    return parseInt(quantity) || 0;
  }

  extractImages(product) {
    if (product.images && Array.isArray(product.images)) {
      return product.images;
    }

    if (product.image) {
      return [product.image];
    }

    if (product.imageUrl) {
      return [product.imageUrl];
    }

    if (product.imageUrls && Array.isArray(product.imageUrls)) {
      return product.imageUrls;
    }

    if (product.rawData && product.rawData.images) {
      return product.rawData.images;
    }

    return [];
  }

  extractCategory(product) {
    return (
      product.category ||
      product.categoryName ||
      (product.rawData && product.rawData.category)
    );
  }

  /**
   * Save merged products to database, maintaining platform connections
   */
  async saveMergedProducts(mergedProducts, userId) {
    const savedProducts = [];

    for (const mergedProduct of mergedProducts) {
      try {
        // Check if product already exists by SKU
        let existingProduct = null;
        if (mergedProduct.sku) {
          existingProduct = await Product.findOne({
            where: {
              userId,
              sku: mergedProduct.sku,
            },
          });
        }

        // Or by barcode
        if (!existingProduct && mergedProduct.barcode) {
          existingProduct = await Product.findOne({
            where: {
              userId,
              barcode: mergedProduct.barcode,
            },
          });
        }

        // Update existing or create new
        let product;
        if (existingProduct) {
          // Update
          await existingProduct.update({
            name: mergedProduct.name || existingProduct.name,
            description:
              mergedProduct.description || existingProduct.description,
            price: mergedProduct.price || existingProduct.price,
            stockQuantity:
              mergedProduct.stockQuantity || existingProduct.stockQuantity,
            images: mergedProduct.images || existingProduct.images,
            barcode: mergedProduct.barcode || existingProduct.barcode,
            category: mergedProduct.category || existingProduct.category,
            lastSyncedAt: new Date(),
          });
          product = existingProduct;
        } else {
          // Create new
          product = await Product.create({
            userId,
            sku: mergedProduct.sku,
            barcode: mergedProduct.barcode,
            name: mergedProduct.name,
            description: mergedProduct.description,
            price: mergedProduct.price || 0,
            stockQuantity: mergedProduct.stockQuantity || 0,
            category: mergedProduct.category,
            images: mergedProduct.images,
            status: "active",
            lastSyncedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        // Update platform connections
        for (const source of mergedProduct.sources) {
          await PlatformData.findOrCreate({
            where: {
              entityType: "product",
              entityId: product.id,
              platformType: source.platform,
            },
            defaults: {
              platformEntityId: source.externalId,
              platformSku: source.sku,
              platformPrice: source.price,
              platformQuantity: source.stockQuantity,
              lastSyncedAt: new Date(),
              status: "active",
              data: { source },
            },
          });
        }

        savedProducts.push(product);
      } catch (error) {
        logger.error(
          `Error saving merged product ${
            mergedProduct.sku || mergedProduct.name
          }:`,
          error
        );
      }
    }

    return savedProducts;
  }
}

module.exports = new ProductMergeService();
