const logger = require("../utils/logger");
const { Order } = require("../models");
const sequelize = require("../config/database");
const { Op } = require("sequelize");

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
      timestamp: new Date().toISOString(),
    };

    // Enhanced structured logging function with detailed feedback
    const structuredLog = (level, message, additionalData = {}) => {
      const logData = {
        ...logContext,
        ...additionalData,
        source: "OrderFetchingExecutor",
        phase: additionalData.phase || "execution",
        timestamp: new Date().toISOString(),
        elapsed: Date.now() - progressReporter.startTime,
      };

      // Create detailed message for task logs
      let detailedMessage = message;
      if (additionalData.phase) {
        detailedMessage = `[${additionalData.phase.toUpperCase()}] ${message}`;
      }

      // Add progress context if available
      if (processedOrders > 0 || duplicatesSkipped > 0) {
        detailedMessage += ` (Processed: ${processedOrders}, Skipped: ${duplicatesSkipped})`;
      }

      onLog(level, detailedMessage, logData);

      // Also log to application logger for debugging
      if (level === "error") {
        logger.error(`[Task ${task.id}] ${detailedMessage}`, logData);
      } else if (level === "warn") {
        logger.warn(`[Task ${task.id}] ${detailedMessage}`, logData);
      } else {
        logger.info(`[Task ${task.id}] ${detailedMessage}`, logData);
      }
    };

    // Connection management and variables initialization
    let platformService = null;
    let dbTransaction = null;
    let processedOrders = 0; // Initialize here to ensure it's always in scope
    let duplicatesSkipped = 0; // Initialize here to ensure it's always in scope
    let orders = [];
    let allOrders = [];
    let estimatedTotal = 1000; // Default value, will be updated when orders are fetched
    let actualTotal = 1000; // Track actual number of orders to process
    let progressReporter = {
      current: 0,
      total: 0,
      percentage: 0,
      phase: "initializing",
      startTime: Date.now(),
      lastUpdate: Date.now(),
    };

    try {
      // Initialize with enhanced logging
      structuredLog("info", "Starting order fetching task", {
        config,
        source: task.metadata?.source || "unknown",
        phase: "initialization",
      });

      // Log how this task was created (important for debugging)
      structuredLog(
        "info",
        `Task source: ${task.metadata?.source || "unknown"}`,
        {
          metadata: task.metadata,
          createdAt: task.createdAt,
          phase: "initialization",
        }
      );

      // Get platform connection with error handling
      const platformConnection = task.platformConnection;
      if (!platformConnection) {
        throw new Error("Platform connection not found");
      }

      structuredLog("info", "Platform connection validated", {
        platformType: platformConnection.platformType,
        platformConnectionId: task.platformConnectionId,
        credentials: platformConnection.credentials ? "Present" : "Missing",
        phase: "connection_setup",
      });

      // Normalize configuration to handle different frontend formats
      let normalizedConfig = { ...config };

      // Handle legacy/frontend config format
      if (config.dateRangeMode) {
        // Convert frontend config to executor format
        if (
          config.dateRangeMode === "interval" &&
          config.intervalPeriod === "month"
        ) {
          const days = config.customDays || 30;
          normalizedConfig.mode = "duration";
          normalizedConfig.duration = days;
          normalizedConfig.startDate =
            config.fromDate ||
            new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
          normalizedConfig.endDate = config.toDate || new Date().toISOString();
        }
      }

      let {
        startDate = new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000
        ).toISOString(), // Default: 30 days ago
        endDate = new Date().toISOString(), // Default: now
        batchSize = 100,
        maxOrders = 1000,
        mode: configMode = "duration",
        duration = 30,
        stopAtFirst = false,
        intervalPeriod = "month", // week, month, quarter, year, custom
        customDays = 30,
      } = normalizedConfig;

      // Enhanced Auto Mode: Calculate date range based on oldest order
      if (configMode === "auto") {
        const autoDateRange = await this.calculateAutoDateRange(
          task,
          platformConnection,
          normalizedConfig
        );

        if (autoDateRange) {
          startDate = autoDateRange.startDate;
          endDate = autoDateRange.endDate;

          structuredLog("info", "Auto mode: Calculated date range", {
            originalStartDate: normalizedConfig.startDate || "default",
            originalEndDate: normalizedConfig.endDate || "default",
            calculatedStartDate: startDate,
            calculatedEndDate: endDate,
            oldestOrderDate: autoDateRange.oldestOrderDate,
            isInitialRun: autoDateRange.isInitialRun,
            phase: "auto_date_calculation",
          });
        }
      }

      structuredLog("info", "Starting order fetching task execution", {
        phase: "initialization",
        config: {
          mode: configMode,
          duration,
          batchSize,
          maxOrders,
          startDate,
          endDate,
        },
        platform: platformConnection.platformType,
        connectionId: platformConnection.id,
      });

      structuredLog("info", "Task configuration validated and normalized", {
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
        phase: "configuration",
      });

      // Initialize progress with enhanced reporting
      estimatedTotal = maxOrders;
      progressReporter.total = estimatedTotal;
      progressReporter.startTime = Date.now();
      progressReporter.lastUpdate = Date.now();

      onProgress(0, estimatedTotal, "Initializing order fetch", "connecting");

      // Check for cancellation
      checkCancellation();

      // Connect to platform API with connection guard
      try {
        structuredLog(
          "info",
          `Initializing connection to ${platformConnection.platformType.toUpperCase()} platform`,
          {
            platformType: platformConnection.platformType,
            platformName:
              platformConnection.name || platformConnection.platformName,
            connectionId: platformConnection.id,
            environment: platformConnection.environment || "production",
            phase: "connecting",
          }
        );

        onProgress(
          10,
          estimatedTotal,
          `Connecting to ${platformConnection.platformType.toUpperCase()}`,
          "connecting"
        );

        platformService = await this.getPlatformService(platformConnection);

        structuredLog(
          "info",
          `Successfully connected to ${platformConnection.platformType.toUpperCase()} platform`,
          {
            platformType: platformConnection.platformType,
            serviceName: platformService.constructor.name,
            hasAuthentication:
              !!platformService.accessToken || !!platformService.apiKey,
            phase: "connected",
          }
        );

        onProgress(
          20,
          estimatedTotal,
          `Connected to ${platformConnection.platformType.toUpperCase()}`,
          "connected"
        );
      } catch (connectionError) {
        structuredLog(
          "error",
          `Failed to establish connection to ${platformConnection.platformType.toUpperCase()}`,
          {
            error: connectionError.message,
            platformType: platformConnection.platformType,
            connectionId: platformConnection.id,
            stack: connectionError.stack,
            phase: "connection_failed",
          }
        );
        throw connectionError;
      }

      checkCancellation();

      // Fetch orders with enhanced error handling and progress tracking
      try {
        structuredLog(
          "info",
          `Starting order fetch from ${platformConnection.platformType.toUpperCase()}`,
          {
            dateRange: { startDate, endDate },
            batchSize,
            maxOrders,
            fetchMode: configMode,
            phase: "fetching_start",
          }
        );

        onProgress(
          30,
          estimatedTotal,
          "Fetching orders from platform...",
          "fetching"
        );

        const fetchStartTime = Date.now();
        const fetchResult = await platformService.fetchOrders({
          startDate,
          endDate,
          size: batchSize,
        });

        if (!fetchResult.success) {
          throw new Error(`Failed to fetch orders: ${fetchResult.message}`);
        }

        allOrders = fetchResult.data || [];
        const fetchDuration = Date.now() - fetchStartTime;

        // Update totals based on actual results
        actualTotal = Math.min(allOrders.length, maxOrders);
        estimatedTotal = actualTotal;
        progressReporter.total = estimatedTotal;
        progressReporter.phase = "processing";

        structuredLog(
          "info",
          `Successfully fetched ${
            allOrders.length
          } orders from ${platformConnection.platformType.toUpperCase()}`,
          {
            totalFetched: allOrders.length,
            actualTotal,
            maxOrders,
            fetchDuration,
            performanceMetrics: {
              ordersPerSecond:
                allOrders.length > 0
                  ? Math.round((allOrders.length / fetchDuration) * 1000)
                  : 0,
              averageOrderFetchTime:
                allOrders.length > 0
                  ? Math.round(fetchDuration / allOrders.length)
                  : 0,
            },
            phase: "fetched",
          }
        );

        onProgress(
          40,
          actualTotal,
          `Found ${allOrders.length} orders, processing ${actualTotal}`,
          "processing"
        );

        // Start database transaction for batch processing
        dbTransaction = await sequelize.transaction();

        structuredLog(
          "info",
          "Database transaction started for order processing",
          {
            transactionId: dbTransaction.id,
            totalOrdersToProcess: actualTotal,
            phase: "transaction_start",
          }
        );

        // Process orders with duplicate checking
        orders = []; // Reset orders array
        const ordersToProcess = allOrders.slice(0, maxOrders);

        for (let i = 0; i < ordersToProcess.length; i++) {
          const order = ordersToProcess[i];
          checkCancellation();
          await waitForResume(); // Handle pause/resume

          try {
            const orderProcessStartTime = Date.now();

            structuredLog(
              "debug",
              `Processing order ${i + 1}/${ordersToProcess.length}: ${
                order.orderNumber || order.id
              }`,
              {
                orderId: order.id,
                orderNumber: order.orderNumber,
                platformOrderId:
                  order.platformOrderId || order.platform_order_id,
                orderIndex: i + 1,
                totalOrders: ordersToProcess.length,
                progressPercentage: Math.round(
                  ((i + 1) / ordersToProcess.length) * 100
                ),
                phase: "order_processing",
              }
            );

            // Transform order first
            const transformedOrder = await this.transformOrder(
              order,
              platformConnection,
              task
            );

            // Log transformation details
            structuredLog("debug", `Order transformed successfully`, {
              originalOrderId: order.id,
              transformedOrderNumber: transformedOrder.orderNumber,
              customerName: transformedOrder.customerName,
              orderStatus: transformedOrder.orderStatus,
              totalAmount: transformedOrder.totalAmount,
              phase: "order_transformed",
            });

            // Check for duplicates using both externalOrderId and orderNumber
            const existingOrder = await Order.findOne({
              where: {
                [Op.or]: [
                  {
                    externalOrderId: transformedOrder.externalOrderId,
                    platformType: transformedOrder.platformType,
                    userId: transformedOrder.userId,
                  },
                  {
                    orderNumber: transformedOrder.orderNumber,
                    platformType: transformedOrder.platformType,
                    userId: transformedOrder.userId,
                  },
                ],
              },
              transaction: dbTransaction,
            });

            if (existingOrder) {
              duplicatesSkipped++;
              structuredLog(
                "info",
                `Duplicate order skipped: ${transformedOrder.orderNumber}`,
                {
                  externalOrderId: transformedOrder.externalOrderId,
                  orderNumber: transformedOrder.orderNumber,
                  existingOrderId: existingOrder.id,
                  duplicatesSkipped,
                  phase: "duplicate_skip",
                }
              );
              continue;
            }

            // Save new order with transaction
            const orderSaveStartTime = Date.now();
            const savedOrder = await Order.create(transformedOrder, {
              transaction: dbTransaction,
            });
            const orderSaveDuration = Date.now() - orderSaveStartTime;

            orders.push(savedOrder);
            processedOrders++;

            structuredLog(
              "info",
              `Order saved successfully: ${savedOrder.orderNumber}`,
              {
                orderId: savedOrder.id,
                orderNumber: savedOrder.orderNumber,
                customerName: savedOrder.customerName,
                orderStatus: savedOrder.orderStatus,
                totalAmount: savedOrder.totalAmount,
                saveDuration: orderSaveDuration,
                processedOrders,
                phase: "order_saved",
              }
            );

            // Enhanced progress reporting
            const currentTime = Date.now();
            progressReporter.current = processedOrders;
            progressReporter.percentage = Math.floor(
              (processedOrders / actualTotal) * 100
            );
            progressReporter.lastUpdate = currentTime;

            const elapsed = currentTime - progressReporter.startTime;
            const rate = processedOrders / (elapsed / 1000); // orders per second
            const eta =
              processedOrders > 0
                ? Math.round((actualTotal - processedOrders) / rate)
                : 0;

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
                  phase: "progress_checkpoint",
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
                phase: "order_error",
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
          duplicatesSkipped > 0
            ? `, skipped ${duplicatesSkipped} duplicates`
            : ""
        }`;
        onLog("info", resultMessage);

        // Check if we should continue in automatic mode
        if (configMode === "auto") {
          if (processedOrders > 0) {
            onLog(
              "info",
              `Automatic mode: Found ${processedOrders} new orders, scheduling next fetch in 30 seconds...`
            );

            // Find the oldest order date from this fetch to use for next iteration
            let oldestOrderInThisFetch = new Date();
            if (orders.length > 0) {
              oldestOrderInThisFetch = orders.reduce((oldest, order) => {
                const orderDate = new Date(order.orderDate || order.createdAt);
                const currentOldest = new Date(oldest);
                return orderDate < currentOldest ? orderDate : currentOldest;
              }, new Date());
            }

            structuredLog(
              "info",
              "Auto mode: Calculated oldest order date for next iteration",
              {
                ordersInCurrentFetch: orders.length,
                oldestOrderInThisFetch: oldestOrderInThisFetch.toISOString(),
                currentDateRange: { startDate, endDate },
                phase: "auto_next_iteration_calculation",
              }
            );

            // Schedule next automatic fetch with updated oldest date
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
                    // Update the oldest date for next iteration
                    oldestOrderDate: oldestOrderInThisFetch.toISOString(),
                  },
                  platformConnectionId: task.platformConnectionId,
                  metadata: {
                    source: "automatic_continuation",
                    parentTaskId: task.id,
                    iterationCount: (task.metadata?.iterationCount || 0) + 1,
                    oldestOrderDate: oldestOrderInThisFetch.toISOString(),
                  },
                });
                onLog(
                  "info",
                  "Next automatic fetch task scheduled successfully"
                );

                structuredLog("info", "Auto-fetch continuation scheduled", {
                  nextOldestDate: oldestOrderInThisFetch.toISOString(),
                  iterationCount: (task.metadata?.iterationCount || 0) + 1,
                  phase: "auto_scheduled_next",
                });
              } catch (error) {
                onLog(
                  "error",
                  `Failed to schedule next automatic fetch: ${error.message}`
                );

                structuredLog(
                  "error",
                  "Failed to schedule auto-fetch continuation",
                  {
                    error: error.message,
                    parentTaskId: task.id,
                    phase: "auto_schedule_failed",
                  }
                );
              }
            }, 30000); // 30 second delay
          } else {
            onLog(
              "info",
              "Automatic mode: No new orders found, stopping auto-fetch sequence"
            );

            structuredLog(
              "info",
              "Auto-fetch sequence completed - no more orders available",
              {
                totalIterations: (task.metadata?.iterationCount || 0) + 1,
                finalDateRange: { startDate, endDate },
                phase: "auto_sequence_complete",
              }
            );
          }
        }

        // Commit transaction
        if (dbTransaction) {
          await dbTransaction.commit();
          structuredLog("info", "Database transaction committed successfully", {
            transactionId: dbTransaction.id,
            phase: "transaction_commit",
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
          mode: configMode,
          automaticContinuation: configMode === "auto" && processedOrders > 0,
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
            phase: "transaction_rollback",
          });
        } catch (rollbackError) {
          structuredLog("error", "Failed to roll back database transaction", {
            error: rollbackError.message,
            transactionId: dbTransaction.id,
            phase: "transaction_rollback_failed",
          });
        }
      }

      // Close platform service connection if applicable
      if (platformService && typeof platformService.close === "function") {
        try {
          await platformService.close();
          structuredLog("info", "Platform service connection closed", {
            platformType: platformConnection.platformType,
            phase: "service_close",
          });
        } catch (closeError) {
          structuredLog(
            "error",
            "Failed to close platform service connection",
            {
              error: closeError.message,
              platformType: platformConnection.platformType,
              phase: "service_close_failed",
            }
          );
        }
      }

      // Final progress update
      onProgress(
        processedOrders,
        actualTotal,
        "Order fetching task completed",
        "completed"
      );
      structuredLog("info", "Order fetching task execution completed", {
        processedOrders,
        totalAvailable: actualTotal,
        phase: "finalization",
      });
    }
  }

  static async calculateAutoDateRange(task, platformConnection, config) {
    try {
      const {
        intervalPeriod = "month",
        customDays = 30,
        oldestOrderDate, // This comes from previous iterations
      } = config;

      const isInitialRun = !task.metadata?.source?.includes("continuation");

      if (isInitialRun) {
        // First run: use the original date range from config
        return {
          startDate:
            config.startDate ||
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: config.endDate || new Date().toISOString(),
          oldestOrderDate: null,
          isInitialRun: true,
        };
      }

      // Continuation run: calculate new date range based on oldest order from previous fetch
      if (!oldestOrderDate) {
        // If no oldest date is provided, find the oldest order from the database
        const { Order } = require("../models");
        const oldestOrder = await Order.findOne({
          where: {
            userId: task.userId,
            connectionId: platformConnection.id,
          },
          order: [["orderDate", "ASC"]],
          attributes: ["orderDate"],
        });

        if (!oldestOrder) {
          // No orders exist yet, use default range
          return {
            startDate: new Date(
              Date.now() - 30 * 24 * 60 * 60 * 1000
            ).toISOString(),
            endDate: new Date().toISOString(),
            oldestOrderDate: null,
            isInitialRun: false,
          };
        }

        oldestOrderDate = oldestOrder.orderDate;
      }

      // Calculate the period duration in days
      let periodDays = 30; // default
      switch (intervalPeriod) {
        case "week":
          periodDays = 7;
          break;
        case "month":
          periodDays = 30;
          break;
        case "quarter":
          periodDays = 90;
          break;
        case "year":
          periodDays = 365;
          break;
        case "custom":
          periodDays = customDays || 30;
          break;
      }

      // Calculate new date range going backwards from the oldest order date
      const endDate = new Date(oldestOrderDate);
      const startDate = new Date(
        endDate.getTime() - periodDays * 24 * 60 * 60 * 1000
      );

      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        oldestOrderDate: oldestOrderDate,
        isInitialRun: false,
        periodDays,
        calculatedFromOldest: true,
      };
    } catch (error) {
      logger.error("Error calculating auto date range:", error);
      // Fallback to default range
      return {
        startDate: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        endDate: new Date().toISOString(),
        oldestOrderDate: null,
        isInitialRun: false,
        error: error.message,
      };
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
    const { mapOrderStatus } = require("../utils/enum-validators");

    // Transform platform-specific order format to internal format
    const baseOrder = {
      userId: task.userId, // Required field from the task
      externalOrderId: rawOrder.id || rawOrder.orderNumber, // Required field
      orderNumber: rawOrder.orderNumber || rawOrder.id,
      platformType: platformConnection.platformType,
      platformConnectionId: platformConnection.id,
      platformOrderId: rawOrder.id || rawOrder.orderNumber, // Legacy field
      connectionId: platformConnection.id,
      orderStatus: mapOrderStatus(
        rawOrder.status ||
          rawOrder.shipmentPackageStatus ||
          rawOrder.orderStatus,
        platformConnection.platformType
      ),
      orderDate: new Date(rawOrder.orderDate || rawOrder.createdAt),
      totalAmount: parseFloat(rawOrder.totalAmount || rawOrder.total || 0),
      currency: rawOrder.currency || "TRY",
      customerName:
        rawOrder.customerName ||
        rawOrder.customerfullName ||
        rawOrder.customer?.name ||
        `${rawOrder.customer?.firstName || ""} ${
          rawOrder.customer?.lastName || ""
        }`.trim() ||
        rawOrder.shippingAddress?.fullName ||
        rawOrder.billingAddress?.fullName ||
        "",
      customerEmail: rawOrder.customerEmail || rawOrder.customer?.email || "",
      customerPhone:
        rawOrder.customerPhone ||
        rawOrder.customer?.phone ||
        rawOrder.shippingAddress?.gsm ||
        rawOrder.billingAddress?.gsm ||
        "",
      shippingAddress: rawOrder.shippingAddress || {},
      billingAddress: rawOrder.billingAddress || rawOrder.shippingAddress || {},
      items: rawOrder.items || rawOrder.lines || [],
      rawData: rawOrder, // Store original data for reference
    };

    return baseOrder;
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
