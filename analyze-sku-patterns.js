/**
 const { Product, sequelize } = require('./server/models');
const { Op } = r            where: {
          sku: {
            [Op.ne]: null
          }
        }here: {
          sku: {
            [Op.ne]: null
          }
        }e('sequelize'); SKU Pattern Analysis and Configuration
 * This script helps analyze existing SKU patterns and configure new ones
 */

const { Product, sequelize } = require("./server/models");

// Brand and Product Type Configuration
const BRAND_CONFIG = {
  ownBrands: {
    NW: "Noteware", // Your brand
  },

  productTypes: {
    K: "Klavye", // Keyboard
    M: "Mouse", // Example
    H: "Headset", // Example
    W: "Webcam", // Example
    T: "Tablet", // Example
    // Add more as needed
  },

  externalBrands: {
    // This will be populated by user input
    // Examples based on your products:
    // 'APPLE': 'Apple',
    // 'SAMSUNG': 'Samsung',
    // etc.
  },
};

class SKUPatternAnalyzer {
  constructor() {
    this.patterns = [];
    this.brandConfig = { ...BRAND_CONFIG };
  }

  /**
   * Add user brands configuration
   */
  addUserBrands(brands) {
    console.log("\n🏷️  Adding User Brand Configuration...");
    brands.forEach((brand) => {
      const initials = this.generateBrandInitials(brand.name);
      this.brandConfig.externalBrands[initials] = brand.name;
      console.log(`  ✅ Added: ${initials} = ${brand.name}`);
    });
  }

  /**
   * Generate brand initials from name
   */
  generateBrandInitials(brandName) {
    if (brandName.length <= 3) {
      return brandName.toUpperCase();
    }

    // For longer names, try to create meaningful initials
    const words = brandName.split(/[\s\-_]+/);
    if (words.length > 1) {
      return words
        .map((word) => word.charAt(0))
        .join("")
        .toUpperCase();
    }

    // For single words, take first 3-4 characters
    return brandName.substring(0, Math.min(4, brandName.length)).toUpperCase();
  }

  /**
   * Analyze existing SKU patterns in database
   */
  async analyzeExistingPatterns() {
    console.log("\n🔍 Analyzing Existing SKU Patterns...");

    try {
      const products = await Product.findAll({
        attributes: ["sku", "name", "category"],
        where: {
          sku: {
            [sequelize.Op.ne]: null,
          },
        },
      });

      console.log(`Found ${products.length} products with SKUs`);

      const patterns = new Map();

      products.forEach((product) => {
        const pattern = this.extractPattern(product.sku);
        if (pattern) {
          if (!patterns.has(pattern.signature)) {
            patterns.set(pattern.signature, {
              ...pattern,
              examples: [],
              count: 0,
            });
          }

          const existing = patterns.get(pattern.signature);
          existing.examples.push({
            sku: product.sku,
            name: product.name,
            category: product.category,
          });
          existing.count++;
        }
      });

      // Display analysis results
      console.log("\n📊 Pattern Analysis Results:");
      patterns.forEach((pattern, signature) => {
        console.log(`\n  Pattern: ${signature}`);
        console.log(`    Count: ${pattern.count}`);
        console.log(`    Structure: ${pattern.structure}`);
        console.log(`    Examples:`);
        pattern.examples.slice(0, 3).forEach((example) => {
          console.log(`      - ${example.sku} (${example.name})`);
        });
      });

      this.patterns = Array.from(patterns.values());
      return this.patterns;
    } catch (error) {
      console.error("Error analyzing patterns:", error);
      return [];
    }
  }

  /**
   * Extract pattern from SKU
   */
  extractPattern(sku) {
    if (!sku || typeof sku !== "string") return null;

    // Pattern 1: {OwnBrand+ProductType}-{Brand}{Numbers}-{ORJ/VARIANT}
    // Example: NWK-APPLE001-ORJ
    const pattern1 = /^([A-Z]{2,4})-([A-Z]+)(\d+)-([A-Z]+)$/;

    // Pattern 2: {ProductType}-{Brand}{Numbers}-{Timestamp}
    // Example: IPHONE14PRO-1749585990424
    const pattern2 = /^([A-Z0-9]+)-(\d+)$/;

    // Pattern 3: Simple pattern
    // Example: TEST-MEDIA-001
    const pattern3 = /^([A-Z]+)-([A-Z]+)-(\d+)$/;

    let match;

    if ((match = sku.match(pattern1))) {
      return {
        signature: "OwnBrand-Brand###-Type",
        structure: "{OwnBrand+ProductType}-{Brand}{Numbers}-{ORJ/VARIANT}",
        ownBrandCode: match[1],
        externalBrand: match[2],
        sequence: match[3],
        variant: match[4],
        type: "structured",
      };
    }

    if ((match = sku.match(pattern2))) {
      return {
        signature: "Product-Timestamp",
        structure: "{ProductCode}-{Timestamp}",
        productCode: match[1],
        timestamp: match[2],
        type: "timestamped",
      };
    }

    if ((match = sku.match(pattern3))) {
      return {
        signature: "Type-SubType-###",
        structure: "{Type}-{SubType}-{Numbers}",
        type1: match[1],
        type2: match[2],
        sequence: match[3],
        type: "simple",
      };
    }

    return {
      signature: "Unknown",
      structure: "Unrecognized pattern",
      original: sku,
      type: "unknown",
    };
  }

