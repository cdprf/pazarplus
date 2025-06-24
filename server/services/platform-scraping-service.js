/**
 * Platform Scraping Service
 * Real implementation for scraping product data from e-commerce platforms
 */

const axios = require("axios");
const cheerio = require("cheerio");
const logger = require("../utils/logger");

class PlatformScrapingService {
  constructor() {
    this.userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
    this.timeout = 10000; // 10 seconds
  }

  /**
   * Scrape product data from platform URL
   */
  async scrapeProductData(url, platform) {
    try {
      logger.info(`Scraping product data from ${platform}: ${url}`);

      // Validate URL
      if (!this.isValidUrl(url)) {
        throw new Error("Invalid URL format");
      }

      // Platform-specific scraping
      switch (platform.toLowerCase()) {
        case "trendyol":
          return await this.scrapeTrendyol(url);
        case "hepsiburada":
          return await this.scrapeHepsiburada(url);
        case "n11":
          return await this.scrapeN11(url);
        case "gittigidiyor":
          return await this.scrapeGittigidiyor(url);
        default:
          return await this.scrapeGeneric(url);
      }
    } catch (error) {
      logger.error(`Error scraping ${platform}:`, error.message);
      throw new Error(`Failed to scrape product data: ${error.message}`);
    }
  }

  /**
   * Scrape Trendyol product
   */
  async scrapeTrendyol(url) {
    try {
      const response = await this.makeRequest(url);
      const $ = cheerio.load(response.data);

      // Extract basic product data
      const productData = {
        name: this.extractText($, [
          "h1.pr-new-br span",
          ".product-detail-info h1",
          'h1[data-id="pdp-product-name"]',
          ".prdct-desc-cntnr-ttl",
        ]),
        description: this.extractText($, [
          ".product-detail-info .product-description",
          ".detail-desc-text",
          ".product-detail-info p",
          ".product-detail-content",
        ]),
        price: this.extractPrice($, [
          ".prc-box-dscntd",
          ".price-current",
          ".prc-box-sllng",
        ]),
        originalPrice: this.extractPrice($, [
          ".prc-box-orgnl",
          ".price-original",
        ]),
        brand: this.extractText($, [
          ".product-brand a",
          ".brand-name",
          '[data-id="pdp-product-brand"]',
        ]),
        category: this.extractText($, [
          ".breadcrumb a:last-child",
          ".category-breadcrumb a:last-child",
        ]),
        images: this.extractImages($, [
          ".product-detail-image img",
          ".gallery-image img",
          ".product-images img",
        ]),
        attributes: this.extractAttributes($, {
          color: [".variant-color .selected", ".color-options .selected"],
          size: [".variant-size .selected", ".size-options .selected"],
          rating: [".rating-point", ".product-rating .rating"],
        }),
        availability: this.extractText($, [".add-to-basket", ".basket-button"])
          ? "in_stock"
          : "out_of_stock",
        sku: this.extractText($, ["[data-sku]", ".product-code"]),

        // Trendyol-specific fields
        sellerId: this.extractText($, [
          ".seller-store-info .seller-name",
          ".store-name",
        ]),
        sellerName: this.extractText($, [".seller-name", ".store-info .name"]),
        deliveryDays: this.extractText($, [".delivery-info", ".shipping-time"]),
        freeShipping: $(".free-shipping, .free-delivery").length > 0,
        discountRate: this.extractDiscountRate($),
        reviewCount: this.extractNumber($, [
          ".rating-line-count",
          ".review-count",
        ]),
        averageRating: this.extractRating($, [".rating-point", ".star-rating"]),
        variants: this.extractVariants($),
        returnPolicy: this.extractText($, [".return-policy", ".return-info"]),
      };

      return this.cleanProductData(productData, "trendyol", url);
    } catch (error) {
      throw new Error(`Trendyol scraping failed: ${error.message}`);
    }
  }

