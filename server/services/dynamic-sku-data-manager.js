/**
 * Dynamic SKU Data Manager
 * Manages brands, product types, and patterns dynamically
 * Learns from connected platforms and user input
 */

class DynamicSKUDataManager {
  constructor() {
    this.ownBrands = new Map();
    this.externalBrands = new Map();
    this.productTypes = new Map();
    this.variantCodes = new Map();
    this.platformData = new Map();

    // Initialize with basic data that can be modified
    this.initializeBasicData();
  }

  /**
   * Initialize with minimal default data
   */
  initializeBasicData() {
    // Add a default own brand that user can modify
    this.ownBrands.set("COMPANY", {
      code: "COMPANY",
      name: "Your Company",
      fullName: "Your Company Name",
      description: "Default company brand - please update",
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Add basic product types that can be extended
    const basicTypes = [
      { code: "PROD", name: "Product", category: "General" },
      { code: "ITEM", name: "Item", category: "General" },
    ];

    basicTypes.forEach((type) => {
      this.productTypes.set(type.code, {
        ...type,
        source: "default",
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // Add basic variant codes
    const basicVariants = [
      { code: "STD", name: "Standard", category: "Default" },
      { code: "V1", name: "Version 1", category: "Version" },
    ];

    basicVariants.forEach((variant) => {
      this.variantCodes.set(variant.code, {
        ...variant,
        source: "default",
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
  }

  /**
   * Learn data from connected platforms
   */
  async learnFromPlatforms(platformServices) {
    const platformData = {};

    for (const [platformName, service] of Object.entries(platformServices)) {
      try {
        console.log(`Learning from platform: ${platformName}`);

        const data = await this.extractPlatformData(service, platformName);
        platformData[platformName] = data;

        // Process learned data
        await this.processPlatformData(platformName, data);
      } catch (error) {
        console.error(`Error learning from ${platformName}:`, error.message);
      }
    }

    return platformData;
  }

  /**
   * Extract data from a platform service
   */
  async extractPlatformData(service, platformName) {
    const data = {
      brands: new Set(),
      productTypes: new Set(),
      categories: new Set(),
      skuPatterns: [],
      extractedAt: new Date(),
    };

    try {
      // Get products from platform
      const products = (await service.getProducts?.({ limit: 100 })) || [];

      products.forEach((product) => {
        // Extract brands
        if (product.brand) {
          data.brands.add(product.brand);
        }
        if (product.manufacturer) {
          data.brands.add(product.manufacturer);
        }

        // Extract categories as potential product types
        if (product.category) {
          data.categories.add(product.category);
        }
        if (product.categoryPath) {
          product.categoryPath.forEach((cat) => data.categories.add(cat));
        }

        // Analyze SKU patterns
        if (product.sku) {
          data.skuPatterns.push(product.sku);
        }
      });

      // Convert Sets to Arrays
      data.brands = Array.from(data.brands);
      data.categories = Array.from(data.categories);
    } catch (error) {
      console.warn(
        `Could not extract data from ${platformName}:`,
        error.message
      );
    }

    return data;
  }

  /**
   * Process and integrate platform data
   */
  async processPlatformData(platformName, data) {
    this.platformData.set(platformName, data);

    // Add discovered brands
    data.brands.forEach((brandName) => {
      const brandCode = this.generateBrandCode(brandName);
      if (!this.externalBrands.has(brandCode)) {
        this.externalBrands.set(brandCode, {
          code: brandCode,
          name: brandName,
          fullName: brandName,
          source: platformName,
          confidence: 0.7,
          discoveredAt: new Date(),
          platforms: [platformName],
        });
      } else {
        // Update existing brand
        const existing = this.externalBrands.get(brandCode);
        if (!existing.platforms.includes(platformName)) {
          existing.platforms.push(platformName);
          existing.confidence = Math.min(0.95, existing.confidence + 0.1);
          existing.updatedAt = new Date();
        }
      }
    });

    // Add discovered categories as product types
    data.categories.forEach((categoryName) => {
      const typeCode = this.generateProductTypeCode(categoryName);
      if (!this.productTypes.has(typeCode)) {
        this.productTypes.set(typeCode, {
          code: typeCode,
          name: categoryName,
          category: this.categorizeProductType(categoryName),
          source: platformName,
          confidence: 0.6,
          discoveredAt: new Date(),
          platforms: [platformName],
        });
      } else {
        // Update existing type
        const existing = this.productTypes.get(typeCode);
        if (!existing.platforms?.includes(platformName)) {
          existing.platforms = existing.platforms || [];
          existing.platforms.push(platformName);
          existing.confidence = Math.min(0.9, existing.confidence + 0.1);
          existing.updatedAt = new Date();
        }
      }
    });
  }

  /**
   * Generate brand code from brand name
   */
  generateBrandCode(brandName) {
    // Clean and normalize the brand name
    const cleaned = brandName.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

    // Take first 4 characters, or use specific rules
    if (cleaned.length <= 4) {
      return cleaned;
    }

    // Common brand code patterns
    const words = brandName.split(/\s+/);
    if (words.length > 1) {
      // Take first 2 letters of each word
      return words
        .map((word) => word.substring(0, 2).toUpperCase())
        .join("")
        .substring(0, 4);
    }

    // Take first 4 characters
    return cleaned.substring(0, 4);
  }

  /**
   * Generate product type code from category name
   */
  generateProductTypeCode(categoryName) {
    const cleaned = categoryName.replace(/[^A-Za-z]/g, "").toUpperCase();

    if (cleaned.length <= 3) {
      return cleaned;
    }

    // Take first 3 consonants if possible
    const consonants = cleaned.match(/[BCDFGHJKLMNPQRSTVWXYZ]/g) || [];
    if (consonants.length >= 3) {
      return consonants.slice(0, 3).join("");
    }

    // Fallback to first 3 characters
    return cleaned.substring(0, 3);
  }

  /**
   * Categorize product type
   */
  categorizeProductType(typeName) {
    const name = typeName.toLowerCase();

    if (
      name.includes("electronic") ||
      name.includes("tech") ||
      name.includes("computer")
    ) {
      return "Electronics";
    }
    if (
      name.includes("clothing") ||
      name.includes("apparel") ||
      name.includes("fashion")
    ) {
      return "Clothing";
    }
    if (
      name.includes("home") ||
      name.includes("furniture") ||
      name.includes("kitchen")
    ) {
      return "Home & Garden";
    }
    if (
      name.includes("book") ||
      name.includes("media") ||
      name.includes("entertainment")
    ) {
      return "Media";
    }
    if (
      name.includes("sport") ||
      name.includes("fitness") ||
      name.includes("outdoor")
    ) {
      return "Sports & Outdoors";
    }

    return "Other";
  }

  /**
   * Add or update own brand
   */
  setOwnBrand(brandData) {
    const { code, name, fullName, description } = brandData;

    if (!code || !name) {
      throw new Error("Brand code and name are required");
    }

    this.ownBrands.set(code.toUpperCase(), {
      code: code.toUpperCase(),
      name,
      fullName: fullName || name,
      description: description || "",
      userDefined: true,
      createdAt: this.ownBrands.has(code.toUpperCase())
        ? this.ownBrands.get(code.toUpperCase()).createdAt
        : new Date(),
      updatedAt: new Date(),
    });

    return this.ownBrands.get(code.toUpperCase());
  }

  /**
   * Add or update external brand
   */
  setExternalBrand(brandData) {
    const { code, name, fullName, source } = brandData;

    if (!code || !name) {
      throw new Error("Brand code and name are required");
    }

    this.externalBrands.set(code.toUpperCase(), {
      code: code.toUpperCase(),
      name,
      fullName: fullName || name,
      source: source || "user",
      confidence: 1.0,
      userDefined: true,
      createdAt: this.externalBrands.has(code.toUpperCase())
        ? this.externalBrands.get(code.toUpperCase()).createdAt
        : new Date(),
      updatedAt: new Date(),
    });

    return this.externalBrands.get(code.toUpperCase());
  }

  /**
   * Add or update product type
   */
  setProductType(typeData) {
    const { code, name, category, description } = typeData;

    if (!code || !name) {
      throw new Error("Product type code and name are required");
    }

    this.productTypes.set(code.toUpperCase(), {
      code: code.toUpperCase(),
      name,
      category: category || "Other",
      description: description || "",
      userDefined: true,
      createdAt: this.productTypes.has(code.toUpperCase())
        ? this.productTypes.get(code.toUpperCase()).createdAt
        : new Date(),
      updatedAt: new Date(),
    });

    return this.productTypes.get(code.toUpperCase());
  }

  /**
   * Add or update variant code
   */
  setVariantCode(variantData) {
    const { code, name, category, description } = variantData;

    if (!code || !name) {
      throw new Error("Variant code and name are required");
    }

    this.variantCodes.set(code.toUpperCase(), {
      code: code.toUpperCase(),
      name,
      category: category || "Other",
      description: description || "",
      userDefined: true,
      createdAt: this.variantCodes.has(code.toUpperCase())
        ? this.variantCodes.get(code.toUpperCase()).createdAt
        : new Date(),
      updatedAt: new Date(),
    });

    return this.variantCodes.get(code.toUpperCase());
  }

  /**
   * Remove data
   */
  removeOwnBrand(code) {
    const upperCode = code.toUpperCase();
    if (this.ownBrands.has(upperCode)) {
      const removed = this.ownBrands.get(upperCode);
      this.ownBrands.delete(upperCode);
      return {
        success: true,
        brand: removed,
        message: `Own brand ${code} removed successfully`,
      };
    }
    return {
      success: false,
      message: `Own brand ${code} not found`,
    };
  }

  removeExternalBrand(code) {
    const upperCode = code.toUpperCase();
    if (this.externalBrands.has(upperCode)) {
      const removed = this.externalBrands.get(upperCode);
      this.externalBrands.delete(upperCode);
      return {
        success: true,
        brand: removed,
        message: `External brand ${code} removed successfully`,
      };
    }
    return {
      success: false,
      message: `External brand ${code} not found`,
    };
  }

  removeProductType(code) {
    const upperCode = code.toUpperCase();
    if (this.productTypes.has(upperCode)) {
      const removed = this.productTypes.get(upperCode);

      // Check if it's a default type
      if (removed.isDefault) {
        return {
          success: false,
          message: `Cannot remove default product type ${code}`,
        };
      }

      this.productTypes.delete(upperCode);
      return {
        success: true,
        productType: removed,
        message: `Product type ${code} removed successfully`,
      };
    }
    return {
      success: false,
      message: `Product type ${code} not found`,
    };
  }

  removeVariantCode(code) {
    const upperCode = code.toUpperCase();
    if (this.variantCodes.has(upperCode)) {
      const removed = this.variantCodes.get(upperCode);

      // Check if it's a default variant
      if (removed.isDefault) {
        return {
          success: false,
          message: `Cannot remove default variant code ${code}`,
        };
      }

      this.variantCodes.delete(upperCode);
      return {
        success: true,
        variantCode: removed,
        message: `Variant code ${code} removed successfully`,
      };
    }
    return {
      success: false,
      message: `Variant code ${code} not found`,
    };
  }

  /**
   * Get all data
   */
  getAllOwnBrands() {
    return Array.from(this.ownBrands.values());
  }

  getAllExternalBrands() {
    return Array.from(this.externalBrands.values());
  }

  getAllProductTypes() {
    return Array.from(this.productTypes.values());
  }

  getAllVariantCodes() {
    return Array.from(this.variantCodes.values());
  }

  getAllBrands() {
    return {
      own: this.getAllOwnBrands(),
      external: this.getAllExternalBrands(),
    };
  }

  /**
   * Search for brands/types/variants
   */
  searchBrands(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    // Search own brands
    this.ownBrands.forEach((brand) => {
      if (
        brand.code.toLowerCase().includes(lowerQuery) ||
        brand.name.toLowerCase().includes(lowerQuery) ||
        brand.fullName.toLowerCase().includes(lowerQuery)
      ) {
        results.push({ ...brand, type: "own" });
      }
    });

    // Search external brands
    this.externalBrands.forEach((brand) => {
      if (
        brand.code.toLowerCase().includes(lowerQuery) ||
        brand.name.toLowerCase().includes(lowerQuery) ||
        brand.fullName.toLowerCase().includes(lowerQuery)
      ) {
        results.push({ ...brand, type: "external" });
      }
    });

    return results;
  }

  /**
   * Search product types
   */
  searchProductTypes(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    this.productTypes.forEach((type) => {
      if (
        type.code.toLowerCase().includes(lowerQuery) ||
        type.name.toLowerCase().includes(lowerQuery) ||
        type.category.toLowerCase().includes(lowerQuery)
      ) {
        results.push(type);
      }
    });

    return results;
  }

  /**
   * Search variant codes
   */
  searchVariantCodes(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    this.variantCodes.forEach((variant) => {
      if (
        variant.code.toLowerCase().includes(lowerQuery) ||
        variant.name.toLowerCase().includes(lowerQuery) ||
        variant.category.toLowerCase().includes(lowerQuery)
      ) {
        results.push(variant);
      }
    });

    return results;
  }

  /**
   * Get data statistics
   */
  getStatistics() {
    return {
      ownBrands: this.ownBrands.size,
      externalBrands: this.externalBrands.size,
      productTypes: this.productTypes.size,
      variantCodes: this.variantCodes.size,
      platformsConnected: this.platformData.size,
      lastUpdated: new Date(),
    };
  }

  /**
   * Export all data
   */
  exportData() {
    return {
      ownBrands: this.getAllOwnBrands(),
      externalBrands: this.getAllExternalBrands(),
      productTypes: this.getAllProductTypes(),
      variantCodes: this.getAllVariantCodes(),
      platformData: Object.fromEntries(this.platformData),
      exportedAt: new Date(),
    };
  }

  /**
   * Import data
   */
  importData(data) {
    try {
      if (data.ownBrands) {
        data.ownBrands.forEach((brand) => {
          this.ownBrands.set(brand.code, { ...brand, importedAt: new Date() });
        });
      }

      if (data.externalBrands) {
        data.externalBrands.forEach((brand) => {
          this.externalBrands.set(brand.code, {
            ...brand,
            importedAt: new Date(),
          });
        });
      }

      if (data.productTypes) {
        data.productTypes.forEach((type) => {
          this.productTypes.set(type.code, { ...type, importedAt: new Date() });
        });
      }

      if (data.variantCodes) {
        data.variantCodes.forEach((variant) => {
          this.variantCodes.set(variant.code, {
            ...variant,
            importedAt: new Date(),
          });
        });
      }

      return { success: true, importedAt: new Date() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Suggest brand code for a given name
   */
  suggestBrandCode(brandName) {
    const suggested = this.generateBrandCode(brandName);
    const alternatives = [];

    // Generate alternatives if the suggested code exists
    if (this.ownBrands.has(suggested) || this.externalBrands.has(suggested)) {
      for (let i = 1; i <= 9; i++) {
        const alt = suggested + i;
        if (!this.ownBrands.has(alt) && !this.externalBrands.has(alt)) {
          alternatives.push(alt);
          break;
        }
      }
    }

    return {
      suggested,
      available:
        !this.ownBrands.has(suggested) && !this.externalBrands.has(suggested),
      alternatives,
    };
  }

  /**
   * Suggest product type code for a given name
   */
  suggestProductTypeCode(typeName) {
    const suggested = this.generateProductTypeCode(typeName);
    const alternatives = [];

    if (this.productTypes.has(suggested)) {
      for (let i = 1; i <= 9; i++) {
        const alt = suggested + i;
        if (!this.productTypes.has(alt)) {
          alternatives.push(alt);
          break;
        }
      }
    }

    return {
      suggested,
      available: !this.productTypes.has(suggested),
      alternatives,
    };
  }
}

module.exports = DynamicSKUDataManager;
