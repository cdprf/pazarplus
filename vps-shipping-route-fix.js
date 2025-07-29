#!/usr/bin/env node

/**
 * VPS Shipping Route Fix
 * Fixes missing /shipping static route on VPS
 */

const fs = require("fs");
const path = require("path");

console.log("🔧 VPS SHIPPING ROUTE FIX");
console.log("========================\n");

function findServerFile() {
  console.log("1. FINDING SERVER FILE");
  console.log("---------------------");

  const possiblePaths = [
    path.join(process.cwd(), "server.js"),
    path.join(process.cwd(), "server", "server.js"),
    path.join(process.cwd(), "app.js"),
    path.join(process.cwd(), "server", "app.js"),
    path.join(process.cwd(), "index.js"),
    path.join(process.cwd(), "main.js"),
  ];

  for (const serverPath of possiblePaths) {
    console.log(`Checking: ${serverPath}`);

    if (fs.existsSync(serverPath)) {
      console.log(`✅ Found server file: ${serverPath}`);
      return serverPath;
    } else {
      console.log("❌ Not found");
    }
  }

  console.log("\n❌ No server file found!");
  return null;
}

function checkShippingRoute(serverPath) {
  console.log("\n2. CHECKING SHIPPING ROUTE");
  console.log("--------------------------");

  const content = fs.readFileSync(serverPath, "utf8");

  const hasShippingRoute =
    content.includes("/shipping") && content.includes("express.static");
  const hasAppUse = content.includes("app.use");

  console.log("Has /shipping route:", hasShippingRoute ? "✅" : "❌");
  console.log("Has app.use statements:", hasAppUse ? "✅" : "❌");

  if (hasShippingRoute) {
    console.log("✅ Shipping route already exists");

    // Extract the shipping route
    const shippingRouteMatch = content.match(
      /app\.use\(['"`]\/shipping['"`][^;]+;/g
    );
    if (shippingRouteMatch) {
      console.log("Current shipping route:");
      shippingRouteMatch.forEach((route) => {
        console.log(`  ${route}`);
      });
    }

    return true;
  }

  return false;
}

function addShippingRoute(serverPath) {
  console.log("\n3. ADDING SHIPPING ROUTE");
  console.log("------------------------");

  const content = fs.readFileSync(serverPath, "utf8");

  // Find where to insert the shipping route
  // Look for existing static routes or app.use statements
  const lines = content.split("\n");
  let insertIndex = -1;

  // Look for existing static routes or middleware
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for other static routes or middleware setup
    if (
      line.includes("app.use") &&
      (line.includes("express.static") ||
        line.includes("cors") ||
        line.includes("helmet"))
    ) {
      insertIndex = i + 1;
    }

    // If we find the routes import/setup, insert before it
    if (
      line.includes("app.use") &&
      (line.includes("routes") || line.includes("/api"))
    ) {
      if (insertIndex === -1) {
        insertIndex = i;
      }
      break;
    }
  }

  // If no good insertion point found, try to find app declaration
  if (insertIndex === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("= express()") || lines[i].includes("express()")) {
        insertIndex = i + 5; // Insert a few lines after app creation
        break;
      }
    }
  }

  if (insertIndex === -1) {
    console.log("❌ Could not find suitable insertion point");
    console.log("Manual addition required. Add this code to your server file:");
    console.log("");
    console.log("// Serve shipping PDFs statically");
    console.log('const path = require("path");');
    console.log(
      'app.use("/shipping", express.static(path.join(__dirname, "public", "shipping")));'
    );
    console.log("");
    return false;
  }

  // Prepare the shipping route code
  const shippingRouteCode = [
    "",
    "// Serve shipping PDFs statically with proper headers",
    'const path = require("path");',
    'app.use("/shipping", (req, res, next) => {',
    '  if (req.path.endsWith(".pdf")) {',
    '    res.setHeader("Content-Type", "application/pdf; charset=utf-8");',
    '    res.setHeader("Content-Disposition", "inline");',
    '    res.setHeader("Accept-Ranges", "bytes");',
    '    res.setHeader("Cache-Control", "public, max-age=3600");',
    "  }",
    "  next();",
    "});",
    'app.use("/shipping", express.static(path.join(__dirname, "public", "shipping")));',
    'console.log("📄 Shipping PDFs available at /shipping/");',
    "",
  ];

  // Insert the code
  lines.splice(insertIndex, 0, ...shippingRouteCode);

  const newContent = lines.join("\n");

  // Create backup
  const backupPath = `${serverPath}.backup.${Date.now()}`;
  fs.writeFileSync(backupPath, content);
  console.log(`📋 Backup created: ${backupPath}`);

  // Write the new content
  fs.writeFileSync(serverPath, newContent);
  console.log("✅ Shipping route added successfully");

  return true;
}

