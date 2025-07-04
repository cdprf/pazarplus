const { PlatformConnection, User } = require("./server/models");
const CategorySyncService = require("./server/services/CategorySyncService");

async function syncAllPlatformCategories() {
  console.log("🔄 SYNCING ALL PLATFORM CATEGORIES...\n");

  try {
    // 1. Get all active platform connections
    console.log("1. Getting platform connections...");
    const connections = await PlatformConnection.findAll({
      where: { isActive: true },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "email"],
        },
      ],
    });

    console.log(`   Found ${connections.length} active connections`);
    connections.forEach((conn) => {
      console.log(
        `     - ${conn.platformType}: ${conn.name} (User: ${
          conn.user?.email || conn.userId
        })`
      );
    });
    console.log();

    if (connections.length === 0) {
      console.log("❌ No platform connections found. Cannot sync categories.");
      return;
    }

    // 2. Sync categories for each platform
    const categorySync = new CategorySyncService();

    for (const connection of connections) {
      console.log(
        `🔄 SYNCING ${connection.platformType.toUpperCase()} CATEGORIES`
      );
      console.log(`   Connection: ${connection.name}`);
      console.log(`   User: ${connection.user?.email || connection.userId}`);

      try {
        const result = await categorySync.syncPlatformCategories(
          connection.platformType,
          connection.userId,
          connection.id
        );

        console.log(`   📊 Sync Result:`);
        console.log(`     Success: ${result.success}`);
        console.log(`     Message: ${result.message}`);

        if (result.success) {
          console.log(
            `     ✅ Categories synced: ${result.categoriesSynced || 0}`
          );
          console.log(
            `     🔄 Categories updated: ${result.categoriesUpdated || 0}`
          );

          if (result.details) {
            console.log(`     📋 Details:`);
            console.log(
              `       Total processed: ${result.details.totalProcessed || 0}`
            );
            console.log(
              `       New categories: ${result.details.newCategories || 0}`
            );
            console.log(
              `       Updated categories: ${
                result.details.updatedCategories || 0
              }`
            );
            console.log(`       Errors: ${result.details.errors || 0}`);
          }
        } else {
          console.log(`     ❌ Sync failed: ${result.error || result.message}`);

          if (result.details?.errors) {
            console.log(`     🔍 Error details:`);
            result.details.errors.slice(0, 3).forEach((error, idx) => {
              console.log(`       ${idx + 1}. ${error}`);
            });
          }
        }
      } catch (syncError) {
        console.log(`     ❌ Sync error: ${syncError.message}`);
        console.log(`     🔍 Stack: ${syncError.stack?.split("\\n")[0]}`);
      }
      console.log();
    }

    // 3. Verify categories were synced
    console.log("3. Verifying category sync results...");
    const { PlatformCategory } = require("./server/models");

    for (const platform of ["trendyol", "hepsiburada", "n11"]) {
      const count = await PlatformCategory.count({
        where: {
          platformType: platform,
          isActive: true,
        },
      });

      console.log(`   ${platform}: ${count} categories`);

      if (count > 0) {
        // Show sample categories
        const sample = await PlatformCategory.findAll({
          where: {
            platformType: platform,
            isActive: true,
          },
          attributes: ["platformCategoryId", "name", "userId"],
          limit: 3,
          order: [["name", "ASC"]],
        });

        sample.forEach((cat) => {
          console.log(
            `     - ${cat.platformCategoryId}: ${cat.name} (User: ${cat.userId})`
          );
        });
      }
    }
    console.log();

    // 4. Test the variant category API
    console.log("4. Testing variant category API after sync...");

    const firstConnection = connections[0];

    // Import the controller properly
    const platformVariantController = require("./server/controllers/platform-variant-controller");

    // Mock request/response for testing
    const mockReq = {
      params: { platform: firstConnection.platformType },
      user: { id: firstConnection.userId },
    };

    let apiResult = null;
    const mockRes = {
      json: (data) => {
        apiResult = data;
      },
      status: (code) => ({
        json: (data) => {
          apiResult = { statusCode: code, ...data };
        },
      }),
    };

    try {
      await platformVariantController.getCategories(mockReq, mockRes);

      console.log(`   📊 API Response for ${firstConnection.platformType}:`);
      console.log(`     Success: ${apiResult?.success}`);
      console.log(
        `     Categories count: ${apiResult?.data?.categories?.length || 0}`
      );

      if (apiResult?.data?.categories?.length > 0) {
        console.log("     ✅ Categories now available for variant selection!");
        console.log("     📋 Sample categories:");
        apiResult.data.categories.slice(0, 3).forEach((cat) => {
          console.log(`       - ${cat.id}: ${cat.name}`);
        });
      } else {
        console.log("     ⚠️  Still no categories available");
      }
    } catch (apiError) {
      console.log(`     ❌ API test error: ${apiError.message}`);
    }
    console.log();

    // 5. Summary
    console.log("🎯 CATEGORY SYNC SUMMARY:");

    const totalCategories = await PlatformCategory.count({
      where: { isActive: true },
    });

    console.log(`   📊 Total categories in database: ${totalCategories}`);

    if (totalCategories > 0) {
      console.log("   ✅ Category sync completed successfully!");
      console.log("   🎉 Variant category selection should now work");
    } else {
      console.log("   ❌ No categories were synced");
      console.log("   🔧 Check platform API credentials and endpoints");
    }
  } catch (error) {
    console.error("❌ Category sync failed:", error.message);
    console.error("Stack trace:", error.stack);
  } finally {
    console.log("\\n🔄 Category sync process complete.");
    process.exit(0);
  }
}

// Run the sync
syncAllPlatformCategories();
