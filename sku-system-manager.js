/**
 * SKU System Configuration and Management
 * Your Structured SKU Format: {NW+ProductType}-{Brand+Number}-{Variant}
 */

const EnhancedVariantDetectionService = require("./server/services/enhanced-variant-detection-service");

// Your Brand Configuration Manager
class SKUSystemManager {
  constructor() {
    this.enhancedService = new EnhancedVariantDetectionService();
    this.customBrands = new Map(); // Store custom brands added at runtime
  }

  /**
   * Complete Brand Configuration
   * Based on your database analysis and common tech brands
   */
  getCompleteConfiguration() {
    return {
      ownBrands: {
        NW: "Noteware", // Your company brand
      },

      productTypes: {
        K: "Klavye", // Keyboard
        M: "Mouse", // Mouse
        H: "Headset", // Headset/Kulaklık
        W: "Webcam", // Webcam/Kamera
        T: "Tablet", // Tablet
        AD: "Adaptör", // Adapter/Charger
        DV: "Drive", // Hard Drive/SSD
        KASA: "Kasa", // Case/Cover
        KASSA: "Kasa", // Alternative spelling
        SC: "Scanner", // Scanner
        PR: "Printer", // Printer
        MO: "Monitor", // Monitor
        SP: "Speaker", // Speaker/Hoparlör
      },

      // Current brands from your database + common tech brands
      externalBrands: {
        // Existing brands from your database
        IBM: "Lenovo/IBM",
        HP: "HP",
        DE: "Dell",
        AS: "Asus",
        AC: "Acer",
        MSI: "MSI",
        LN: "Lenovo",
        MON: "Monster",

        // Major tech brands you might work with
        APPL: "Apple",
        SAMS: "Samsung",
        LOGI: "Logitech",
        RAZE: "Razer",
        MSFT: "Microsoft",
        CORS: "Corsair",
        STEE: "SteelSeries",
        HYPR: "HyperX",
        ROCS: "Roccat",
        KING: "Kingston",
        SAND: "SanDisk",
        WEST: "Western Digital",
        SEAG: "Seagate",
        TOSH: "Toshiba",
        SONY: "Sony",
        PHIL: "Philips",
        BENG: "BenQ",
        ASUS: "Asus", // Alternative to AS
        LENO: "Lenovo", // Alternative to LN/IBM
        GIGA: "Gigabyte",
        ASRO: "ASRock",
        EVGA: "EVGA",
        ZOTA: "Zotac",
      },

      variantCodes: {
        // Layout variants (for keyboards)
        TR: "Turkish Layout",
        UK: "UK Layout",
        US: "US Layout",
        ING: "English Layout",
        FR: "French Layout",
        DE: "German Layout",

        // Features
        ORJ: "Original",
        LED: "LED Backlit",
        RGB: "RGB Lighting",
        MECH: "Mechanical",
        MEMB: "Membrane",
        WIRE: "Wired",
        WLES: "Wireless",
        BT: "Bluetooth",

        // Inclusion/Packaging
        KASALI: "With Case",
        KUTU: "Boxed",
        BULK: "Bulk Package",

        // Colors (Turkish)
        SYH: "Black Color", // Siyah
        KIRMIZI: "Red Color", // Kırmızı
        BEYAZ: "White Color", // Beyaz
        MAVI: "Blue Color", // Mavi
        YESIL: "Green Color", // Yeşil
        SARI: "Yellow Color", // Sarı
        GRI: "Gray Color", // Gri

        // Sizes
        S: "Small",
        M: "Medium",
        L: "Large",
        XL: "Extra Large",

        // Versions
        V1: "Version 1",
        V2: "Version 2",
        V3: "Version 3",
        V4: "Version 4",
        V5: "Version 5",

        // Component specific (from your database)
        MC: "Menteşe Kapağı", // Hinge Cover
        D: "Alt Kasa", // Bottom Case
        PA001: "Power Adapter Type 1",
        A1: "Variant A1",
        A5: "Variant A5",
        A7: "Variant A7",
        A8: "Variant A8",
        A9: "Variant A9",
      },
    };
  }

