const cron = require("node-cron");
const logger = require("../utils/logger");
const ProductOrderLinkingService = require("../services/product-order-linking-service");
const { OrderItem, Order } = require("../models");
const { Op } = require("sequelize");

class ProductLinkingJobService {
  constructor() {
    this.linkingService = new ProductOrderLinkingService();
    this.isRunning = false;
    this.lastRunStats = null;
    this.schedules = [];
  }

  /**
   * Initialize and start all scheduled jobs
   */
  start() {
    logger.info("Starting Product Linking Background Jobs");

    // Run every 30 minutes
    const autoLinkingJob = cron.schedule(
      "*/30 * * * *",
      async () => {
        await this.runAutoLinking();
      },
      {
        scheduled: false,
        timezone: "Europe/Istanbul",
      }
    );

    // Run daily at 2 AM for comprehensive linking
    const dailyLinkingJob = cron.schedule(
      "0 2 * * *",
      async () => {
        await this.runDailyLinking();
      },
      {
        scheduled: false,
        timezone: "Europe/Istanbul",
      }
    );

    // Run weekly on Sunday at 3 AM for cleanup and optimization
    const weeklyOptimizationJob = cron.schedule(
      "0 3 * * 0",
      async () => {
        await this.runWeeklyOptimization();
      },
      {
        scheduled: false,
        timezone: "Europe/Istanbul",
      }
    );

    // Store job references
    this.schedules = [
      { name: "auto-linking", job: autoLinkingJob, enabled: true },
      { name: "daily-linking", job: dailyLinkingJob, enabled: true },
      {
        name: "weekly-optimization",
        job: weeklyOptimizationJob,
        enabled: true,
      },
    ];

    // Start all jobs
    this.schedules.forEach((schedule) => {
      if (schedule.enabled) {
        schedule.job.start();
        logger.info(`Started job: ${schedule.name}`);
      }
    });

    logger.info("All Product Linking Background Jobs started successfully");
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    logger.info("Stopping Product Linking Background Jobs");
    this.schedules.forEach((schedule) => {
      schedule.job.stop();
      logger.info(`Stopped job: ${schedule.name}`);
    });
  }

