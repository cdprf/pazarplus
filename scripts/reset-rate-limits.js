#!/usr/bin/env node

const readline = require("readline");
const path = require("path");

// Import cache service to clear Redis rate limits
let cacheService;
let cacheConnected = false;

try {
  cacheService = require("../server/services/cache-service");
} catch (error) {
  console.log("⚠️  Could not load cache service. Will restart server instead.");
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Add timeout to prevent hanging
const OPERATION_TIMEOUT = 10000; // 10 seconds

console.log("🔧 Enhanced Rate Limit Reset Utility");
console.log("This tool can help you manage rate limiting issues");
console.log("");

const resetOptions = [
  "1. Clear all rate limits (Redis + restart server)",
  "2. Clear specific user rate limits",
  "3. Clear authentication rate limits",
  "4. Clear platform API rate limits",
  "5. Just restart server (clears memory-based limits)",
  "6. Show current rate limit status",
  "0. Exit",
];

function showMenu() {
  console.log("Available options:");
  resetOptions.forEach((option) => console.log(option));
  console.log("");
}

// Add timeout wrapper for Redis operations
function withTimeout(promise, timeoutMs = OPERATION_TIMEOUT) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Operation timed out")), timeoutMs)
    ),
  ]);
}

async function clearAllRateLimits() {
  if (cacheService && cacheConnected) {
    try {
      console.log("🧹 Clearing Redis rate limit cache...");
      // Clear all rate limit keys from Redis with timeout
      const keys = await withTimeout(cacheService.client.keys("rate_limit:*"));
      if (keys.length > 0) {
        await withTimeout(cacheService.client.del(...keys));
        console.log(`✅ Cleared ${keys.length} rate limit entries from Redis`);
      } else {
        console.log("ℹ️  No rate limit entries found in Redis");
      }
    } catch (error) {
      console.log("❌ Failed to clear Redis cache:", error.message);
      console.log("💡 Try restarting the server instead (option 5)");
    }
  } else {
    console.log("⚠️  Redis not available. Recommend server restart instead.");
  }
  console.log("🔄 Server restart recommended to clear memory-based limits");
}

async function clearUserRateLimits(userId) {
  if (!userId || userId.trim() === "") {
    console.log("❌ Please provide a valid user ID");
    return;
  }

  if (cacheService && cacheConnected) {
    try {
      console.log(`🧹 Clearing rate limits for user: ${userId}...`);
      const keys = await withTimeout(
        cacheService.client.keys(`rate_limit:*${userId}*`)
      );
      if (keys.length > 0) {
        await withTimeout(cacheService.client.del(...keys));
        console.log(
          `✅ Cleared ${keys.length} rate limit entries for user ${userId}`
        );
      } else {
        console.log(`ℹ️  No rate limit entries found for user ${userId}`);
      }
    } catch (error) {
      console.log("❌ Failed to clear user rate limits:", error.message);
    }
  } else {
    console.log("⚠️  Redis not available. Cannot clear user-specific limits.");
  }
}

async function clearAuthRateLimits() {
  if (cacheService && cacheConnected) {
    try {
      console.log("🧹 Clearing authentication rate limits...");
      const keys = await withTimeout(
        cacheService.client.keys("rate_limit:auth:*")
      );
      if (keys.length > 0) {
        await withTimeout(cacheService.client.del(...keys));
        console.log(
          `✅ Cleared ${keys.length} authentication rate limit entries`
        );
      } else {
        console.log("ℹ️  No authentication rate limit entries found");
      }
    } catch (error) {
      console.log("❌ Failed to clear auth rate limits:", error.message);
    }
  } else {
    console.log("⚠️  Redis not available. Cannot clear auth limits.");
  }
}

async function clearPlatformRateLimits() {
  if (cacheService && cacheConnected) {
    try {
      console.log("🧹 Clearing platform API rate limits...");
      const keys = await withTimeout(
        cacheService.client.keys("rate_limit:platform*")
      );
      if (keys.length > 0) {
        await withTimeout(cacheService.client.del(...keys));
        console.log(
          `✅ Cleared ${keys.length} platform API rate limit entries`
        );
      } else {
        console.log("ℹ️  No platform API rate limit entries found");
      }
    } catch (error) {
      console.log("❌ Failed to clear platform rate limits:", error.message);
    }
  } else {
    console.log("⚠️  Redis not available. Cannot clear platform limits.");
  }
}

