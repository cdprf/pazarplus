const axios = require("axios");
const chalk = require("chalk");

const BASE_URL = "http://localhost:3000/api";
let authToken = "";

// Test configuration
const testConfig = {
  baseProduct: {
    name: "Premium Cotton T-Shirt",
    description: "High-quality cotton t-shirt with multiple variants",
    category: "Clothing",
    brand: "TestBrand",
    price: 29.99,
    sku: "COTTON-TSHIRT-001",
  },
  variants: [
    {
      name: "Small Red",
      attributes: { size: "S", color: "Red" },
      sku: "COTTON-TSHIRT-001-S-RED",
      price: 29.99,
      stock: 100,
    },
    {
      name: "Medium Blue",
      attributes: { size: "M", color: "Blue" },
      sku: "COTTON-TSHIRT-001-M-BLUE",
      price: 32.99,
      stock: 150,
    },
    {
      name: "Large Black",
      attributes: { size: "L", color: "Black" },
      sku: "COTTON-TSHIRT-001-L-BLACK",
      price: 34.99,
      stock: 75,
    },
  ],
};

async function makeRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      status: error.response?.status,
    };
  }
}

async function authenticate() {
  console.log(chalk.blue("🔐 Authenticating..."));

  const result = await makeRequest("POST", "/auth/login", {
    email: "admin@pazar.com",
    password: "admin123",
  });

  if (result.success && result.data.token) {
    authToken = result.data.token;
    console.log(chalk.green("✅ Authentication successful"));
    return true;
  } else {
    console.log(chalk.red("❌ Authentication failed:", result.error));
    return false;
  }
}

async function testProductCreation() {
  console.log(chalk.blue("\n📦 Testing Product Creation..."));

  const result = await makeRequest(
    "POST",
    "/products",
    testConfig.baseProduct,
    authToken
  );

  if (result.success) {
    console.log(chalk.green("✅ Product created successfully"));
    console.log(`   Product ID: ${result.data.id}`);
    return result.data.id;
  } else {
    console.log(chalk.red("❌ Product creation failed:", result.error));
    return null;
  }
}

async function testVariantCreation(productId) {
  console.log(chalk.blue("\n🎨 Testing Product Variants Creation..."));

  const createdVariants = [];

  for (const variant of testConfig.variants) {
    const variantData = {
      ...variant,
      productId: productId,
    };

    const result = await makeRequest(
      "POST",
      `/products/${productId}/variants`,
      variantData,
      authToken
    );

    if (result.success) {
      console.log(chalk.green(`✅ Variant created: ${variant.name}`));
      console.log(`   Variant ID: ${result.data.id}`);
      createdVariants.push(result.data);
    } else {
      console.log(
        chalk.red(
          `❌ Variant creation failed for ${variant.name}:`,
          result.error
        )
      );
    }
  }

  return createdVariants;
}

async function testInventoryOperations(variants) {
  console.log(chalk.blue("\n📊 Testing Inventory Operations..."));

  if (variants.length === 0) {
    console.log(chalk.yellow("⚠️ No variants available for inventory testing"));
    return;
  }

  const variant = variants[0];

  // Test stock adjustment
  console.log(chalk.cyan("  Testing stock adjustment..."));
  const adjustResult = await makeRequest(
    "POST",
    `/products/variants/${variant.id}/inventory/adjust`,
    {
      quantity: 25,
      type: "increase",
      reason: "Test stock increase",
      notes: "Automated test adjustment",
    },
    authToken
  );

  if (adjustResult.success) {
    console.log(chalk.green("  ✅ Stock adjustment successful"));
  } else {
    console.log(chalk.red("  ❌ Stock adjustment failed:", adjustResult.error));
  }

  // Test stock reservation
  console.log(chalk.cyan("  Testing stock reservation..."));
  const reserveResult = await makeRequest(
    "POST",
    `/products/variants/${variant.id}/inventory/reserve`,
    {
      quantity: 5,
      orderId: "TEST-ORDER-001",
      customerId: "TEST-CUSTOMER-001",
    },
    authToken
  );

  if (reserveResult.success) {
    console.log(chalk.green("  ✅ Stock reservation successful"));
    console.log(`     Reservation ID: ${reserveResult.data.id}`);

    // Test reservation release
    console.log(chalk.cyan("  Testing reservation release..."));
    const releaseResult = await makeRequest(
      "POST",
      `/products/inventory/reservations/${reserveResult.data.id}/release`,
      {},
      authToken
    );

    if (releaseResult.success) {
      console.log(chalk.green("  ✅ Reservation release successful"));
    } else {
      console.log(
        chalk.red("  ❌ Reservation release failed:", releaseResult.error)
      );
    }
  } else {
    console.log(
      chalk.red("  ❌ Stock reservation failed:", reserveResult.error)
    );
  }
}

