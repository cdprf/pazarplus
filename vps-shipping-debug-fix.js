#!/usr/bin/env node
/**
 * VPS Shipping Route Debug & Fix Script
 * This script will help diagnose and fix the shipping route issue on your VPS
 */

const fs = require("fs");
const path = require("path");

console.log("🔧 VPS SHIPPING ROUTE DEBUG & FIX");
console.log("===================================");

// 1. Check current directory structure
console.log("\n1. DIRECTORY STRUCTURE CHECK");
console.log("------------------------------");

const currentDir = process.cwd();
console.log(`Current directory: ${currentDir}`);

// Check for shipping directories
const possibleShippingPaths = [
  path.join(currentDir, "server", "public", "shipping"),
  path.join(currentDir, "public", "shipping"),
  path.join(
    currentDir,
    "server",
    "modules",
    "order-management",
    "public",
    "shipping"
  ),
  "/home/aj/pazar-plus/server/public/shipping",
  "/home/aj/pazar-plus/public/shipping",
];

console.log("\nChecking shipping directories:");
possibleShippingPaths.forEach((dirPath) => {
  const exists = fs.existsSync(dirPath);
  console.log(`${exists ? "✅" : "❌"} ${dirPath}`);

  if (exists) {
    try {
      const files = fs.readdirSync(dirPath);
      console.log(
        `   📁 Contains ${files.length} files: ${files.slice(0, 3).join(", ")}${
          files.length > 3 ? "..." : ""
        }`
      );
    } catch (err) {
      console.log(`   ❌ Error reading directory: ${err.message}`);
    }
  }
});

// 2. Check server files
console.log("\n2. SERVER FILE CHECK");
console.log("---------------------");

const serverFiles = [
  path.join(currentDir, "server.js"),
  path.join(currentDir, "server", "server.js"),
  path.join(currentDir, "server", "app.js"),
];

serverFiles.forEach((filePath) => {
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? "✅" : "❌"} ${filePath}`);
});

// 3. Create test shipping route verification
console.log("\n3. CREATING SHIPPING ROUTE TEST");
console.log("--------------------------------");

const testScript = `
const express = require('express');
const path = require('path');
const fs = require('fs');

// Test shipping route configuration
const app = express();

// Test different shipping paths
const testPaths = [
  path.join(__dirname, 'server', 'public', 'shipping'),
  path.join(__dirname, 'public', 'shipping'),
  '/home/aj/pazar-plus/server/public/shipping'
];

console.log('Testing shipping paths:');
testPaths.forEach((testPath, index) => {
  const exists = fs.existsSync(testPath);
  console.log(\`Path \${index + 1}: \${testPath} - \${exists ? 'EXISTS' : 'NOT FOUND'}\`);
  
  if (exists) {
    try {
      const files = fs.readdirSync(testPath);
      console.log(\`  Files: \${files.length} found\`);
      
      // Configure shipping route for this path
      app.use(\`/shipping-test-\${index + 1}\`, express.static(testPath));
      console.log(\`  ✅ Configured route: /shipping-test-\${index + 1}\`);
    } catch (err) {
      console.log(\`  ❌ Error: \${err.message}\`);
    }
  }
});

// Start test server
const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(\`\\n🚀 Test server running on port \${PORT}\`);
  console.log('Test URLs:');
  testPaths.forEach((testPath, index) => {
    if (fs.existsSync(testPath)) {
      console.log(\`  http://localhost:\${PORT}/shipping-test-\${index + 1}/\`);
    }
  });
  console.log('\\nPress Ctrl+C to stop');
});
`;

const testFilePath = path.join(currentDir, "shipping-route-test.js");
fs.writeFileSync(testFilePath, testScript);
console.log(`✅ Created test script: ${testFilePath}`);

// 4. Check if app.js has shipping route
console.log("\n4. CHECKING APP.JS SHIPPING ROUTE");
console.log("-----------------------------------");

const appJsPath = path.join(currentDir, "server", "app.js");
if (fs.existsSync(appJsPath)) {
  try {
    const appJsContent = fs.readFileSync(appJsPath, "utf8");
    const hasShippingRoute = appJsContent.includes('app.use("/shipping"');
    const hasStaticShipping =
      appJsContent.includes("express.static") &&
      appJsContent.includes("shipping");

    console.log(`✅ app.js exists`);
    console.log(`${hasShippingRoute ? "✅" : "❌"} Has /shipping route`);
    console.log(
      `${hasStaticShipping ? "✅" : "❌"} Has static shipping configuration`
    );

    if (hasShippingRoute && hasStaticShipping) {
      console.log("🎉 Shipping route is already configured in app.js!");
      console.log("Issue is likely path-related, not missing route.");
    }
  } catch (err) {
    console.log(`❌ Error reading app.js: ${err.message}`);
  }
} else {
  console.log("❌ app.js not found");
}

// 5. Create shipping directory if needed
console.log("\n5. ENSURING SHIPPING DIRECTORY EXISTS");
console.log("---------------------------------------");

const preferredShippingPath = path.join(
  currentDir,
  "server",
  "public",
  "shipping"
);
if (!fs.existsSync(preferredShippingPath)) {
  try {
    fs.mkdirSync(preferredShippingPath, { recursive: true });
    console.log(`✅ Created shipping directory: ${preferredShippingPath}`);
  } catch (err) {
    console.log(`❌ Failed to create shipping directory: ${err.message}`);
  }
} else {
  console.log(`✅ Shipping directory exists: ${preferredShippingPath}`);
}

// 6. Create test PDF
console.log("\n6. CREATING TEST PDF");
console.log("---------------------");

const testPdfContent = Buffer.from(
  "%PDF-1.4\\n1 0 obj\\n<<\\n/Type /Catalog\\n/Pages 2 0 R\\n>>\\nendobj\\n2 0 obj\\n<<\\n/Type /Pages\\n/Kids [3 0 R]\\n/Count 1\\n>>\\nendobj\\n3 0 obj\\n<<\\n/Type /Page\\n/Parent 2 0 R\\n/MediaBox [0 0 612 792]\\n>>\\nendobj\\nxref\\n0 4\\n0000000000 65535 f \\n0000000009 00000 n \\n0000000058 00000 n \\n0000000115 00000 n \\ntrailer\\n<<\\n/Size 4\\n/Root 1 0 R\\n>>\\nstartxref\\n174\\n%%EOF"
);

const testPdfPath = path.join(preferredShippingPath, "test-shipping.pdf");
try {
  fs.writeFileSync(testPdfPath, testPdfContent);
  console.log(`✅ Created test PDF: ${testPdfPath}`);
} catch (err) {
  console.log(`❌ Failed to create test PDF: ${err.message}`);
}

console.log("\n🎯 NEXT STEPS:");
console.log("===============");
console.log("1. Run the test server: node shipping-route-test.js");
console.log("2. Test the shipping route in your browser");
console.log("3. Check if your main app.js is being used correctly");
console.log("4. Restart your main server after confirming paths");
console.log("\\n🔗 Test URL (if server running on yarukai.com):");
console.log("   https://yarukai.com/shipping/test-shipping.pdf");
