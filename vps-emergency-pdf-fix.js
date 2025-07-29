#!/usr/bin/env node

/**
 * VPS PDF 404 Fix Script
 * Run this script on your VPS to fix the PDF 404 issue
 */

const fs = require("fs");
const path = require("path");

console.log("🚨 VPS PDF 404 Emergency Fix Starting...\n");

// 1. Check current working directory
console.log("📍 Current working directory:", process.cwd());

// 2. Check if we're in the right location
const possibleProjectPaths = [
  "/var/www/html/pazar",
  "/var/www/html/pazar+",
  "/var/www/pazar",
  "/var/www/pazar+",
  process.cwd(),
];

let projectPath = null;
for (const testPath of possibleProjectPaths) {
  if (fs.existsSync(path.join(testPath, "server", "server.js"))) {
    projectPath = testPath;
    break;
  }
}

if (!projectPath) {
  console.log(
    "❌ Could not find project directory. Please run this script from your project root."
  );
  process.exit(1);
}

console.log("✅ Project found at:", projectPath);

// 3. Change to project directory
process.chdir(projectPath);

// 4. Check PDF directory
const pdfDir = path.join(projectPath, "server", "public", "shipping");
console.log("\n📁 Checking PDF directory:", pdfDir);

if (!fs.existsSync(pdfDir)) {
  console.log("❌ PDF directory does not exist. Creating...");
  fs.mkdirSync(pdfDir, { recursive: true });
  console.log("✅ Created PDF directory");
} else {
  console.log("✅ PDF directory exists");
}

// 5. Set correct permissions
try {
  const { execSync } = require("child_process");
  execSync(`chmod 755 "${pdfDir}"`, { stdio: "inherit" });
  console.log("✅ Set directory permissions to 755");
} catch (err) {
  console.log("⚠️  Could not set permissions:", err.message);
}

// 6. Create test file
const testFile = path.join(pdfDir, "test-vps-fix.txt");
fs.writeFileSync(
  testFile,
  "VPS PDF fix test file - " + new Date().toISOString()
);
console.log("✅ Created test file:", testFile);

// 7. Check environment file
const envPath = path.join(projectPath, "server", ".env");
console.log("\n🔧 Checking environment configuration...");

let envContent = "";
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, "utf8");
  console.log("✅ .env file exists");
} else {
  console.log("❌ .env file missing. Creating...");
}

// Ensure correct environment variables
const requiredEnvVars = {
  NODE_ENV: "production",
  CLIENT_URL: "https://yarukai.com",
  PORT: "3000",
};

let envNeedsUpdate = false;
for (const [key, value] of Object.entries(requiredEnvVars)) {
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (!regex.test(envContent)) {
    envContent += `\n${key}=${value}`;
    envNeedsUpdate = true;
    console.log(`✅ Added ${key}=${value}`);
  }
}

// Comment out SERVER_BASE_URL if it exists and is different from CLIENT_URL
if (
  envContent.includes("SERVER_BASE_URL=") &&
  !envContent.includes("#SERVER_BASE_URL=")
) {
  envContent = envContent.replace(/^SERVER_BASE_URL=/gm, "#SERVER_BASE_URL=");
  envNeedsUpdate = true;
  console.log("✅ Commented out SERVER_BASE_URL (using relative URLs)");
}

if (envNeedsUpdate) {
  fs.writeFileSync(envPath, envContent);
  console.log("✅ Updated .env file");
}

// 8. Test URL generation
console.log("\n🔗 Testing URL generation logic...");
// Load environment variables
require("dotenv").config({ path: envPath });

const useAbsoluteUrl =
  process.env.SERVER_BASE_URL &&
  process.env.SERVER_BASE_URL !== process.env.CLIENT_URL &&
  process.env.NODE_ENV !== "production";

const testFileName = "test-file.pdf";
let publicUrl;
if (useAbsoluteUrl) {
  publicUrl = `${process.env.SERVER_BASE_URL}/shipping/${testFileName}`;
} else {
  publicUrl = `/shipping/${testFileName}`;
}

console.log("Environment variables:");
console.log("  NODE_ENV:", process.env.NODE_ENV);
console.log("  CLIENT_URL:", process.env.CLIENT_URL);
console.log("  SERVER_BASE_URL:", process.env.SERVER_BASE_URL);
console.log("  useAbsoluteUrl:", useAbsoluteUrl);
console.log("  Generated URL:", publicUrl);

// 9. Test file access
console.log("\n🌐 Testing file access...");
const testUrl = `https://yarukai.com/shipping/test-vps-fix.txt`;
console.log("Test this URL in your browser:", testUrl);

// 10. Check if process is running
console.log("\n🔄 Checking Node.js processes...");
try {
  const { execSync } = require("child_process");
  const processes = execSync('ps aux | grep -E "(node|npm)" | grep -v grep', {
    encoding: "utf8",
  });
  console.log("Running Node.js processes:");
  console.log(processes);
} catch (err) {
  console.log("❌ No Node.js processes found or error checking processes");
}

// 11. Instructions for restart
console.log("\n🔄 Next Steps - Restart your application:");
console.log(
  "Choose one of these commands based on how you're running the app:"
);
console.log("");
console.log("If using PM2:");
console.log("  pm2 restart all");
console.log("  pm2 restart pazar-plus");
console.log("");
console.log("If using systemd:");
console.log("  sudo systemctl restart pazar-plus");
console.log("");
console.log("If running manually:");
console.log("  cd server && npm start");
console.log("");

// 12. Final tests
console.log("🧪 After restarting, test these:");
console.log("1. Static file test:", testUrl);
console.log("2. Generate a shipping slip in the app");
console.log("3. Check if the PDF URL works");
console.log("");

console.log("✨ VPS PDF 404 Fix Complete!");
console.log("");
console.log("📋 Summary of changes:");
console.log("✅ Created/verified PDF directory with correct permissions");
console.log("✅ Updated .env file for production deployment");
console.log("✅ Forced relative URLs for same-domain deployment");
console.log("✅ Created test file for verification");
console.log("");
console.log("🎯 The PDF URLs should now be: /shipping/filename.pdf");
console.log("🎯 Which resolves to: https://yarukai.com/shipping/filename.pdf");
