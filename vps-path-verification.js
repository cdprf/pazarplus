#!/usr/bin/env node

/**
 * VPS Path Verification Script
 * Verifies PDF generation and serving paths on VPS
 */

const fs = require("fs");
const path = require("path");

console.log("🔍 VPS PATH VERIFICATION");
console.log("========================\n");

console.log("1. ENVIRONMENT INFO");
console.log("------------------");
console.log("Working Directory:", process.cwd());
console.log("Script Directory:", __dirname);
console.log("Node Version:", process.version);
console.log("Platform:", process.platform);
console.log("");

console.log("2. DIRECTORY STRUCTURE CHECK");
console.log("----------------------------");

const pathsToCheck = [
  // Current working directory structure
  path.join(process.cwd(), "server"),
  path.join(process.cwd(), "server/public"),
  path.join(process.cwd(), "server/public/shipping"),

  // Relative to script directory
  path.join(__dirname, "server"),
  path.join(__dirname, "server/public"),
  path.join(__dirname, "server/public/shipping"),

  // Alternative structures
  path.join(__dirname, "../public"),
  path.join(__dirname, "../public/shipping"),
  path.join(__dirname, "../../public"),
  path.join(__dirname, "../../public/shipping"),
];

pathsToCheck.forEach((checkPath) => {
  const exists = fs.existsSync(checkPath);
  console.log(`${exists ? "✅" : "❌"} ${checkPath}`);

  if (exists && checkPath.includes("shipping")) {
    try {
      const files = fs.readdirSync(checkPath);
      console.log(
        `   📄 Files: ${files.length} (${files.slice(0, 3).join(", ")}${
          files.length > 3 ? "..." : ""
        })`
      );
    } catch (err) {
      console.log(`   ❌ Cannot read directory: ${err.message}`);
    }
  }
});

console.log("\n3. EXPRESS STATIC PATH CHECK");
console.log("----------------------------");

// Simulate what Express static serving expects
const expressAppDir = path.join(process.cwd(), "server"); // Assuming server.js is in server/
const expressShippingPath = path.join(expressAppDir, "public", "shipping");

console.log("Express app directory (assumed):", expressAppDir);
console.log("Express shipping path:", expressShippingPath);
console.log(
  "Express shipping path exists:",
  fs.existsSync(expressShippingPath)
);

if (fs.existsSync(expressShippingPath)) {
  try {
    const files = fs.readdirSync(expressShippingPath);
    console.log("Files in Express shipping path:", files.length);

    if (files.length > 0) {
      console.log("Sample files:");
      files.slice(0, 3).forEach((file) => {
        const filePath = path.join(expressShippingPath, file);
        const stats = fs.statSync(filePath);
        console.log(
          `  - ${file} (${stats.size} bytes, ${stats.mtime.toISOString()})`
        );
      });
    }
  } catch (err) {
    console.log("Cannot read Express shipping directory:", err.message);
  }
}

console.log("\n4. CREATE TEST FILE");
console.log("------------------");

// Try to create a test file in the expected location
const testFileName = `vps-test-${Date.now()}.txt`;

const testPaths = [
  path.join(process.cwd(), "server/public/shipping", testFileName),
  path.join(__dirname, "../public/shipping", testFileName),
];

let testFileCreated = false;

for (const testPath of testPaths) {
  const dir = path.dirname(testPath);

  if (fs.existsSync(dir) || dir.includes(process.cwd())) {
    try {
      // Ensure directory exists
      fs.mkdirSync(dir, { recursive: true });

      // Create test file
      fs.writeFileSync(
        testPath,
        `Test file created at ${new Date().toISOString()}\nPath: ${testPath}`
      );

      console.log(`✅ Test file created: ${testPath}`);
      console.log(
        `🌐 Should be accessible at: https://yarukai.com/shipping/${testFileName}`
      );

      testFileCreated = true;
      break;
    } catch (err) {
      console.log(
        `❌ Failed to create test file at ${testPath}: ${err.message}`
      );
    }
  }
}

if (!testFileCreated) {
  console.log("❌ Could not create test file in any location");
}

console.log("\n5. RECOMMENDATIONS");
console.log("==================");

console.log("Based on the paths found:");

const workingDirShipping = path.join(process.cwd(), "server/public/shipping");
const scriptDirShipping = path.join(__dirname, "../public/shipping");

if (fs.existsSync(workingDirShipping)) {
  console.log("✅ Use working directory path in your app:");
  console.log(`   path.join(process.cwd(), "server/public/shipping")`);
} else if (fs.existsSync(scriptDirShipping)) {
  console.log("✅ Use script directory path in your app:");
  console.log(`   path.join(__dirname, "../public/shipping")`);
} else {
  console.log("❌ No shipping directory found. Create it:");
  console.log(`   mkdir -p ${workingDirShipping}`);
}

console.log("\n🔄 After creating test file, restart your server and test:");
console.log(`   curl -I https://yarukai.com/shipping/${testFileName}`);
console.log("   Should return 200 OK, not 404");

console.log("\n📊 If still 404, check server logs for static serving errors.");
