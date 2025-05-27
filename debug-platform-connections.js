const { PlatformConnection, User } = require("./server/models");
const sequelize = require("./server/config/database");

async function debugPlatformConnections() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected successfully");

    // Get all users
    const users = await User.findAll({
      attributes: ["id", "username", "email"],
      raw: true,
    });
    console.log("\n👥 All users in database:");
    console.table(users);

    // Get all platform connections
    const allConnections = await PlatformConnection.findAll({
      attributes: [
        "id",
        "userId",
        "platformType",
        "name",
        "status",
        "isActive",
        "lastSyncAt",
      ],
      raw: true,
    });
    console.log("\n🔗 All platform connections:");
    console.table(allConnections);

    // Test getActiveConnections for each user
    for (const user of users) {
      console.log(
        `\n🔍 Testing getActiveConnections for user: ${user.username} (${user.id})`
      );

      const activeConnections = await PlatformConnection.getActiveConnections(
        user.id
      );
      console.log(
        `📡 Found ${activeConnections.length} active connections for ${user.username}:`
      );

      if (activeConnections.length > 0) {
        console.table(
          activeConnections.map((c) => ({
            id: c.id,
            platformType: c.platformType,
            name: c.name,
            status: c.status,
            isActive: c.isActive,
            lastSyncAt: c.lastSyncAt,
          }))
        );

        // Test each platform connection
        for (const connection of activeConnections) {
          try {
            console.log(
              `\n🧪 Testing ${connection.platformType} connection (ID: ${connection.id})...`
            );

            // Import the platform service factory
            const PlatformServiceFactory = require("./server/modules/order-management/services/platforms/platformServiceFactory");

            // Create service instance
            const service = PlatformServiceFactory.createService(
              connection.platformType,
              connection.id
            );

            // Test connection
            const testResult = await service.testConnection();
            console.log(
              `✅ Test result for ${connection.platformType}:`,
              testResult.success ? "SUCCESS" : "FAILED"
            );
            if (!testResult.success) {
              console.log(`❌ Error: ${testResult.message}`);
            }
          } catch (error) {
            console.log(
              `❌ Error testing ${connection.platformType}:`,
              error.message
            );
          }
        }
      } else {
        console.log("❌ No active connections found for this user");
      }
    }

    console.log("\n🎯 Recommendations:");
    if (allConnections.length === 0) {
      console.log(
        "• No platform connections found. Create some connections first."
      );
    } else if (users.length === 0) {
      console.log("• No users found. Create a user account first.");
    } else {
      const activeCount = allConnections.filter(
        (c) => c.isActive && c.status === "active"
      ).length;
      if (activeCount === 0) {
        console.log(
          "• Platform connections exist but none are active. Check status and isActive fields."
        );
      } else {
        console.log(
          "• Platform connections look good. The issue might be in the JWT token or request authentication."
        );
        console.log(
          "• Check that the user ID in your JWT token matches the database user ID."
        );
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

console.log("🔧 Debug Platform Connections");
console.log("===============================");
debugPlatformConnections();
