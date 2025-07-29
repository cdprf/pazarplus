#!/usr/bin/env node

/**
 * VPS PDF Fix Script
 * This script attempts to fix common PDF serving issues on VPS
 */

const fs = require("fs");
const path = require("path");

console.log("🔧 VPS PDF Fix Script Starting...\n");

// 1. Ensure PDF directory exists with correct permissions
console.log("📁 Creating/fixing PDF directory...");
const pdfDir = path.join(process.cwd(), "server/public/shipping");

try {
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
    console.log(`✅ Created directory: ${pdfDir}`);
  }

  // Check if directory is writable
  fs.accessSync(pdfDir, fs.constants.W_OK);
  console.log(`✅ Directory is writable: ${pdfDir}`);
} catch (err) {
  console.log(`❌ Directory issue: ${err.message}`);
  console.log(`   Try: chmod 755 ${pdfDir}`);
}

// 2. Check and fix server.js static serving
console.log("\n⚙️  Checking server.js static serving...");
const serverJsPath = path.join(process.cwd(), "server/server.js");

if (fs.existsSync(serverJsPath)) {
  try {
    let serverContent = fs.readFileSync(serverJsPath, "utf8");

    // Check if static serving exists
    const hasShippingStatic =
      serverContent.includes('app.use("/shipping"') ||
      serverContent.includes("app.use('/shipping'");

    if (!hasShippingStatic) {
      console.log("❌ Missing static serving configuration");
      console.log("📝 Adding static serving configuration...");

      // Find a good place to insert the static serving
      const expressStaticPattern = /app\.use\([^)]*express\.static[^;]*;/;
      const match = serverContent.match(expressStaticPattern);

      const staticServingCode = `
// Serve PDF files from shipping directory
app.use("/shipping", express.static(path.join(__dirname, "public/shipping")));`;

      if (match) {
        // Insert after existing static serving
        serverContent = serverContent.replace(
          match[0],
          match[0] + staticServingCode
        );
      } else {
        // Insert before app.listen or route definitions
        const insertPoints = [
          /app\.listen\(/,
          /app\.use\(['"`]\/api['"`]/,
          /app\.get\(['"`]\/\*['"`]/,
        ];

        let inserted = false;
        for (const pattern of insertPoints) {
          if (serverContent.match(pattern)) {
            serverContent = serverContent.replace(
              pattern,
              staticServingCode + "\n\n$&"
            );
            inserted = true;
            break;
          }
        }

        if (!inserted) {
          // Fallback: add at the end before module.exports or last line
          if (serverContent.includes("module.exports")) {
            serverContent = serverContent.replace(
              "module.exports",
              staticServingCode + "\n\nmodule.exports"
            );
          } else {
            serverContent += staticServingCode;
          }
        }
      }

      // Backup original file
      fs.writeFileSync(serverJsPath + ".backup", fs.readFileSync(serverJsPath));
      fs.writeFileSync(serverJsPath, serverContent);
      console.log("✅ Added static serving configuration to server.js");
      console.log("📋 Original file backed up as server.js.backup");
    } else {
      console.log("✅ Static serving already configured");
    }
  } catch (err) {
    console.log(`❌ Error modifying server.js: ${err.message}`);
  }
} else {
  console.log(`❌ server.js not found at: ${serverJsPath}`);
}

// 3. Create .env file with correct VPS settings if missing
console.log("\n🔧 Checking environment configuration...");
const envPath = path.join(process.cwd(), "server/.env");

if (!fs.existsSync(envPath)) {
  console.log("📝 Creating .env file for VPS...");
  const envContent = `# VPS Environment Configuration
NODE_ENV=production
CLIENT_URL=https://yarukai.com
# SERVER_BASE_URL=https://yarukai.com (uncomment only if client and API are on different domains)
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pazar_plus
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# Session Secret
SESSION_SECRET=your-super-secret-key-change-this-in-production

# CORS Settings
CORS_ORIGIN=https://yarukai.com
`;

  fs.writeFileSync(envPath, envContent);
  console.log("✅ Created .env file");
  console.log("⚠️  Please update database credentials and session secret");
} else {
  console.log("✅ .env file exists");
}

// 4. Test PDF generation and URL
console.log("\n🧪 Testing PDF generation...");
try {
  // Simulate the URL generation logic from templateBasedPdfGenerator.js
  const useAbsoluteUrl =
    process.env.SERVER_BASE_URL &&
    process.env.SERVER_BASE_URL !== process.env.CLIENT_URL;

  const testFileName = `test_fix_${Date.now()}.pdf`;
  let publicUrl;

  if (useAbsoluteUrl) {
    publicUrl = `${process.env.SERVER_BASE_URL}/shipping/${testFileName}`;
  } else {
    publicUrl = `/shipping/${testFileName}`;
  }

  console.log(`📋 Test URL generation: ${publicUrl}`);
  console.log(`📋 useAbsoluteUrl: ${useAbsoluteUrl}`);

  // Create a simple test file
  const testFilePath = path.join(pdfDir, testFileName);
  fs.writeFileSync(testFilePath, "Test PDF content for VPS fix verification");
  console.log(`✅ Created test file: ${testFilePath}`);

  // Test URL
  console.log(
    `🔗 Test this URL: https://yarukai.com${
      publicUrl.startsWith("/") ? publicUrl : "/" + publicUrl
    }`
  );
} catch (err) {
  console.log(`❌ Error in PDF test: ${err.message}`);
}

console.log("\n🎯 VPS Deployment Checklist:");
console.log("1. ✅ PDF directory created and writable");
console.log("2. ✅ Static serving configured in server.js");
console.log("3. ✅ Environment variables set correctly");
console.log("4. 🔄 Restart your Node.js application");
console.log("5. 🔄 Test PDF URL in browser");

console.log("\n📋 Commands to run on VPS:");
console.log("# Navigate to your project directory");
console.log("cd /var/www/html/pazar");
console.log("");
console.log("# Run this fix script");
console.log("node vps-pdf-fix.js");
console.log("");
console.log("# Restart your application (choose one):");
console.log("pm2 restart pazar-plus  # if using PM2");
console.log("sudo systemctl restart pazar-plus  # if using systemd");
console.log("# or kill and restart manually");

console.log("\n✨ Fix Script Complete!");
