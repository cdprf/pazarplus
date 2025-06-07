const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Database connection
const dbPath = path.join(__dirname, "database.db");
const db = new sqlite3.Database(dbPath);

class ManualVariantConverter {
  constructor() {
    this.conversions = [];
    this.results = {
      success: 0,
      errors: 0,
      details: [],
    };
  }

  // Add a conversion specification
  addConversion(mainSKU, variantSKUs, groupName = null) {
    this.conversions.push({
      mainSKU,
      variantSKUs: Array.isArray(variantSKUs) ? variantSKUs : [variantSKUs],
      groupName: groupName || mainSKU,
    });
  }

  // Find products by SKU
  async findProductsBySKU(skus) {
    return new Promise((resolve, reject) => {
      const placeholders = skus.map(() => "?").join(",");
      const query = `
        SELECT id, name, sku, price, stockQuantity, images, status, category, description
        FROM products 
        WHERE sku IN (${placeholders}) AND status = 'active'
        ORDER BY sku
      `;

      db.all(query, skus, (err, products) => {
        if (err) reject(err);
        else resolve(products);
      });
    });
  }

  // Convert a group of products to main + variants
  async convertGroup(mainSKU, variantSKUs, groupName) {
    try {
      console.log(`\n🔄 Converting group: ${groupName}`);
      console.log(`   Main SKU: ${mainSKU}`);
      console.log(`   Variant SKUs: ${variantSKUs.join(", ")}`);

      // Find all products
      const allSKUs = [mainSKU, ...variantSKUs];
      const products = await this.findProductsBySKU(allSKUs);

      console.log(
        `   Found ${products.length} products out of ${allSKUs.length} SKUs`
      );

      // Find main product
      const mainProduct = products.find((p) => p.sku === mainSKU);
      if (!mainProduct) {
        throw new Error(`Main product with SKU ${mainSKU} not found`);
      }

      // Find variant products
      const variantProducts = products.filter((p) =>
        variantSKUs.includes(p.sku)
      );
      if (variantProducts.length === 0) {
        throw new Error(
          `No variant products found for SKUs: ${variantSKUs.join(", ")}`
        );
      }

      console.log(
        `   Main Product: ${mainProduct.name} (ID: ${mainProduct.id})`
      );
      variantProducts.forEach((v) => {
        console.log(`   Variant: ${v.name} (ID: ${v.id}, SKU: ${v.sku})`);
      });

      // Start transaction
      await this.runQuery("BEGIN TRANSACTION");

      try {
        // Update main product to have variants
        await this.runQuery(
          "UPDATE products SET hasVariants = 1 WHERE id = ?",
          [mainProduct.id]
        );

        // Create variants
        for (let i = 0; i < variantProducts.length; i++) {
          const variant = variantProducts[i];

          // Determine variant type from SKU suffix
          const variantType = this.getVariantType(variant.sku, mainSKU);

          // Calculate differences
          const differences = {
            type: variantType,
            sku: variant.sku,
          };

          if (variant.price !== mainProduct.price) {
            differences.priceDifference = `₺${variant.price} (Main: ₺${mainProduct.price})`;
          }

          if (variant.stockQuantity !== mainProduct.stockQuantity) {
            differences.stockDifference = `${variant.stockQuantity} (Main: ${mainProduct.stockQuantity})`;
          }

          // Insert variant
          await this.runQuery(
            `
            INSERT INTO product_variants (
              productId, name, sku, price, stockQuantity, images, 
              differences, sortOrder, isDefault, status, 
              createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `,
            [
              mainProduct.id,
              variant.name,
              variant.sku,
              variant.price,
              variant.stockQuantity,
              variant.images || "[]",
              JSON.stringify(differences),
              i + 1,
              false,
              "active",
            ]
          );

          // Mark original product as merged
          await this.runQuery(
            "UPDATE products SET status = ?, name = ? WHERE id = ?",
            ["inactive", `[MERGED] ${variant.name}`, variant.id]
          );

          console.log(
            `   ✅ Created variant: ${variant.name} -> ${variantType}`
          );
        }

        // Commit transaction
        await this.runQuery("COMMIT");

        this.results.success++;
        this.results.details.push({
          group: groupName,
          mainProduct: mainProduct.name,
          variantsCreated: variantProducts.length,
          status: "success",
        });

        console.log(`   ✅ Successfully converted group: ${groupName}`);
      } catch (error) {
        // Rollback on error
        await this.runQuery("ROLLBACK");
        throw error;
      }
    } catch (error) {
      console.error(
        `   ❌ Error converting group ${groupName}:`,
        error.message
      );
      this.results.errors++;
      this.results.details.push({
        group: groupName,
        error: error.message,
        status: "error",
      });
    }
  }

  // Get variant type from SKU
  getVariantType(variantSKU, mainSKU) {
    if (!variantSKU || !mainSKU) return "Unknown";

    const suffix = variantSKU.substring(mainSKU.length).toLowerCase();

    const typeMap = {
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
    };

    return typeMap[suffix] || `Variant ${suffix}`;
  }

