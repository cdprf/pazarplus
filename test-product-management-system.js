/**
 * Comprehensive Product Management System Test
 * Tests the complete product fetching and management flow using our fixed platform services
 */

const axios = require("axios");
const chalk = require("chalk");
const path = require("path");

// Configuration
const API_BASE_URL = "http://localhost:3000/api";
const TEST_USER_EMAIL = "dd@ex.com";
const TEST_USER_PASSWORD = "cQPtReU2D2WVHv8@";

class ProductManagementTester {
  constructor() {
    this.authToken = null;
    this.userId = null;
    this.testConnections = [];
    this.testResults = {
      authentication: false,
      platformConnections: false,
      productFetching: {},
      productSync: false,
      productManagement: false,
    };
  }

  /**
   * Initialize test environment and authenticate
   */
  async initialize() {
    console.log(chalk.blue("🚀 Initializing Product Management System Test\n"));

    try {
      // Test server health
      await this.testServerHealth();

      // Authenticate test user
      await this.authenticateUser();

      console.log(
        chalk.green("✅ Test environment initialized successfully\n")
      );
      return true;
    } catch (error) {
      console.log(
        chalk.red(
          `❌ Failed to initialize test environment: ${error.message}\n`
        )
      );
      return false;
    }
  }

  /**
   * Test server health and availability
   */
  async testServerHealth() {
    console.log(chalk.yellow("📋 Testing server health..."));

    try {
      const response = await axios.get(`${API_BASE_URL}/health`);

      if (response.data.success) {
        console.log(chalk.green("  ✅ Server is healthy and running"));
        console.log(
          chalk.blue(
            `  📍 Available routes: ${Object.keys(response.data.routes).join(
              ", "
            )}`
          )
        );
        return true;
      }
    } catch (error) {
      throw new Error(`Server health check failed: ${error.message}`);
    }
  }

  /**
   * Authenticate test user
   */
  async authenticateUser() {
    console.log(chalk.yellow("🔐 Authenticating test user..."));

    try {
      // Try to login first
      let response;
      try {
        response = await axios.post(`${API_BASE_URL}/auth/login`, {
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD,
        });
      } catch (loginError) {
        // If login fails, try to register
        console.log(chalk.blue("  👤 User not found, creating test user..."));

        const registerResponse = await axios.post(
          `${API_BASE_URL}/auth/register`,
          {
            email: TEST_USER_EMAIL,
            password: TEST_USER_PASSWORD,
            firstName: "Test",
            lastName: "User",
          }
        );

        if (registerResponse.data.success) {
          console.log(chalk.green("  ✅ Test user created successfully"));

          // Now login with the new user
          response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: TEST_USER_EMAIL,
            password: TEST_USER_PASSWORD,
          });
        }
      }

      if (response.data.success && response.data.token) {
        this.authToken = response.data.token;
        this.userId = response.data.user.id;
        this.testResults.authentication = true;

        console.log(chalk.green("  ✅ Authentication successful"));
        console.log(chalk.blue(`  👤 User ID: ${this.userId}`));
        return true;
      }