  /**
   * Generate SKU based on product information
   */
  generateSKU(productInfo, options = {}) {
    const {
      productType,
      brand,
      isVariant = false,
      variantType = "ORJ",
      sequence,
    } = productInfo;

    // Get own brand + product type code
    let ownBrandCode = "";
    Object.entries(this.brandConfig.ownBrands).forEach(([code, name]) => {
      ownBrandCode += code;
    });

    const productTypeCode = this.brandConfig.productTypes[productType]
      ? productType
      : "X";
    const prefix = ownBrandCode + productTypeCode;

    // Get brand initials
    const brandInitials = this.getBrandInitials(brand);

    // Generate sequence number
    const sequenceNum = sequence || this.generateSequenceNumber();

    // Determine variant suffix
    const suffix = isVariant ? variantType || "VAR" : "ORJ";

    return `${prefix}-${brandInitials}${sequenceNum
      .toString()
      .padStart(3, "0")}-${suffix}`;
  }

  /**
   * Get brand initials from configuration
   */
  getBrandInitials(brandName) {
    // Check if brand is already configured
    for (const [initials, name] of Object.entries(
      this.brandConfig.externalBrands
    )) {
      if (name.toLowerCase() === brandName.toLowerCase()) {
        return initials;
      }
    }

    // Generate new initials
    return this.generateBrandInitials(brandName);
  }

  /**
   * Generate sequence number (this would typically query database)
   */
  generateSequenceNumber() {
    return Math.floor(Math.random() * 999) + 1;
  }

  /**
   * Detect variants from existing products
   */
  async detectPotentialVariants() {
    console.log("\n🔄 Detecting Potential Variants...");

    try {
      const products = await Product.findAll({
        attributes: ["id", "sku", "name", "category"],
        where: {
          sku: {
            [sequelize.Op.ne]: null,
          },
        },
      });

      const groups = new Map();

      products.forEach((product) => {
        const basePattern = this.extractBasePattern(product.sku);
        if (basePattern) {
          if (!groups.has(basePattern)) {
            groups.set(basePattern, []);
          }
          groups.get(basePattern).push(product);
        }
      });

      // Find groups with multiple products (potential variants)
      const variantGroups = [];
      groups.forEach((products, pattern) => {
        if (products.length > 1) {
          variantGroups.push({
            basePattern: pattern,
            products: products,
            count: products.length,
          });
        }
      });

      console.log(`Found ${variantGroups.length} potential variant groups:`);
      variantGroups.forEach((group) => {
        console.log(
          `\n  Pattern: ${group.basePattern} (${group.count} products)`
        );
        group.products.slice(0, 3).forEach((product) => {
          console.log(`    - ${product.sku}: ${product.name}`);
        });
      });

      return variantGroups;
    } catch (error) {
      console.error("Error detecting variants:", error);
      return [];
    }
  }

  /**
   * Extract base pattern for variant detection
   */
  extractBasePattern(sku) {
    if (!sku) return null;

    // Remove variant indicators and timestamps
    let base = sku
      .replace(/-VAR\d*$/i, "")
      .replace(/-ORJ$/i, "")
      .replace(/-\d{10,}$/, "") // Remove timestamps
      .replace(/-V\d+$/, ""); // Remove variant numbers

    return base;
  }

  /**
   * Interactive brand configuration
   */
  async configureBrands() {
    console.log("\n⚙️  Brand Configuration Setup");
    console.log("Please provide your brand information:");

    // This would typically use readline or a proper input method
    // For now, return a sample configuration
    return [
      { name: "Apple", category: "Electronics" },
      { name: "Samsung", category: "Electronics" },
      { name: "Logitech", category: "Peripherals" },
      { name: "Razer", category: "Gaming" },
      // Add more brands as needed
    ];
  }
}

// Main execution
async function main() {
  console.log("🚀 SKU Pattern Analysis System");
  console.log("=".repeat(50));

  const analyzer = new SKUPatternAnalyzer();

  try {
    // Step 1: Configure brands (this would be interactive)
    const userBrands = await analyzer.configureBrands();
    analyzer.addUserBrands(userBrands);

    // Step 2: Analyze existing patterns
    await analyzer.analyzeExistingPatterns();

    // Step 3: Detect potential variants
    await analyzer.detectPotentialVariants();

    // Step 4: Generate sample SKUs
    console.log("\n🎯 Sample SKU Generation:");

    const sampleProducts = [
      { productType: "K", brand: "Apple", isVariant: false },
      { productType: "K", brand: "Apple", isVariant: true, variantType: "VAR" },
      { productType: "M", brand: "Logitech", isVariant: false },
    ];

    sampleProducts.forEach((product) => {
      const sku = analyzer.generateSKU(product);
      console.log(
        `  ${product.brand} ${
          analyzer.brandConfig.productTypes[product.productType]
        } -> ${sku}`
      );
    });

    console.log("\n✅ Analysis Complete!");
    console.log("\nNext steps:");
    console.log("1. Review the detected patterns");
    console.log("2. Configure your complete brand list");
    console.log("3. Update the VariantDetectionService with new patterns");
  } catch (error) {
    console.error("❌ Analysis failed:", error);
  } finally {
    process.exit(0);
  }
}

// Export for use in other modules
module.exports = { SKUPatternAnalyzer, BRAND_CONFIG };

// Run if called directly
if (require.main === module) {
  main();
}
