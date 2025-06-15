const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");
const SKUSystemManager = require("../../sku-system-manager");
const EnhancedVariantDetectionService = require("../services/enhanced-variant-detection-service");

// Initialize SKU system manager
const skuManager = new SKUSystemManager();
const variantService = new EnhancedVariantDetectionService();

/**
 * Generate SKU based on product information
 * POST /api/sku/generate
 */
router.post("/generate", async (req, res) => {
  try {
    const { productType, brand, variant, productName, category } = req.body;

    logger.info("SKU generation request:", {
      productType,
      brand,
      variant,
      productName,
      category,
    });

    // Generate SKU using the manager
    const sku = skuManager.generateSKU({
      productType,
      brand,
      variant,
      productName,
      category,
    });

    res.json({
      success: true,
      sku,
      components: skuManager.parseSKU(sku),
    });
  } catch (error) {
    logger.error("SKU generation error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to generate SKU",
    });
  }
});

/**
 * Parse an existing SKU
 * POST /api/sku/parse
 */
router.post("/parse", async (req, res) => {
  try {
    const { sku } = req.body;

    if (!sku) {
      return res.status(400).json({
        success: false,
        message: "SKU is required",
      });
    }

    logger.info("SKU parsing request:", { sku });

    const parsed = skuManager.parseSKU(sku);
    const isValid = skuManager.validateSKUFormat(sku);

    res.json({
      success: true,
      sku,
      parsed,
      isValid,
      structured: parsed.isStructured,
    });
  } catch (error) {
    logger.error("SKU parsing error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to parse SKU",
    });
  }
});

/**
 * Validate SKU format
 * POST /api/sku/validate
 */
router.post("/validate", async (req, res) => {
  try {
    const { sku } = req.body;

    if (!sku) {
      return res.status(400).json({
        success: false,
        message: "SKU is required",
      });
    }

    logger.info("SKU validation request:", { sku });

    const isValid = skuManager.validateSKUFormat(sku);
    const parsed = skuManager.parseSKU(sku);
    const suggestions = [];

    // Provide suggestions if invalid
    if (!isValid && parsed.isStructured) {
      suggestions.push(
        "SKU appears to follow structured format but has validation issues"
      );
    } else if (!isValid && !parsed.isStructured) {
      suggestions.push(
        "Consider using structured format: {ProductType}-{Brand+Number}-{Variant}"
      );
    }

    res.json({
      success: true,
      sku,
      isValid,
      parsed,
      suggestions,
    });
  } catch (error) {
    logger.error("SKU validation error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to validate SKU",
    });
  }
});

/**
 * Get available brands
 * GET /api/sku/brands
 */
router.get("/brands", async (req, res) => {
  try {
    const brands = skuManager.getAvailableBrands();

    res.json({
      success: true,
      brands: brands.map((brand) => ({
        code: brand.code,
        name: brand.name,
        fullName: brand.fullName,
      })),
    });
  } catch (error) {
    logger.error("Error fetching brands:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch brands",
    });
  }
});

/**
 * Get available product types
 * GET /api/sku/product-types
 */
router.get("/product-types", async (req, res) => {
  try {
    const productTypes = skuManager.getAvailableProductTypes();

    res.json({
      success: true,
      productTypes: productTypes.map((type) => ({
        code: type.code,
        name: type.name,
        category: type.category,
      })),
    });
  } catch (error) {
    logger.error("Error fetching product types:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product types",
    });
  }
});

/**
 * Get available variant codes
 * GET /api/sku/variant-codes
 */
router.get("/variant-codes", async (req, res) => {
  try {
    const variantCodes = skuManager.getAvailableVariantCodes();

    res.json({
      success: true,
      variantCodes: variantCodes.map((variant) => ({
        code: variant.code,
        name: variant.name,
        category: variant.category,
      })),
    });
  } catch (error) {
    logger.error("Error fetching variant codes:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch variant codes",
    });
  }
});

/**
 * Detect variants for a product
 * POST /api/sku/detect-variants
 */
router.post("/detect-variants", async (req, res) => {
  try {
    const { productName, description, category, sku } = req.body;

    logger.info("Variant detection request:", { productName, category, sku });

    // Use enhanced variant detection service
    const detectedVariants = await variantService.detectVariants({
      name: productName,
      description,
      category,
      sku,
    });

    res.json({
      success: true,
      variants: detectedVariants,
      suggestions: variantService.getSuggestions(detectedVariants),
    });
  } catch (error) {
    logger.error("Variant detection error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to detect variants",
    });
  }
});

/**
 * Generate variant SKUs for a product
 * POST /api/sku/generate-variants
 */
router.post("/generate-variants", async (req, res) => {
  try {
    const { baseSKU, variants, productInfo } = req.body;

    logger.info("Variant generation request:", {
      baseSKU,
      variants: variants?.length,
    });

    if (!baseSKU) {
      return res.status(400).json({
        success: false,
        message: "Base SKU is required",
      });
    }

    if (!variants || !Array.isArray(variants)) {
      return res.status(400).json({
        success: false,
        message: "Variants array is required",
      });
    }

    // Parse base SKU to get components
    const baseParsed = skuManager.parseSKU(baseSKU);

    // Generate variant SKUs
    const generatedVariants = variants.map((variant) => {
      const variantSKU = skuManager.generateSKU({
        productType: baseParsed.productType,
        brand: baseParsed.brand,
        variant: variant.code || variant.name,
        productName: productInfo?.name || "",
        category: productInfo?.category || "",
      });

      return {
        ...variant,
        sku: variantSKU,
        parsed: skuManager.parseSKU(variantSKU),
      };
    });

    res.json({
      success: true,
      baseSKU,
      variants: generatedVariants,
      totalGenerated: generatedVariants.length,
    });
  } catch (error) {
    logger.error("Variant generation error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to generate variants",
    });
  }
});

/**
 * Add custom brand
 * POST /api/sku/brands
 */
router.post("/brands", async (req, res) => {
  try {
    const { code, name, fullName } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: "Brand code and name are required",
      });
    }

    logger.info("Adding custom brand:", { code, name, fullName });

    // Add custom brand to manager
    const added = skuManager.addCustomBrand({ code, name, fullName });

    if (added) {
      res.json({
        success: true,
        message: "Brand added successfully",
        brand: { code, name, fullName },
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Brand already exists or invalid data",
      });
    }
  } catch (error) {
    logger.error("Add brand error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to add brand",
    });
  }
});

/**
 * Get SKU statistics and insights
 * GET /api/sku/stats
 */
router.get("/stats", async (req, res) => {
  try {
    // This would typically query the database for actual stats
    // For now, return basic system stats
    const stats = {
      totalBrands: skuManager.getAvailableBrands().length,
      totalProductTypes: skuManager.getAvailableProductTypes().length,
      totalVariantCodes: skuManager.getAvailableVariantCodes().length,
      systemVersion: "1.0.0",
      lastUpdated: new Date().toISOString(),
    };

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error("Error fetching SKU stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch SKU statistics",
    });
  }
});

module.exports = router;