  /**
   * Scrape Hepsiburada product
   */
  async scrapeHepsiburada(url) {
    try {
      const response = await this.makeRequest(url);
      const $ = cheerio.load(response.data);

      const productData = {
        name: this.extractText($, [
          'h1[data-bind="text: productName"]',
          ".product-name h1",
          ".pdp-product-name",
        ]),
        description: this.extractText($, [
          ".product-description",
          ".description-content",
          ".product-detail-description",
        ]),
        price: this.extractPrice($, [
          ".notranslate",
          ".price-current",
          ".product-price .price",
        ]),
        originalPrice: this.extractPrice($, [".price-old", ".old-price"]),
        brand: this.extractText($, [".brand-name", ".product-brand a"]),
        category: this.extractText($, [
          ".breadcrumb a:last-child",
          ".category-navigation a:last-child",
        ]),
        images: this.extractImages($, [
          ".product-images img",
          ".gallery img",
          ".product-detail-image img",
        ]),
        attributes: this.extractAttributes($, {
          color: [".variant-color .selected"],
          size: [".variant-size .selected"],
          rating: [".rating-score", ".product-rating"],
        }),
        availability: this.extractText($, [
          ".add-to-cart",
          ".basket-add-button",
        ])
          ? "in_stock"
          : "out_of_stock",
      };

      return this.cleanProductData(productData, "hepsiburada", url);
    } catch (error) {
      throw new Error(`Hepsiburada scraping failed: ${error.message}`);
    }
  }

  /**
   * Scrape N11 product
   */
  async scrapeN11(url) {
    try {
      const response = await this.makeRequest(url);
      const $ = cheerio.load(response.data);

      const productData = {
        name: this.extractText($, [
          ".unf-p-summary h1",
          ".product-name h1",
          ".productName",
        ]),
        description: this.extractText($, [
          ".productDetailDesc",
          ".product-description",
        ]),
        price: this.extractPrice($, [".newPrice", ".price-current"]),
        originalPrice: this.extractPrice($, [".oldPrice", ".price-old"]),
        brand: this.extractText($, [".brand a", ".product-brand"]),
        category: this.extractText($, [".breadCrumb a:last-child"]),
        images: this.extractImages($, [
          ".productImages img",
          ".product-image img",
        ]),
        attributes: this.extractAttributes($, {
          rating: [".ratingPoint"],
        }),
        availability: this.extractText($, [".addBasket", ".add-to-cart"])
          ? "in_stock"
          : "out_of_stock",
      };

      return this.cleanProductData(productData, "n11", url);
    } catch (error) {
      throw new Error(`N11 scraping failed: ${error.message}`);
    }
  }

  /**
   * Generic scraping for unknown platforms
   */
  async scrapeGeneric(url) {
    try {
      const response = await this.makeRequest(url);
      const $ = cheerio.load(response.data);

      const productData = {
        name: this.extractText($, [
          "h1",
          ".product-title",
          ".product-name",
          '[itemprop="name"]',
        ]),
        description: this.extractText($, [
          ".product-description",
          ".description",
          '[itemprop="description"]',
        ]),
        price: this.extractPrice($, [
          ".price",
          ".product-price",
          '[itemprop="price"]',
          ".amount",
        ]),
        brand: this.extractText($, [
          ".brand",
          ".product-brand",
          '[itemprop="brand"]',
        ]),
        category: this.extractText($, [
          ".breadcrumb a:last-child",
          ".category",
        ]),
        images: this.extractImages($, [
          ".product-image img",
          ".gallery img",
          ".product-photos img",
        ]),
        availability: "unknown",
      };

      return this.cleanProductData(productData, "generic", url);
    } catch (error) {
      throw new Error(`Generic scraping failed: ${error.message}`);
    }
  }

