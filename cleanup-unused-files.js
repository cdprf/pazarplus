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

// Define categories of files to remove
const UNUSED_FILES = {
  // Analysis and Debug Scripts (Root Level) - SAFE TO REMOVE
  analysisScripts: [
    "analyze-background-task-issues.js",
    "analyze-header-issues.js",
    "analyze-hepsiburada-products-categories.js",
    "analyze-n11-field-mapping.js",
    "analyze-n11-product-linking.js",
    "analyze-raw-order-data.js",
    "analyze-sku-patterns.js",
    "analyze-styling-issues.js",
    "browser-integration-test-creator.js",
    "category-status-report.js",
    "check-all-orders.js",
    "check-analytics-data.js",
    "check-analytics-issues.js",
    "check-background-activity.js",
    "check-bulk-operations-index.js",
    "check-configuration-status.js",
    "check-current-orders.js",
    "check-database-content.js",
    "check-database-status.js",
    "check-database-tables.js",
    "check-db-schema.js",
    "check-designer-loading.js",
    "check-hepsiburada-orders-final.js",
    "check-n11-model-db-columns.js",
    "check-n11-table-status.js",
    "check-orders-columns.js",
    "check-orders-data.js",
    "check-orders-schema.js",
    "check-orders-table.js",
    "check-platform-categories.js",
    "check-platform-conflicts.js",
    "check-postgres-db.js",
    "check-product-linking-status.js",
    "check-product-model-final.js",
    "check-product-model.js",
    "check-products-with-orders.js",
    "check-shipping-rates.js",
    "check-table-schemas.js",
    "check-users-final.js",
    "check-users-fixed.js",
    "check-users.js",
    "check-variant-categories.js",
    "check-variant-relationships.js",
    "complete-analyze-button-fix.js",
    "comprehensive-analyze-button-verification.js",
    "comprehensive-category-sync-diagnosis.js",
    "comprehensive-db-check.js",
    "comprehensive-notification-test.js",
    "comprehensive-stock-test.js",
    "consolidate-migrations.js",
    "create-test-customer-questions.js",
    "create-test-orders.js",
    "create-test-products.js",
    "create-test-user.js",
    "dashboard-testing-instructions.js",
    "debug-associations.js",
    "debug-background-task-logs.js",
    "debug-categories-response.js",
    "debug-n11-init.js",
    "debug-n11-products.js",
    "debug-platform-categories-556.js",
    "debug-query-issue.js",
    "debug-sync.js",
    "debug-task-progress.js",
    "deep-recheck.js",
    "demo-enhanced-intelligence.js",
    "demo-intelligence-api.js",
    "demo-unified-intelligence.js",
    "detailed-notification-diagnostic.js",
    "diagnose-db-connection-pool.js",
    "direct-category-sync.js",
    "enhanced-sku-final-test.js",
    "enhanced-sku-pattern-analyzer.js",
    "ensure-task-queue-running.js",
    "explore-database.js",
    "fetch-all-products-comprehensive.js",
    "fetch-unlimited-products.js",
    "final-accessibility-verification.js",
    "final-background-task-validation.js",
    "final-deployment-check.js",
    "final-endpoint-test.js",
    "final-integration-status.js",
    "final-integration-test.js",
    "final-integration-validation.js",
    "final-n11-test.js",
    "final-n11-verification.js",
    "final-platform-variant-test.js",
    "final-status-report.js",
    "final-verification.js",
    "find-categories-endpoint.js",
    "fix-background-tasks.js",
    "fix-category-sync.js",
    "fix-designer-critical-issues.js",
    "fix-hepsiburada-field-mapping.js",
    "fix-hepsiburada-order-data.js",
    "fix-hepsiburada-order-dates.js",
    "fix-missing-order-data.js",
    "fix-missing-stockQuantity-column.js",
    "fix-orders-columns.js",
    "fix-product-linking.js",
    "fix-productid-type.js",
    "fix-stuck-tasks.js",
    "frontend-test-guide.js",
    "generate-test-token.js",
    "get-product-details.js",
    "get-test-token.js",
    "implement-analytics-improvements.js",
    "integration-test-background-tasks.js",
    "investigate-n11-orders-api.js",
    "investigate-trendyol-556.js",
    "manual-import-test.js",
    "manual-modal-test-instructions.js",
    "monitor.js",
    "parse-qnb-error.js",
    "qnb-efatura-test.js",
    "quick-n11-test.js",
    "quick-qnb-test.js",
    "service-control.js",
    "sku-system-manager.js",
    "sync-all-categories.js",
    "sync-all-platform-categories.js",
    "sync-variant-categories.js",
    "DESIGNER_STYLING_ISSUES_ANALYSIS.js",
  ],

  // Test Scripts (Root Level) - SAFE TO REMOVE
  testScripts: [
    "test-addlog-method.js",
    "test-addlog-save-debug.js",
    "test-customer-questions-real-data.js",
    "test-designer-ui-issues.js",
    "test-designer-ui.js",
    "test-executor-directly.js",
    "test-hepsiburada-api.js",
    "test-logging-system.js",
    "test-n11-api.js",
    "test-n11-background-task-final.js",
    "test-n11-complete-flow.js",
    "test-n11-linking-core.js",
    "test-n11-order-pipeline.js",
    "test-n11-order-structure.js",
    "test-n11-product-linking.js",
    "test-n11-real-response.js",
    "test-n11-simple-linking.js",
    "test-n11-with-longer-wait.js",
    "test-onlog-callback.js",
    "test-onlog-flow.js",
    "test-product-analytics.js",
    "test-product-linking.js",
    "test-qnb-finans-invoice-generation.js",
    "test-real-api-response.js",
    "test-real-data-fetch.js",
    "test-real-n11-response.js",
    "test-sequelize-changed.js",
    "test-shipping-designer-issues.js",
    "test-trendyol-direct.js",
    "verify-designer-route-fix.js",
    "verify-styling-fixes.js",
  ],

  // Documentation Files - SAFE TO REMOVE
  documentationFiles: [
    "ABORT_ERROR_FIX_COMPLETE.md",
    "ANALYTICS_COMPONENTS_FIX_SUMMARY.md",
    "ANALYTICS_FIX_GUIDE.md",
    "ANALYTICS_FRONTEND_FIX_COMPLETE.md",
    "ANALYTICS_IMPLEMENTATION_COMPLETE.md",
    "ANALYTICS_INTEGRATION_STATUS_FINAL.md",
    "ANALYTICS_STATUS_REPORT.md",
    "ANALYTICS_SYSTEM_FINAL_REPORT.md",
    "AUTHENTICATION_SCHEMA_FIX_COMPLETE.md",
    "AUTOMATIC_VARIANT_DETECTION_FINAL_REPORT.md",
    "BACKEND_ISSUES_RESOLVED.md",
    "BACKEND_STABILITY_FIX_COMPLETE.md",
    "BACKGROUND_TASKS_FIX_COMPLETE.md",
    "BACKGROUND_TASK_API_TEST_FIX_COMPLETE.md",
    "BACKGROUND_TASK_ENHANCEMENT_FINAL_STATUS.md",
    "BACKGROUND_TASK_LOGGING_IMPLEMENTATION_COMPLETE.md",
    "BACKGROUND_TASK_SUCCESS_SUMMARY.md",
    "BACKGROUND_TASK_SYSTEM_FINAL_REPORT.md",
    "BULK_UPDATE_FIX_SUMMARY.md",
    "BUSINESS_INTELLIGENCE_ESLINT_FIXES_COMPLETE.md",
    "CATEGORIES_API_IMPLEMENTATION_FINAL_REPORT.md",
    "CATEGORY_SYNC_STATUS_FINAL.md",
    "CLIENT_DEPENDENCIES_FIX_COMPLETE.md",
    "CONSOLE_ERRORS_FIXED.md",
    "CUSTOMER_API_FIX_COMPLETE.md",
    "CUSTOMER_MANAGEMENT_FINAL_STATUS.md",
    "CUSTOMER_MANAGEMENT_IMPLEMENTATION_COMPLETE.md",
    "CUSTOMER_PROFILE_ENHANCEMENT_SUMMARY.md",
    "CUSTOMER_PROFILE_FIXES_COMPLETE.md",
    "CUSTOMER_QUESTIONS_API_FIX_COMPLETE.md",
    "CUSTOMER_QUESTIONS_FINAL_INTEGRATION_REPORT.md",
    "CUSTOMER_QUESTIONS_ISSUES_ANALYSIS.md",
    "CUSTOMER_QUESTIONS_ISSUE_ANALYSIS.md",
    "CUSTOMER_QUESTIONS_SYNC_FINAL_REPORT.md",
    "DATABASE_ENUM_FIX_COMPLETE.md",
    "DATABASE_SCHEMA_SUMMARY.md",
    "DB_CONNECTION_POOL_FIX_COMPLETE.md",
    "DESIGNER_STYLING_FIXES_COMPLETE.md",
    "ENHANCED_PRODUCT_MANAGEMENT_COMPLETE.md",
    "ENHANCED_PRODUCT_MANAGEMENT_FINAL_STATUS.md",
    "ENHANCED_PRODUCT_MANAGEMENT_INTEGRATION_COMPLETE.md",
    "ENHANCED_PRODUCT_MANAGEMENT_SYSTEM.md",
    "ENHANCED_PRODUCT_TABLE_LINT_FIXES_COMPLETE.md",
    "ENHANCED_SKU_FINAL_COMPLETION.md",
    "ENHANCED_SKU_SYSTEM_COMPLETION_REPORT.md",
    "ENHANCED_SKU_SYSTEM_FINAL_COMPLETION.md",
    "ENHANCED_SKU_SYSTEM_GUIDE.md",
    "ENUM_VALIDATION_FIX_COMPLETE.md",
    "ERROR_HANDLING_AND_ROUTE_TESTING_SUMMARY.md",
    "ERROR_HANDLING_FINAL_STATUS.md",
    "EXTERNAL_DOCS_UPDATE_SUMMARY.md",
    "FINAL_DEPLOYMENT_CHECKLIST.md",
    "FINAL_INTEGRATION_STATUS_REPORT.md",
    "FRONTEND_ANALYTICS_ENHANCEMENT_REPORT.md",
    "HEPSIBURADA_CATEGORIES_API_IMPLEMENTATION_GUIDE.md",
    "HEPSIBURADA_FIELD_MAPPING_FIX_SUMMARY.md",
    "HEPSIBURADA_SUCCESS_REPORT.md",
    "IMPLEMENTATION_PROGRESS.md",
    "IMPORT_BUTTON_TEST_RESULTS.md",
    "LOG_ANALYSIS_REPORT.md",
    "MAIN_MIGRATION_UPDATE_SUMMARY.md",
    "MIGRATION_CONSOLIDATION_COMPLETE.md",
    "MIGRATION_SUMMARY.md",
    "MODAL_FIX_COMPLETE.md",
    "MULTIPLE_API_CALLS_FIX_COMPLETE.md",
    "N11_BACKGROUND_TASK_FIXES_COMPLETE.md",
    "N11_CATEGORIES_API_OFFICIAL_IMPLEMENTATION.md",
    "N11_IMPLEMENTATION_FINAL_REPORT.md",
    "N11_INTEGRATION_FIXES_COMPLETE.md",
    "N11_ORDER_ENUM_FIX_COMPLETE.md",
    "N11_ORDER_IMPLEMENTATION_COMPLETE.md",
    "NEON_SETUP_GUIDE.md",
    "NETWORK_ACCESS_ISSUE_SOLUTION.md",
    "NETWORK_ISSUE_RESOLVED.md",
    "NETWORK_STATUS_IMPLEMENTATION_COMPLETE.md",
    "NOTIFICATION_SYSTEM_ANALYSIS_REPORT.md",
    "NOTIFICATION_SYSTEM_FIX_COMPLETE.md",
    "PRODUCT_LINKING_ANALYSIS_REPORT.md",
    "QNB Finans e-Arşiv Entegrasyon Kılavuzu.md",
    "QNB_EARSIV_MODULAR_REFACTORING_FINAL.md",
    "QNB_FINANS_INTEGRATION_GUIDE.md",
    "QNB_FINANS_SERVICE_UPDATE_SUMMARY.md",
    "QNB_FINANS_TESTING_GUIDE.md",
    "QNB_FINANS_TEST_RESULTS.md",
    "QNB_WS_SECURITY_IMPLEMENTATION_COMPLETE.md",
    "SHIPPING_DESIGNER_ISSUES_REPORT.md",
    "VERCEL_DEPLOYMENT_GUIDE.md",
    "VERCEL_DEPLOYMENT_ISSUES_ANALYSIS.md",
    "implementation-roadmap.md",
    "master-plan.md",
  ],

  // Shell Scripts and Deployment Files - CHECK BEFORE REMOVING
  shellScripts: [
    "auto-network-config.sh",
    "deploy-with-neon.sh",
    "deploy.sh",
    "diagnose-network-issues.sh",
    "fix-db-connection-pool.sh",
    "fix-network-access.sh",
    "set-vercel-env.sh",
    "setup-neon-database.sh",
    "setup-neon-db.sh",
    "setup-vercel-env.sh",
    "shell-aliases.sh",
    "start-network-accessible.sh",
    "validate-deployment.sh",
    "validate-vercel-deployment.sh",
  ],

  // Log and Data Files - SAFE TO REMOVE
  logFiles: [
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
    "hepsiburada-questions-analysis.ipynb",
  ],

  // Backup Environment Files - CHECK BEFORE REMOVING
  envBackups: [".env.example.backup", ".env.qnb-test"],

  // Potentially Unused Server Files - INVESTIGATE BEFORE REMOVING
  serverFiles: [
    "server/models/CustomerQuestionFixed.js",
    "server/scripts/seed-sample-data.js",
    "server/scripts/seedTurkishCarriers.js",
    "server/scripts/sync-database.js",
    "server/scripts/create-sample-products.js",
    "server/scripts/remove-platform-product-data.js",
    "server/scripts/backfill-order-items.js",
    "server/scripts/update-order-schema.js",
    "server/scripts/optimize-database.js",
    "server/scripts/run-optimization.js",
    "server/create-sample-connections.js",
    "server/sync-customers.js",
    "server/startup-performance-monitor.js",
  ],

  // Potentially Unused Client Files - INVESTIGATE BEFORE REMOVING
  clientFiles: [
    "client/src/components/auth/Register-new.jsx",
    "client/src/components/CustomerQuestionsOld.js",
    "client/src/components/compliance/TurkishComplianceDashboard.jsx",
    "client/src/components/payments/TurkishPaymentGateway.jsx",
    "client/src/components/shipping/TestDesigner.jsx",
    "client/src/components/VariantDetectionTester.js",
  ],
};