function verifyShippingDirectory() {
  console.log("\n4. VERIFYING SHIPPING DIRECTORY");
  console.log("-------------------------------");

  const shippingDir = path.join(process.cwd(), "server", "public", "shipping");

  console.log(`Checking: ${shippingDir}`);

  if (!fs.existsSync(shippingDir)) {
    console.log("❌ Shipping directory not found, creating...");

    try {
      fs.mkdirSync(shippingDir, { recursive: true });
      console.log("✅ Shipping directory created");
    } catch (error) {
      console.log("❌ Failed to create shipping directory:", error.message);
      return false;
    }
  } else {
    console.log("✅ Shipping directory exists");
  }

  // Check permissions
  try {
    const stats = fs.statSync(shippingDir);
    const permissions = (stats.mode & parseInt("777", 8)).toString(8);
    console.log(`📁 Directory permissions: ${permissions}`);

    // List files
    const files = fs.readdirSync(shippingDir);
    console.log(`📄 Files in directory: ${files.length}`);

    if (files.length > 0) {
      console.log("Recent files:");
      files.slice(-3).forEach((file) => {
        console.log(`  - ${file}`);
      });
    }
  } catch (error) {
    console.log("❌ Cannot access shipping directory:", error.message);
    return false;
  }

  return true;
}

function createTestFile() {
  console.log("\n5. CREATING TEST FILE");
  console.log("--------------------");

  const shippingDir = path.join(process.cwd(), "server", "public", "shipping");
  const testFile = path.join(shippingDir, "test-route-fix.txt");

  try {
    fs.writeFileSync(
      testFile,
      `Test file created at ${new Date().toISOString()}\nIf you can access this file via HTTP, the shipping route is working!`
    );
    console.log(`✅ Test file created: ${testFile}`);
    console.log("🌐 Test URL: https://yarukai.com/shipping/test-route-fix.txt");
    console.log("");
    console.log("After restarting your server, this URL should work!");

    return true;
  } catch (error) {
    console.log("❌ Failed to create test file:", error.message);
    return false;
  }
}

function showRestartInstructions() {
  console.log("\n6. RESTART INSTRUCTIONS");
  console.log("=======================");

  console.log("🔄 To apply the changes, restart your server:");
  console.log("");
  console.log("For PM2:");
  console.log("  pm2 restart all");
  console.log("  # or specific app:");
  console.log("  pm2 restart pazar-plus");
  console.log("");
  console.log("For systemd service:");
  console.log("  sudo systemctl restart pazar-plus");
  console.log("");
  console.log("For manual process:");
  console.log("  # Stop current process and restart");
  console.log("  node server.js");
  console.log("");

  console.log("📊 Check if it's working:");
  console.log("  curl -I https://yarukai.com/shipping/test-route-fix.txt");
  console.log("  # Should return 200 OK, not 404");
}

function main() {
  console.log("Starting VPS shipping route fix...\n");

  // Step 1: Find server file
  const serverPath = findServerFile();
  if (!serverPath) {
    console.log("\n❌ CRITICAL: Could not find server file");
    console.log(
      "Please manually add the shipping route to your main server file"
    );
    return;
  }

  // Step 2: Check if shipping route exists
  const hasRoute = checkShippingRoute(serverPath);

  // Step 3: Add shipping route if missing
  if (!hasRoute) {
    const added = addShippingRoute(serverPath);
    if (!added) {
      console.log("\n❌ Failed to add shipping route automatically");
      return;
    }
  }

  // Step 4: Verify shipping directory
  const dirOk = verifyShippingDirectory();
  if (!dirOk) {
    console.log("\n❌ Shipping directory issues");
    return;
  }

  // Step 5: Create test file
  createTestFile();

  // Step 6: Show restart instructions
  showRestartInstructions();

  console.log("\n✅ VPS SHIPPING ROUTE FIX COMPLETE!");
  console.log("===================================");
  console.log("");
  console.log("🎯 Key Actions Taken:");
  console.log("1. ✅ Located server file");
  console.log("2. ✅ Added/verified shipping route");
  console.log("3. ✅ Verified shipping directory");
  console.log("4. ✅ Created test file");
  console.log("");
  console.log("🔄 NEXT: Restart your server and test the URLs!");
}

// Run the fix
main();
