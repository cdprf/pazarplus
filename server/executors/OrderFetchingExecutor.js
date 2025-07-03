const logger = require("../utils/logger");
const { Order } = require("../models");
const sequelize = require("../config/database");

/**
 * Order Fetching Task Executor
 * Handles fetching orders from e-commerce platforms with enhanced logging and connection management
 */
class OrderFetchingExecutor {
  static async execute(task, callbacks) {
    const { onProgress, onLog, checkCancellation, waitForResume } = callbacks;
    const { config } = task;
    
    // Create structured logging context
    const logContext = {
      taskId: task.id,
      taskType: task.taskType,
      platformConnectionId: task.platformConnectionId,
      userId: task.userId,
      executorVersion: "2.0.0",
      timestamp: new Date().toISOString()
    };
    
    // Enhanced structured logging function
    const structuredLog = (level, message, additionalData = {}) => {
      const logData = {
        ...logContext,
        ...additionalData,
        source: "OrderFetchingExecutor",
        phase: additionalData.phase || "execution"
      };
      onLog(level, message, logData);
    };
    
    // Connection management
    let platformService = null;
    let dbTransaction = null;

    try {
      // Initialize with enhanced logging
      structuredLog("info", "Starting order fetching task", {
        config,
        source: task.metadata?.source || "unknown",
        phase: "initialization"
      });
      
      // Log how this task was created (important for debugging)
      structuredLog("info", `Task source: ${task.metadata?.source || "unknown"}`, {
        metadata: task.metadata,
        createdAt: task.createdAt,
        phase: "initialization"
      });

      // Get platform connection with error handling
      const platformConnection = task.platformConnection;
      if (!platformConnection) {
        throw new Error("Platform connection not found");
      }

      structuredLog("info", "Platform connection validated", {
        platformType: platformConnection.platformType,
        platformConnectionId: task.platformConnectionId,
        credentials: platformConnection.credentials ? "Present" : "Missing",
        phase: "connection_setup"
      });

      // Normalize configuration to handle different frontend formats
      let normalizedConfig = { ...config };
      
      // Handle legacy/frontend config format
      if (config.dateRangeMode) {
        // Convert frontend config to executor format
        if (config.dateRangeMode === "interval" && config.intervalPeriod === "month") {
          const days = config.customDays || 30;
          normalizedConfig.mode = "duration";
          normalizedConfig.duration = days;
          normalizedConfig.startDate = config.fromDate || new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
          normalizedConfig.endDate = config.toDate || new Date().toISOString();
        }
      }

      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Default: 30 days ago
        endDate = new Date().toISOString(), // Default: now
        batchSize = 100,
        maxOrders = 1000,
        mode: configMode = "duration",
        duration = 30,
        stopAtFirst = false,
      } = normalizedConfig;

      structuredLog("info", "Order fetching configuration validated", {
        originalConfig: config,
        normalizedConfig: {
          startDate,
          endDate,
          batchSize,
          maxOrders,
          mode: configMode,
          duration,
          stopAtFirst,
        },
        phase: "configuration"
      });

      // Initialize progress with enhanced reporting
      let processedOrders = 0;
      const estimatedTotal = maxOrders;
      const progressReporter = {
        current: 0,
        total: estimatedTotal,
        percentage: 0,
        phase: "initializing",
        startTime: Date.now(),
        lastUpdate: Date.now()
      };
      
      onProgress(0, estimatedTotal, "Initializing order fetch", "connecting");

      // Check for cancellation
      checkCancellation();

      // Connect to platform API with connection guard
      try {
        structuredLog("info", "Establishing platform connection", {
          platformType: platformConnection.platformType,
          phase: "connecting"
        });
        
        onProgress(10, estimatedTotal, "Connecting to platform", "connecting");
        
        platformService = await this.getPlatformService(platformConnection);
        
        structuredLog("info", "Platform service connected successfully", {
          platformType: platformConnection.platformType,
          phase: "connected"
        });
      } catch (connectionError) {
        structuredLog("error", "Failed to establish platform connection", {
          error: connectionError.message,
          platformType: platformConnection.platformType,
          phase: "connection_failed"
        });
        throw connectionError;
      }

      checkCancellation();

      // Fetch orders with enhanced error handling and progress tracking
      try {
        structuredLog("info", "Fetching orders from platform", {
          dateRange: { startDate, endDate },
          batchSize,
          maxOrders,
          phase: "fetching"
        });
        
        onProgress(15, estimatedTotal, "Fetching orders", "fetching");

        const fetchResult = await platformService.fetchOrders({
          startDate,
          endDate,
          size: batchSize,
        });

        if (!fetchResult.success) {
          throw new Error(`Failed to fetch orders: ${fetchResult.message}`);
        }

        const allOrders = fetchResult.data || [];
        const actualTotal = Math.min(allOrders.length, maxOrders);

        // Update progress reporter
        progressReporter.total = actualTotal;
        progressReporter.phase = "processing";

        onProgress(
          20,
          actualTotal,
          `Found ${allOrders.length} orders, processing ${actualTotal}`,
          "processing"
        );

        structuredLog("info", "Orders fetched successfully", {
          totalFetched: allOrders.length,
          maxOrders,
          actualTotal,
          fetchDuration: Date.now() - progressReporter.startTime,
          phase: "fetched"
        });

        // Start database transaction for batch processing
        dbTransaction = await sequelize.transaction();
        
        structuredLog("info", "Database transaction started for order processing", {
          transactionId: dbTransaction.id,
          phase: "transaction_start"
        });

        // Process orders with duplicate checking
        const orders = [];
        const ordersToProcess = allOrders.slice(0, maxOrders);
        let duplicatesSkipped = 0;

      for (let i = 0; i < ordersToProcess.length; i++) {
        const order = ordersToProcess[i];
        checkCancellation();
        await waitForResume(); // Handle pause/resume

        try {
          structuredLog(
            "debug",
            `Processing order ${i + 1}/${ordersToProcess.length}`,
            {
              orderId: order.id,
              platformOrderId: order.platformOrderId || order.platform_order_id,
              orderIndex: i + 1,
              totalOrders: ordersToProcess.length,
              phase: "order_processing"
            }
          );

          // Transform order first
          const transformedOrder = await this.transformOrder(
            order,
            platformConnection,
            task
          );

          // Check for duplicates before saving
          const existingOrder = await Order.findOne({
            where: {
              externalOrderId: transformedOrder.externalOrderId,
              platformType: transformedOrder.platformType,
              userId: transformedOrder.userId,
            },
            transaction: dbTransaction
          });

          if (existingOrder) {
            duplicatesSkipped++;
            structuredLog(
              "debug",
              `Skipping duplicate order: ${transformedOrder.externalOrderId}`,
              {
                externalOrderId: transformedOrder.externalOrderId,
                duplicatesSkipped,
                phase: "duplicate_skip"
              }
            );
            continue;
          }

          // Save new order with transaction
          const savedOrder = await Order.create(transformedOrder, { transaction: dbTransaction });
          orders.push(savedOrder);
          processedOrders++;

          // Enhanced progress reporting
          const currentTime = Date.now();
          progressReporter.current = processedOrders;
          progressReporter.percentage = Math.floor((processedOrders / actualTotal) * 100);
          progressReporter.lastUpdate = currentTime;
          
          const elapsed = currentTime - progressReporter.startTime;
          const rate = processedOrders / (elapsed / 1000); // orders per second
          const eta = processedOrders > 0 ? Math.round((actualTotal - processedOrders) / rate) : 0;
          
          onProgress(
            processedOrders,
            actualTotal,
            `Processed ${processedOrders}/${actualTotal} orders (${duplicatesSkipped} duplicates skipped) - ETA: ${eta}s`,
            "processing"
          );

          // Enhanced logging every 25 orders with performance metrics
          if (processedOrders % 25 === 0) {
            structuredLog(
              "info",
              `Progress checkpoint: ${processedOrders} orders processed`,
              {
                processed: processedOrders,
                total: actualTotal,
                duplicates: duplicatesSkipped,
                percentage: progressReporter.percentage,
                rate: Math.round(rate * 100) / 100,
                eta: eta,
                elapsed: Math.round(elapsed / 1000),
                phase: "progress_checkpoint"
              }
            );
          }
        } catch (orderError) {
          structuredLog(
            "warn",
            `Failed to process order ${order.id || order.orderNumber}`,
            {
              error: orderError.message,
              orderId: order.id || order.orderNumber,
              orderIndex: i + 1,
              phase: "order_error"
            }
          );
          // Continue with next order
        }

        // Small delay between orders to avoid overwhelming the system
        if (i % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      // Final progress update
      onProgress(
        processedOrders,
        processedOrders,
        "Order fetching completed",
        "completed"
      );

      const resultMessage = `Order fetching completed. Processed ${processedOrders} new orders${
        duplicatesSkipped > 0 ? `, skipped ${duplicatesSkipped} duplicates` : ""
      }`;
      onLog("info", resultMessage);

      // Check if we should continue in automatic mode
      if (configMode === "auto" && processedOrders > 0) {
        onLog(
          "info",
          "Automatic mode: Found new orders, scheduling next fetch in 30 seconds..."
        );

        // Schedule next automatic fetch
        setTimeout(async () => {
          try {
            const BackgroundTaskService = require("../services/BackgroundTaskService");
            await BackgroundTaskService.createTask({
              userId: task.userId,
              taskType: "order_fetching",
              priority: "normal",
              config: {
                ...config,
                mode: "auto", // Ensure continuation
              },
              platformConnectionId: task.platformConnectionId,
              metadata: {
                source: "automatic_continuation",
                parentTaskId: task.id,
              },
            });
            onLog("info", "Next automatic fetch task scheduled successfully");
          } catch (error) {
            onLog(
              "error",
              `Failed to schedule next automatic fetch: ${error.message}`
            );
          }
        }, 30000); // 30 second delay
      } else if (mode === "auto" && processedOrders === 0) {
        onLog(
          "info",
          "Automatic mode: Found new orders, scheduling next fetch",
          {
            processedOrders,
            mode: configMode,
            phase: "auto_scheduling"
          }
        );

        // Schedule next automatic fetch
        setTimeout(async () => {
          try {
            const BackgroundTaskService = require("../services/BackgroundTaskService");
            await BackgroundTaskService.createTask({
              userId: task.userId,
              taskType: "order_fetching",
              priority: "normal",
              config: {
                ...config,
                mode: "auto", // Ensure continuation
              },
              platformConnectionId: task.platformConnectionId,
              metadata: {
                source: "automatic_continuation",
                parentTaskId: task.id,
              },
            });
            structuredLog("info", "Next automatic fetch task scheduled successfully", {
              parentTaskId: task.id,
              phase: "auto_scheduled"
            });
          } catch (error) {
            structuredLog(
              "error",
              "Failed to schedule next automatic fetch",
              {
                error: error.message,
                parentTaskId: task.id,
                phase: "auto_schedule_failed"
              }
            );
          }
        }, 30000); // 30 second delay
      }

      // Commit transaction
      if (dbTransaction) {
        await dbTransaction.commit();
        structuredLog("info", "Database transaction committed successfully", {
          transactionId: dbTransaction.id,
          phase: "transaction_commit"
        });
      }

      return {
        success: true,
        processedOrders,
        duplicatesSkipped,
        totalAvailable: allOrders.length,
        platform: platformConnection.platformType,
        startDate,
        endDate,
        mode,
        automaticContinuation: mode === "auto" && processedOrders > 0,
        orders: orders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.orderStatus,
          totalAmount: order.totalAmount,
        })),
        statistics: {
          successCount: orders.length,
          errorCount: processedOrders - orders.length,
          duplicatesSkipped,
          duration: Date.now() - progressReporter.startTime,
        },
      };
    } catch (error) {
      onLog("error", `Order fetching failed: ${error.message}`);
      throw error;
    }
    } finally {
      // Ensure transaction is rolled back on error
      if (dbTransaction) {
        try {
          await dbTransaction.rollback();
          structuredLog("info", "Database transaction rolled back", {
            transactionId: dbTransaction.id,
            phase: "transaction_rollback"
          });
        } catch (rollbackError) {
          structuredLog("error", "Failed to roll back database transaction", {
            error: rollbackError.message,
            transactionId: dbTransaction.id,
            phase: "transaction_rollback_failed"
          });
        }
      }

      // Close platform service connection if applicable
      if (platformService && typeof platformService.close === "function") {
        try {
          await platformService.close();
          structuredLog("info", "Platform service connection closed", {
            platformType: platformConnection.platformType,
            phase: "service_close"
          });
        } catch (closeError) {
          structuredLog("error", "Failed to close platform service connection", {
            error: closeError.message,
            platformType: platformConnection.platformType,
            phase: "service_close_failed"
          });
        }
      }

      // Final progress update
      onProgress(
        processedOrders,
        estimatedTotal,
        "Order fetching task completed",
        "completed"
      );
      structuredLog("info", "Order fetching task execution completed", {
        processedOrders,
        totalAvailable: estimatedTotal,
        phase: "finalization"
      });
    }
  }

  static async getPlatformService(platformConnection) {
    const services = {
      trendyol: require("../modules/order-management/services/platforms/trendyol/trendyol-service"),
      hepsiburada: require("../modules/order-management/services/platforms/hepsiburada/hepsiburada-service"),
      n11: require("../modules/order-management/services/platforms/n11/n11-service"),
    };

    const ServiceClass = services[platformConnection.platformType];
    if (!ServiceClass) {
      throw new Error(
        `Unsupported platform: ${platformConnection.platformType}`
      );
    }

    return new ServiceClass(platformConnection.id);
  }

  static async transformOrder(rawOrder, platformConnection, task) {
    // Transform platform-specific order format to internal format
    const baseOrder = {
      userId: task.userId, // Required field from the task
      externalOrderId: rawOrder.id || rawOrder.orderNumber, // Required field
      orderNumber: rawOrder.orderNumber || rawOrder.id,
      platformType: platformConnection.platformType,
      platformConnectionId: platformConnection.id,
      platformOrderId: rawOrder.id || rawOrder.orderNumber, // Legacy field
      connectionId: platformConnection.id,
      orderStatus: this.mapOrderStatus(
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
      // Direct creation - duplicate checking is now done in main execution flow
      return await Order.create(orderData);
    } catch (error) {
      logger.error("Error saving order:", error);
      throw error;
    }
  }
}

module.exports = OrderFetchingExecutor;
