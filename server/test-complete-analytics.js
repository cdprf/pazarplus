const axios = require("axios");
const chalk = require("chalk");

/**
 * Comprehensive Analytics API Test Suite for Month 5 Phase 1
 * Tests all new Business Intelligence and Analytics features
 */

const BASE_URL = "http://localhost:3000/api";
const ANALYTICS_BASE = `${BASE_URL}/analytics`;

// Test configuration
const TEST_CONFIG = {
  timeout: 10000,
  timeframes: ["7d", "30d", "90d"],
  formats: ["json", "csv"],
};

class AnalyticsTestSuite {
  constructor() {
    this.testResults = [];
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
  }

  async runTest(testName, testFunction) {
    this.totalTests++;
    console.log(chalk.blue(`\n🧪 Testing: ${testName}`));

    try {
      const startTime = Date.now();
      const result = await testFunction();
      const duration = Date.now() - startTime;

      this.passedTests++;
      this.testResults.push({
        name: testName,
        status: "PASSED",
        duration,
        result,
      });

      console.log(chalk.green(`✅ PASSED (${duration}ms)`));
      return result;
    } catch (error) {
      this.failedTests++;
      this.testResults.push({
        name: testName,
        status: "FAILED",
        error: error.message,
        stack: error.stack,
      });

      console.log(chalk.red(`❌ FAILED: ${error.message}`));
      return null;
    }
  }

