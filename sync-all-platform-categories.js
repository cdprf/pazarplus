#!/usr/bin/env node
/**
 * Sync all platform categories with proper user ID
 */

const CategorySyncService = require("./server/services/CategorySyncService");
const { User, PlatformConnection } = require("./server/models");

async function syncAllPlatformCategories() {
  try {
    console.log("Starting comprehensive category sync...");

    // Get a valid user for the sync
    const user = await User.findOne();
    if (!user) {
      console.log("No users found in database");
      return;
    }

    console.log(`Using user: ${user.email} (${user.id})`);

    const syncService = new CategorySyncService();
    const platforms = ["trendyol", "hepsiburada", "n11"];

    for (const platform of platforms) {
      console.log(`\n--- Syncing ${platform} categories ---`);

      try {
        // Check if we have a platform connection for this user and platform
        const connection = await PlatformConnection.findOne({
          where: {
            platformType: platform,
            userId: user.id,
          },
        });

        if (!connection) {
          console.log(
            `No ${platform} connection found for user, using general sync`
          );
        } else {
          console.log(`Found ${platform} connection: ${connection.id}`);
        }

        const result = await syncService.syncPlatformCategories(
          platform,
          user.id
        );
        console.log(`✅ ${platform} sync completed: ${result.message}`);

        if (result.data && result.data.stats) {
          console.log(`   Stats: ${JSON.stringify(result.data.stats)}`);
        }
      } catch (error) {
        console.log(`❌ ${platform} sync failed: ${error.message}`);
      }
    }

    // Verify results
    console.log("\n--- Verification ---");
    const { PlatformCategory } = require("./server/models");

    for (const platform of platforms) {
      const count = await PlatformCategory.count({
        where: { platformType: platform, userId: user.id },
      });
      console.log(`${platform}: ${count} categories for user`);

      // Also check total without user filter
      const totalCount = await PlatformCategory.count({
        where: { platformType: platform },
      });
      console.log(`${platform}: ${totalCount} categories total`);
    }
  } catch (error) {
    console.error("Sync failed:", error.message);
  }

  process.exit(0);
}

syncAllPlatformCategories().catch(console.error);
