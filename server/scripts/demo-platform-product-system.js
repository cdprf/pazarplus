const { Op } = require("sequelize");
const {
  Product,
  TrendyolProduct,
  HepsiburadaProduct,
  N11Product,
} = require("../models");

console.log("🚀 Starting Platform Product System Demo...\n");

async function demoFullPlatformProductSystem() {
  try {
    // Step 0: Get or create a user for the demo
    console.log("👤 Step 0: Getting demo user...");
    const { User } = require("../models");
    let demoUser;
    try {
      demoUser = await User.findOne();
      if (!demoUser) {
        demoUser = await User.create({
          email: "demo@example.com",
          password: "demopassword123",
          firstName: "Demo",
          lastName: "User",
        });
      }
    } catch (error) {
      // User with this email might already exist, try to find it
      demoUser = await User.findOne({ where: { email: "demo@example.com" } });
      if (!demoUser) {
        // If still no user, use the first available user
        demoUser = await User.findOne();
      }
    }

    console.log(`✅ Using demo user: ${demoUser.email} (ID: ${demoUser.id})\n`);

    // Step 1: Create a base product
    console.log("📦 Step 1: Creating base product...");
    const baseProduct = await Product.create({
      name: "Demo Smart Watch",
      description: "A high-quality smart watch with fitness tracking",
      sku: "DEMO-SW-001",
      barcode: "1234567890123",
      price: 299.99,
      costPrice: 150.0,
      stockQuantity: 100,
      category: "Electronics",
      brand: "DemoTech",
      weight: 0.5,
      dimensions: JSON.stringify({ length: 10, width: 5, height: 2 }),
      status: "active",
      tags: JSON.stringify(["smartwatch", "fitness", "electronics"]),
      userId: demoUser.id,
    });

    console.log(`✅ Base product created with ID: ${baseProduct.id}`);
    console.log(`   Name: ${baseProduct.name}`);
    console.log(`   SKU: ${baseProduct.sku}`);
    console.log(`   Price: $${baseProduct.price}\n`);

    // Step 2: Create Trendyol-specific product
    console.log("🟡 Step 2: Creating Trendyol product...");
    const trendyolProduct = await TrendyolProduct.create({
      productId: baseProduct.id,
      trendyolProductId: "TR-" + baseProduct.sku,
      barcode: baseProduct.barcode,
      title: "Akıllı Saat - Fitness Takip Özellikli",
      brand: "DemoTech",
      brandId: "DT001",
      categoryName: "Elektronik > Akıllı Saatler",
      categoryId: "CAT001",
      quantity: baseProduct.stockQuantity,
      stockCode: baseProduct.sku,
      dimensionalWeight: 0.6,
      description: "Yüksek kaliteli akıllı saat, fitness takip özellikleri ile",
      currencyType: "TRY",
      listPrice: baseProduct.price * 12, // Convert to TRY (assuming 1 USD = 12 TRY)
      salePrice: baseProduct.price * 11.5, // Discount price
      vatRate: 18,
      images: JSON.stringify([
        "https://example.com/smartwatch1.jpg",
        "https://example.com/smartwatch2.jpg",
      ]),
      attributes: JSON.stringify([
        { name: "Renk", value: "Siyah" },
        { name: "Ekran Boyutu", value: "1.4 inch" },
        { name: "Su Geçirmezlik", value: "IP68" },
      ]),
      approved: false,
      rejected: false,
      blockedByPartner: false,
      hasActiveCampaign: false,
      archived: false,
      blacklisted: false,
      locked: false,
      onSale: true,
      hasHtmlContent: false,
      productUrl: null,
      productCode: null,
      productContentId: null,
      productMainId: null,
      pimCategoryId: "PIM001",
      supplierId: "SUP001",
      platformListingId: null,
      status: "pending",
      lastSyncedAt: null,
      syncErrors: null,
      createDateTime: Date.now(),
      lastUpdateDate: Date.now(),
      rejectReasonDetails: JSON.stringify([]),
      stockUnitType: "Adet",
    });

    console.log(`✅ Trendyol product created with ID: ${trendyolProduct.id}`);
    console.log(`   Trendyol Product ID: ${trendyolProduct.trendyolProductId}`);
    console.log(`   Title: ${trendyolProduct.title}`);
    console.log(
      `   Price: ${trendyolProduct.listPrice} ${trendyolProduct.currencyType}`
    );
    console.log(`   Status: ${trendyolProduct.status}\n`);

    // Step 3: Create Hepsiburada-specific product
    console.log("🔵 Step 3: Creating Hepsiburada product...");
    const hepsiburadaProduct = await HepsiburadaProduct.create({
      productId: baseProduct.id,
      merchantSku: baseProduct.sku,
      barcode: baseProduct.barcode,
      title: "Akıllı Saat - Fitness Takibi",
      brand: "DemoTech",
      categoryId: "18003030", // Hepsiburada category ID for smart watches
      description:
        "Yüksek kaliteli akıllı saat, gelişmiş fitness takip özellikleri",
      attributes: {
        Renk: "Siyah",
        "Ekran Boyutu": "1.4 inch",
        "Su Geçirmezlik": "IP68",
        "Pil Ömrü": "7 gün",
        Bluetooth: "5.0",
      },
      images: [
        "https://example.com/hb-smartwatch1.jpg",
        "https://example.com/hb-smartwatch2.jpg",
        "https://example.com/hb-smartwatch3.jpg",
      ],
      price: baseProduct.price * 12, // Convert to TRY
      stock: baseProduct.stockQuantity,
      vatRate: 18,
      cargoCompany1Id: "ARAS",
      cargoCompany2Id: "YURTICI",
      deliveryDuration: 2,
      status: "pending",
      lastSyncedAt: null,
      syncErrors: null,
    });

    console.log(
      `✅ Hepsiburada product created with ID: ${hepsiburadaProduct.id}`
    );
    console.log(`   Merchant SKU: ${hepsiburadaProduct.merchantSku}`);
    console.log(`   Title: ${hepsiburadaProduct.title}`);
    console.log(`   Price: ${hepsiburadaProduct.price} TRY`);
    console.log(`   Stock: ${hepsiburadaProduct.stock}`);
    console.log(`   Status: ${hepsiburadaProduct.status}\n`);

    // Step 4: Create N11-specific product
    console.log("🟢 Step 4: Creating N11 product...");
    const n11Product = await N11Product.create({
      productId: baseProduct.id,
      n11ProductId: null, // Will be set after successful upload to N11
      sellerCode: baseProduct.sku,
      title: "Akıllı Saat Fitness Tracker",
      subtitle: "Gelişmiş Sağlık Takibi",
      description:
        "Kapsamlı fitness takip özellikleri ile donatılmış akıllı saat",
      categoryId: "1000011", // N11 category ID for smart watches
      price: baseProduct.price * 12, // Convert to TRY
      currencyType: "TL",
      stockAmount: baseProduct.stockQuantity,
      preparingDay: 1,
      images: [
        "https://example.com/n11-smartwatch1.jpg",
        "https://example.com/n11-smartwatch2.jpg",
      ],
      attributes: {
        Renk: "Siyah",
        Marka: "DemoTech",
        Model: "SW-001",
        "Ekran Boyutu": "1.4 inch",
        "Su Geçirmezlik": "IP68",
      },
      shipmentTemplate: "Hızlı Kargo",
      approvalStatus: "Pending",
      brandId: "1001",
      barcode: baseProduct.barcode,
      status: "pending",
      lastSyncedAt: null,
      syncErrors: null,
    });

    console.log(`✅ N11 product created with ID: ${n11Product.id}`);
    console.log(`   Seller Code: ${n11Product.sellerCode}`);
    console.log(`   Title: ${n11Product.title}`);
    console.log(`   Price: ${n11Product.price} ${n11Product.currencyType}`);
    console.log(`   Stock: ${n11Product.stockAmount}`);
    console.log(`   Approval Status: ${n11Product.approvalStatus}\n`);

    // Step 5: Test associations and queries
    console.log("🔗 Step 5: Testing associations and queries...");

    // Get product with all platform variants
    const productWithPlatforms = await Product.findByPk(baseProduct.id, {
      include: [
        { model: TrendyolProduct, as: "trendyolProduct" },
        { model: HepsiburadaProduct, as: "hepsiburadaProduct" },
        { model: N11Product, as: "n11Product" },
      ],
    });

    console.log(`📊 Product "${productWithPlatforms.name}" is listed on:`);
    console.log(
      `   🟡 Trendyol: ${
        productWithPlatforms.trendyolProduct ? "✅ Listed" : "❌ Not listed"
      }`
    );
    console.log(
      `   🔵 Hepsiburada: ${
        productWithPlatforms.hepsiburadaProduct ? "✅ Listed" : "❌ Not listed"
      }`
    );
    console.log(
      `   🟢 N11: ${
        productWithPlatforms.n11Product ? "✅ Listed" : "❌ Not listed"
      }\n`
    );

    // Step 6: Test queries across platforms
    console.log("🔍 Step 6: Testing cross-platform queries...");

    // Find all pending products across platforms
    const pendingProducts = await Promise.all([
      TrendyolProduct.findAll({ where: { status: "pending" } }),
      HepsiburadaProduct.findAll({ where: { status: "pending" } }),
      N11Product.findAll({ where: { status: "pending" } }),
    ]);

    console.log(`📋 Pending products summary:`);
    console.log(`   🟡 Trendyol: ${pendingProducts[0].length} pending`);
    console.log(`   🔵 Hepsiburada: ${pendingProducts[1].length} pending`);
    console.log(`   🟢 N11: ${pendingProducts[2].length} pending\n`);

    // Step 7: Test stock synchronization scenario
    console.log("🔄 Step 7: Testing stock synchronization...");

    // Simulate stock update from platform
    await trendyolProduct.update({
      quantity: 95,
      lastSyncedAt: new Date(),
      status: "active",
    });

    // Update base product stock to match platform
    await baseProduct.update({ stockQuantity: 95 });

    // Sync across other platforms
    await hepsiburadaProduct.update({ stock: 95 });
    await n11Product.update({ stockAmount: 95 });

    console.log(
      `✅ Stock synchronized across all platforms: ${baseProduct.stockQuantity} units\n`
    );

    // Step 8: Test error handling
    console.log("❌ Step 8: Testing error handling...");

    // Simulate sync error
    await trendyolProduct.update({
      syncErrors: {
        error: "Invalid category mapping",
        timestamp: new Date(),
        details: "Category ID CAT001 is not valid for this product type",
      },
      status: "error",
    });

    console.log(`🚨 Sync error recorded for Trendyol product`);
    console.log(`   Error: ${trendyolProduct.syncErrors.error}\n`);

    // Step 9: Generate summary report
    console.log("📊 Step 9: Generating platform product summary...");

    const summary = {
      baseProduct: {
        id: baseProduct.id,
        name: baseProduct.name,
        sku: baseProduct.sku,
        stock: baseProduct.stockQuantity,
      },
      platforms: {
        trendyol: {
          id: trendyolProduct.id,
          platformId: trendyolProduct.trendyolProductId,
          status: trendyolProduct.status,
          price: `${trendyolProduct.listPrice} ${trendyolProduct.currencyType}`,
          stock: trendyolProduct.quantity,
        },
        hepsiburada: {
          id: hepsiburadaProduct.id,
          merchantSku: hepsiburadaProduct.merchantSku,
          status: hepsiburadaProduct.status,
          price: `${hepsiburadaProduct.price} TRY`,
          stock: hepsiburadaProduct.stock,
        },
        n11: {
          id: n11Product.id,
          sellerCode: n11Product.sellerCode,
          status: n11Product.status,
          price: `${n11Product.price} ${n11Product.currencyType}`,
          stock: n11Product.stockAmount,
          approvalStatus: n11Product.approvalStatus,
        },
      },
    };

    console.log("📋 Platform Product System Summary:");
    console.log(JSON.stringify(summary, null, 2));

    console.log("\n✅ Platform Product System Demo Completed Successfully!");
    console.log("🎯 All features demonstrated:");
    console.log("   ✅ Base product creation");
    console.log(
      "   ✅ Platform-specific product creation (Trendyol, Hepsiburada, N11)"
    );
    console.log("   ✅ Model associations and relationships");
    console.log("   ✅ Cross-platform queries");
    console.log("   ✅ Stock synchronization");
    console.log("   ✅ Error handling and tracking");
    console.log("   ✅ Comprehensive reporting\n");

    return {
      success: true,
      baseProduct,
      platformProducts: {
        trendyol: trendyolProduct,
        hepsiburada: hepsiburadaProduct,
        n11: n11Product,
      },
      summary,
    };
  } catch (error) {
    console.error("❌ Demo failed:", error);
    console.error("Stack trace:", error.stack);
    return { success: false, error: error.message };
  }
}

// Run the demo
if (require.main === module) {
  demoFullPlatformProductSystem()
    .then((result) => {
      if (result.success) {
        console.log("🎉 Demo completed successfully!");
        process.exit(0);
      } else {
        console.error("💥 Demo failed:", result.error);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("💥 Unexpected error:", error);
      process.exit(1);
    });
}

module.exports = { demoFullPlatformProductSystem };