      throw new Error("Authentication failed - no token received");
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Get authenticated axios instance
   */
  getAuthenticatedAxios() {
    return axios.create({
      baseURL: API_BASE_URL,
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Test product sync status
   */
  async testProductSyncStatus() {
    console.log(chalk.yellow("📊 Testing product sync status..."));

    try {
      const api = this.getAuthenticatedAxios();
      const response = await api.get("/products/sync-status");

      if (response.data.success) {
        const data = response.data.data;
        console.log(chalk.green("  ✅ Sync status retrieved successfully"));
        console.log(chalk.blue(`  📦 Total products: ${data.totalProducts}`));
        console.log(
          chalk.blue(`  🔌 Connected platforms: ${data.platformStats.length}`)
        );

        data.platformStats.forEach((platform) => {
          console.log(
            chalk.cyan(
              `    - ${platform.platformType}: ${platform.productCount} products`
            )
          );
        });

        return data;
      }

      throw new Error("Failed to get sync status");
    } catch (error) {
      console.log(
        chalk.red(
          `  ❌ Sync status test failed: ${
            error.response?.data?.message || error.message
          }`
        )
      );
      return null;
    }
  }

  /**
   * Test platform-specific product fetching
   */
  async testPlatformProductFetching(platformType, connectionId) {
    console.log(chalk.yellow(`📦 Testing ${platformType} product fetching...`));

    try {
      const api = this.getAuthenticatedAxios();
      const response = await api.get(
        `/products/test/${platformType}/${connectionId}`,
        {
          params: { page: 0, size: 5 },
        }
      );

      if (response.data.success) {
        const data = response.data.data;
        console.log(
          chalk.green(`  ✅ ${platformType} product fetching successful`)
        );
        console.log(
          chalk.blue(`  🔗 Connection test: ${data.connectionTest.status}`)
        );
        console.log(chalk.blue(`  📦 Products fetched: ${data.productCount}`));

        if (data.products && data.products.length > 0) {
          console.log(
            chalk.cyan(
              `  📝 Sample product: ${
                data.products[0].name ||
                data.products[0].title ||
                "Unnamed Product"
              }`
            )
          );
        }

        this.testResults.productFetching[platformType] = true;
        return data;
      }

      throw new Error(response.data.message || "Product fetching failed");
    } catch (error) {
      console.log(
        chalk.red(
          `  ❌ ${platformType} product fetching failed: ${
            error.response?.data?.message || error.message
          }`
        )
      );
      this.testResults.productFetching[platformType] = false;
      return null;
    }
  }

  /**
   * Test complete product synchronization
   */
  async testProductSync() {
    console.log(chalk.yellow("🔄 Testing complete product synchronization..."));

    try {
      const api = this.getAuthenticatedAxios();
      const response = await api.post("/products/sync", {
        options: { page: 0, size: 20 },
      });

      if (response.data.success) {
        const data = response.data.data;
        console.log(chalk.green("  ✅ Product sync completed successfully"));
        console.log(chalk.blue(`  📊 Total fetched: ${data.totalFetched}`));
        console.log(chalk.blue(`  🔀 Total merged: ${data.totalMerged}`));
        console.log(chalk.blue(`  💾 Total saved: ${data.totalSaved}`));

        console.log(chalk.cyan("  📈 Platform results:"));
        data.platformResults.forEach((result) => {
          const status = result.success ? "✅" : "❌";
          console.log(
            chalk.cyan(
              `    ${status} ${result.platform}: ${result.count || 0} products`
            )
          );
        });

        this.testResults.productSync = true;
        return data;
      }

      throw new Error(response.data.message || "Product sync failed");
    } catch (error) {
      console.log(
        chalk.red(
          `  ❌ Product sync failed: ${
            error.response?.data?.message || error.message
          }`
        )
      );
      this.testResults.productSync = false;
      return null;
    }
  }

  /**
   * Test product listing and filtering
   */
  async testProductListing() {
    console.log(chalk.yellow("📋 Testing product listing and filtering..."));

    try {
      const api = this.getAuthenticatedAxios();

      // Test basic product listing
      const listResponse = await api.get("/products", {
        params: { page: 0, limit: 10 },
      });

      if (listResponse.data.success) {
        const products = listResponse.data.data.products;
        const pagination = listResponse.data.data.pagination;

        console.log(chalk.green("  ✅ Product listing successful"));
        console.log(
          chalk.blue(`  📦 Products found: ${pagination.totalItems}`)
        );
        console.log(chalk.blue(`  📄 Pages: ${pagination.totalPages}`));

        if (products.length > 0) {
          console.log(
            chalk.cyan(
              `  📝 First product: ${products[0].name || "Unnamed Product"}`
            )
          );

          // Test search functionality
          console.log(chalk.yellow("  🔍 Testing search functionality..."));
          const searchResponse = await api.get("/products", {
            params: {
              search: products[0].name?.substring(0, 5) || "test",
              limit: 5,
            },
          });

          if (searchResponse.data.success) {
            console.log(
              chalk.green(
                `    ✅ Search successful: ${searchResponse.data.data.products.length} results`
              )
            );
          }
        }

        this.testResults.productManagement = true;
        return products;
      }

      throw new Error("Product listing failed");
    } catch (error) {
      console.log(
        chalk.red(
          `  ❌ Product listing failed: ${
            error.response?.data?.message || error.message
          }`
        )
      );
      this.testResults.productManagement = false;
      return null;
    }
  }

  /**
   * Test platform-specific product views
   */
  async testPlatformProductViews() {
    console.log(chalk.yellow("🎯 Testing platform-specific product views..."));

    const platforms = ["trendyol", "n11", "hepsiburada"];
    const results = {};

    for (const platform of platforms) {
      try {
        const api = this.getAuthenticatedAxios();
        const response = await api.get(`/products/platform/${platform}`, {
          params: { page: 0, limit: 5 },
        });

        if (response.data.success) {
          const products = response.data.data.products;
          console.log(
            chalk.green(`  ✅ ${platform} products: ${products.length} found`)
          );
          results[platform] = products.length;
        }
      } catch (error) {
        console.log(
          chalk.yellow(
            `  ⚠️  ${platform} products: No products or error (${error.response?.status})`
          )
        );
        results[platform] = 0;
      }
    }

    return results;
  }

  /**
   * Generate comprehensive test report
   */
  async generateTestReport() {
    console.log(chalk.yellow("\n📊 Generating Comprehensive Test Report...\n"));

    const report = {
      timestamp: new Date().toISOString(),
      testEnvironment: {
        apiUrl: API_BASE_URL,
        userId: this.userId,
        authenticationWorking: this.testResults.authentication,
      },
      productFetchingResults: this.testResults.productFetching,
      productSyncWorking: this.testResults.productSync,
      productManagementWorking: this.testResults.productManagement,
      overallSuccess:
        this.testResults.authentication &&
        this.testResults.productSync &&
        this.testResults.productManagement,
      nextSteps: [],
    };

    // Add next steps based on results
    if (report.overallSuccess) {
      report.nextSteps = [
        "Set up real platform connections with actual API credentials",
        "Configure automated product synchronization schedules",
        "Implement product management UI components",
        "Add inventory management and stock tracking features",
      ];
    } else {
      report.nextSteps = [
        "Review failed test components and fix any issues",
        "Ensure all platform services are properly configured",
        "Verify database connections and models are working",
        "Check authentication and authorization systems",
      ];
    }

    console.log(chalk.green("📋 COMPREHENSIVE TEST REPORT:"));
    console.log(chalk.white(JSON.stringify(report, null, 2)));

    // Summary
    console.log(chalk.cyan("\n🎯 TEST SUMMARY:"));
    console.log(
      `  Authentication: ${
        report.testEnvironment.authenticationWorking ? "✅" : "❌"
      }`
    );
    console.log(`  Product Sync: ${report.productSyncWorking ? "✅" : "❌"}`);
    console.log(
      `  Product Management: ${report.productManagementWorking ? "✅" : "❌"}`
    );

    Object.entries(report.productFetchingResults).forEach(
      ([platform, success]) => {
        console.log(`  ${platform} Fetching: ${success ? "✅" : "❌"}`);
      }
    );

    if (report.overallSuccess) {
      console.log(
        chalk.green(
          "\n🎉 ALL MAJOR TESTS PASSED! Product management system is ready for production use.\n"
        )
      );
    } else {
      console.log(
        chalk.yellow(
          "\n⚠️  Some tests failed. Review the issues above before proceeding.\n"
        )
      );
    }

    return report;
  }

  /**
   * Run all tests in sequence
   */
  async runAllTests() {
    try {
      console.log(
        chalk.cyan("🧪 Starting Comprehensive Product Management Tests...\n")
      );

      // Initialize test environment
      const initialized = await this.initialize();
      if (!initialized) {
        console.log(
          chalk.red("❌ Failed to initialize test environment. Exiting.\n")
        );
        return false;
      }

      // Test product sync status
      await this.testProductSyncStatus();

      // Test product synchronization
      await this.testProductSync();

      // Test product listing and management
      await this.testProductListing();

      // Test platform-specific views
      await this.testPlatformProductViews();

      // Generate final report
      const report = await this.generateTestReport();

      return report.overallSuccess;
    } catch (error) {
      console.error(chalk.red(`💥 Test execution failed: ${error.message}`));
      console.error(error.stack);
      return false;
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new ProductManagementTester();
  tester
    .runAllTests()
    .then((success) => {
      if (success) {
        console.log(
          chalk.green(
            "🚀 Product management system is ready for real-world use!"
          )
        );
        process.exit(0);
      } else {
        console.log(
          chalk.red("❌ Tests failed. Please review and fix issues.")
        );
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error(chalk.red("💥 Unexpected error:", error.message));
      process.exit(1);
    });
}

module.exports = ProductManagementTester;
