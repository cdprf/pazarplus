const fs = require("fs");
const path = require("path");
let Parser;
try {
  const json2csv = require("json2csv");
  Parser = json2csv.Parser;
} catch (error) {
  console.warn("json2csv not available, template generation will be limited");
}
const logger = require("../utils/logger");

// Try to load Excel parsing library
let ExcelJS;
try {
  ExcelJS = require("exceljs");
} catch (error) {
  logger.warn("ExcelJS not available, Excel import will be disabled");
}

// Try to load CSV parsing library
let csvParser;
try {
  csvParser = require("csv-parser");
} catch (error) {
  logger.warn("csv-parser not available, CSV import will be disabled");
}

const {
  MainProduct,
  PlatformVariant,
  Product,
  sequelize,
} = require("../models");
const { Op } = require("sequelize");

/**
 * Product Import Service
 * Handles CSV/Excel file uploads and product imports with main/variant classification
 */
class ProductImportService {
  constructor() {
    this.supportedFormats = [];

    if (csvParser) {
      this.supportedFormats.push("csv", "text/csv");
    }

    if (ExcelJS) {
      this.supportedFormats.push(
        "xlsx",
        "xls",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel"
      );
    }

    this.uploadDir = path.join(__dirname, "..", "uploads", "imports");
    this.ensureUploadDir();
  }

  /**
   * Ensure upload directory exists
   */
  ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Parse uploaded file and extract product data
   * @param {Object} file - Uploaded file object (from multer)
   * @returns {Object} Parsed data with headers and rows
   */
  async parseFile(file) {
    if (!file) {
      throw new Error("No file provided");
    }

    const fileExtension = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype;

    logger.info(
      `Parsing file: ${file.originalname}, type: ${mimeType}, extension: ${fileExtension}`
    );

    if (fileExtension === ".csv" || mimeType === "text/csv") {
      return await this.parseCSV(file);
    } else if (
      [".xlsx", ".xls"].includes(fileExtension) ||
      mimeType.includes("spreadsheet") ||
      mimeType.includes("excel")
    ) {
      return await this.parseExcel(file);
    } else {
      throw new Error(
        `Unsupported file format: ${fileExtension}. Supported formats: CSV, Excel (XLSX, XLS)`
      );
    }
  }

  /**
   * Parse CSV file
   * @param {Object} file - File object
   * @returns {Object} Parsed CSV data
   */
  async parseCSV(file) {
    if (!csvParser) {
      throw new Error(
        "CSV parsing is not available. Please install csv-parser package."
      );
    }

    return new Promise((resolve, reject) => {
      const results = [];
      const stream = fs.createReadStream(file.path || file.buffer);

      stream
        .pipe(csvParser())
        .on("data", (data) => results.push(data))
        .on("end", () => {
          if (results.length === 0) {
            reject(new Error("CSV file is empty or contains no valid data"));
            return;
          }

          const headers = Object.keys(results[0]);
          resolve({
            headers,
            rows: results,
            totalRows: results.length,
            format: "csv",
          });
        })
        .on("error", (error) => {
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        });
    });
  }

  /**
   * Parse Excel file
   * @param {Object} file - File object
   * @returns {Object} Parsed Excel data
   */
  async parseExcel(file) {
    if (!ExcelJS) {
      throw new Error(
        "Excel parsing is not available. Please install exceljs package."
      );
    }

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(file.path);

      // Use the first worksheet
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error("Excel file contains no worksheets");
      }

      const rows = [];
      const headers = [];

