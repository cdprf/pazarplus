const logger = require("../utils/logger");
const api = require("../services/api");

/**
 * Order Fetching Task Executor
 * Handles fetching orders from e-commerce platforms
 */
class OrderFetchingExecutor {
  static async execute(task, callbacks) {
    const { onProgress, onLog, checkCancellation, waitForResume } = callbacks;
    const { config } = task;

    try {
      onLog("info", "Starting order fetching task");

      // Get platform connection
      const platformConnection = task.platformConnection;
      if (!platformConnection) {
        throw new Error("Platform connection not found");
      }

      onLog("info", `Fetching orders from ${platformConnection.platformType}`);

      const {
        startDate = null,
        endDate = null,
        batchSize = 100,
        maxOrders = 1000,
      } = config;

      // Initialize progress
      let processedOrders = 0;
      const estimatedTotal = maxOrders;
      onProgress(0, estimatedTotal, "Initializing order fetch", "connecting");

      // Check for cancellation
      checkCancellation();

      // Connect to platform API
      onProgress(10, estimatedTotal, "Connecting to platform", "connecting");
      const platformService = await this.getPlatformService(platformConnection);

      checkCancellation();

      // Get total available orders
      onLog("info", "Getting total order count");
      const totalAvailable = await platformService.getOrderCount({
        startDate,
        endDate,
      });

      const actualTotal = Math.min(totalAvailable, maxOrders);
      onProgress(20, actualTotal, `Found ${totalAvailable} orders`, "fetching");

      // Fetch orders in batches
      const orders = [];
      let offset = 0;

      while (processedOrders < actualTotal && offset < totalAvailable) {
        checkCancellation();
        await waitForResume(); // Handle pause/resume

        const batchOrders = await platformService.getOrders({
          startDate,
          endDate,
          limit: batchSize,
          offset,
        });

        if (batchOrders.length === 0) {
          break;
        }

        // Process each order in the batch
        for (const order of batchOrders) {
          checkCancellation();

          try {
            // Transform and save order
            const transformedOrder = await this.transformOrder(
              order,
              platformConnection
            );
            const savedOrder = await this.saveOrder(transformedOrder);
            orders.push(savedOrder);

            processedOrders++;

            // Update progress
            const percentage = Math.floor(
              (processedOrders / actualTotal) * 100
            );
            onProgress(
              processedOrders,
              actualTotal,
              `Processed ${processedOrders}/${actualTotal} orders`,
              "processing"
            );

            // Log every 50 orders
            if (processedOrders % 50 === 0) {
              onLog("info", `Processed ${processedOrders} orders`);
            }
          } catch (orderError) {
            onLog(
              "warn",
              `Failed to process order ${order.id}: ${orderError.message}`
            );
            // Continue with next order
          }
        }

        offset += batchSize;

        // Small delay between batches to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Final progress update
      onProgress(
        processedOrders,
        processedOrders,
        "Order fetching completed",
        "completed"
      );

      onLog(
        "info",
        `Order fetching completed. Processed ${processedOrders} orders`
      );

      return {
        success: true,
        processedOrders,
        totalAvailable,
        platform: platformConnection.platformType,
        startDate,
        endDate,
        orders: orders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          totalAmount: order.totalAmount,
        })),
        statistics: {
          successCount: orders.length,
          errorCount: processedOrders - orders.length,
          duration: Date.now() - task.startedAt,
        },
      };
    } catch (error) {
      onLog("error", `Order fetching failed: ${error.message}`);
      throw error;
    }
  }

  static async getPlatformService(platformConnection) {
    const services = {
      trendyol: require("../integrations/trendyol/TrendyolService"),
      hepsiburada: require("../integrations/hepsiburada/HepsiburadaService"),
      n11: require("../integrations/n11/N11Service"),
    };

    const ServiceClass = services[platformConnection.platformType];
    if (!ServiceClass) {
      throw new Error(
        `Unsupported platform: ${platformConnection.platformType}`
      );
    }

    return new ServiceClass(platformConnection.credentials);
  }

  static async transformOrder(rawOrder, platformConnection) {
    // Transform platform-specific order format to internal format
    const baseOrder = {
      platformType: platformConnection.platformType,
      platformConnectionId: platformConnection.id,
      platformOrderId: rawOrder.id || rawOrder.orderNumber,
      orderNumber: rawOrder.orderNumber || rawOrder.id,
      status: this.mapOrderStatus(
        rawOrder.status,
        platformConnection.platformType
      ),
      orderDate: new Date(rawOrder.orderDate || rawOrder.createdAt),
      totalAmount: parseFloat(rawOrder.totalAmount || rawOrder.total || 0),
      currency: rawOrder.currency || "TRY",
      customerName:
        rawOrder.customer?.name ||
        `${rawOrder.customer?.firstName || ""} ${
          rawOrder.customer?.lastName || ""
        }`.trim(),
      customerEmail: rawOrder.customer?.email || "",
      customerPhone: rawOrder.customer?.phone || "",
      shippingAddress: rawOrder.shippingAddress || {},
      billingAddress: rawOrder.billingAddress || rawOrder.shippingAddress || {},
      items: rawOrder.items || [],
      rawData: rawOrder, // Store original data for reference
    };

    return baseOrder;
  }

  static mapOrderStatus(platformStatus, platformType) {
    // Map platform-specific statuses to internal statuses
    const statusMaps = {
      trendyol: {
        Created: "pending",
        Approved: "confirmed",
        Picking: "processing",
        Invoiced: "processing",
        Shipped: "shipped",
        Delivered: "delivered",
        Cancelled: "cancelled",
        Returned: "returned",
      },
      hepsiburada: {
        New: "pending",
        Approved: "confirmed",
        Preparing: "processing",
        Shipped: "shipped",
        Delivered: "delivered",
        Cancelled: "cancelled",
        Returned: "returned",
      },
      n11: {
        NEW: "pending",
        APPROVED: "confirmed",
        PREPARING: "processing",
        SHIPPED: "shipped",
        DELIVERED: "delivered",
        CANCELLED: "cancelled",
        RETURNED: "returned",
      },
    };

    const statusMap = statusMaps[platformType];
    return statusMap?.[platformStatus] || "unknown";
  }

  static async saveOrder(orderData) {
    try {
      // Check if order already exists
      const existingOrder = await api.orders.findByPlatformOrderId(
        orderData.platformOrderId,
        orderData.platformType
      );

      if (existingOrder) {
        // Update existing order
        return api.orders.updateOrder(existingOrder.id, orderData);
      } else {
        // Create new order
        return api.orders.createOrder(orderData);
      }
    } catch (error) {
      logger.error("Error saving order:", error);
      throw error;
    }
  }
}

module.exports = OrderFetchingExecutor;
