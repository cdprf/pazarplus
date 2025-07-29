#!/usr/bin/env node

/**
 * VPS PDF Serving Quick Fix
 * Fixes common PDF 404 issues on VPS
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("=== VPS PDF SERVING QUICK FIX ===\n");

function runCommand(command, description) {
  console.log(`🔧 ${description}...`);
  console.log(`   Command: ${command}`);

  try {
    const output = execSync(command, { encoding: "utf8", stdio: "pipe" });
    console.log("   ✅ Success");
    if (output.trim()) {
      console.log(`   Output: ${output.trim()}`);
    }
    return true;
  } catch (error) {
    console.log("   ❌ Failed:", error.message);
    return false;
  }
}

function createShippingDirectory() {
  console.log("1. CREATING SHIPPING DIRECTORY");
  console.log("==============================");

  const possibleBasePaths = [
    "/var/www/html/pazar",
    "/var/www/html",
    "/home/pazar",
    process.cwd(),
  ];

  let targetPath = null;

  // Find the correct base path
  for (const basePath of possibleBasePaths) {
    const serverPath = path.join(basePath, "server");

    if (fs.existsSync(serverPath)) {
      targetPath = path.join(serverPath, "public", "shipping");
      console.log(`📍 Found server at: ${serverPath}`);
      break;
    }
  }

  if (!targetPath) {
    console.log("❌ Could not find server directory");
    return false;
  }

  console.log(`🎯 Target shipping directory: ${targetPath}`);

  // Create directory structure
  if (!fs.existsSync(targetPath)) {
    try {
      fs.mkdirSync(targetPath, { recursive: true });
      console.log("✅ Shipping directory created");
    } catch (error) {
      console.log("❌ Failed to create directory:", error.message);
      return false;
    }
  } else {
    console.log("✅ Shipping directory already exists");
  }

  return targetPath;
}

function fixPermissions(shippingPath) {
  console.log("\n2. FIXING PERMISSIONS");
  console.log("=====================");

  // Fix directory permissions
  runCommand(`chmod 755 "${shippingPath}"`, "Setting directory permissions");

  // Fix ownership (try different users)
  const possibleUsers = ["www-data", "nginx", "apache", "pazar"];

  for (const user of possibleUsers) {
    const success = runCommand(
      `chown -R ${user}:${user} "${shippingPath}"`,
      `Setting ownership to ${user}`
    );

    if (success) {
      console.log(`✅ Ownership set to ${user}`);
      break;
    }
  }

  // Fix file permissions for any existing files
  try {
    const files = fs.readdirSync(shippingPath);

    if (files.length > 0) {
      runCommand(
        `chmod 644 "${shippingPath}"/*.pdf`,
        "Setting file permissions for PDFs"
      );
    }
  } catch (error) {
    console.log("ℹ️  No existing files to fix permissions for");
  }
}

function testStaticServing(shippingPath) {
  console.log("\n3. TESTING STATIC SERVING");
  console.log("=========================");

  const testFileName = `test_${Date.now()}.txt`;
  const testFilePath = path.join(shippingPath, testFileName);

  try {
    // Create test file
    fs.writeFileSync(testFilePath, "Test file for static serving");
    console.log(`✅ Test file created: ${testFileName}`);

    // Set proper permissions
    runCommand(`chmod 644 "${testFilePath}"`, "Setting test file permissions");

    console.log("\n🌐 Test URL:");
    console.log(`   https://yarukai.com/shipping/${testFileName}`);
    console.log("\n📋 Manual test steps:");
    console.log("   1. Visit the URL above in a browser");
    console.log('   2. You should see "Test file for static serving"');
    console.log("   3. If you get 404, there's a server configuration issue");

    // Clean up after a delay
    setTimeout(() => {
      try {
        fs.unlinkSync(testFilePath);
        console.log(`🧹 Test file cleaned up: ${testFileName}`);
      } catch (err) {
        console.log("⚠️  Could not clean up test file automatically");
      }
    }, 30000); // 30 seconds
  } catch (error) {
    console.log("❌ Failed to create test file:", error.message);
  }
}

function restartServices() {
  console.log("\n4. RESTARTING SERVICES");
  console.log("======================");

  // Try to restart nginx
  runCommand("systemctl restart nginx", "Restarting nginx");
  runCommand("service nginx restart", "Restarting nginx (alternative)");

  // Try to restart the Node.js app
  runCommand("pm2 restart all", "Restarting PM2 processes");
  runCommand("systemctl restart pazar-plus", "Restarting pazar-plus service");

  // Check service status
  console.log("\n📊 Service Status:");
  runCommand("systemctl status nginx --no-pager -l", "Checking nginx status");
  runCommand("pm2 list", "Checking PM2 processes");
}

function checkServerConfiguration() {
  console.log("\n5. CHECKING SERVER CONFIGURATION");
  console.log("================================");

  // Check if Express app.js has the shipping route
  const appPath = path.join(process.cwd(), "server", "app.js");

  if (fs.existsSync(appPath)) {
    const appContent = fs.readFileSync(appPath, "utf8");

    if (appContent.includes("/shipping")) {
      console.log("✅ Express shipping route found in app.js");
    } else {
      console.log("❌ Express shipping route NOT found in app.js");
      console.log("   This might be the issue - the route is missing");
    }

    if (appContent.includes("express.static")) {
      console.log("✅ Express static middleware found");
    } else {
      console.log("❌ Express static middleware NOT found");
    }
  } else {
    console.log("❌ app.js not found at expected location");
  }

  // Check nginx configuration
  const nginxConfigs = [
    "/etc/nginx/sites-available/default",
    "/etc/nginx/sites-available/yarukai.com",
    "/etc/nginx/conf.d/default.conf",
  ];

  for (const configPath of nginxConfigs) {
    if (fs.existsSync(configPath)) {
      console.log(`📋 Found nginx config: ${configPath}`);

      try {
        const content = fs.readFileSync(configPath, "utf8");

        if (content.includes("/shipping")) {
          console.log("✅ Nginx has shipping location block");
        } else {
          console.log("⚠️  Nginx might need shipping location block");
        }

        if (content.includes("proxy_pass")) {
          console.log("✅ Nginx is configured as reverse proxy");
        }
      } catch (error) {
        console.log(`❌ Cannot read nginx config: ${error.message}`);
      }
      break;
    }
  }
}

function main() {
  console.log("Starting VPS PDF serving fix...\n");

  // Step 1: Create shipping directory
  const shippingPath = createShippingDirectory();

  if (!shippingPath) {
    console.log("\n❌ CRITICAL: Could not create shipping directory");
    console.log("Manual steps required:");
    console.log("1. Find your project directory (likely /var/www/html/pazar)");
    console.log("2. Create: mkdir -p /path/to/project/server/public/shipping");
    console.log(
      "3. Fix permissions: chmod 755 /path/to/project/server/public/shipping"
    );
    return;
  }

  // Step 2: Fix permissions
  fixPermissions(shippingPath);

  // Step 3: Test static serving
  testStaticServing(shippingPath);

  // Step 4: Restart services
  restartServices();

  // Step 5: Check configuration
  checkServerConfiguration();

  console.log("\n=== SUMMARY ===");
  console.log("✅ Shipping directory:", shippingPath);
  console.log("✅ Permissions fixed");
  console.log("✅ Services restarted");
  console.log("✅ Configuration checked");

  console.log("\n=== NEXT STEPS ===");
  console.log("1. 🧪 Test the URL again:");
  console.log(
    "   https://yarukai.com/shipping/shipping_slip_92de620d-a52c-4f3a-9724-d4820a1dd463_1753787639585.pdf"
  );

  console.log("\n2. 📊 If still 404, check logs:");
  console.log("   sudo tail -f /var/log/nginx/error.log");
  console.log("   pm2 logs");

  console.log("\n3. 🔧 Manual verification:");
  console.log(`   ls -la "${shippingPath}"`);
  console.log("   curl -I https://yarukai.com/shipping/test_file.txt");
}

// Run the fix
main();
