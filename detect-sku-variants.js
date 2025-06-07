const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Database connection
const dbPath = path.join(__dirname, "database.db");
const db = new sqlite3.Database(dbPath);

// SKU variant patterns to detect
const VARIANT_PATTERNS = [
  "-orj", // Original
  "-org", // Original (alternative)
  "-pro", // Professional
  "-mini", // Mini version
  "-max", // Maximum version
  "-lite", // Lite version
  "-plus", // Plus version
  "-xl", // Extra Large
  "-s", // Small
  "-m", // Medium
  "-l", // Large
  "-v2", // Version 2
  "-v3", // Version 3
  "-a", // Type A
  "-b", // Type B
  "-c", // Type C
];

class SKUVariantDetector {
  constructor() {
    this.detectedGroups = new Map();
    this.statistics = {
      totalProducts: 0,
      potentialGroups: 0,
      variantsFound: 0,
      processedProducts: 0,
    };
  }

  // Extract base SKU by removing variant suffixes
  extractBaseSKU(sku) {
    if (!sku) return null;

    let baseSKU = sku.toLowerCase();

    // Sort patterns by length (longest first) to avoid partial matches
    const sortedPatterns = VARIANT_PATTERNS.sort((a, b) => b.length - a.length);

    for (const pattern of sortedPatterns) {
      if (baseSKU.endsWith(pattern)) {
        return sku.substring(0, sku.length - pattern.length);
      }
    }

    return sku; // Return original if no pattern found
  }

  // Detect variant type from SKU
  detectVariantType(sku, baseSKU) {
    if (!sku || !baseSKU || sku.length <= baseSKU.length) return "standard";

    const suffix = sku.substring(baseSKU.length).toLowerCase();

    const variantTypeMap = {
      "-orj": "Original",
      "-org": "Original",
      "-pro": "Professional",
      "-mini": "Mini",
      "-max": "Maximum",
      "-lite": "Lite",
      "-plus": "Plus",
      "-xl": "Extra Large",
      "-s": "Small",
      "-m": "Medium",
      "-l": "Large",
      "-v2": "Version 2",
      "-v3": "Version 3",
      "-a": "Type A",
      "-b": "Type B",
      "-c": "Type C",
    };

    return variantTypeMap[suffix] || `Variant ${suffix}`;
  }