async function testLowStockAlert(variants) {
  console.log(chalk.blue("\n⚠️ Testing Low Stock Alerts..."));

  const result = await makeRequest(
    "GET",
    "/products/inventory/low-stock?threshold=80",
    null,
    authToken
  );

  if (result.success) {
    console.log(chalk.green("✅ Low stock alert check successful"));
    console.log(`   Found ${result.data.length} products with low stock`);

    if (result.data.length > 0) {
      result.data.forEach((item) => {
        console.log(
          `   - ${item.name}: ${item.currentStock} units (threshold: ${item.threshold})`
        );
      });
    }
  } else {
    console.log(chalk.red("❌ Low stock alert check failed:", result.error));
  }
}

async function testInventoryMovementHistory(variants) {
  console.log(chalk.blue("\n📜 Testing Inventory Movement History..."));

  if (variants.length === 0) {
    console.log(chalk.yellow("⚠️ No variants available for history testing"));
    return;
  }

  const variant = variants[0];
  const result = await makeRequest(
    "GET",
    `/products/variants/${variant.id}/inventory/movements`,
    null,
    authToken
  );

  if (result.success) {
    console.log(chalk.green("✅ Inventory movement history retrieved"));
    console.log(`   Found ${result.data.length} movements`);

    if (result.data.length > 0) {
      result.data.slice(0, 3).forEach((movement) => {
        console.log(
          `   - ${movement.type}: ${movement.quantity} units (${movement.reason})`
        );
      });
    }
  } else {
    console.log(
      chalk.red("❌ Inventory movement history failed:", result.error)
    );
  }
}

async function testBulkOperations(productId, variants) {
  console.log(chalk.blue("\n📋 Testing Bulk Operations..."));

  // Test bulk price update
  console.log(chalk.cyan("  Testing bulk price update..."));
  const priceUpdateData = {
    variants: variants.map((v) => ({
      id: v.id,
      price: v.price * 1.1, // 10% increase
    })),
  };

  const priceResult = await makeRequest(
    "PUT",
    `/products/${productId}/variants/bulk/price`,
    priceUpdateData,
    authToken
  );

  if (priceResult.success) {
    console.log(chalk.green("  ✅ Bulk price update successful"));
  } else {
    console.log(chalk.red("  ❌ Bulk price update failed:", priceResult.error));
  }

  // Test bulk stock update
  console.log(chalk.cyan("  Testing bulk stock update..."));
  const stockUpdateData = {
    variants: variants.map((v) => ({
      id: v.id,
      stock: v.stock + 10,
    })),
  };

  const stockResult = await makeRequest(
    "PUT",
    `/products/${productId}/variants/bulk/stock`,
    stockUpdateData,
    authToken
  );

  if (stockResult.success) {
    console.log(chalk.green("  ✅ Bulk stock update successful"));
  } else {
    console.log(chalk.red("  ❌ Bulk stock update failed:", stockResult.error));
  }
}

async function testProductVariantsRetrieval(productId) {
  console.log(chalk.blue("\n🔍 Testing Product Variants Retrieval..."));

  const result = await makeRequest(
    "GET",
    `/products/${productId}/variants`,
    null,
    authToken
  );

  if (result.success) {
    console.log(chalk.green("✅ Product variants retrieved successfully"));
    console.log(`   Found ${result.data.length} variants`);

    result.data.forEach((variant) => {
      console.log(
        `   - ${variant.name}: ${variant.currentStock} units at $${variant.price}`
      );
    });

    return result.data;
  } else {
    console.log(
      chalk.red("❌ Product variants retrieval failed:", result.error)
    );
    return [];
  }
}

async function runComprehensiveTest() {
  console.log(
    chalk.bold.blue(
      "🚀 Starting Comprehensive Product Variants & Inventory Test\n"
    )
  );

  // Step 1: Authentication
  const authSuccess = await authenticate();
  if (!authSuccess) {
    console.log(chalk.red("❌ Test aborted due to authentication failure"));
    return;
  }

  // Step 2: Create base product
  const productId = await testProductCreation();
  if (!productId) {
    console.log(chalk.red("❌ Test aborted due to product creation failure"));
    return;
  }

  // Step 3: Create product variants
  const variants = await testVariantCreation(productId);

  // Step 4: Test inventory operations
  await testInventoryOperations(variants);

  // Step 5: Test low stock alerts
  await testLowStockAlert(variants);

  // Step 6: Test inventory movement history
  await testInventoryMovementHistory(variants);

  // Step 7: Test bulk operations
  await testBulkOperations(productId, variants);

  // Step 8: Test product variants retrieval (to see final state)
  const finalVariants = await testProductVariantsRetrieval(productId);

  console.log(chalk.bold.green("\n✅ Comprehensive test completed!"));
  console.log(chalk.blue(`📊 Test Summary:`));
  console.log(`   - Product ID: ${productId}`);
  console.log(`   - Variants Created: ${variants.length}`);
  console.log(`   - Final Variants Count: ${finalVariants.length}`);
}

// Run the test
runComprehensiveTest().catch((error) => {
  console.error(chalk.red("❌ Test failed with error:"), error.message);
  process.exit(1);
});