  /**
   * Make HTTP request with proper headers
   */
  async makeRequest(url) {
    const config = {
      timeout: this.timeout,
      headers: {
        "User-Agent": this.userAgent,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        DNT: "1",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
    };

    return await axios.get(url, config);
  }

  /**
   * Extract text from multiple selectors
   */
  extractText($, selectors) {
    for (const selector of selectors) {
      const text = $(selector).first().text().trim();
      if (text) return text;
    }
    return null;
  }

  /**
   * Extract price from multiple selectors
   */
  extractPrice($, selectors) {
    for (const selector of selectors) {
      const priceText = $(selector).first().text().trim();
      if (priceText) {
        // Extract numeric value from price text
        const price = priceText.replace(/[^\d,.-]/g, "").replace(",", ".");
        const numericPrice = parseFloat(price);
        if (!isNaN(numericPrice)) return numericPrice;
      }
    }
    return null;
  }

  /**
   * Extract images from multiple selectors
   */
  extractImages($, selectors) {
    const images = [];
    for (const selector of selectors) {
      $(selector).each((i, elem) => {
        const src =
          $(elem).attr("src") ||
          $(elem).attr("data-src") ||
          $(elem).attr("data-original");
        if (src && !images.includes(src)) {
          images.push(src.startsWith("//") ? "https:" + src : src);
        }
      });
    }
    return images.slice(0, 10); // Limit to 10 images
  }

  /**
   * Extract attributes from multiple selectors
   */
  extractAttributes($, attributeMap) {
    const attributes = {};
    for (const [key, selectors] of Object.entries(attributeMap)) {
      const value = this.extractText($, selectors);
      if (value) attributes[key] = value;
    }
    return attributes;
  }

  /**
   * Extract discount rate percentage
   */
  extractDiscountRate($) {
    const discountText = this.extractText($, [
      ".discount-rate",
      ".discount-percentage",
      ".price-discount-rate",
    ]);

    if (discountText) {
      const match = discountText.match(/(\d+)%/);
      return match ? parseInt(match[1]) : null;
    }
    return null;
  }

  /**
   * Extract numeric value from text
   */
  extractNumber($, selectors) {
    const text = this.extractText($, selectors);
    if (text) {
      const match = text.match(/(\d+(?:[.,]\d+)?)/);
      return match ? parseFloat(match[1].replace(",", ".")) : null;
    }
    return null;
  }

  /**
   * Extract rating value
   */
  extractRating($, selectors) {
    for (const selector of selectors) {
      const element = $(selector).first();

      // Try data attributes first
      const dataRating =
        element.attr("data-rating") || element.attr("data-score");
      if (dataRating) return parseFloat(dataRating);

      // Try text content
      const text = element.text().trim();
      const match = text.match(/(\d+(?:[.,]\d+)?)/);
      if (match) return parseFloat(match[1].replace(",", "."));

      // Try counting stars
      const stars = element.find(".star, .filled-star").length;
      if (stars > 0) return stars;
    }
    return null;
  }

  /**
   * Extract product variants
   */
  extractVariants($) {
    const variants = [];

    // Color variants
    $(".variant-color .variant-item, .color-options .option").each(
      (i, elem) => {
        const color = $(elem).attr("title") || $(elem).text().trim();
        const image = $(elem).find("img").attr("src");
        if (color) {
          variants.push({
            type: "color",
            value: color,
            image: image,
            available: !$(elem).hasClass("disabled"),
          });
        }
      }
    );

    // Size variants
    $(".variant-size .variant-item, .size-options .option").each((i, elem) => {
      const size = $(elem).attr("title") || $(elem).text().trim();
      if (size) {
        variants.push({
          type: "size",
          value: size,
          available: !$(elem).hasClass("disabled"),
        });
      }
    });

    return variants;
  }

  /**
   * Clean and normalize product data to central model
   */
  cleanProductData(productData, platform, url) {
    const centralProduct = {
      // Core product fields (common to central model)
      name: productData.name || "Unknown Product",
      description: productData.description || "",
      basePrice: productData.price || 0,
      originalPrice: productData.originalPrice || productData.price || 0,
      brand: productData.brand || "",
      category: productData.category || "",
      images: productData.images || [],
      attributes: productData.attributes || {},
      availability: productData.availability || "unknown",
      baseSku: productData.sku || this.generateSku(platform),
      currency: productData.currency || "TRY",

      // Scraping metadata
      scrapedFrom: url,
      scrapedAt: new Date().toISOString(),
      platform: platform,

      // Platform-specific extra fields
      platformExtras: this.extractPlatformExtras(productData, platform),
    };

    // Add platform-specific validations and enhancements
    return this.enhanceProductByPlatform(centralProduct, platform);
  }

  /**
   * Extract platform-specific extra fields
   */
  extractPlatformExtras(productData, platform) {
    const extras = {};

    switch (platform.toLowerCase()) {
      case "trendyol":
        extras.trendyol = {
          sellerId: productData.sellerId,
          sellerName: productData.sellerName,
          deliveryDays: productData.deliveryDays,
          freeShipping: productData.freeShipping,
          discountRate: productData.discountRate,
          reviewCount: productData.reviewCount,
          averageRating: productData.averageRating,
          variants: productData.variants || [],
          sizingChart: productData.sizingChart,
          returnPolicy: productData.returnPolicy,
        };
        break;

      case "hepsiburada":
        extras.hepsiburada = {
          sellerId: productData.sellerId,
          sellerName: productData.sellerName,
          merchantId: productData.merchantId,
          deliveryInfo: productData.deliveryInfo,
          installmentOptions: productData.installmentOptions,
          fastDelivery: productData.fastDelivery,
          hbPlusEligible: productData.hbPlusEligible,
          reviewScore: productData.reviewScore,
          reviewCount: productData.reviewCount,
          technicalSpecs: productData.technicalSpecs || {},
          warranty: productData.warranty,
        };
        break;

      case "n11":
        extras.n11 = {
          sellerId: productData.sellerId,
          sellerName: productData.sellerName,
          sellerRating: productData.sellerRating,
          deliveryTime: productData.deliveryTime,
          paymentOptions: productData.paymentOptions || [],
          installments: productData.installments,
          campaignInfo: productData.campaignInfo,
          productCode: productData.productCode,
          barcode: productData.barcode,
        };
        break;

      default:
        extras.generic = {
          rawData: productData.rawData || {},
          additionalInfo: productData.additionalInfo || {},
        };
    }

    return extras;
  }

  /**
   * Enhance product data based on platform-specific rules
   */
  enhanceProductByPlatform(product, platform) {
    switch (platform.toLowerCase()) {
      case "trendyol":
        // Trendyol-specific enhancements
        if (product.platformExtras?.trendyol?.discountRate) {
          product.discountPercentage =
            product.platformExtras.trendyol.discountRate;
        }
        break;

      case "hepsiburada":
        // Hepsiburada-specific enhancements
        if (product.platformExtras?.hepsiburada?.fastDelivery) {
          product.attributes.fastDelivery = true;
        }
        break;

      case "n11":
        // N11-specific enhancements
        if (product.platformExtras?.n11?.barcode) {
          product.barcode = product.platformExtras.n11.barcode;
        }
        break;
    }

    return product;
  }

  /**
   * Generate SKU for products without one
   */
  generateSku(platform) {
    const timestamp = Date.now();
    const platformPrefix = platform.toUpperCase().substring(0, 3);
    return `${platformPrefix}-${timestamp}`;
  }

  /**
   * Validate URL format
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Detect platform from URL
   */
  detectPlatform(url) {
    try {
      const domain = new URL(url).hostname.toLowerCase();

      if (domain.includes("trendyol.com")) return "trendyol";
      if (domain.includes("hepsiburada.com")) return "hepsiburada";
      if (domain.includes("n11.com")) return "n11";
      if (domain.includes("gittigidiyor.com")) return "gittigidiyor";
      if (domain.includes("amazon.com") || domain.includes("amazon.tr"))
        return "amazon";
      if (domain.includes("ciceksepeti.com")) return "ciceksepeti";
      if (domain.includes("markafoni.com")) return "markafoni";

      return "generic";
    } catch (error) {
      logger.error("Error detecting platform:", error.message);
      return "generic";
    }
  }

  /**
   * Scrape product data with retry logic
   */
  async scrapeProductDataWithRetry(url, platform, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(
          `Scraping attempt ${attempt}/${maxRetries} for ${platform}: ${url}`
        );

        const result = await this.scrapeProductData(url, platform);

        if (result && result.name) {
          logger.info(`✅ Scraping successful on attempt ${attempt}`);
          return result;
        } else {
          throw new Error("No valid product data extracted");
        }
      } catch (error) {
        lastError = error;
        logger.warn(`❌ Scraping attempt ${attempt} failed: ${error.message}`);

        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          const delay = Math.pow(2, attempt) * 1000;
          logger.info(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `Failed to scrape after ${maxRetries} attempts: ${lastError.message}`
    );
  }
}

module.exports = PlatformScrapingService;