async function showRateLimitStatus() {
  if (cacheService && cacheConnected) {
    try {
      console.log("📊 Checking rate limit status...");
      const allKeys = await withTimeout(
        cacheService.client.keys("rate_limit:*")
      );
      console.log(`📊 Rate Limit Status:`);
      console.log(`Total active rate limit entries: ${allKeys.length}`);

      if (allKeys.length > 0) {
        // Group by type
        const byType = {};
        allKeys.forEach((key) => {
          const type = key.split(":")[1] || "unknown";
          byType[type] = (byType[type] || 0) + 1;
        });

        console.log("By type:");
        Object.entries(byType).forEach(([type, count]) => {
          console.log(`  ${type}: ${count} entries`);
        });
      }
    } catch (error) {
      console.log("❌ Failed to get rate limit status:", error.message);
    }
  } else {
    console.log(
      "📊 Cache service not available. Rate limits may be in memory only."
    );
  }
}

function handleChoice(choice) {
  console.log(`\n🔄 Processing option ${choice}...`);

  switch (choice) {
    case "1":
      clearAllRateLimits()
        .then(() => {
          console.log("✅ All rate limits cleared!");
          console.log("👋 Done!");
          process.exit(0);
        })
        .catch((error) => {
          console.log("❌ Error:", error.message);
          process.exit(1);
        });
      break;

    case "2":
      rl.question("Enter user ID to clear rate limits for: ", (userId) => {
        clearUserRateLimits(userId)
          .then(() => {
            console.log("✅ User rate limits cleared!");
            console.log("👋 Done!");
            process.exit(0);
          })
          .catch((error) => {
            console.log("❌ Error:", error.message);
            process.exit(1);
          });
      });
      break;

    case "3":
      clearAuthRateLimits()
        .then(() => {
          console.log("✅ Authentication rate limits cleared!");
          console.log("👋 Done!");
          process.exit(0);
        })
        .catch((error) => {
          console.log("❌ Error:", error.message);
          process.exit(1);
        });
      break;

    case "4":
      clearPlatformRateLimits()
        .then(() => {
          console.log("✅ Platform API rate limits cleared!");
          console.log("👋 Done!");
          process.exit(0);
        })
        .catch((error) => {
          console.log("❌ Error:", error.message);
          process.exit(1);
        });
      break;

    case "5":
      console.log(
        "🔄 Please restart your server to clear memory-based rate limits"
      );
      console.log("Run: npm run dev (or your start command)");
      console.log("👋 Done!");
      process.exit(0);
      break;

    case "6":
      showRateLimitStatus()
        .then(() => {
          console.log("👋 Done!");
          process.exit(0);
        })
        .catch((error) => {
          console.log("❌ Error:", error.message);
          process.exit(1);
        });
      break;

    case "0":
      console.log("👋 Goodbye!");
      process.exit(0);
      break;

    default:
      console.log("❌ Invalid choice. Please try again.");
      askForChoice();
  }
}

function askForChoice() {
  rl.question("Choose an option (0-6): ", handleChoice);
}

// Initialize cache service if available
async function initializeCacheService() {
  if (cacheService) {
    try {
      if (cacheService.connect) {
        console.log("🔌 Connecting to Redis...");
        await withTimeout(cacheService.connect(), 5000);
        cacheConnected = true;
        console.log("✅ Redis connected successfully");
      } else {
        // Assume it's already connected or doesn't need explicit connection
        cacheConnected = true;
        console.log("✅ Cache service available");
      }
    } catch (error) {
      console.log("⚠️  Could not connect to Redis:", error.message);
      console.log(
        "💡 Some features may not work. Consider server restart instead."
      );
      cacheConnected = false;
    }
  } else {
    console.log("⚠️  Cache service not available");
  }
}

// Handle process termination gracefully
process.on("SIGINT", () => {
  console.log("\n👋 Interrupted. Goodbye!");
  rl.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n👋 Terminating. Goodbye!");
  rl.close();
  process.exit(0);
});

// Main execution
async function main() {
  await initializeCacheService();
  showMenu();
  askForChoice();
}

main().catch((error) => {
  console.error("❌ Fatal error:", error.message);
  process.exit(1);
});
