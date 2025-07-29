/**
 * Route Loading Test Script
 *
 * This script tests the loading of all routes in the application and displays any errors with stack traces.
 * It helps identify routing issues, missing dependencies, and misconfigured routes.
 */

import fs from "fs";
import path from "path";
import chalk from "chalk"; // For colored console output
import { fileURLToPath } from "url";
import { dirname } from "path";

// Get current file path (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up basic environment variables for testing
process.env.NODE_ENV = "development";
process.env.DEBUG = "pazar:routes,pazar:api";

// Keep track of loaded and failed routes
const results = {
  loaded: [],
  failed: [],
  warnings: [],
};

/**
 * Verify if a module exports a valid Express router
 * @param {Object} routeModule - The imported route module
 * @param {string} routeName - Name of the route file
 * @returns {boolean} Whether the route module appears valid
 */
function isValidRouteModule(routeModule, routeName) {
  // Check if it's a Router or function that can be used as middleware
  const isRouter =
    routeModule &&
    (typeof routeModule === "function" ||
      (routeModule.get && typeof routeModule.get === "function") ||
      (routeModule.post && typeof routeModule.post === "function") ||
      (routeModule.use && typeof routeModule.use === "function"));

  if (!isRouter) {
    console.warn(
      chalk.yellow(
        `Warning: Route module '${routeName}' doesn't appear to be a valid Express router.`
      )
    );
    results.warnings.push({
      route: routeName,
      reason: "Not a valid Express router",
    });
    return false;
  }

  return true;
}

/**
 * Test loading a single route file
 * @param {string} routePath - Path to the route file
 */
async function testRouteLoading(routePath) {
  const routeName = path.basename(routePath);

  try {
    console.log(chalk.cyan(`Testing route: ${routeName}`));
    const route = await import(routePath);

    // Verify if it's a valid route module
    if (isValidRouteModule(route, routeName)) {
      results.loaded.push(routeName);
      console.log(chalk.green(`✓ Successfully loaded ${routeName}`));
    }
  } catch (error) {
    console.error(chalk.red(`✗ Failed to load route: ${routeName}`));
    console.error(chalk.red(`  Error: ${error.message}`));
    console.error(chalk.gray(`  Stack trace: ${error.stack}`));

    results.failed.push({
      route: routeName,
      error: error.message,
      stack: error.stack,
    });
  }
}

/**
 * Test loading the main routes index file
 */
