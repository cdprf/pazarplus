const { PlatformConnection, User } = require("./server/models");
const sequelize = require("./server/config/database");
const PlatformServiceFactory = require("./server/modules/order-management/services/platforms/platformServiceFactory");

async function testOrderFetching() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected successfully");

    // Get the dev user
    const devUser = await User.findOne({
      where: { username: "dda" }, // Changed from "test" to "dda" to match existing user
    });

    if (!devUser) {
      console.log("❌ dda user not found");
      return;
    }

    console.log(`👤 Testing for user: ${devUser.username} (${devUser.id})`);

    // Get active connections for test user
    const activeConnections = await PlatformConnection.getActiveConnections(
      devUser.id
    );
    console.log(`📡 Found ${activeConnections.length} active connections`);

    if (activeConnections.length === 0) {
      console.log("❌ No active connections found");
      return;
    }

    // Test each platform connection by fetching orders
    for (const connection of activeConnections) {
      console.log(
        `\n🔍 Testing ${connection.platformType} orders (Connection ID: ${connection.id})`
      );

      try {
        // Create service instance
        const service = PlatformServiceFactory.createService(
          connection.platformType,
          connection.id
        );

        // Test connection first
        const testResult = await service.testConnection();
        if (!testResult.success) {
          console.log(
            `❌ Connection test failed for ${connection.platformType}: ${testResult.message}`
          );
          continue;
        }

        console.log(`✅ Connection test passed for ${connection.platformType}`);

        // Try to fetch orders
        console.log(`📦 Fetching orders from ${connection.platformType}...`);

        const orders = await service.getOrders({
          limit: 5,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          endDate: new Date(),
        });

        if (orders && orders.length > 0) {
          console.log(
            `✅ Successfully fetched ${orders.length} orders from ${connection.platformType}`
          );
          console.log("📋 Sample order:", {
            id: orders[0].id || orders[0].orderId,
            status: orders[0].status,
            date: orders[0].orderDate || orders[0].createdAt,
            customer: orders[0].customerName || orders[0].customer?.name,
          });
        } else {
          console.log(
            `ℹ️  No orders found in ${connection.platformType} (this is normal if no recent orders exist)`
          );
        }
      } catch (error) {
        console.log(
          `❌ Error fetching orders from ${connection.platformType}:`,
          error.message
        );
        console.log(
          "   This might be due to API credentials, rate limits, or no orders in the date range"
        );
      }
    }

    // Now test the order controller logic
    console.log("\n🧪 Testing Order Controller Logic");
    const OrderController = require("./server/modules/order-management/controllers/order-controller");

    // Mock request and response
    const mockReq = {
      user: { id: devUser.id },
      query: { source: "platform", limit: "10" },
    };

    const mockRes = {
      json: (data) => {
        console.log("📤 Order Controller Response:");
        if (data.success) {
          console.log(
            `✅ Success: Found ${data.data?.orders?.length || 0} orders`
          );
          console.log(
            `📊 Sources: ${JSON.stringify(data.data?.sources || {})}`
          );
        } else {
          console.log(`❌ Failed: ${data.message}`);
        }
        return mockRes;
      },
      status: (code) => {
        console.log(`📋 Status Code: ${code}`);
        return mockRes;
      },
    };

    try {
      await OrderController.getOrders(mockReq, mockRes);
    } catch (error) {
      console.log("❌ Order Controller Error:", error.message);
    }
  } catch (error) {
    console.error("❌ Test Error:", error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

console.log("🧪 Testing Order Fetching for Dev User");
console.log("=====================================");
testOrderFetching();
