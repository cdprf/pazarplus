const { PlatformConnection, User } = require("./server/models");
const CategorySyncService = require("./server/services/CategorySyncService");

async function syncVariantCategories() {
  console.log("🔄 SYNCING CATEGORIES FOR VARIANT TAB...\n");

  try {
    const categorySync = new CategorySyncService();

    // 1. Get users with platform connections
    console.log("1. Finding users with platform connections...");
    const users = await User.findAll({
      include: [
        {
          model: PlatformConnection,
          as: "platformConnections",
          where: { isActive: true },
          required: true,
        },
      ],
      attributes: ["id", "email"],
    });

    console.log(
      `   Found ${users.length} users with active platform connections`
    );
    console.log();

    // 2. Sync categories for each user and platform
    for (const user of users) {
      console.log(`📱 Syncing categories for user: ${user.email}`);

      for (const connection of user.platformConnections) {
        console.log(`   🔄 Syncing ${connection.platformType} categories...`);

        try {
          const result = await categorySync.syncPlatformCategories(
            connection.platformType,
            user.id,
            connection.id,
            true // Force refresh
          );

          if (result.success) {
            console.log(
              `   ✅ ${connection.platformType}: ${result.categoriesCount} categories synced`
            );
          } else {
            console.log(`   ❌ ${connection.platformType}: ${result.message}`);
          }
        } catch (error) {
          console.log(`   ❌ ${connection.platformType}: ${error.message}`);

          // For debugging, show more details for some errors
          if (
            error.message.includes("API") ||
            error.message.includes("connection")
          ) {
            console.log(`      Details: ${error.stack.split("\n")[0]}`);
          }
        }
      }
      console.log();
    }

    // 3. Verify categories were synced
    console.log("3. Verifying category sync results...");
    const { PlatformCategory } = require("./server/models");

    const platforms = ["trendyol", "hepsiburada", "n11"];
    let totalSynced = 0;

    for (const platform of platforms) {
      const count = await PlatformCategory.count({
        where: {
          platformType: platform,
          isActive: true,
        },
      });

      console.log(`   ${platform}: ${count} categories`);
      totalSynced += count;
    }

    console.log(`   Total: ${totalSynced} categories synced`);
    console.log();

    // 4. Test the variant category API
    if (totalSynced > 0) {
      console.log("4. Testing variant category API...");
      const platformController = require("./server/controllers/platform-variant-controller");

      const testUser = users[0];
      const mockReq = {
        params: { platform: "trendyol" },
        user: { id: testUser.id },
      };

      const mockRes = {
        json: (data) => {
          console.log(
            `   ✅ API returned ${data.data.categories.length} categories`
          );
          if (data.data.categories.length > 0) {
            console.log(`   Sample: ${data.data.categories[0].name}`);
          }
        },
        status: (code) => ({
          json: (data) => {
            console.log(`   ❌ API Error (${code}): ${data.message}`);
          },
        }),
      };

      await platformController.getPlatformCategories(mockReq, mockRes);
    }

    console.log("\n🎉 CATEGORY SYNC COMPLETE!");
    console.log(
      "   The variant tab should now show categories for platform selection."
    );
  } catch (error) {
    console.error("❌ Error syncing variant categories:", error.message);
    console.error("Stack trace:", error.stack);
  } finally {
    console.log("\n🔄 Category sync process complete.");
    process.exit(0);
  }
}

// Run the sync
syncVariantCategories();