  // Analyze products and group by base SKU
  async analyzeProducts() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT id, name, sku, price, stockQuantity, images, status, category
        FROM products 
        WHERE status = 'active' AND sku IS NOT NULL 
        ORDER BY sku
      `;

      db.all(query, [], (err, products) => {
        if (err) {
          reject(err);
          return;
        }

        this.statistics.totalProducts = products.length;
        console.log(
          `🔍 Analyzing ${products.length} active products for SKU variants...`
        );

        // Group products by base SKU
        for (const product of products) {
          const baseSKU = this.extractBaseSKU(product.sku);
          const variantType = this.detectVariantType(product.sku, baseSKU);

          if (!this.detectedGroups.has(baseSKU)) {
            this.detectedGroups.set(baseSKU, []);
          }

          this.detectedGroups.get(baseSKU).push({
            ...product,
            baseSKU,
            variantType,
            isVariant: product.sku !== baseSKU,
          });

          this.statistics.processedProducts++;
        }

        // Filter groups that have more than one product
        const variantGroups = new Map();
        for (const [baseSKU, products] of this.detectedGroups) {
          if (products.length > 1) {
            variantGroups.set(baseSKU, products);
            this.statistics.potentialGroups++;
            this.statistics.variantsFound += products.length - 1;
          }
        }

        this.detectedGroups = variantGroups;
        resolve(this.detectedGroups);
      });
    });
  }

  // Generate report of detected variant groups
  generateReport() {
    console.log("\n📊 SKU VARIANT ANALYSIS REPORT");
    console.log("================================");
    console.log(`Total Products Analyzed: ${this.statistics.totalProducts}`);
    console.log(`Potential Variant Groups: ${this.statistics.potentialGroups}`);
    console.log(`Total Variants Found: ${this.statistics.variantsFound}`);
    console.log("\n📋 DETECTED VARIANT GROUPS:");
    console.log("============================");

    for (const [baseSKU, products] of this.detectedGroups) {
      console.log(`\n🏷️  Base SKU: ${baseSKU}`);
      console.log(`   Products in group: ${products.length}`);

      // Find the main product (exact match with base SKU)
      const mainProduct = products.find((p) => p.sku === baseSKU);
      const variants = products.filter((p) => p.sku !== baseSKU);

      if (mainProduct) {
        console.log(
          `   📦 Main Product: ${mainProduct.name} (${mainProduct.sku})`
        );
        console.log(
          `      Price: ₺${mainProduct.price} | Stock: ${mainProduct.stockQuantity}`
        );
      } else {
        console.log(
          `   ⚠️  No main product found - suggest using: ${products[0].name} (${products[0].sku})`
        );
      }

      variants.forEach((variant) => {
        console.log(
          `   📋 Variant [${variant.variantType}]: ${variant.name} (${variant.sku})`
        );
        console.log(
          `      Price: ₺${variant.price} | Stock: ${variant.stockQuantity}`
        );
      });

      console.log("   ---");
    }
  }

  // Generate SQL script to convert to variant system
  generateConversionScript() {
    const statements = [];
    let groupCounter = 0;

    console.log("\n🔧 CONVERSION SCRIPT PREVIEW:");
    console.log("=============================");

    for (const [baseSKU, products] of this.detectedGroups) {
      groupCounter++;

      // Find the main product (exact match with base SKU) or use first product
      let mainProduct = products.find((p) => p.sku === baseSKU);
      if (!mainProduct) {
        mainProduct = products[0]; // Use first product as main if no exact match
      }

      const variants = products.filter((p) => p.id !== mainProduct.id);

      if (variants.length === 0) continue;

      console.log(`\n--- Group ${groupCounter}: ${baseSKU} ---`);
      console.log(`Main Product: ${mainProduct.name} (ID: ${mainProduct.id})`);

      // Update main product to have variants
      statements.push(`-- Group ${groupCounter}: ${baseSKU}`);
      statements.push(
        `UPDATE products SET hasVariants = 1 WHERE id = ${mainProduct.id};`
      );

      // Create variants
      variants.forEach((variant, index) => {
        const differences = {
          type: variant.variantType,
          sku: variant.sku,
        };

        // Add price difference if different
        if (variant.price !== mainProduct.price) {
          differences.price = `₺${variant.price} (Main: ₺${mainProduct.price})`;
        }

        const variantData = {
          productId: mainProduct.id,
          name: variant.name,
          sku: variant.sku,
          price: variant.price,
          stockQuantity: variant.stockQuantity,
          images: variant.images,
          differences: JSON.stringify(differences),
          sortOrder: index + 1,
          isDefault: false,
          status: "active",
        };

        statements.push(
          `INSERT INTO product_variants (productId, name, sku, price, stockQuantity, images, differences, sortOrder, isDefault, status, createdAt, updatedAt) VALUES (${
            variantData.productId
          }, '${variantData.name.replace(/'/g, "''")}', '${variantData.sku}', ${
            variantData.price
          }, ${variantData.stockQuantity}, '${variantData.images || "[]"}', '${
            variantData.differences
          }', ${variantData.sortOrder}, ${variantData.isDefault ? 1 : 0}, '${
            variantData.status
          }', datetime('now'), datetime('now'));`
        );

        // Mark original product as merged
        statements.push(
          `UPDATE products SET status = 'inactive', name = '[MERGED] ' || name WHERE id = ${variant.id};`
        );

        console.log(
          `  Variant ${index + 1}: ${variant.name} -> ${variant.variantType}`
        );
      });

      statements.push(""); // Empty line between groups
    }

    return statements;
  }

  // Save conversion script to file
  saveConversionScript(statements) {
    const fs = require("fs");
    const filename = `sku-variant-conversion-${Date.now()}.sql`;
    const content = [
      "-- SKU-Based Product Variant Conversion Script",
      `-- Generated: ${new Date().toISOString()}`,
      `-- Total Groups: ${this.statistics.potentialGroups}`,
      `-- Total Variants: ${this.statistics.variantsFound}`,
      "",
      "BEGIN TRANSACTION;",
      "",
      ...statements,
      "",
      "COMMIT;",
    ].join("\n");

    fs.writeFileSync(filename, content);
    console.log(`\n💾 Conversion script saved to: ${filename}`);
    return filename;
  }
}

// Main execution
async function main() {
  console.log("🚀 Starting SKU Variant Detection...\n");

  const detector = new SKUVariantDetector();

  try {
    await detector.analyzeProducts();
    detector.generateReport();

    if (detector.detectedGroups.size > 0) {
      const statements = detector.generateConversionScript();
      const scriptFile = detector.saveConversionScript(statements);

      console.log("\n✅ NEXT STEPS:");
      console.log("==============");
      console.log("1. Review the generated SQL script");
      console.log("2. Test on a backup database first");
      console.log("3. Run the script to convert products to variants");
      console.log("4. Verify the results in the frontend");
      console.log(`\nScript location: ${scriptFile}`);
    } else {
      console.log("\nℹ️  No variant groups detected with current patterns.");
      console.log("Consider adjusting VARIANT_PATTERNS if needed.");
    }
  } catch (error) {
    console.error("❌ Error during analysis:", error);
  } finally {
    db.close();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { SKUVariantDetector, VARIANT_PATTERNS };
