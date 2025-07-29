#!/usr/bin/env node

/**
 * VPS PDF Access Diagnostic Script
 * Diagnoses PDF 404 issues on VPS deployment
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

console.log("=== VPS PDF ACCESS DIAGNOSTIC ===\n");

// Extract filename from the provided URL
const testPdfUrl =
  "https://yarukai.com/shipping/shipping_slip_92de620d-a52c-4f3a-9724-d4820a1dd463_1753787639585.pdf";
const filename = path.basename(testPdfUrl);

console.log("Testing PDF:", filename);
console.log("Full URL:", testPdfUrl);
console.log("");

// 1. Check if we're running on VPS or local
function detectEnvironment() {
  console.log("1. ENVIRONMENT DETECTION");
  console.log("========================");

  const hostname = require("os").hostname();
  const isVPS =
    hostname.includes("yarukai") || process.env.NODE_ENV === "production";

  console.log("Hostname:", hostname);
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("Is VPS:", isVPS);
  console.log("");

  return isVPS;
}

// 2. Check shipping directory and permissions
function checkShippingDirectory() {
  console.log("2. SHIPPING DIRECTORY CHECK");
  console.log("===========================");

  const possiblePaths = [
    path.join(__dirname, "server", "public", "shipping"),
    path.join(__dirname, "public", "shipping"),
    path.join(process.cwd(), "server", "public", "shipping"),
    path.join(process.cwd(), "public", "shipping"),
    "/var/www/html/pazar/server/public/shipping",
    "/var/www/html/server/public/shipping",
    "/home/pazar/server/public/shipping",
  ];

  let shippingDir = null;

  for (const dirPath of possiblePaths) {
    console.log(`Checking: ${dirPath}`);

    if (fs.existsSync(dirPath)) {
      const stats = fs.statSync(dirPath);
      const permissions = (stats.mode & parseInt("777", 8)).toString(8);

      console.log(`  ✅ EXISTS - Permissions: ${permissions}`);

      // Check if it's readable and has files
      try {
        const files = fs.readdirSync(dirPath);
        console.log(`  📁 Files: ${files.length} total`);

        if (files.length > 0) {
          console.log(`  📄 Recent files: ${files.slice(-3).join(", ")}`);
        }

        // Check for the specific file
        if (files.includes(filename)) {
          console.log(`  🎯 TARGET FILE FOUND: ${filename}`);

          const filePath = path.join(dirPath, filename);
          const fileStats = fs.statSync(filePath);
          const filePerms = (fileStats.mode & parseInt("777", 8)).toString(8);

          console.log(`  📄 File size: ${fileStats.size} bytes`);
          console.log(`  🔒 File permissions: ${filePerms}`);
          console.log(`  🕒 File modified: ${fileStats.mtime}`);
        }

        shippingDir = dirPath;
        break;
      } catch (error) {
        console.log(`  ❌ Cannot read directory: ${error.message}`);
      }
    } else {
      console.log("  ❌ Does not exist");
    }
  }

  console.log("");
  return shippingDir;
}

// 3. Check Express static serving configuration
function checkExpressConfig() {
  console.log("3. EXPRESS STATIC SERVING CHECK");
  console.log("===============================");

  try {
    const appPath = path.join(__dirname, "server", "app.js");

    if (fs.existsSync(appPath)) {
      const appContent = fs.readFileSync(appPath, "utf8");

      // Check for shipping route configuration
      const shippingRoutes = appContent.match(
        /app\.use\(['"`]\/shipping['"`][^;]+/g
      );

      if (shippingRoutes) {
        console.log("📋 Express shipping routes found:");
        shippingRoutes.forEach((route) => {
          console.log(`  ${route}`);
        });
      } else {
        console.log("❌ No shipping routes found in app.js");
      }

      // Check for static middleware
      const staticMiddleware = appContent.match(/express\.static\([^)]+\)/g);

      if (staticMiddleware) {
        console.log("📋 Express static middleware found:");
        staticMiddleware.forEach((middleware) => {
          console.log(`  ${middleware}`);
        });
      }
    } else {
      console.log("❌ app.js not found at expected location");
    }
  } catch (error) {
    console.log("❌ Error checking Express config:", error.message);
  }

  console.log("");
}

// 4. Test HTTP access
async function testHttpAccess() {
  console.log("4. HTTP ACCESS TEST");
  console.log("==================");

  return new Promise((resolve) => {
    const url = new URL(testPdfUrl);
    const client = url.protocol === "https:" ? https : http;

    console.log(`Testing: ${testPdfUrl}`);

    const req = client.request(
      url,
      {
        method: "HEAD", // Use HEAD to avoid downloading the file
        timeout: 10000,
      },
      (res) => {
        console.log(`Response Status: ${res.statusCode} ${res.statusMessage}`);
        console.log("Response Headers:");

        Object.entries(res.headers).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });

        if (res.statusCode === 200) {
          console.log("✅ PDF is accessible via HTTP");
        } else if (res.statusCode === 404) {
          console.log("❌ PDF returns 404 - Not Found");
        } else {
          console.log(`⚠️  Unexpected status code: ${res.statusCode}`);
        }

        resolve(res.statusCode);
      }
    );

    req.on("error", (error) => {
      console.log("❌ HTTP request failed:", error.message);
      resolve(null);
    });

    req.on("timeout", () => {
      console.log("❌ HTTP request timed out");
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

// 5. Generate test PDF and check access
async function generateTestPdf() {
  console.log("5. TEST PDF GENERATION");
  console.log("======================");

  try {
    // Simple test PDF generation
    const testFileName = `test_pdf_${Date.now()}.pdf`;

    // Try to find the PDF generator
    const generatorPath = path.join(
      __dirname,
      "server",
      "services",
      "templateBasedPdfGenerator.js"
    );

    if (fs.existsSync(generatorPath)) {
      console.log("📄 PDF generator found, creating test PDF...");

      // Create a simple test file instead of using the complex generator
      const shippingDir = checkShippingDirectory();

      if (shippingDir) {
        const testFilePath = path.join(shippingDir, testFileName);

        // Create a simple text file to test static serving
        fs.writeFileSync(testFilePath, "TEST PDF CONTENT");

        console.log(`✅ Test file created: ${testFilePath}`);

        // Test access via HTTP
        const testUrl = `https://yarukai.com/shipping/${testFileName}`;
        console.log(`🌐 Testing access: ${testUrl}`);

        // Give a moment for the file system to sync
        setTimeout(async () => {
          const testResult = await testHttpAccess(testUrl);

          if (testResult === 200) {
            console.log("✅ Static file serving is working");
          } else {
            console.log("❌ Static file serving has issues");
          }

          // Clean up test file
          try {
            fs.unlinkSync(testFilePath);
            console.log("🧹 Test file cleaned up");
          } catch (err) {
            console.log("⚠️  Could not clean up test file:", err.message);
          }
        }, 1000);
      } else {
        console.log("❌ Could not find shipping directory for test");
      }
    } else {
      console.log("❌ PDF generator not found");
    }
  } catch (error) {
    console.log("❌ Test PDF generation failed:", error.message);
  }
}

// 6. Check nginx configuration (if accessible)
function checkNginxConfig() {
  console.log("6. NGINX CONFIGURATION CHECK");
  console.log("============================");

  const nginxPaths = [
    "/etc/nginx/sites-available/default",
    "/etc/nginx/sites-available/yarukai.com",
    "/etc/nginx/nginx.conf",
    "/etc/nginx/conf.d/default.conf",
  ];

  for (const configPath of nginxPaths) {
    if (fs.existsSync(configPath)) {
      console.log(`📋 Found nginx config: ${configPath}`);

      try {
        const content = fs.readFileSync(configPath, "utf8");

        // Look for location blocks
        const locationBlocks = content.match(/location\s+[^{]+\{[^}]+\}/g);

        if (locationBlocks) {
          console.log("📍 Location blocks found:");
          locationBlocks.forEach((block) => {
            if (
              block.includes("/shipping") ||
              block.includes("static") ||
              block.includes("pdf")
            ) {
              console.log(`  ${block.split("\n")[0]}...`);
            }
          });
        }
      } catch (error) {
        console.log(`  ❌ Cannot read config: ${error.message}`);
      }
    }
  }

  console.log("");
}

// Main diagnostic function
async function runDiagnostic() {
  console.log("Starting VPS PDF diagnostic...\n");

  const isVPS = detectEnvironment();
  const shippingDir = checkShippingDirectory();

  checkExpressConfig();

  await testHttpAccess();

  if (isVPS) {
    checkNginxConfig();
  }

  // await generateTestPdf();

  console.log("\n=== DIAGNOSTIC SUMMARY ===");
  console.log("Environment:", isVPS ? "VPS" : "Local");
  console.log("Shipping Directory:", shippingDir || "NOT FOUND");
  console.log("Target File:", filename);
  console.log("Test URL:", testPdfUrl);

  console.log("\n=== RECOMMENDATIONS ===");

  if (!shippingDir) {
    console.log("1. ❌ Shipping directory not found - create it:");
    console.log("   mkdir -p /var/www/html/pazar/server/public/shipping");
    console.log("   chmod 755 /var/www/html/pazar/server/public/shipping");
  }

  console.log("2. 🔧 Check file permissions:");
  console.log(
    "   sudo chown -R www-data:www-data /var/www/html/pazar/server/public/shipping"
  );
  console.log(
    "   sudo chmod -R 755 /var/www/html/pazar/server/public/shipping"
  );

  console.log("3. 🔄 Restart services:");
  console.log("   sudo systemctl restart nginx");
  console.log("   sudo pm2 restart all");

  console.log("4. 📋 Check logs:");
  console.log("   sudo tail -f /var/log/nginx/error.log");
  console.log("   pm2 logs");
}

// Run the diagnostic
runDiagnostic().catch(console.error);
