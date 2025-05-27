#!/usr/bin/env node

/**
 * Database Optimization Runner
 * Executes database optimization tasks and generates reports
 */

const DatabaseOptimizer = require("./optimize-database");
const logger = require("../utils/logger");

/**
 * Run Database Optimization
 * Executes the comprehensive database optimization process
 */
async function runOptimization() {
  const startTime = Date.now();

  try {
    logger.info("=".repeat(60));
    logger.info("STARTING DATABASE OPTIMIZATION PROCESS");
    logger.info("=".repeat(60));

    const optimizer = new DatabaseOptimizer();
    const report = await optimizer.run();

    const duration = (Date.now() - startTime) / 1000;

    // Display results
    console.log("\n" + "=".repeat(60));
    console.log("DATABASE OPTIMIZATION COMPLETE");
    console.log("=".repeat(60));
    console.log(`Duration: ${duration.toFixed(2)} seconds`);
    console.log(
      `Optimizations Applied: ${report.summary.optimizationsApplied}`
    );
    console.log(`Errors Encountered: ${report.summary.errorsEncountered}`);

    if (report.optimizations.length > 0) {
      console.log("\nOptimizations Applied:");
      report.optimizations.forEach((opt, index) => {
        console.log(`${index + 1}. ${opt.type}: ${opt.message}`);
        if (opt.details) {
          console.log(`   Details: ${JSON.stringify(opt.details, null, 2)}`);
        }
      });
    }

    if (report.errors.length > 0) {
      console.log("\nErrors Encountered:");
      report.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.type}: ${error.message}`);
      });
    }

    if (report.recommendations.length > 0) {
      console.log("\nRecommendations:");
      report.recommendations.forEach((rec, index) => {
        console.log(
          `${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`
        );
        console.log(`   Implementation: ${rec.implementation}`);
      });
    }

    // Save report to file
    const fs = require("fs").promises;
    const path = require("path");
    const reportPath = path.join(
      __dirname,
      "../logs",
      `optimization-report-${new Date().toISOString().split("T")[0]}.json`
    );

    try {
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`\nDetailed report saved to: ${reportPath}`);
    } catch (writeError) {
      logger.warn("Failed to save optimization report:", writeError.message);
    }

    logger.info("Database optimization process completed successfully");

    return report;
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;

    console.error("\n" + "=".repeat(60));
    console.error("DATABASE OPTIMIZATION FAILED");
    console.error("=".repeat(60));
    console.error(`Duration: ${duration.toFixed(2)} seconds`);
    console.error(`Error: ${error.message}`);

    logger.error("Database optimization process failed:", error);

    throw error;
  }
}

// Execute if run directly
if (require.main === module) {
  runOptimization()
    .then(() => {
      console.log("\nOptimization completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\nOptimization failed:", error.message);
      process.exit(1);
    });
}

module.exports = { runOptimization };