async function testMainRoutesIndex() {
  console.log(chalk.cyan.bold("\nTesting main routes index.js..."));
  try {
    const mainRoutes = await import("./server/routes/index.js");
    if (isValidRouteModule(mainRoutes.default || mainRoutes, "index.js")) {
      console.log(
        chalk.green.bold("✓ Main routes index.js loaded successfully!")
      );
      return true;
    }
    return false;
  } catch (error) {
    console.error(chalk.red.bold("✗ Failed to load main routes index.js"));
    console.error(chalk.red(`  Error: ${error.message}`));
    console.error(chalk.gray(`  Stack trace: ${error.stack}`));

    results.failed.push({
      route: "index.js (main routes)",
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
}

/**
 * Test loading app.js and its route mounting
 */
async function testAppRoutesMounting() {
  console.log(chalk.cyan.bold("\nTesting routes mounting in app.js..."));
  try {
    const appModule = await import("./server/app.js");
    const app = appModule.default || appModule;
    console.log(chalk.green.bold("✓ app.js loaded successfully!"));

    // Inspect the app's router stack to identify mounted routes
    if (app._router && app._router.stack) {
      console.log(chalk.cyan("Inspecting app router stack:"));

      const apiRoutes = app._router.stack.filter(
        (layer) =>
          layer.route && layer.route.path && layer.route.path.startsWith("/api")
      );

      console.log(
        chalk.cyan(
          `Found ${apiRoutes.length} direct API routes mounted in app.js`
        )
      );

      // Look for the middleware that mounts the main routes
      const mainMiddleware = app._router.stack.filter(
        (layer) =>
          layer.name === "router" && layer.regexp.toString().includes("/api")
      );

      console.log(
        chalk.cyan(
          `Found ${mainMiddleware.length} middleware router(s) for /api path`
        )
      );
    }

    return true;
  } catch (error) {
    console.error(chalk.red.bold("✗ Failed to load and test app.js"));
    console.error(chalk.red(`  Error: ${error.message}`));
    console.error(chalk.gray(`  Stack trace: ${error.stack}`));

    results.failed.push({
      route: "app.js (application)",
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
}

/**
 * Check for common issues in route files
 * @param {string} routePath - Path to the route file
 */
function analyzeRouteFile(routePath) {
  try {
    const content = fs.readFileSync(routePath, "utf8");
    const routeName = path.basename(routePath);

    // Check for common issues
    if (
      !content.includes("express.Router()") &&
      !content.includes("express.Router(")
    ) {
      console.warn(
        chalk.yellow(
          `Warning: Route ${routeName} might not be exporting a router.`
        )
      );
      results.warnings.push({
        route: routeName,
        reason: "No router creation detected",
      });
    }

    // Check for router export
    if (
      !content.includes("module.exports") &&
      !content.includes("export default")
    ) {
      console.warn(
        chalk.yellow(
          `Warning: Route ${routeName} might not be exporting anything.`
        )
      );
      results.warnings.push({
        route: routeName,
        reason: "No module exports detected",
      });
    }

    // Check for route handlers
    const hasRouteHandlers =
      content.includes("router.get") ||
      content.includes("router.post") ||
      content.includes("router.put") ||
      content.includes("router.delete") ||
      content.includes("router.use");

    if (!hasRouteHandlers) {
      console.warn(
        chalk.yellow(
          `Warning: Route ${routeName} doesn't contain any route handlers.`
        )
      );
      results.warnings.push({
        route: routeName,
        reason: "No route handlers detected",
      });
    }
  } catch (error) {
    console.warn(
      chalk.yellow(`Warning: Couldn't analyze ${routePath}: ${error.message}`)
    );
  }
}

/**
 * Main test function to test all routes
 */
async function testAllRoutes() {
  console.log(chalk.bold.blue("=== Testing Routes Loading ==="));
  console.log(chalk.blue(`Started at: ${new Date().toLocaleString()}\n`));

  // Get all route files
  const routeDir = path.join(__dirname, "server", "routes");
  const routeFiles = fs
    .readdirSync(routeDir)
    .filter((file) => file.endsWith(".js"))
    .map((file) => path.join(routeDir, file));

  console.log(chalk.blue(`Found ${routeFiles.length} route files to test\n`));

  // Test individual route files
  for (const routePath of routeFiles) {
    if (path.basename(routePath) !== "index.js") {
      analyzeRouteFile(routePath);
      testRouteLoading(routePath);
      console.log(""); // Add line break between routes
    }
  }

  // Test main routes index
  const mainIndexSuccess = testMainRoutesIndex();

  // Test app.js route mounting only if index loaded successfully
  if (mainIndexSuccess) {
    testAppRoutesMounting();
  }

  // Print summary report
  console.log(chalk.bold.blue("\n=== Routes Loading Test Summary ==="));
  console.log(
    chalk.green(`✓ Successfully loaded ${results.loaded.length} routes:`)
  );
  results.loaded.forEach((route) => console.log(chalk.green(`  - ${route}`)));

  if (results.failed.length > 0) {
    console.log(
      chalk.red(`\n✗ Failed to load ${results.failed.length} routes:`)
    );
    results.failed.forEach((failure) => {
      console.log(chalk.red(`  - ${failure.route}: ${failure.error}`));
    });
  }

  if (results.warnings.length > 0) {
    console.log(chalk.yellow(`\n⚠ Found ${results.warnings.length} warnings:`));
    results.warnings.forEach((warning) => {
      console.log(chalk.yellow(`  - ${warning.route}: ${warning.reason}`));
    });
  }

  // Create report file
  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\..+/, "");
  const reportContent = {
    timestamp: new Date().toISOString(),
    summary: {
      total: routeFiles.length,
      loaded: results.loaded.length,
      failed: results.failed.length,
      warnings: results.warnings.length,
    },
    results,
  };

  fs.writeFileSync(
    path.join(__dirname, `routes-loading-report-${timestamp}.json`),
    JSON.stringify(reportContent, null, 2)
  );

  console.log(
    chalk.blue(`\nReport saved to routes-loading-report-${timestamp}.json`)
  );
  console.log(chalk.blue(`Test completed at: ${new Date().toLocaleString()}`));
}

// Execute tests
testAllRoutes().catch((error) => {
  console.error(chalk.red("Test execution failed:"));
  console.error(error);
});
