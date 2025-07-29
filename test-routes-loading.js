#!/usr/bin/env node

/**
 * Route Loading Test Script
 * Tests all route imports and identifies any loading issues
 */

const path = require("path");
const fs = require("fs");

console.log("🔍 Starting Route Loading Test...\n");

// Define routes directory
const routesDir = path.join(__dirname, "server", "routes");

// List of expected route files based on routes/index.js
const expectedRoutes = [
  "auth.js",
  "platformRoutes.js",
  "product-routes.js",
  "settingsRoutes.js",
  "complianceRoutes.js",
  "paymentRoutes.js",
  "customerRoutes.js",
  "customerQuestions.js",
  "importExportRoutes.js",
  "image-proxy.js",
  "network.js",
  "analytics.js",
  "subscription.js",
  "rate-limits.js",
  "shipping-templates.js",
  "database.js",
  "shipping.js",
  "sku.js",
];

// Test 1: Check if routes directory exists
console.log("📁 Test 1: Checking routes directory...");
if (!fs.existsSync(routesDir)) {
  console.error("❌ Routes directory not found:", routesDir);
  process.exit(1);
}
console.log("✅ Routes directory exists");

// Test 2: List all files in routes directory
console.log("\n📋 Test 2: Listing all route files...");
const routeFiles = fs
  .readdirSync(routesDir)
  .filter((file) => file.endsWith(".js"));
console.log("Found route files:", routeFiles);

// Test 3: Check for missing expected routes
console.log("\n🔍 Test 3: Checking for missing expected routes...");
const missingRoutes = expectedRoutes.filter(
  (route) => !routeFiles.includes(route)
);
if (missingRoutes.length > 0) {
  console.warn("⚠️  Missing expected routes:", missingRoutes);
} else {
  console.log("✅ All expected routes found");
}

// Test 4: Test individual route loading
console.log("\n🧪 Test 4: Testing individual route loading...");
const loadingResults = {};

for (const routeFile of expectedRoutes) {
  const routePath = path.join(routesDir, routeFile);

  try {
    if (!fs.existsSync(routePath)) {
      loadingResults[routeFile] = {
        status: "missing",
        error: "File not found",
      };
      continue;
    }

    // Check if file has basic syntax errors
    const content = fs.readFileSync(routePath, "utf8");

    // Basic syntax check - look for obvious issues
    if (!content.includes("module.exports") && !content.includes("exports.")) {
      loadingResults[routeFile] = {
        status: "warning",
        error: "No module.exports found",
      };
      continue;
    }

    // Try to require the module
    delete require.cache[require.resolve(routePath)];
    const routeModule = require(routePath);

    loadingResults[routeFile] = {
      status: "success",
      type: typeof routeModule,
      hasRouter: routeModule && typeof routeModule === "function",
    };
  } catch (error) {
    loadingResults[routeFile] = {
      status: "error",
      error: error.message,
      stack: error.stack,
    };
  }
}

// Test 5: Test main routes/index.js loading
console.log("\n🏠 Test 5: Testing main routes/index.js loading...");
const indexPath = path.join(routesDir, "index.js");

try {
  delete require.cache[require.resolve(indexPath)];
  const mainRoutes = require(indexPath);
  console.log("✅ Main routes/index.js loaded successfully");
  console.log("Type:", typeof mainRoutes);
} catch (error) {
  console.error("❌ Failed to load main routes/index.js:");
  console.error("Error:", error.message);
  console.error("Stack:", error.stack);
}

// Test 6: Test order-management module routes
console.log("\n📦 Test 6: Testing order-management module routes...");
const orderModulePath = path.join(
  __dirname,
  "server",
  "modules",
  "order-management",
  "routes"
);

try {
  if (fs.existsSync(orderModulePath)) {
    delete require.cache[require.resolve(orderModulePath)];
    const orderRoutes = require(orderModulePath);
    console.log("✅ Order management routes loaded successfully");
    console.log("Type:", typeof orderRoutes);
  } else {
    console.warn(
      "⚠️  Order management routes directory not found:",
      orderModulePath
    );
  }
} catch (error) {
  console.error("❌ Failed to load order management routes:");
  console.error("Error:", error.message);
}

// Display results
console.log("\n📊 Route Loading Results:");
console.log("=".repeat(50));

let successCount = 0;
let errorCount = 0;
let warningCount = 0;
let missingCount = 0;

for (const [route, result] of Object.entries(loadingResults)) {
  const icon =
    result.status === "success"
      ? "✅"
      : result.status === "error"
      ? "❌"
      : result.status === "warning"
      ? "⚠️ "
      : "🚫";

  console.log(`${icon} ${route}: ${result.status}`);

  if (result.error) {
    console.log(`   Error: ${result.error}`);
  }

  if (result.type) {
    console.log(`   Type: ${result.type}, Has Router: ${result.hasRouter}`);
  }

  // Count results
  switch (result.status) {
    case "success":
      successCount++;
      break;
    case "error":
      errorCount++;
      break;
    case "warning":
      warningCount++;
      break;
    case "missing":
      missingCount++;
      break;
  }
}

console.log("\n📈 Summary:");
console.log(`✅ Successful: ${successCount}`);
console.log(`❌ Errors: ${errorCount}`);
console.log(`⚠️  Warnings: ${warningCount}`);
console.log(`🚫 Missing: ${missingCount}`);

// Test 7: Check app.js for route mounting
console.log("\n🏗️  Test 7: Checking app.js route mounting...");
const appPath = path.join(__dirname, "server", "app.js");

try {
  const appContent = fs.readFileSync(appPath, "utf8");

  // Check for route mounting patterns
  const routeMountPattern = /app\.use\(['"]\/api['"], .*routes\)/;
  const hasRouteMount = routeMountPattern.test(appContent);

  if (hasRouteMount) {
    console.log("✅ Found route mounting in app.js");
  } else {
    console.warn("⚠️  No route mounting pattern found in app.js");
  }

  // Check for specific route imports
  if (appContent.includes('require("./routes")')) {
    console.log("✅ Routes import found in app.js");
  } else {
    console.warn("⚠️  No routes import found in app.js");
  }
} catch (error) {
  console.error("❌ Failed to read app.js:", error.message);
}

// Final recommendations
console.log("\n💡 Recommendations:");
if (errorCount > 0) {
  console.log(
    "🔧 Fix route loading errors first - these will prevent the server from starting"
  );
}
if (missingCount > 0) {
  console.log(
    "📁 Create missing route files or remove references from routes/index.js"
  );
}
if (warningCount > 0) {
  console.log("⚠️  Review warning routes - they may not export properly");
}

console.log("\n🏁 Route loading test completed!");

// Exit with appropriate code
const hasIssues = errorCount > 0 || missingCount > 0;
process.exit(hasIssues ? 1 : 0);