  /**
   * Automatic linking job - runs every 30 minutes
   * Processes recent unlinked items
   */
  async runAutoLinking() {
    if (this.isRunning) {
      logger.warn("Auto linking job already running, skipping...");
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info("Starting automatic product linking job");

      // Get recent unlinked items (last 24 hours)
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);

      const unlinkedItems = await OrderItem.findAll({
        where: {
          productId: null,
          createdAt: { [Op.gte]: last24Hours },
        },
        include: [
          {
            model: Order,
            as: "order",
            attributes: ["id", "platform", "orderNumber", "userId"],
          },
        ],
        limit: 100, // Process max 100 items per run
        order: [["createdAt", "DESC"]],
      });

      if (unlinkedItems.length === 0) {
        logger.info("No recent unlinked items found");
        this.lastRunStats = {
          processedItems: 0,
          linkedItems: 0,
          duration: Date.now() - startTime,
          timestamp: new Date(),
        };
        return;
      }

      logger.info(`Processing ${unlinkedItems.length} recent unlinked items`);

      // Group items by user for efficiency
      const itemsByUser = {};
      unlinkedItems.forEach((item) => {
        const userId = item.order.userId;
        if (!itemsByUser[userId]) {
          itemsByUser[userId] = [];
        }
        itemsByUser[userId].push(item);
      });

      let totalProcessed = 0;
      let totalLinked = 0;

      // Process each user's items
      for (const [userId, userItems] of Object.entries(itemsByUser)) {
        try {
          // Get user's products for matching
          const userProducts = await this.linkingService.getUserProducts(
            userId
          );

          if (userProducts.length === 0) {
            logger.warn(`No products found for user ${userId}, skipping`);
            totalProcessed += userItems.length;
            continue;
          }

          const result = await this.linkingService.processBatch(
            userItems,
            userProducts,
            false // dryRun
          );

          totalProcessed += result.processed || 0;
          totalLinked += result.linked || 0;

          logger.info(
            `User ${userId}: processed ${result.processed}, linked ${result.linked}`
          );
        } catch (error) {
          logger.error(`Error processing items for user ${userId}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      this.lastRunStats = {
        processedItems: totalProcessed,
        linkedItems: totalLinked,
        duration,
        timestamp: new Date(),
      };

      logger.info(
        `Auto linking completed: ${totalLinked}/${totalProcessed} items linked in ${duration}ms`
      );
    } catch (error) {
      logger.error("Auto linking job failed:", error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Daily comprehensive linking job
   * Processes all unlinked items with more aggressive strategies
   */
  async runDailyLinking() {
    if (this.isRunning) {
      logger.warn("Daily linking job skipped - auto linking job is running");
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info("Starting daily comprehensive product linking job");

      // Get all unlinked items (with reasonable limit)
      const unlinkedItems = await OrderItem.findAll({
        where: { productId: null },
        include: [
          {
            model: Order,
            as: "order",
            attributes: ["id", "platform", "orderNumber", "userId"],
          },
        ],
        limit: 1000, // Process max 1000 items per daily run
        order: [["createdAt", "DESC"]],
      });

      if (unlinkedItems.length === 0) {
        logger.info("No unlinked items found");
        return;
      }

      logger.info(
        `Starting daily comprehensive linking for ${unlinkedItems.length} items`
      );

      // Group by user
      const itemsByUser = {};
      unlinkedItems.forEach((item) => {
        const userId = item.order.userId;
        if (!itemsByUser[userId]) {
          itemsByUser[userId] = [];
        }
        itemsByUser[userId].push(item);
      });

      let totalProcessed = 0;
      let totalLinked = 0;

      // Process each user's items with larger batch sizes
      for (const [userId, userItems] of Object.entries(itemsByUser)) {
        try {
          // Get user's products for matching
          const userProducts = await this.linkingService.getUserProducts(
            userId
          );

          if (userProducts.length === 0) {
            logger.warn(
              `No products found for user ${userId}, skipping daily linking`
            );
            totalProcessed += userItems.length;
            continue;
          }

          const result = await this.linkingService.processBatch(
            userItems,
            userProducts,
            false // dryRun
          );

          totalProcessed += result.processed || 0;
          totalLinked += result.linked || 0;

          logger.info(
            `Daily linking - User ${userId}: processed ${result.processed}, linked ${result.linked}`
          );
        } catch (error) {
          logger.error(`Error in daily linking for user ${userId}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      logger.info(
        `Daily linking completed: ${totalLinked}/${totalProcessed} items linked in ${duration}ms`
      );
    } catch (error) {
      logger.error("Daily linking job failed:", error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Weekly optimization job
   * Cleans up and optimizes linking data
   */
  async runWeeklyOptimization() {
    try {
      logger.info("Starting weekly optimization job");

      // Get linking statistics for the week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const weeklyStats = await this.generateLinkingReport(weekAgo);

      logger.info("Weekly linking report:", weeklyStats);

      // Here you could add:
      // - Cleanup of old linking attempts
      // - Optimization of matching algorithms based on success rates
      // - Alert generation for low linking rates
      // - Performance metrics collection

      logger.info("Weekly optimization completed");
    } catch (error) {
      logger.error("Weekly optimization job failed:", error);
    }
  }

  /**
   * Generate linking statistics report
   */
  async generateLinkingReport(since = null) {
    const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours

    const totalItems = await OrderItem.count({
      where: { createdAt: { [Op.gte]: sinceDate } },
      include: [{ model: Order, as: "order", attributes: [] }],
    });

    const linkedItems = await OrderItem.count({
      where: {
        productId: { [Op.not]: null },
        createdAt: { [Op.gte]: sinceDate },
      },
      include: [{ model: Order, as: "order", attributes: [] }],
    });

    const linkingRate =
      totalItems > 0 ? ((linkedItems / totalItems) * 100).toFixed(2) : "0.00";

    return {
      period: since ? "custom" : "last_24h",
      since: sinceDate,
      totalItems,
      linkedItems,
      unlinkedItems: totalItems - linkedItems,
      linkingRate: parseFloat(linkingRate),
    };
  }

  /**
   * Get job status and statistics
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRunStats: this.lastRunStats,
      schedules: this.schedules.map((s) => ({
        name: s.name,
        enabled: s.enabled,
        running: s.job.running,
      })),
    };
  }

  /**
   * Manually trigger auto linking job
   */
  async triggerAutoLinking() {
    logger.info("Manually triggering auto linking job");
    await this.runAutoLinking();
  }

  /**
   * Enable or disable a specific job
   */
  toggleJob(jobName, enabled) {
    const schedule = this.schedules.find((s) => s.name === jobName);
    if (schedule) {
      schedule.enabled = enabled;
      if (enabled) {
        schedule.job.start();
        logger.info(`Enabled job: ${jobName}`);
      } else {
        schedule.job.stop();
        logger.info(`Disabled job: ${jobName}`);
      }
      return true;
    }
    return false;
  }
}

module.exports = ProductLinkingJobService;
