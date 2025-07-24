#!/usr/bin/env node

/**
 * Database Optimization Runner
 * Executes database optimization tasks and generates reports
 */

const DatabaseOptimizer = require('./optimize-database');
const logger = require('../utils/logger');

/**
 * Run Database Optimization
 * Executes the comprehensive database optimization process
 */
async function runOptimization() {
  const startTime = Date.now();

  try {
    logger.info('='.repeat(60));
    logger.info('STARTING DATABASE OPTIMIZATION PROCESS');
    logger.info('='.repeat(60));

    const optimizer = new DatabaseOptimizer();
    const report = await optimizer.run();

    const duration = (Date.now() - startTime) / 1000;

    // Display results
    logger.info('\n' + '='.repeat(60));
    logger.info('DATABASE OPTIMIZATION COMPLETE');
    logger.info('='.repeat(60));
    logger.info(`Duration: ${duration.toFixed(2)} seconds`);
    logger.info(
      `Optimizations Applied: ${report.summary.optimizationsApplied}`
    );
    logger.info(`Errors Encountered: ${report.summary.errorsEncountered}`);

    if (report.optimizations.length > 0) {
      logger.info('\nOptimizations Applied:');
      report.optimizations.forEach((opt, index) => {
        logger.info(`${index + 1}. ${opt.type}: ${opt.message}`);
        if (opt.details) {
          logger.info(`   Details: ${JSON.stringify(opt.details, null, 2)}`);
        }
      });
    }

    if (report.errors.length > 0) {
      logger.info('\nErrors Encountered:');
      report.errors.forEach((error, index) => {
        logger.info(`${index + 1}. ${error.type}: ${error.message}`);
      });
    }

    if (report.recommendations.length > 0) {
      logger.info('\nRecommendations:');
      report.recommendations.forEach((rec, index) => {
        logger.info(
          `${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`
        );
        logger.info(`   Implementation: ${rec.implementation}`);
      });
    }

    // Save report to file
    const fs = require('fs').promises;
    const path = require('path');
    const reportPath = path.join(
      __dirname,
      '../logs',
      `optimization-report-${new Date().toISOString().split('T')[0]}.json`
    );

    try {
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      logger.info(`\nDetailed report saved to: ${reportPath}`);
    } catch (writeError) {
      logger.warn('Failed to save optimization report:', writeError.message);
    }

    logger.info('Database optimization process completed successfully');

    return report;
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;

    logger.error('\n' + '='.repeat(60));
    logger.error('DATABASE OPTIMIZATION FAILED');
    logger.error('='.repeat(60));
    logger.error(`Duration: ${duration.toFixed(2)} seconds`);
    logger.error(`Error: ${error.message}`);

    logger.error('Database optimization process failed:', error);

    throw error;
  }
}

// Execute if run directly
if (require.main === module) {
  runOptimization()
    .then(() => {
      logger.info('\nOptimization completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('\nOptimization failed:', error.message);
      process.exit(1);
    });
}

module.exports = { runOptimization };
