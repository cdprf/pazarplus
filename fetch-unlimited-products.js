#!/usr/bin/env node

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "server", ".env") });

const {
  PlatformConnectionModel,
} = require("./server/models/PlatformConnection");
const {
  TrendyolService,
} = require("./server/services/platforms/TrendyolService");
const {
  HepsiburadaService,
} = require("./server/services/platforms/HepsiburadaService");
const { N11Service } = require("./server/services/platforms/N11Service");
const { sequelize } = require("./server/config/database");

async function fetchAllProductsUnlimited() {
  console.log("🚀 UNLIMITED PRODUCT FETCHING TEST");
  console.log("====================================================");
  console.log(`📅 Date: ${new Date().toLocaleString()}`);
  console.log(`🎯 Goal: Fetch ALL available products (targeting 7k+)\n`);

  let totalProducts = 0;
  const results = [];

  try {
    // Test Trendyol - Fetch ALL products
    console.log("📦 TRENDYOL - Fetching ALL products (no limits)");
    console.log("==================================================");

    try {
      const trendyolConnection = await PlatformConnectionModel.findOne({
        where: { platformType: "trendyol", isActive: true },
        order: [["updatedAt", "DESC"]],
      });

      if (trendyolConnection) {
        const trendyolService = new TrendyolService(trendyolConnection.id);
        const startTime = Date.now();

        console.log("📡 Testing connection...");
        const isConnected = await trendyolService.testConnection();

        if (isConnected) {
          console.log("✅ Connection successful");
          console.log("📥 Fetching ALL Trendyol products...");

          // Fetch ALL products without any limit
          const trendyolProducts = await trendyolService.getAllProducts();
          const duration = Date.now() - startTime;

          console.log(
            `✅ Trendyol: ${trendyolProducts.length} products fetched in ${duration}ms`
          );
          totalProducts += trendyolProducts.length;

          results.push({
            platform: "Trendyol",
            products: trendyolProducts.length,
            duration,
            success: true,
          });
        } else {
          console.log("❌ Trendyol connection failed");
          results.push({
            platform: "Trendyol",
            products: 0,
            duration: 0,
            success: false,
            error: "Connection failed",
          });
        }
      } else {
        console.log("❌ No Trendyol connection found");
        results.push({
          platform: "Trendyol",
          products: 0,
          duration: 0,
          success: false,
          error: "No connection found",
        });
      }
    } catch (error) {
      console.log(`❌ Trendyol error: ${error.message}`);
      results.push({
        platform: "Trendyol",
        products: 0,
        duration: 0,
        success: false,
        error: error.message,
      });
    }

    console.log(`🔄 Current total: ${totalProducts} products\n`);

    // Test Hepsiburada - Fetch ALL products
    console.log("📦 HEPSIBURADA - Fetching ALL products (no limits)");
    console.log("==================================================");

    try {
      const hepsiburadaConnection = await PlatformConnectionModel.findOne({
        where: { platformType: "hepsiburada", isActive: true },
        order: [["updatedAt", "DESC"]],
      });

      if (hepsiburadaConnection) {
        const hepsiburadaService = new HepsiburadaService(
          hepsiburadaConnection.id
        );
        const startTime = Date.now();

        console.log("📡 Testing connection...");
        const isConnected = await hepsiburadaService.testConnection();

        if (isConnected) {
          console.log("✅ Connection successful");
          console.log("📥 Fetching ALL Hepsiburada products...");

          // Fetch ALL products without any limit
          const hepsiburadaProducts = await hepsiburadaService.getAllProducts();
          const duration = Date.now() - startTime;

          console.log(
            `✅ Hepsiburada: ${hepsiburadaProducts.length} products fetched in ${duration}ms`
          );
          totalProducts += hepsiburadaProducts.length;

          results.push({
            platform: "Hepsiburada",
            products: hepsiburadaProducts.length,
            duration,
            success: true,
          });
        } else {
          console.log("❌ Hepsiburada connection failed");
          results.push({
            platform: "Hepsiburada",
            products: 0,
            duration: 0,
            success: false,
            error: "Connection failed",
          });
        }
      } else {
        console.log("❌ No Hepsiburada connection found");
        results.push({
          platform: "Hepsiburada",
          products: 0,
          duration: 0,
          success: false,
          error: "No connection found",
        });
      }
    } catch (error) {
      console.log(`❌ Hepsiburada error: ${error.message}`);
      results.push({
        platform: "Hepsiburada",
        products: 0,
        duration: 0,
        success: false,
        error: error.message,
      });
    }

    console.log(`🔄 Current total: ${totalProducts} products\n`);

    // Test N11 - Fetch ALL products
    console.log("📦 N11 - Fetching ALL products (no limits)");
    console.log("==================================================");

    try {
      const n11Connection = await PlatformConnectionModel.findOne({
        where: { platformType: "n11", isActive: true },
        order: [["updatedAt", "DESC"]],
      });

      if (n11Connection) {
        const n11Service = new N11Service(n11Connection.id);
        const startTime = Date.now();

        console.log("📡 Testing connection...");
        const isConnected = await n11Service.testConnection();

        if (isConnected) {
          console.log("✅ Connection successful");
          console.log("📥 Fetching ALL N11 products...");

          // Fetch ALL products without any limit
          const n11Products = await n11Service.getAllProducts();
          const duration = Date.now() - startTime;

          console.log(
            `✅ N11: ${n11Products.length} products fetched in ${duration}ms`
          );
          totalProducts += n11Products.length;

          results.push({
            platform: "N11",
            products: n11Products.length,
            duration,
            success: true,
          });
        } else {
          console.log("❌ N11 connection failed");
          results.push({
            platform: "N11",
            products: 0,
            duration: 0,
            success: false,
            error: "Connection failed",
          });
        }
      } else {
        console.log("❌ No N11 connection found");
        results.push({
          platform: "N11",
          products: 0,
          duration: 0,
          success: false,
          error: "No connection found",
        });
      }
    } catch (error) {
      console.log(`❌ N11 error: ${error.message}`);
      results.push({
        platform: "N11",
        products: 0,
        duration: 0,
        success: false,
        error: error.message,
      });
    }

    console.log(`🔄 Final total: ${totalProducts} products\n`);

    // Print final results
    console.log(
      "================================================================================"
    );
    console.log("📊 UNLIMITED PRODUCT FETCHING RESULTS");
    console.log(
      "================================================================================\n"
    );

    let totalDuration = 0;
    let successfulPlatforms = 0;

    results.forEach((result) => {
      console.log(`🔹 ${result.platform.toUpperCase()}`);
      console.log("----------------------------------------");
      if (result.success) {
        console.log(`✅ Products: ${result.products.toLocaleString()}`);
        console.log(`⏱️ Duration: ${(result.duration / 1000).toFixed(1)}s`);
        successfulPlatforms++;
      } else {
        console.log(`❌ Error: ${result.error}`);
        console.log(`⏱️ Duration: ${(result.duration / 1000).toFixed(1)}s`);
      }
      totalDuration += result.duration;
      console.log("");
    });

    console.log(
      "================================================================================"
    );
    console.log("📈 FINAL SUMMARY");
    console.log(
      "================================================================================"
    );
    console.log(`🎯 TOTAL PRODUCTS FETCHED: ${totalProducts.toLocaleString()}`);
    console.log(
      `📊 TARGET ACHIEVEMENT: ${
        totalProducts >= 7000 ? "🎉 SUCCESS!" : "⚠️ TARGET NOT MET"
      }`
    );
    console.log(
      `📈 Progress: ${totalProducts}/7,000 (${(
        (totalProducts / 7000) *
        100
      ).toFixed(1)}%)`
    );
    console.log(`⏱️ Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`📦 Platforms Tested: ${results.length}`);
    console.log(
      `✅ Successful Platforms: ${successfulPlatforms}/${results.length}`
    );

    if (totalProducts >= 7000) {
      console.log(
        "\n🎉🎉🎉 EXCELLENT! Successfully fetched 7,000+ products! 🎉🎉🎉"
      );
    } else if (totalProducts >= 5000) {
      console.log("\n👍 Good progress! Close to the 7k target.");
    } else {
      console.log("\n⚠️ Need more products to reach 7k target.");
    }

    console.log("\n🏁 Unlimited Product Fetching Test Complete!");
  } catch (error) {
    console.error("❌ Fatal error during unlimited fetch test:", error);
    console.error(error.stack);
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
    process.exit(0);
  }
}

// Run the test
fetchAllProductsUnlimited().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});
