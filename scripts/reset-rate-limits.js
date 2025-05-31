#!/usr/bin/env node

const readline = require("readline");
const path = require("path");

// Import cache service to clear Redis rate limits
let cacheService;
try {
  cacheService = require("../server/services/cache-service");
} catch (error) {
  console.log("⚠️  Could not load cache service. Will restart server instead.");
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

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

async function clearAllRateLimits() {
  if (cacheService) {
    try {
      console.log("🧹 Clearing Redis rate limit cache...");
      // Clear all rate limit keys from Redis
      const keys = await cacheService.client.keys("rate_limit:*");
      if (keys.length > 0) {
        await cacheService.client.del(...keys);
        console.log(`✅ Cleared ${keys.length} rate limit entries from Redis`);
      } else {
        console.log("ℹ️  No rate limit entries found in Redis");
      }
    } catch (error) {
      console.log("❌ Failed to clear Redis cache:", error.message);
    }
  }
  console.log("🔄 Server restart recommended to clear memory-based limits");
}

async function clearUserRateLimits(userId) {
  if (cacheService && userId) {
    try {
      const keys = await cacheService.client.keys(`rate_limit:*${userId}*`);
      if (keys.length > 0) {
        await cacheService.client.del(...keys);
        console.log(
          `✅ Cleared ${keys.length} rate limit entries for user ${userId}`
        );
      } else {
        console.log(`ℹ️  No rate limit entries found for user ${userId}`);
      }
    } catch (error) {
      console.log("❌ Failed to clear user rate limits:", error.message);
    }
  }
}

async function clearAuthRateLimits() {
  if (cacheService) {
    try {
      const keys = await cacheService.client.keys("rate_limit:auth:*");
      if (keys.length > 0) {
        await cacheService.client.del(...keys);
        console.log(
          `✅ Cleared ${keys.length} authentication rate limit entries`
        );
      } else {
        console.log("ℹ️  No authentication rate limit entries found");
      }
    } catch (error) {
      console.log("❌ Failed to clear auth rate limits:", error.message);
    }
  }
}

async function clearPlatformRateLimits() {
  if (cacheService) {
    try {
      const keys = await cacheService.client.keys("rate_limit:platform*");
      if (keys.length > 0) {
        await cacheService.client.del(...keys);
        console.log(
          `✅ Cleared ${keys.length} platform API rate limit entries`
        );
      } else {
        console.log("ℹ️  No platform API rate limit entries found");
      }
    } catch (error) {
      console.log("❌ Failed to clear platform rate limits:", error.message);
    }
  }
}

async function showRateLimitStatus() {
  if (cacheService) {
    try {
      const allKeys = await cacheService.client.keys("rate_limit:*");
      console.log(`📊 Rate Limit Status:`);
      console.log(`Total active rate limit entries: ${allKeys.length}`);

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
  switch (choice) {
    case "1":
      clearAllRateLimits().then(() => {
        console.log("✅ All rate limits cleared!");
        rl.close();
      });
      break;

    case "2":
      rl.question("Enter user ID to clear rate limits for: ", (userId) => {
        clearUserRateLimits(userId).then(() => {
          console.log("✅ User rate limits cleared!");
          rl.close();
        });
      });
      break;

    case "3":
      clearAuthRateLimits().then(() => {
        console.log("✅ Authentication rate limits cleared!");
        rl.close();
      });
      break;

    case "4":
      clearPlatformRateLimits().then(() => {
        console.log("✅ Platform API rate limits cleared!");
        rl.close();
      });
      break;

    case "5":
      console.log(
        "🔄 Please restart your server to clear memory-based rate limits"
      );
      console.log("Run: npm run dev (or your start command)");
      rl.close();
      break;

    case "6":
      showRateLimitStatus().then(() => {
        rl.close();
      });
      break;

    case "0":
      console.log("👋 Goodbye!");
      rl.close();
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
if (cacheService) {
  cacheService.connect &&
    cacheService.connect().catch(() => {
      console.log(
        "⚠️  Could not connect to Redis. Some features may not work."
      );
    });
}

showMenu();
askForChoice();
