#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Base directory
const BASE_DIR = __dirname;

// Only include absolutely safe files to remove
const SAFE_TO_REMOVE = [
  // Analysis and debugging scripts - definitely unused in production
  "analyze-background-task-issues.js",
  "analyze-header-issues.js",
  "analyze-hepsiburada-products-categories.js",
  "analyze-n11-field-mapping.js",
  "analyze-n11-product-linking.js",
  "analyze-raw-order-data.js",
  "analyze-sku-patterns.js",
  "analyze-styling-issues.js",
  "check-all-orders.js",
  "check-analytics-data.js",
  "check-analytics-issues.js",
  "check-background-activity.js",
  "check-database-content.js",
  "check-database-status.js",
  "check-database-tables.js",
  "check-orders-data.js",
  "check-platform-categories.js",
  "check-product-model.js",
  "debug-associations.js",
  "debug-categories-response.js",
  "debug-n11-init.js",
  "debug-query-issue.js",
  "diagnose-db-connection-pool.js",
  "explore-database.js",
  "test-addlog-method.js",
  "test-designer-ui.js",
  "test-n11-api.js",
  "test-product-linking.js",
  "verify-styling-fixes.js",

  // Log files and test data
  "client.log",
  "server.log",
  "database.sqlite",
  "customer-questions-test-results.json",
  "hepsiburada-categories-test-results.json",
  "HEADER_ANALYSIS_REPORT.json",
  "HEADER_VERIFICATION_REPORT.json",
  "designer-styling-verification-report.json",
  "shipping-designer-test-report.json",
  "notification-test.html",

  // Development notebooks
  "hepsiburada-questions-analysis.ipynb",

  // Status and fix documentation (safe to remove as they're just reports)
  "ANALYTICS_IMPLEMENTATION_COMPLETE.md",
  "ANALYTICS_STATUS_REPORT.md",
  "BACKEND_STABILITY_FIX_COMPLETE.md",
  "BACKGROUND_TASKS_FIX_COMPLETE.md",
  "CLIENT_DEPENDENCIES_FIX_COMPLETE.md",
  "CONSOLE_ERRORS_FIXED.md",
  "DATABASE_ENUM_FIX_COMPLETE.md",
  "DESIGNER_STYLING_FIXES_COMPLETE.md",
  "ERROR_HANDLING_FINAL_STATUS.md",
  "MODAL_FIX_COMPLETE.md",
  "NETWORK_ISSUE_RESOLVED.md",
  "NOTIFICATION_SYSTEM_FIX_COMPLETE.md",

  // Backup environment files (keeping main .env files)
  ".env.example.backup",
  ".env.qnb-test",
];

function fileExists(filePath) {
  try {
    return fs.existsSync(path.join(BASE_DIR, filePath));
  } catch (error) {
    return false;
  }
}

function deleteFile(filePath) {
  try {
    const fullPath = path.join(BASE_DIR, filePath);
    fs.unlinkSync(fullPath);
    return true;
  } catch (error) {
    console.error(`Error deleting ${filePath}: ${error.message}`);
    return false;
  }
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase().trim());
    });
  });
}

async function main() {
  console.log("🧹 PAZAR+ SAFE CLEANUP TOOL");
  console.log("============================");
  console.log(
    "This script removes ONLY files that are definitely safe to delete:"
  );
  console.log("- Debug/analysis scripts");
  console.log("- Log files and test data");
  console.log("- Completed status reports");
  console.log("- Backup environment files");
  console.log("\nThis will NOT touch any core application files.");

  const existingFiles = SAFE_TO_REMOVE.filter(fileExists);

  if (existingFiles.length === 0) {
    console.log("\nNo unused files found to clean up.");
    rl.close();
    return;
  }

  console.log(`\nFound ${existingFiles.length} safe-to-remove files:`);
  existingFiles.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file}`);
  });

  const proceed = await askQuestion(
    `\nDelete all ${existingFiles.length} files? (y/n): `
  );

  if (proceed !== "y" && proceed !== "yes") {
    console.log("Cleanup cancelled.");
    rl.close();
    return;
  }

  console.log("\nDeleting files...");
  let deletedCount = 0;
  let failedCount = 0;

  for (const file of existingFiles) {
    if (deleteFile(file)) {
      console.log(`✓ Deleted: ${file}`);
      deletedCount++;
    } else {
      console.log(`✗ Failed to delete: ${file}`);
      failedCount++;
    }
  }

  console.log(`\n🎉 Cleanup completed!`);
  console.log(`📊 Summary: ${deletedCount} deleted, ${failedCount} failed`);

  if (deletedCount > 0) {
    console.log("\nRecommendations:");
    console.log("1. Test your application to ensure everything works");
    console.log(
      '2. Commit changes: git add . && git commit -m "Clean up unused debug/log files"'
    );
    console.log(
      "3. Consider running the full cleanup script for more thorough cleaning"
    );
  }

  rl.close();
}

// Handle Ctrl+C gracefully
process.on("SIGINT", () => {
  console.log("\n\nCleanup interrupted by user.");
  rl.close();
  process.exit(0);
});

// Run the script
main().catch((error) => {
  console.error("An error occurred:", error);
  rl.close();
  process.exit(1);
});