// Helper functions
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

async function processCategory(categoryName, files, description) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`CATEGORY: ${categoryName.toUpperCase()}`);
  console.log(`Description: ${description}`);
  console.log(`${"=".repeat(60)}`);

  const existingFiles = files.filter(fileExists);

  if (existingFiles.length === 0) {
    console.log("No files found in this category.");
    return;
  }

  console.log(`Found ${existingFiles.length} files:`);
  existingFiles.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file}`);
  });

  const answer = await askQuestion(
    `\nDo you want to delete all ${existingFiles.length} files in this category? (y/n/s for skip): `
  );

  if (answer === "y" || answer === "yes") {
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

    console.log(`\nSummary: ${deletedCount} deleted, ${failedCount} failed`);
  } else if (answer === "s" || answer === "skip") {
    console.log("Skipped this category.");
  } else {
    console.log("Cancelled deletion for this category.");
  }
}

async function main() {
  console.log("🧹 PAZAR+ PROJECT CLEANUP TOOL");
  console.log("================================");
  console.log(
    "This script will help you remove unused files from your project."
  );
  console.log("Files are categorized by safety level and usage.");
  console.log("\nRECOMMENDATION: Create a backup before running this script!");

  const proceed = await askQuestion("\nDo you want to proceed? (y/n): ");

  if (proceed !== "y" && proceed !== "yes") {
    console.log("Cleanup cancelled.");
    rl.close();
    return;
  }

  // Process each category
  await processCategory(
    "Analysis Scripts",
    UNUSED_FILES.analysisScripts,
    "Debug and analysis scripts - SAFE TO REMOVE"
  );

  await processCategory(
    "Test Scripts",
    UNUSED_FILES.testScripts,
    "Testing and verification scripts - SAFE TO REMOVE"
  );

  await processCategory(
    "Documentation Files",
    UNUSED_FILES.documentationFiles,
    "Markdown documentation and reports - SAFE TO REMOVE"
  );

  await processCategory(
    "Log and Data Files",
    UNUSED_FILES.logFiles,
    "Log files and test data - SAFE TO REMOVE"
  );

  await processCategory(
    "Shell Scripts",
    UNUSED_FILES.shellScripts,
    "Deployment and setup scripts - CHECK if you use these for deployment"
  );

  await processCategory(
    "Environment Backups",
    UNUSED_FILES.envBackups,
    "Backup environment files - CHECK if you need these"
  );

  await processCategory(
    "Server Files",
    UNUSED_FILES.serverFiles,
    "Potentially unused server files - INVESTIGATE before removing"
  );

  await processCategory(
    "Client Files",
    UNUSED_FILES.clientFiles,
    "Potentially unused client files - INVESTIGATE before removing"
  );

  console.log("\n🎉 Cleanup process completed!");
  console.log("\nNext steps:");
  console.log("1. Test your application to ensure everything works");
  console.log("2. Commit your changes if everything is working");
  console.log("3. Consider running npm/yarn install to clean up dependencies");

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