      // Get headers from first row
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell, colNumber) => {
        headers.push(cell.text || `Column${colNumber}`);
      });

      if (headers.length === 0) {
        throw new Error("Excel file has no headers in first row");
      }

      // Get data rows (starting from row 2)
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);

        // Skip empty rows
        if (row.hasValues) {
          const rowData = {};
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1];
            if (header) {
              rowData[header] = cell.text || cell.value || "";
            }
          });

          // Only add row if it has at least one non-empty value
          if (
            Object.values(rowData).some(
              (value) => value && value.toString().trim()
            )
          ) {
            rows.push(rowData);
          }
        }
      }

      if (rows.length === 0) {
        throw new Error("Excel file contains no data rows");
      }

      return {
        headers,
        rows,
        totalRows: rows.length,
        format: "excel",
      };
    } catch (error) {
      throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
  }

  /**
   * Analyze parsed data and suggest field mappings
   * @param {Object} parsedData - Data from parseFile
   * @returns {Object} Field mapping suggestions
   */
  suggestFieldMappings(parsedData) {
    const { headers } = parsedData;
    const mappings = {};
    const suggestions = {};

    // Define mapping patterns for common field names
    const fieldPatterns = {
      name: /^(name|title|product.*name|item.*name|ürün.*adı|başlık)$/i,
      description: /^(description|desc|açıklama|detay)$/i,
      sku: /^(sku|stock.*code|product.*code|kod|stok.*kodu)$/i,
      barcode: /^(barcode|barkod|gtin|upc|ean)$/i,
      category: /^(category|kategori|cat)$/i,
      brand: /^(brand|marka|manufacturer|üretici)$/i,
      price: /^(price|fiyat|liste.*fiyat|satış.*fiyat)$/i,
      costPrice: /^(cost.*price|maliyet|alış.*fiyat)$/i,
      stock: /^(stock|stok|quantity|miktar|adet)$/i,
      weight: /^(weight|ağırlık|kg)$/i,
      dimensions: /^(dimensions|boyut|size|ebat)$/i,
      status: /^(status|durum|aktif|active)$/i,
    };

    // Map headers to fields
    headers.forEach((header) => {
      const normalizedHeader = header.trim();

      for (const [field, pattern] of Object.entries(fieldPatterns)) {
        if (pattern.test(normalizedHeader)) {
          mappings[field] = normalizedHeader;
          suggestions[field] = {
            mapped: true,
            confidence: "high",
            header: normalizedHeader,
          };
          break;
        }
      }
    });

    // Find unmapped headers and suggest possible fields
    const unmappedHeaders = headers.filter(
      (header) => !Object.values(mappings).includes(header.trim())
    );

    unmappedHeaders.forEach((header) => {
      const lowerHeader = header.toLowerCase();

      // Suggest based on content
      if (lowerHeader.includes("variant") || lowerHeader.includes("varyant")) {
        suggestions.variantInfo = {
          mapped: false,
          confidence: "medium",
          header: header,
          suggestion: "This might contain variant information",
        };
      } else if (
        lowerHeader.includes("image") ||
        lowerHeader.includes("resim")
      ) {
        suggestions.images = {
          mapped: false,
          confidence: "medium",
          header: header,
          suggestion: "This might contain image URLs",
        };
      } else if (
        lowerHeader.includes("tag") ||
        lowerHeader.includes("etiket")
      ) {
        suggestions.tags = {
          mapped: false,
          confidence: "medium",
          header: header,
          suggestion: "This might contain product tags",
        };
      }
    });

    return {
      mappings,
      suggestions,
      unmappedHeaders,
      totalHeaders: headers.length,
      mappedCount: Object.keys(mappings).length,
    };
  }

  /**
   * Validate import data based on field mappings
   * @param {Object} parsedData - Parsed file data
   * @param {Object} fieldMappings - User-defined field mappings
   * @returns {Object} Validation results
   */
  validateImportData(parsedData, fieldMappings = {}) {
    const { rows } = parsedData;
    const errors = [];
    const warnings = [];
    const validRows = [];
    const invalidRows = [];

    // Required fields for a valid product
    const requiredFields = ["name"];
    const recommendedFields = ["price", "category"];

    rows.forEach((row, index) => {
      const rowErrors = [];
      const rowWarnings = [];
      const mappedRow = {};

      // Map fields according to fieldMappings
      Object.entries(fieldMappings).forEach(([targetField, sourceField]) => {
        if (sourceField && row[sourceField] !== undefined) {
          mappedRow[targetField] = row[sourceField];
        }
      });

      // Check required fields
      requiredFields.forEach((field) => {
        if (!mappedRow[field] || !mappedRow[field].toString().trim()) {
          rowErrors.push(`Missing required field: ${field}`);
        }
      });

      // Check recommended fields
      recommendedFields.forEach((field) => {
        if (!mappedRow[field] || !mappedRow[field].toString().trim()) {
          rowWarnings.push(`Missing recommended field: ${field}`);
        }
      });

      // Validate price if present
      if (mappedRow.price) {
        const price = parseFloat(mappedRow.price);
        if (isNaN(price) || price < 0) {
          rowErrors.push("Invalid price value");
        }
      }

      // Validate stock if present
      if (mappedRow.stock) {
        const stock = parseInt(mappedRow.stock);
        if (isNaN(stock) || stock < 0) {
          rowWarnings.push("Invalid stock value");
        }
      }

      const rowValidation = {
        rowIndex: index + 1,
        originalData: row,
        mappedData: mappedRow,
        errors: rowErrors,
        warnings: rowWarnings,
        isValid: rowErrors.length === 0,
      };

      if (rowErrors.length === 0) {
        validRows.push(rowValidation);
      } else {
        invalidRows.push(rowValidation);
      }
    });

    return {
      totalRows: rows.length,
      validRows: validRows.length,
      invalidRows: invalidRows.length,
      validData: validRows,
      invalidData: invalidRows,
      hasErrors: invalidRows.length > 0,
      hasWarnings: validRows.some((row) => row.warnings.length > 0),
    };
  }

  /**
   * Import products with main/variant classification options
   * @param {Object} validatedData - Validated import data
   * @param {Object} importOptions - Import configuration
   * @param {string} userId - User ID
   * @returns {Object} Import results
   */
  async importProducts(validatedData, importOptions, userId) {
    const {
      classificationMode = "manual", // 'manual', 'auto', 'all_main', 'all_variants'
      mainProductMapping = {},
      variantGrouping = "name", // 'name', 'sku', 'category'
      createMissing = true,
      updateExisting = false,
      dryRun = false,
    } = importOptions;

    logger.info(`Starting product import for user ${userId}`, {
      mode: classificationMode,
      totalProducts: validatedData.validRows.length,
      dryRun,
    });

    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      mainProducts: [],
      variants: [],
      errors: [],
    };

    const transaction = await sequelize.transaction();

    try {
      for (const rowData of validatedData.validData) {
        try {
          const { mappedData } = rowData;

          // Determine if this should be a main product or variant
          const classification = await this.classifyProduct(
            mappedData,
            classificationMode,
            mainProductMapping,
            variantGrouping
          );

          if (classification.type === "main") {
            if (!dryRun) {
              const mainProduct = await this.createMainProduct(
                mappedData,
                userId,
                transaction
              );
              results.mainProducts.push(mainProduct);
              results.created++;
            }
          } else if (classification.type === "variant") {
            if (!dryRun) {
              const variant = await this.createPlatformVariant(
                mappedData,
                classification.mainProductId,
                userId,
                transaction
              );
              results.variants.push(variant);
              results.created++;
            }
          } else {
            // Skip or create as main by default
            if (createMissing && !dryRun) {
              const mainProduct = await this.createMainProduct(
                mappedData,
                userId,
                transaction
              );
              results.mainProducts.push(mainProduct);
              results.created++;
            } else {
              results.skipped++;
            }
          }

          results.processed++;
        } catch (error) {
          logger.error(`Error processing row ${rowData.rowIndex}:`, error);
          results.errors.push({
            row: rowData.rowIndex,
            error: error.message,
            data: rowData.mappedData,
          });
          results.errors++;
        }
      }

      if (!dryRun) {
        await transaction.commit();
      } else {
        await transaction.rollback();
      }

      logger.info(`Product import completed`, results);
      return results;
    } catch (error) {
      await transaction.rollback();
      logger.error("Product import failed:", error);
      throw error;
    }
  }

  /**
   * Classify a product as main product or variant
   * @param {Object} productData - Product data
   * @param {string} mode - Classification mode
   * @param {Object} mainProductMapping - Main product mapping rules
   * @param {string} grouping - Grouping field
   * @returns {Object} Classification result
   */
  async classifyProduct(productData, mode, mainProductMapping, grouping) {
    switch (mode) {
      case "all_main":
        return { type: "main" };

      case "all_variants":
        // For all variants mode, we need to find or create a main product
        const mainProduct = await this.findOrCreateMainProduct(
          productData,
          grouping
        );
        return {
          type: "variant",
          mainProductId: mainProduct.id,
        };

      case "manual":
        // Check if this product is mapped to a main product
        const mappingKey = this.generateMappingKey(productData, grouping);
        if (mainProductMapping[mappingKey]) {
          return {
            type: "variant",
            mainProductId: mainProductMapping[mappingKey],
          };
        }
        return { type: "main" };

      case "auto":
        // Auto-detect based on patterns
        return await this.autoClassifyProduct(productData);

      default:
        return { type: "main" };
    }
  }

  /**
   * Auto-classify product based on naming patterns and characteristics
   * @param {Object} productData - Product data
   * @returns {Object} Classification result
   */
  async autoClassifyProduct(productData) {
    const { name, sku } = productData;

    // Look for variant indicators in name or SKU
    const variantPatterns = [
      /\b(S|M|L|XL|XXL)\b/i, // Size indicators
      /\b(black|white|red|blue|green|yellow)\b/i, // Color indicators
      /\b(siyah|beyaz|kırmızı|mavi|yeşil|sarı)\b/i, // Turkish color indicators
      /-\w{1,3}$/i, // SKU suffixes like -SM, -BLK
      /\bvariants?\b/i, // Contains "variant"
      /\bmodel\s+\w+/i, // Model variations
    ];

    const hasVariantIndicators = variantPatterns.some(
      (pattern) => pattern.test(name) || (sku && pattern.test(sku))
    );

    if (hasVariantIndicators) {
      // Try to find a main product for this variant
      const baseName = this.extractBaseName(name);
      const mainProduct = await MainProduct.findOne({
        where: {
          [Op.or]: [
            { name: { [Op.iLike]: `%${baseName}%` } },
            { baseSku: { [Op.iLike]: `%${this.extractBaseSku(sku)}%` } },
          ],
        },
      });

      if (mainProduct) {
        return {
          type: "variant",
          mainProductId: mainProduct.id,
        };
      }
    }

    return { type: "main" };
  }

  /**
   * Extract base name from product name (remove variant indicators)
   * @param {string} name - Product name
   * @returns {string} Base name
   */
  extractBaseName(name) {
    if (!name) return "";

    // Remove common variant indicators
    return name
      .replace(/\b(S|M|L|XL|XXL)\b/gi, "")
      .replace(
        /\b(black|white|red|blue|green|yellow|siyah|beyaz|kırmızı|mavi|yeşil|sarı)\b/gi,
        ""
      )
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Extract base SKU from SKU (remove variant suffixes)
   * @param {string} sku - Product SKU
   * @returns {string} Base SKU
   */
  extractBaseSku(sku) {
    if (!sku) return "";

    // Remove common SKU suffixes
    return sku.replace(/-\w{1,3}$/i, "").trim();
  }

  /**
   * Find or create main product for variant grouping
   * @param {Object} productData - Product data
   * @param {string} groupingField - Field to group by
   * @returns {Object} Main product
   */
  async findOrCreateMainProduct(productData, groupingField) {
    const groupingValue = productData[groupingField];
    if (!groupingValue) {
      throw new Error(
        `Grouping field '${groupingField}' not found in product data`
      );
    }

    // Try to find existing main product
    let mainProduct = await MainProduct.findOne({
      where: {
        [groupingField]: groupingValue,
      },
    });

    if (!mainProduct) {
      // Create new main product
      mainProduct = await MainProduct.create({
        name: productData.name || groupingValue,
        baseSku: productData.sku || `MAIN-${Date.now()}`,
        category: productData.category || "Unknown",
        description: productData.description || "",
        basePrice: parseFloat(productData.price) || 0,
        baseCostPrice: parseFloat(productData.costPrice) || 0,
        stockQuantity: parseInt(productData.stock) || 0,
        status: "active",
        userId: productData.userId,
      });
    }

    return mainProduct;
  }

  /**
   * Generate mapping key for manual classification
   * @param {Object} productData - Product data
   * @param {string} grouping - Grouping field
   * @returns {string} Mapping key
   */
  generateMappingKey(productData, grouping) {
    const value = productData[grouping];
    return value ? value.toString().toLowerCase().trim() : "";
  }

  /**
   * Create main product
   * @param {Object} productData - Product data
   * @param {string} userId - User ID
   * @param {Object} transaction - Database transaction
   * @returns {Object} Created main product
   */
  async createMainProduct(productData, userId, transaction) {
    const mainProductData = {
      name: productData.name,
      baseSku: productData.sku || `MAIN-${Date.now()}`,
      category: productData.category || "Imported",
      description: productData.description || "",
      brand: productData.brand || "",
      basePrice: parseFloat(productData.price) || 0,
      baseCostPrice: parseFloat(productData.costPrice) || 0,
      stockQuantity: parseInt(productData.stock) || 0,
      minStockLevel: parseInt(productData.minStock) || 5,
      weight: parseFloat(productData.weight) || 0,
      status: productData.status || "active",
      userId,
      importedAt: new Date(),
      importSource: "csv_excel_import",
    };

    // Handle dimensions if provided
    if (productData.dimensions) {
      mainProductData.dimensions = productData.dimensions;
    }

    return await MainProduct.create(mainProductData, { transaction });
  }

  /**
   * Create platform variant
   * @param {Object} productData - Product data
   * @param {string} mainProductId - Main product ID
   * @param {string} userId - User ID
   * @param {Object} transaction - Database transaction
   * @returns {Object} Created platform variant
   */
  async createPlatformVariant(productData, mainProductId, userId, transaction) {
    const variantData = {
      mainProductId,
      platform: productData.platform || "manual",
      platformSku: productData.sku || `VAR-${Date.now()}`,
      platformBarcode: productData.barcode || "",
      variantSuffix: this.extractVariantSuffix(productData),
      useMainPrice: !productData.price,
      platformPrice: productData.price ? parseFloat(productData.price) : null,
      platformCostPrice: productData.costPrice
        ? parseFloat(productData.costPrice)
        : null,
      stockQuantity: parseInt(productData.stock) || 0,
      isPublished: false,
      syncStatus: "pending",
      attributes: this.extractVariantAttributes(productData),
      userId,
    };

    return await PlatformVariant.create(variantData, { transaction });
  }

  /**
   * Extract variant suffix from product data
   * @param {Object} productData - Product data
   * @returns {string} Variant suffix
   */
  extractVariantSuffix(productData) {
    const { name, sku } = productData;

    // Try to extract suffix from SKU
    if (sku) {
      const skuMatch = sku.match(/-(\w{1,10})$/i);
      if (skuMatch) {
        return skuMatch[1];
      }
    }

    // Try to extract from name
    if (name) {
      const sizeMatch = name.match(/\b(XS|S|M|L|XL|XXL|XXXL)\b/i);
      if (sizeMatch) {
        return sizeMatch[1];
      }

      const colorMatch = name.match(
        /\b(black|white|red|blue|green|yellow|siyah|beyaz|kırmızı|mavi|yeşil|sarı)\b/i
      );
      if (colorMatch) {
        return colorMatch[1].substring(0, 3).toUpperCase();
      }
    }

    return "";
  }

  /**
   * Extract variant attributes from product data
   * @param {Object} productData - Product data
   * @returns {Object} Variant attributes
   */
  extractVariantAttributes(productData) {
    const attributes = {};

    // Extract size
    if (productData.size) {
      attributes.size = productData.size;
    } else if (productData.name) {
      const sizeMatch = productData.name.match(
        /\b(XS|S|M|L|XL|XXL|XXXL|\d+)\b/i
      );
      if (sizeMatch) {
        attributes.size = sizeMatch[1];
      }
    }

    // Extract color
    if (productData.color) {
      attributes.color = productData.color;
    } else if (productData.name) {
      const colorMatch = productData.name.match(
        /\b(black|white|red|blue|green|yellow|siyah|beyaz|kırmızı|mavi|yeşil|sarı)\b/i
      );
      if (colorMatch) {
        attributes.color = colorMatch[1];
      }
    }

    // Extract material
    if (productData.material) {
      attributes.material = productData.material;
    }

    // Extract pattern
    if (productData.pattern) {
      attributes.pattern = productData.pattern;
    }

    // Add import metadata
    attributes.importedAt = new Date();
    attributes.importSource = "csv_excel_import";

    return attributes;
  }

  /**
   * Generate CSV template for product import
   * @returns {string} CSV template content
   */
  generateCSVTemplate() {
    const headers = [
      "name",
      "description",
      "sku",
      "barcode",
      "category",
      "brand",
      "price",
      "costPrice",
      "stock",
      "minStock",
      "weight",
      "status",
      "platform",
      "size",
      "color",
      "material",
    ];

    const sampleData = [
      {
        name: "Example Product - Red L",
        description: "This is an example product description",
        sku: "EXP-001-RED-L",
        barcode: "1234567890123",
        category: "Clothing",
        brand: "Example Brand",
        price: "29.99",
        costPrice: "15.00",
        stock: "100",
        minStock: "10",
        weight: "0.5",
        status: "active",
        platform: "trendyol",
        size: "L",
        color: "Red",
        material: "Cotton",
      },
      {
        name: "Example Product - Blue M",
        description: "This is an example product description",
        sku: "EXP-001-BLUE-M",
        barcode: "1234567890124",
        category: "Clothing",
        brand: "Example Brand",
        price: "29.99",
        costPrice: "15.00",
        stock: "75",
        minStock: "10",
        weight: "0.5",
        status: "active",
        platform: "trendyol",
        size: "M",
        color: "Blue",
        material: "Cotton",
      },
    ];

    try {
      const parser = new Parser({ fields: headers });
      return parser.parse(sampleData);
    } catch (error) {
      logger.error("Error generating CSV template:", error);
      // Fallback to manual CSV generation
      const csvRows = [
        headers.join(","),
        ...sampleData.map((row) =>
          headers.map((header) => `"${row[header] || ""}"`).join(",")
        ),
      ];
      return csvRows.join("\n");
    }
  }

  /**
   * Get supported file formats
   * @returns {Array} Supported formats
   */
  getSupportedFormats() {
    return this.supportedFormats;
  }

  /**
   * Check if file format is supported
   * @param {string} filename - Filename or mimetype
   * @returns {boolean} Is supported
   */
  isFormatSupported(filename) {
    const extension = path.extname(filename).toLowerCase();
    return this.supportedFormats.some(
      (format) =>
        format.includes(extension.replace(".", "")) || filename.includes(format)
    );
  }
}

module.exports = new ProductImportService();
