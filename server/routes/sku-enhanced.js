const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");
const EnhancedSKUService = require("../services/enhanced-sku-service");

// Initialize Enhanced SKU service
const skuService = new EnhancedSKUService();

// Initialize with platform services (will be connected to actual platform services)
const initializeService = async () => {
  try {
    // In the future, this will connect to actual platform services
    await skuService.initialize({});
    logger.info("Enhanced SKU Service initialized");
  } catch (error) {
    logger.error("Failed to initialize Enhanced SKU Service:", error);
  }
};

initializeService();

/**
 * Process and classify a code (barcode or SKU)
 * POST /api/sku/process
 */
router.post("/process", async (req, res) => {
  try {
    const { code, context } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Code is required",
      });
    }

    logger.info("Processing code:", { code, context });

    const result = skuService.processCode(code, context || {});

    res.json(result);
  } catch (error) {
    logger.error("Code processing error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to process code",
    });
  }
});

/**
 * Generate SKU using dynamic data
 * POST /api/sku/generate
 */
router.post("/generate", async (req, res) => {
  try {
    const parameters = req.body;

    logger.info("SKU generation request:", parameters);

    const result = skuService.generateSKU(parameters);

    res.json({
      success: true,
      ...result,
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
 * Parse an existing SKU (legacy endpoint)
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

    const result = skuService.processCode(sku);

    res.json({
      success: true,
      sku,
      classification: result.classification,
      parsed: result.sku?.parsed || null,
      isValid: result.classification.type === "sku",
      structured: result.classification.type === "sku",
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
 * Validate SKU format (legacy endpoint)
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

    const result = skuService.processCode(sku);

    res.json({
      success: true,
      sku,
      isValid: result.classification.type === "sku",
      classification: result.classification,
      actions: result.actions || [],
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
 * Get all available data (brands, product types, variants, patterns)
 * GET /api/sku/data
 */
router.get("/data", async (req, res) => {
  try {
    const data = skuService.getAllData();

    res.json({
      success: true,
      ...data,
    });
  } catch (error) {
    logger.error("Error fetching SKU data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch SKU data",
    });
  }
});

/**
 * Get available brands (legacy endpoint)
 * GET /api/sku/brands
 */
router.get("/brands", async (req, res) => {
  try {
    const data = skuService.getAllData();
    const allBrands = [...data.brands.own, ...data.brands.external];

    res.json({
      success: true,
      brands: allBrands.map((brand) => ({
        code: brand.code,
        name: brand.name,
        fullName: brand.fullName,
        type: brand.type || "external",
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
 * Get available product types (legacy endpoint)
 * GET /api/sku/product-types
 */
router.get("/product-types", async (req, res) => {
  try {
    const data = skuService.getAllData();

    res.json({
      success: true,
      productTypes: data.productTypes.map((type) => ({
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
 * Get available variant codes (legacy endpoint)
 * GET /api/sku/variant-codes
 */
router.get("/variant-codes", async (req, res) => {
  try {
    const data = skuService.getAllData();

    res.json({
      success: true,
      variantCodes: data.variantCodes.map((variant) => ({
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
 * Search data
 * GET /api/sku/search?q=query&type=brands|productTypes|variantCodes|all
 */
router.get("/search", async (req, res) => {
  try {
    const { q: query, type = "all" } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const results = skuService.search(query, type);

    res.json({
      success: true,
      query,
      type,
      results,
    });
  } catch (error) {
    logger.error("Search error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search",
    });
  }
});

/**
 * Analyze codes for patterns
 * POST /api/sku/analyze
 */
router.post("/analyze", async (req, res) => {
  try {
    const { codes } = req.body;

    if (!codes || !Array.isArray(codes)) {
      return res.status(400).json({
        success: false,
        message: "Array of codes is required",
      });
    }

    logger.info("Code analysis request:", { count: codes.length });

    const result = skuService.analyzeCodesForPatterns(codes);

    res.json(result);
  } catch (error) {
    logger.error("Code analysis error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to analyze codes",
    });
  }
});

/**
 * Add own brand
 * POST /api/sku/own-brands
 */
router.post("/own-brands", async (req, res) => {
  try {
    const brandData = req.body;

    logger.info("Adding own brand:", brandData);

    const result = skuService.addOwnBrand(brandData);

    res.json({
      success: true,
      message: "Own brand added successfully",
      brand: result,
    });
  } catch (error) {
    logger.error("Add own brand error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to add own brand",
    });
  }
});

/**
 * Add external brand
 * POST /api/sku/external-brands
 */
router.post("/external-brands", async (req, res) => {
  try {
    const brandData = req.body;

    logger.info("Adding external brand:", brandData);

    const result = skuService.addExternalBrand(brandData);

    res.json({
      success: true,
      message: "External brand added successfully",
      brand: result,
    });
  } catch (error) {
    logger.error("Add external brand error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to add external brand",
    });
  }
});

/**
 * Add product type
 * POST /api/sku/product-types
 */
router.post("/product-types", async (req, res) => {
  try {
    const typeData = req.body;

    logger.info("Adding product type:", typeData);

    const result = skuService.addProductType(typeData);

    res.json({
      success: true,
      message: "Product type added successfully",
      productType: result,
    });
  } catch (error) {
    logger.error("Add product type error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to add product type",
    });
  }
});

/**
 * Add variant code
 * POST /api/sku/variant-codes
 */
router.post("/variant-codes", async (req, res) => {
  try {
    const variantData = req.body;

    logger.info("Adding variant code:", variantData);

    const result = skuService.addVariantCode(variantData);

    res.json({
      success: true,
      message: "Variant code added successfully",
      variantCode: result,
    });
  } catch (error) {
    logger.error("Add variant code error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to add variant code",
    });
  }
});

/**
 * Add/Learn pattern
 * POST /api/sku/patterns
 */
router.post("/patterns", async (req, res) => {
  try {
    const { type = "user", ...patternData } = req.body;

    logger.info("Adding pattern:", { type, ...patternData });

    let result;
    if (type === "user") {
      result = skuService.addUserPattern(patternData);
    } else {
      result = skuService.learnPatternFromUser(patternData);
    }

    if (result.success) {
      res.json({
        success: true,
        message: "Pattern added successfully",
        pattern: result.pattern,
        confidence: result.confidence,
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Add pattern error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to add pattern",
    });
  }
});

/**
 * Delete data
 * DELETE /api/sku/:type/:code
 */
router.delete("/:type/:code", async (req, res) => {
  try {
    const { type, code } = req.params;

    logger.info("Deleting SKU data:", { type, code });

    let result = false;
    switch (type) {
      case "own-brands":
        result = skuService.removeOwnBrand(code);
        break;
      case "external-brands":
        result = skuService.removeExternalBrand(code);
        break;
      case "product-types":
        result = skuService.removeProductType(code);
        break;
      case "variant-codes":
        result = skuService.removeVariantCode(code);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid type",
        });
    }

    if (result) {
      res.json({
        success: true,
        message: `${type} deleted successfully`,
      });
    } else {
      res.status(404).json({
        success: false,
        message: `${type} not found or cannot be deleted`,
      });
    }
  } catch (error) {
    logger.error("Delete SKU data error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to delete data",
    });
  }
});

/**
 * Provide feedback on classification
 * POST /api/sku/feedback
 */
router.post("/feedback", async (req, res) => {
  try {
    const { code, classification, isCorrect, comment } = req.body;

    if (!code || !classification || typeof isCorrect !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Code, classification, and isCorrect are required",
      });
    }

    logger.info("Feedback received:", { code, classification, isCorrect, comment });

    const result = skuService.provideFeedback({
      code,
      classification,
      isCorrect,
      comment
    });

    res.json(result);
  } catch (error) {
    logger.error("Feedback error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to process feedback",
    });
  }
});

/**
 * Export data
 * GET /api/sku/export
 */
router.get("/export", async (req, res) => {
  try {
    const data = skuService.exportData();

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error("Export error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export data",
    });
  }
});

/**
 * Import data
 * POST /api/sku/import
 */
router.post("/import", async (req, res) => {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        message: "Data is required",
      });
    }

    logger.info("Importing SKU data");

    const result = skuService.importData(data);

    res.json(result);
  } catch (error) {
    logger.error("Import error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to import data",
    });
  }
});

/**
 * Get SKU statistics and insights
 * GET /api/sku/stats
 */
router.get("/stats", async (req, res) => {
  try {
    const data = skuService.getAllData();

    res.json({
      success: true,
      stats: data.statistics,
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
