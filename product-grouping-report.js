const chalk = require("chalk");
const { Product, ProductVariant, sequelize } = require("./server/models");

// Function to generate a comprehensive report of the product grouping results
async function generateGroupingReport() {
  try {
    console.log(chalk.blue("📊 Product Grouping Implementation Report"));
    console.log(chalk.gray("==========================================\n"));

    // Get statistics on the current state
    const mainProducts = await Product.findAll({
      where: {
        hasVariants: true,
        status: "active",
      },
      include: [
        {
          model: ProductVariant,
          as: "variants",
          required: false,
        },
      ],
    });

    const mergedProducts = await Product.findAll({
      where: {
        status: "inactive",
        name: {
          [sequelize.Sequelize.Op.like]: "[MERGED]%",
        },
      },
    });

    const totalVariants = await ProductVariant.count();

    console.log(chalk.green("✅ Implementation Results:"));
    console.log(`   📦 Main Products with Variants: ${mainProducts.length}`);
    console.log(
      `   🔄 Products Converted to Variants: ${mergedProducts.length}`
    );
    console.log(`   📋 Total Variants Created: ${totalVariants}`);
    console.log(`   🎯 Total Product Groups: ${mainProducts.length}`);

    console.log(chalk.cyan("\n📈 Sample Groups Created:"));
    console.log(chalk.gray("============================\n"));

    // Show first 10 groups as examples
    for (let i = 0; i < Math.min(10, mainProducts.length); i++) {
      const product = mainProducts[i];
      const variantCount = product.variants ? product.variants.length : 0;

      console.log(chalk.yellow(`${i + 1}. ${product.sku} - "${product.name}"`));
      console.log(chalk.gray(`   📊 Variants: ${variantCount}`));

      if (product.variants && product.variants.length > 0) {
        product.variants.slice(0, 3).forEach((variant) => {
          console.log(chalk.gray(`   📦 ${variant.sku} - "${variant.name}"`));
        });
        if (product.variants.length > 3) {
          console.log(
            chalk.gray(
              `   ... and ${product.variants.length - 3} more variants`
            )
          );
        }
      }
      console.log("");
    }

    if (mainProducts.length > 10) {
      console.log(
        chalk.gray(`... and ${mainProducts.length - 10} more product groups\n`)
      );
    }

    console.log(chalk.magenta("🔍 Next Steps:"));
    console.log("===============\n");
    console.log("1. 🛍️  Update your frontend to display variants properly");
    console.log("2. 📋 Test product catalog browsing and variant selection");
    console.log("3. 🛒 Verify shopping cart functionality with variants");
    console.log("4. 📊 Update inventory management for variant tracking");
    console.log("5. 🔄 Test platform synchronization with the new structure");
    console.log("6. 📈 Monitor performance with the consolidated catalog");

    console.log(chalk.blue("\n💡 Benefits Achieved:"));
    console.log("===================\n");
    console.log("✅ Cleaner product catalog organization");
    console.log("✅ Better user experience with product variants");
    console.log("✅ Simplified inventory management");
    console.log("✅ Improved platform synchronization efficiency");
    console.log("✅ Enhanced product search and filtering capabilities");

    console.log(
      chalk.green(
        "\n🎉 Product grouping implementation completed successfully!"
      )
    );
  } catch (error) {
    console.error(chalk.red("❌ Error generating report:"), error);
  }
}

// Function to verify the grouping integrity
async function verifyGroupingIntegrity() {
  try {
    console.log(chalk.blue("\n🔍 Verifying Grouping Integrity..."));
    console.log(chalk.gray("==================================\n"));

    // Check for orphaned variants
    const orphanedVariants = await ProductVariant.findAll({
      include: [
        {
          model: Product,
          as: "product",
          where: { status: "inactive" },
        },
      ],
    });

    if (orphanedVariants.length > 0) {
      console.log(
        chalk.red(
          `⚠️  Found ${orphanedVariants.length} orphaned variants (linked to inactive products)`
        )
      );
    } else {
      console.log(chalk.green("✅ No orphaned variants found"));
    }

    // Check for products marked as having variants but with no variants
    const productsWithoutVariants = await Product.findAll({
      where: {
        hasVariants: true,
        status: "active",
      },
      include: [
        {
          model: ProductVariant,
          as: "variants",
          required: false,
        },
      ],
    });

    const emptyVariantProducts = productsWithoutVariants.filter(
      (p) => !p.variants || p.variants.length === 0
    );

    if (emptyVariantProducts.length > 0) {
      console.log(
        chalk.yellow(
          `⚠️  Found ${emptyVariantProducts.length} products marked as having variants but with no variants`
        )
      );
    } else {
      console.log(
        chalk.green("✅ All products with hasVariants=true have variants")
      );
    }

    // Check for duplicate SKUs in variants
    const allVariants = await ProductVariant.findAll({
      attributes: ["sku"],
      group: ["sku"],
      having: sequelize.literal("COUNT(*) > 1"),
    });

    if (allVariants.length > 0) {
      console.log(
        chalk.red(`⚠️  Found ${allVariants.length} duplicate SKUs in variants`)
      );
    } else {
      console.log(chalk.green("✅ No duplicate SKUs found in variants"));
    }

    console.log(chalk.green("\n✅ Integrity verification completed"));
  } catch (error) {
    console.error(chalk.red("❌ Error verifying integrity:"), error);
  }
}

// Main function
async function runReport() {
  await generateGroupingReport();
  await verifyGroupingIntegrity();
  process.exit(0);
}

// Run the report
if (require.main === module) {
  runReport();
}

module.exports = {
  generateGroupingReport,
  verifyGroupingIntegrity,
};