  /**
   * Get available brands for frontend
   */
  getAvailableBrands() {
    const config = this.getCompleteConfiguration();
    const brands = [];

    // Add external brands
    Object.entries(config.externalBrands).forEach(([code, name]) => {
      brands.push({
        code,
        name,
        fullName: name,
      });
    });

    // Add own brands
    Object.entries(config.ownBrands).forEach(([code, name]) => {
      brands.push({
        code,
        name,
        fullName: name,
        isOwn: true,
      });
    });

    // Add custom brands
    this.customBrands.forEach((data, code) => {
      brands.push({
        code,
        name: data.name,
        fullName: data.fullName || data.name,
        isCustom: true,
      });
    });

    return brands.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get available product types for frontend
   */
  getAvailableProductTypes() {
    const config = this.getCompleteConfiguration();
    const types = [];

    Object.entries(config.productTypes).forEach(([code, name]) => {
      types.push({
        code,
        name,
        category: this.getProductTypeCategory(code),
      });
    });

    return types.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get available variant codes for frontend
   */
  getAvailableVariantCodes() {
    const config = this.getCompleteConfiguration();
    const variants = [];

    Object.entries(config.variantCodes).forEach(([code, name]) => {
      variants.push({
        code,
        name,
        category: this.getVariantCategory(code),
      });
    });

    return variants.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Add custom brand at runtime
   */
  addCustomBrand({ code, name, fullName }) {
    if (!code || !name) {
      return false;
    }

    // Check if brand already exists
    const config = this.getCompleteConfiguration();
    if (
      config.externalBrands[code] ||
      config.ownBrands[code] ||
      this.customBrands.has(code)
    ) {
      return false;
    }

    this.customBrands.set(code.toUpperCase(), {
      name,
      fullName: fullName || name,
    });

    return true;
  }

  /**
   * Generate SKU using the enhanced service
   */
  generateSKU({ productType, brand, variant, productName, category }) {
    return this.enhancedService.generateSKU({
      productType,
      brand,
      variant,
      productName,
      category,
    });
  }

  /**
   * Parse SKU using the enhanced service
   */
  parseSKU(sku) {
    return this.enhancedService.parseSKU(sku);
  }

  /**
   * Validate SKU format using the enhanced service
   */
  validateSKUFormat(sku) {
    return this.enhancedService.validateSKUFormat(sku);
  }

  /**
   * Get product type category for UI grouping
   */
  getProductTypeCategory(code) {
    const inputDevices = ["K", "M", "T"];
    const accessories = ["AD", "KASA", "KASSA"];
    const storage = ["DV"];
    const audioVideo = ["H", "W", "SP", "MO"];
    const printers = ["PR", "SC"];

    if (inputDevices.includes(code)) return "Input Devices";
    if (accessories.includes(code)) return "Accessories";
    if (storage.includes(code)) return "Storage";
    if (audioVideo.includes(code)) return "Audio/Video";
    if (printers.includes(code)) return "Printers/Scanners";

    return "Other";
  }

  /**
   * Get variant category for UI grouping
   */
  getVariantCategory(code) {
    const layouts = ["TR", "UK", "US", "ING", "FR", "DE"];
    const features = [
      "ORJ",
      "LED",
      "RGB",
      "MECH",
      "MEMB",
      "WIRE",
      "WLES",
      "BT",
    ];
    const colors = ["SYH", "KIRMIZI", "BEYAZ", "MAVI", "YESIL", "SARI", "GRI"];
    const sizes = ["S", "M", "L", "XL"];
    const versions = ["V1", "V2", "V3", "V4", "V5"];
    const packaging = ["KASALI", "KUTU", "BULK"];

    if (layouts.includes(code)) return "Layout";
    if (features.includes(code)) return "Features";
    if (colors.includes(code)) return "Colors";
    if (sizes.includes(code)) return "Sizes";
    if (versions.includes(code)) return "Versions";
    if (packaging.includes(code)) return "Packaging";

    return "Other";
  }

  /**
   * Test SKU generation for different product types
   */
  async demonstrateSystemCapabilities() {
    console.log("🚀 SKU System Demonstration");
    console.log("=".repeat(60));

    const examples = [
      // Keyboards
      { productType: "K", brand: "Apple", sequence: 1, variant: "TR" },
      { productType: "K", brand: "Logitech", sequence: 15, variant: "UK" },
      { productType: "K", brand: "Razer", sequence: 3, variant: "RGB" },

      // Mice
      { productType: "M", brand: "Logitech", sequence: 25, variant: "ORJ" },
      { productType: "M", brand: "Razer", sequence: 8, variant: "RGB" },

      // Adapters
      { productType: "AD", brand: "Dell", sequence: 12, variant: "ORJ" },
      { productType: "AD", brand: "HP", sequence: 45, variant: "V2" },

      // Cases
      { productType: "KASA", brand: "Asus", sequence: 7, variant: "SYH" },

      // Headsets
      { productType: "H", brand: "SteelSeries", sequence: 2, variant: "WLES" },
      { productType: "H", brand: "HyperX", sequence: 11, variant: "LED" },
    ];

    console.log("\n📦 Generated SKUs:");
    examples.forEach((example) => {
      const sku = this.enhancedService.generateSKU(example);
      const name = this.enhancedService.generateVariantName(
        example,
        example.variant
      );
      console.log(`${sku} → ${name}`);
    });

    return examples;
  }

  /**
   * Analyze and suggest improvements to existing SKUs
   */
  async analyzeExistingSKUs(skus) {
    console.log("\n🔍 Analyzing Existing SKUs");
    console.log("-".repeat(40));

    const analysis = {
      structured: [],
      needsUpdate: [],
      suggestions: [],
    };

    skus.forEach((sku) => {
      const parsed = this.enhancedService.parseSKU(sku);

      if (parsed && parsed.isStructured) {
        analysis.structured.push({ sku, parsed });
        console.log(`✅ ${sku} - Well structured`);
      } else {
        analysis.needsUpdate.push(sku);
        console.log(`⚠️  ${sku} - Needs restructuring`);

        // Suggest a structured format if possible
        const suggestion = this.suggestSKUImprovement(sku);
        if (suggestion) {
          analysis.suggestions.push({ original: sku, suggested: suggestion });
        }
      }
    });

    return analysis;
  }

  /**
   * Suggest improvement for non-structured SKUs
   */
  suggestSKUImprovement(sku) {
    // This would contain logic to analyze unstructured SKUs
    // and suggest structured alternatives
    // For now, return a simple suggestion
    return `Suggested restructuring needed for: ${sku}`;
  }

  /**
   * Get next sequence number for a brand (placeholder)
   */
  async getNextSequenceForBrand(brandCode, productType) {
    // This would query your database for the highest existing sequence
    // For now, return a sample number
    return Math.floor(Math.random() * 100) + 1;
  }

  /**
   * Batch create variants for a base product
   */
  createProductVariants(baseProduct, variantTypes) {
    console.log(
      `\n🎯 Creating variants for ${baseProduct.brand} ${baseProduct.productType}`
    );

    const variants = this.enhancedService.generateVariantSKUs(
      baseProduct,
      variantTypes
    );

    variants.forEach((variant) => {
      console.log(`  ${variant.sku} - ${variant.name}`);
      if (Object.keys(variant.attributes).length > 0) {
        console.log(`    Attributes: ${JSON.stringify(variant.attributes)}`);
      }
    });

    return variants;
  }
}

// Test the complete system
async function testCompleteSystem() {
  const manager = new SKUSystemManager();

  // 1. Demonstrate capabilities
  await manager.demonstrateSystemCapabilities();

  // 2. Analyze some existing SKUs
  const sampleSKUs = [
    "NWK-IBM048-TR",
    "NWK-HP038-TR",
    "NWK-AS054-UK",
    "TYCA124C9CBAC01C00", // Unstructured
    "NWK-MSI005-TR-LED",
  ];

  await manager.analyzeExistingSKUs(sampleSKUs);

  // 3. Create variants for a base product
  const baseKeyboard = {
    productType: "K",
    brand: "Dell",
    sequence: 50,
  };

  const keyboardVariants = ["TR", "UK", "ING", "LED"];
  manager.createProductVariants(baseKeyboard, keyboardVariants);

  // 4. Show configuration
  console.log("\n⚙️  System Configuration Summary:");
  const config = manager.getCompleteConfiguration();
  console.log(`• Own Brands: ${Object.keys(config.ownBrands).length}`);
  console.log(`• Product Types: ${Object.keys(config.productTypes).length}`);
  console.log(
    `• External Brands: ${Object.keys(config.externalBrands).length}`
  );
  console.log(`• Variant Codes: ${Object.keys(config.variantCodes).length}`);

  console.log("\n✅ SKU System Ready for Production!");
  console.log("Next steps:");
  console.log("1. Add any missing brands to the configuration");
  console.log("2. Implement sequence number management in database");
  console.log("3. Update frontend components to use new SKU generation");
  console.log("4. Consider migrating existing unstructured SKUs");
}

// Run if called directly
if (require.main === module) {
  testCompleteSystem().catch(console.error);
}

module.exports = SKUSystemManager;