  // Run a database query
  async runQuery(query, params = []) {
    return new Promise((resolve, reject) => {
      db.run(query, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  // Process all conversions
  async processAll() {
    console.log(
      `🚀 Starting manual variant conversion for ${this.conversions.length} groups...\n`
    );

    for (const conversion of this.conversions) {
      await this.convertGroup(
        conversion.mainSKU,
        conversion.variantSKUs,
        conversion.groupName
      );
    }

    this.generateFinalReport();
  }

  // Generate final report
  generateFinalReport() {
    console.log("\n📊 CONVERSION SUMMARY");
    console.log("====================");
    console.log(`✅ Successful conversions: ${this.results.success}`);
    console.log(`❌ Failed conversions: ${this.results.errors}`);
    console.log(
      `📦 Total groups processed: ${this.results.success + this.results.errors}`
    );

    if (this.results.details.length > 0) {
      console.log("\n📋 DETAILED RESULTS:");
      this.results.details.forEach((detail) => {
        if (detail.status === "success") {
          console.log(
            `✅ ${detail.group}: ${detail.variantsCreated} variants created for "${detail.mainProduct}"`
          );
        } else {
          console.log(`❌ ${detail.group}: ${detail.error}`);
        }
      });
    }
  }
}

// Example usage for your specific case
async function convertSpecificProducts() {
  const converter = new ManualVariantConverter();

  // Add your specific conversions
  // Example: converter.addConversion('nwk-as001', ['nwk-as001-orj'], 'NWK-AS001 Group');

  // Add multiple examples that might exist in your database
  const potentialConversions = [
    { main: "nwk-as001", variants: ["nwk-as001-orj"] },
    // Add more as needed
  ];

  // Check which products actually exist before adding conversions
  for (const { main, variants } of potentialConversions) {
    try {
      const allSKUs = [main, ...variants];
      const existingProducts = await converter.findProductsBySKU(allSKUs);

      if (existingProducts.length >= 2) {
        // At least main + 1 variant
        const foundSKUs = existingProducts.map((p) => p.sku);
        const foundVariants = variants.filter((v) => foundSKUs.includes(v));

        if (foundSKUs.includes(main) && foundVariants.length > 0) {
          converter.addConversion(main, foundVariants, `${main} Group`);
          console.log(
            `📋 Added conversion: ${main} + variants [${foundVariants.join(
              ", "
            )}]`
          );
        }
      }
    } catch (error) {
      console.log(`⚠️  Could not check products for ${main}: ${error.message}`);
    }
  }

  // Process all conversions
  await converter.processAll();
}

// Interactive mode - let user specify conversions
async function interactiveMode() {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  function question(prompt) {
    return new Promise((resolve) => rl.question(prompt, resolve));
  }

  const converter = new ManualVariantConverter();

  console.log("🔧 INTERACTIVE VARIANT CONVERSION MODE");
  console.log("=====================================");
  console.log("Enter product SKUs to convert to variants.");
  console.log("Format: mainSKU variantSKU1 variantSKU2 ...");
  console.log("Example: nwk-as001 nwk-as001-orj");
  console.log('Type "done" when finished, "list" to see added conversions.\n');

  while (true) {
    const input = await question('Enter SKUs (or "done"/"list"): ');

    if (input.toLowerCase() === "done") break;

    if (input.toLowerCase() === "list") {
      console.log("\n📋 Current conversions:");
      converter.conversions.forEach((conv, i) => {
        console.log(
          `${i + 1}. ${conv.mainSKU} + [${conv.variantSKUs.join(", ")}]`
        );
      });
      console.log("");
      continue;
    }

    const skus = input.trim().split(/\s+/);
    if (skus.length < 2) {
      console.log("⚠️  Please enter at least 2 SKUs (main + variant)");
      continue;
    }

    const [mainSKU, ...variantSKUs] = skus;

    try {
      // Check if products exist
      const allSKUs = [mainSKU, ...variantSKUs];
      const existingProducts = await converter.findProductsBySKU(allSKUs);

      console.log(
        `Found ${existingProducts.length}/${allSKUs.length} products:`
      );
      existingProducts.forEach((p) => console.log(`  - ${p.sku}: ${p.name}`));

      if (existingProducts.length >= 2) {
        const confirm = await question("Add this conversion? (y/n): ");
        if (confirm.toLowerCase() === "y" || confirm.toLowerCase() === "yes") {
          converter.addConversion(mainSKU, variantSKUs, `${mainSKU} Group`);
          console.log("✅ Conversion added!\n");
        }
      } else {
        console.log(
          "⚠️  Not enough products found to create a variant group.\n"
        );
      }
    } catch (error) {
      console.log(`❌ Error checking products: ${error.message}\n`);
    }
  }

  rl.close();

  if (converter.conversions.length > 0) {
    const proceed = await new Promise((resolve) => {
      const rl2 = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl2.question("\nProceed with conversions? (y/n): ", (answer) => {
        rl2.close();
        resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
      });
    });

    if (proceed) {
      await converter.processAll();
    } else {
      console.log("❌ Conversion cancelled.");
    }
  } else {
    console.log("ℹ️  No conversions to process.");
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--interactive") || args.includes("-i")) {
    await interactiveMode();
  } else {
    await convertSpecificProducts();
  }

  db.close();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ManualVariantConverter };