  async testDashboardAnalytics() {
    return this.runTest("Dashboard Analytics API", async () => {
      const response = await axios.get(
        `${ANALYTICS_BASE}/dashboard?timeframe=30d`
      );

      // Validate response structure
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      const { data } = response.data;

      // Validate required fields
      const requiredFields = ["summary", "revenue", "platforms", "topProducts"];
      for (const field of requiredFields) {
        if (!data[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Validate summary metrics
      if (typeof data.summary.totalRevenue !== "number") {
        throw new Error("Invalid totalRevenue type");
      }

      if (typeof data.summary.totalOrders !== "number") {
        throw new Error("Invalid totalOrders type");
      }

      console.log(
        chalk.gray(`  Revenue: ₺${data.summary.totalRevenue.toLocaleString()}`)
      );
      console.log(chalk.gray(`  Orders: ${data.summary.totalOrders}`));
      console.log(chalk.gray(`  Platforms: ${data.platforms?.length || 0}`));

      return data;
    });
  }

  async testBusinessIntelligence() {
    return this.runTest("Business Intelligence API", async () => {
      const response = await axios.get(
        `${ANALYTICS_BASE}/business-intelligence?timeframe=30d`
      );

      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      const { data } = response.data;

      // Validate AI recommendations
      if (!data.recommendations || !Array.isArray(data.recommendations)) {
        throw new Error("Missing or invalid recommendations array");
      }

      // Validate financial KPIs
      if (!data.financialKPIs) {
        throw new Error("Missing financialKPIs object");
      }

      // Check recommendation structure
      if (data.recommendations.length > 0) {
        const rec = data.recommendations[0];
        const requiredRecFields = [
          "title",
          "description",
          "priority",
          "category",
          "estimatedImpact",
        ];

        for (const field of requiredRecFields) {
          if (!rec[field]) {
            throw new Error(`Missing recommendation field: ${field}`);
          }
        }
      }

      console.log(
        chalk.gray(`  Recommendations: ${data.recommendations.length}`)
      );
      console.log(
        chalk.gray(
          `  Financial KPIs: ${Object.keys(data.financialKPIs).length}`
        )
      );

      return data;
    });
  }

  async testInventoryInsights() {
    return this.runTest("Inventory Insights API", async () => {
      const response = await axios.get(
        `${ANALYTICS_BASE}/inventory-insights?timeframe=30d`
      );

      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      const { data } = response.data;

      // Validate alerts structure
      if (!data.alerts) {
        throw new Error("Missing alerts object");
      }

      const requiredAlertTypes = ["lowStock", "reorderNeeded", "overstock"];
      for (const alertType of requiredAlertTypes) {
        if (!Array.isArray(data.alerts[alertType])) {
          throw new Error(`Missing or invalid alert type: ${alertType}`);
        }
      }

      // Validate optimization suggestions
      if (!data.optimization) {
        throw new Error("Missing optimization object");
      }

      // Validate predictions
      if (!data.predictions || !data.predictions.products) {
        throw new Error("Missing predictions data");
      }

      console.log(
        chalk.gray(`  Low Stock Items: ${data.alerts.lowStock.length}`)
      );
      console.log(
        chalk.gray(`  Reorder Needed: ${data.alerts.reorderNeeded.length}`)
      );
      console.log(
        chalk.gray(`  Overstock Items: ${data.alerts.overstock.length}`)
      );
      console.log(
        chalk.gray(`  Predictions: ${data.predictions.products.length}`)
      );

      return data;
    });
  }

  async testRevenueAnalytics() {
    return this.runTest("Revenue Analytics API", async () => {
      const response = await axios.get(
        `${ANALYTICS_BASE}/revenue?timeframe=30d`
      );

      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      const { data } = response.data;

      // Validate revenue data structure
      if (!data.daily || !Array.isArray(data.daily)) {
        throw new Error("Missing or invalid daily revenue data");
      }

      if (!data.growth) {
        throw new Error("Missing growth analysis");
      }

      if (!data.forecast) {
        throw new Error("Missing revenue forecast");
      }

      // Validate daily data structure
      if (data.daily.length > 0) {
        const dayData = data.daily[0];
        if (!dayData.date || typeof dayData.revenue !== "number") {
          throw new Error("Invalid daily revenue data structure");
        }
      }

      console.log(chalk.gray(`  Daily Data Points: ${data.daily.length}`));
      console.log(chalk.gray(`  Growth Rate: ${data.growth.rate}%`));
      console.log(chalk.gray(`  Forecast Period: ${data.forecast.period}`));

      return data;
    });
  }

  async testPlatformPerformance() {
    return this.runTest("Platform Performance API", async () => {
      const response = await axios.get(
        `${ANALYTICS_BASE}/platform-performance?timeframe=30d`
      );

      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      const { data } = response.data;

      // Validate platforms array
      if (!data.platforms || !Array.isArray(data.platforms)) {
        throw new Error("Missing or invalid platforms data");
      }

      // Validate comparison data
      if (!data.comparison) {
        throw new Error("Missing platform comparison data");
      }

      // Validate platform data structure
      if (data.platforms.length > 0) {
        const platform = data.platforms[0];
        const requiredFields = [
          "platform",
          "totalRevenue",
          "totalOrders",
          "performanceScore",
        ];

        for (const field of requiredFields) {
          if (platform[field] === undefined) {
            throw new Error(`Missing platform field: ${field}`);
          }
        }
      }

      console.log(chalk.gray(`  Platforms Analyzed: ${data.platforms.length}`));
      console.log(
        chalk.gray(
          `  Comparison Metrics: ${Object.keys(data.comparison).length}`
        )
      );

      return data;
    });
  }

  async testMarketAnalysis() {
    return this.runTest("Market Analysis API", async () => {
      const response = await axios.get(
        `${ANALYTICS_BASE}/market-analysis?timeframe=30d`
      );

      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      const { data } = response.data;

      // Validate market trends
      if (!data.trends) {
        throw new Error("Missing market trends data");
      }

      // Validate categories
      if (!data.categories || !Array.isArray(data.categories)) {
        throw new Error("Missing or invalid categories data");
      }

      // Validate seasonal analysis
      if (!data.seasonal) {
        throw new Error("Missing seasonal analysis");
      }

      console.log(
        chalk.gray(`  Categories Analyzed: ${data.categories.length}`)
      );
      console.log(
        chalk.gray(`  Seasonal Trends: ${Object.keys(data.seasonal).length}`)
      );

      return data;
    });
  }

  async testRealTimeAnalytics() {
    return this.runTest("Real-time Analytics API", async () => {
      const response = await axios.get(`${ANALYTICS_BASE}/realtime`);

      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      const { data } = response.data;

      // Validate real-time metrics
      if (!data.metrics) {
        throw new Error("Missing real-time metrics");
      }

      // Validate timestamp
      if (!data.timestamp) {
        throw new Error("Missing timestamp");
      }

      // Validate live data freshness (should be recent)
      const timestamp = new Date(data.timestamp);
      const now = new Date();
      const ageDifference = now - timestamp;

      if (ageDifference > 60000) {
        // More than 1 minute old
        console.log(
          chalk.yellow(
            `  Warning: Data is ${Math.round(ageDifference / 1000)}s old`
          )
        );
      }

      console.log(
        chalk.gray(`  Metrics Count: ${Object.keys(data.metrics).length}`)
      );
      console.log(
        chalk.gray(`  Data Age: ${Math.round(ageDifference / 1000)}s`)
      );

      return data;
    });
  }

  async testDataExport() {
    return this.runTest("Data Export API", async () => {
      // Test JSON export
      const jsonResponse = await axios.get(
        `${ANALYTICS_BASE}/export?timeframe=7d&format=json`
      );

      if (jsonResponse.status !== 200) {
        throw new Error(
          `JSON export failed with status ${jsonResponse.status}`
        );
      }

      // Test CSV export
      const csvResponse = await axios.get(
        `${ANALYTICS_BASE}/export?timeframe=7d&format=csv`,
        {
          responseType: "blob",
        }
      );

      if (csvResponse.status !== 200) {
        throw new Error(`CSV export failed with status ${csvResponse.status}`);
      }

      console.log(
        chalk.gray(
          `  JSON Export: ${JSON.stringify(jsonResponse.data).length} bytes`
        )
      );
      console.log(
        chalk.gray(`  CSV Export: ${csvResponse.data.size || "N/A"} bytes`)
      );

      return { json: jsonResponse.data, csv: csvResponse.data };
    });
  }

  async testPerformanceMetrics() {
    return this.runTest("API Performance Metrics", async () => {
      const endpoints = [
        "/dashboard",
        "/business-intelligence",
        "/revenue",
        "/platform-performance",
      ];

      const performanceResults = [];

      for (const endpoint of endpoints) {
        const startTime = Date.now();
        const response = await axios.get(
          `${ANALYTICS_BASE}${endpoint}?timeframe=30d`
        );
        const duration = Date.now() - startTime;

        performanceResults.push({
          endpoint,
          duration,
          status: response.status,
          dataSize: JSON.stringify(response.data).length,
        });

        if (duration > 2000) {
          // More than 2 seconds
          console.log(
            chalk.yellow(`  Warning: ${endpoint} took ${duration}ms`)
          );
        }
      }

      const avgDuration =
        performanceResults.reduce((sum, r) => sum + r.duration, 0) /
        performanceResults.length;

      console.log(
        chalk.gray(`  Average Response Time: ${Math.round(avgDuration)}ms`)
      );
      console.log(chalk.gray(`  Endpoints Tested: ${endpoints.length}`));

      return performanceResults;
    });
  }

  async testErrorHandling() {
    return this.runTest("Error Handling", async () => {
      const errorTests = [
        {
          name: "Invalid timeframe",
          url: `${ANALYTICS_BASE}/dashboard?timeframe=invalid`,
          expectedStatus: 400,
        },
        {
          name: "Invalid endpoint",
          url: `${ANALYTICS_BASE}/nonexistent`,
          expectedStatus: 404,
        },
        {
          name: "Invalid export format",
          url: `${ANALYTICS_BASE}/export?format=invalid`,
          expectedStatus: 400,
        },
      ];

      for (const test of errorTests) {
        try {
          const response = await axios.get(test.url);
          if (response.status === test.expectedStatus) {
            console.log(chalk.gray(`  ✓ ${test.name}: Correct error handling`));
          } else {
            throw new Error(
              `Expected status ${test.expectedStatus}, got ${response.status}`
            );
          }
        } catch (error) {
          if (error.response && error.response.status === test.expectedStatus) {
            console.log(chalk.gray(`  ✓ ${test.name}: Correct error handling`));
          } else {
            throw new Error(
              `${test.name}: Unexpected error - ${error.message}`
            );
          }
        }
      }

      return errorTests;
    });
  }

  printSummary() {
    console.log(chalk.blue("\n📊 TEST SUMMARY"));
    console.log(chalk.blue("═".repeat(50)));

    console.log(`Total Tests: ${this.totalTests}`);
    console.log(chalk.green(`Passed: ${this.passedTests}`));
    console.log(chalk.red(`Failed: ${this.failedTests}`));
    console.log(
      `Success Rate: ${Math.round((this.passedTests / this.totalTests) * 100)}%`
    );

    if (this.failedTests > 0) {
      console.log(chalk.red("\n❌ FAILED TESTS:"));
      this.testResults
        .filter((result) => result.status === "FAILED")
        .forEach((result) => {
          console.log(chalk.red(`  • ${result.name}: ${result.error}`));
        });
    }

    console.log(chalk.blue("\n🎯 MONTH 5 PHASE 1 COMPLETION STATUS:"));

    if (this.passedTests === this.totalTests) {
      console.log(chalk.green("✅ ALL ANALYTICS FEATURES WORKING"));
      console.log(chalk.green("✅ BUSINESS INTELLIGENCE OPERATIONAL"));
      console.log(chalk.green("✅ READY FOR MONTH 5 PHASE 2"));
    } else {
      console.log(chalk.yellow("⚠️  SOME ISSUES DETECTED"));
      console.log(chalk.yellow("🔧 REQUIRES FIXES BEFORE PHASE 2"));
    }
  }

  async runAllTests() {
    console.log(chalk.blue("🚀 STARTING MONTH 5 PHASE 1 ANALYTICS TEST SUITE"));
    console.log(chalk.blue("═".repeat(60)));

    // Core analytics tests
    await this.testDashboardAnalytics();
    await this.testBusinessIntelligence();
    await this.testInventoryInsights();
    await this.testRevenueAnalytics();
    await this.testPlatformPerformance();
    await this.testMarketAnalysis();
    await this.testRealTimeAnalytics();
    await this.testDataExport();

    // Performance and reliability tests
    await this.testPerformanceMetrics();
    await this.testErrorHandling();

    this.printSummary();
  }
}

// Run the test suite
async function main() {
  const testSuite = new AnalyticsTestSuite();

  try {
    await testSuite.runAllTests();
  } catch (error) {
    console.log(
      chalk.red(`\n💥 Test suite failed to complete: ${error.message}`)
    );
    process.exit(1);
  }
}

// Handle uncaught errors
process.on("unhandledRejection", (error) => {
  console.log(chalk.red(`\n💥 Unhandled rejection: ${error.message}`));
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = AnalyticsTestSuite;
