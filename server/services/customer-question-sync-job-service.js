let cron;
let cronEnabled = true;

try {
  cron = require('node-cron');
} catch (error) {
  logger.warn('Cron job dependencies not available:', error.message);
  cronEnabled = false;

  // Create fallback cron implementation
  cron = {
    schedule: () => ({
      start: () => {},
      stop: () => {},
      destroy: () => {}
    }),
    validate: () => true
  };
}

const logger = require('../utils/logger');
const CustomerQuestionService = require('./CustomerQuestionService');
const PlatformConnection = require('../models/PlatformConnection');
const { Op } = require('sequelize');

class CustomerQuestionSyncJobService {
  constructor() {
    this.schedules = [];
    this.isRunning = false;
    this.lastSyncTimes = new Map();
    this.questionService = new CustomerQuestionService();
  }

  /**
   * Initialize and start all scheduled jobs
   */
  start() {
    if (!cronEnabled) {
      logger.warn('Cron jobs disabled - dependencies not available');
      return;
    }

    logger.info('Starting Customer Question Sync Background Jobs');

    // Run every 15 minutes during business hours (9 AM - 6 PM)
    const frequentSyncJob = cron.schedule(
      '*/15 9-18 * * *',
      async () => {
        await this.runFrequentSync();
      },
      {
        scheduled: false,
        timezone: 'Europe/Istanbul'
      }
    );

    // Run every hour outside business hours
    const hourlyNightSyncJob = cron.schedule(
      '0 0-8,19-23 * * *',
      async () => {
        await this.runHourlySync();
      },
      {
        scheduled: false,
        timezone: 'Europe/Istanbul'
      }
    );

    // Run comprehensive sync daily at 3 AM
    const dailySyncJob = cron.schedule(
      '0 3 * * *',
      async () => {
        await this.runDailySync();
      },
      {
        scheduled: false,
        timezone: 'Europe/Istanbul'
      }
    );

    // Store job references
    this.schedules = [
      { name: 'frequent-question-sync', job: frequentSyncJob, enabled: true },
      { name: 'hourly-night-sync', job: hourlyNightSyncJob, enabled: true },
      { name: 'daily-comprehensive-sync', job: dailySyncJob, enabled: true }
    ];

    // Start all jobs
    this.schedules.forEach((schedule) => {
      if (schedule.enabled) {
        schedule.job.start();
        logger.info(`Started job: ${schedule.name}`);
      }
    });

    logger.info(
      'All Customer Question Sync Background Jobs started successfully'
    );
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    logger.info('Stopping Customer Question Sync Background Jobs');
    this.schedules.forEach((schedule) => {
      schedule.job.stop();
      logger.info(`Stopped job: ${schedule.name}`);
    });
  }

  /**
   * Frequent sync job - runs every 15 minutes during business hours
   * Syncs questions from the last 2 hours to catch new questions quickly
   */
  async runFrequentSync() {
    if (this.isRunning) {
      logger.warn('Question sync job already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting frequent customer question sync job');

      // Get questions from last 2 hours
      const last2Hours = new Date();
      last2Hours.setHours(last2Hours.getHours() - 2);

      await this.syncQuestionsFromAllPlatforms({
        startDate: last2Hours,
        scope: 'frequent'
      });

      // Also check status updates for existing unanswered questions
      await this.syncExistingQuestionStatuses();

      const duration = Date.now() - startTime;
      logger.info('Frequent question sync completed', {
        duration: `${duration}ms`,
        scope: 'frequent'
      });
    } catch (error) {
      logger.error('Error in frequent question sync job:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Hourly sync job - runs every hour during night hours
   * Syncs questions from the last 4 hours
   */
  async runHourlySync() {
    if (this.isRunning) {
      logger.warn('Question sync job already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting hourly customer question sync job');

      // Get questions from last 4 hours
      const last4Hours = new Date();
      last4Hours.setHours(last4Hours.getHours() - 4);

      await this.syncQuestionsFromAllPlatforms({
        startDate: last4Hours,
        scope: 'hourly'
      });

      const duration = Date.now() - startTime;
      logger.info('Hourly question sync completed', {
        duration: `${duration}ms`,
        scope: 'hourly'
      });
    } catch (error) {
      logger.error('Error in hourly question sync job:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Daily comprehensive sync job
   * Syncs all questions from the last 7 days to ensure nothing is missed
   */
  async runDailySync() {
    if (this.isRunning) {
      logger.warn('Question sync job already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting daily comprehensive customer question sync job');

      // Get questions from last 7 days
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);

      await this.syncQuestionsFromAllPlatforms({
        startDate: last7Days,
        scope: 'daily',
        comprehensive: true
      });

      const duration = Date.now() - startTime;
      logger.info('Daily comprehensive question sync completed', {
        duration: `${duration}ms`,
        scope: 'daily'
      });
    } catch (error) {
      logger.error('Error in daily question sync job:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Sync questions from all available platforms
   */
  async syncQuestionsFromAllPlatforms(options = {}) {
    try {
      const { startDate, scope = 'manual', comprehensive = false } = options;

      // Get active platform connections
      const connections = await PlatformConnection.findAll({
        where: {
          status: 'active',
          isActive: true,
          platformType: {
            [Op.in]: ['trendyol', 'hepsiburada', 'n11']
          }
        },
        order: [
          ['isDefault', 'DESC'],
          ['createdAt', 'DESC']
        ]
      });

      if (connections.length === 0) {
        logger.warn('No active platform connections found for question sync');
        return { synced: 0, platforms: {} };
      }

      // Initialize question service if needed
      if (!this.questionService.initialized) {
        await this.questionService.loadPlatformConfigs();
        const platformConfigs = {};

        for (const connection of connections) {
          const platformType = connection.platformType;
          if (!platformConfigs[platformType]) {
            platformConfigs[platformType] = {
              enabled: true,
              isTest: connection.environment !== 'production',
              ...connection.credentials
            };
          }
        }

        await this.questionService.initialize(platformConfigs);
      }

      const syncResults = {
        totalSynced: 0,
        platforms: {},
        errors: []
      };

      // Sync from each platform
      const availablePlatforms = Object.keys(
        this.questionService.platformServices
      );

      for (const platform of availablePlatforms) {
        try {
          logger.info(`Syncing questions from ${platform}`, {
            scope,
            startDate
          });

          const lastSyncTime = this.lastSyncTimes.get(platform) || startDate;

          const result = await this.questionService.syncPlatformQuestions(
            platform,
            {
              startDate: comprehensive ? startDate : lastSyncTime,
              endDate: new Date()
            }
          );

          syncResults.platforms[platform] = {
            synced: result.synced || 0,
            lastSync: new Date()
          };

          syncResults.totalSynced += result.synced || 0;
          this.lastSyncTimes.set(platform, new Date());

          logger.info(
            `Synced ${result.synced || 0} questions from ${platform}`,
            {
              scope,
              platform
            }
          );

          // Add delay between platforms to respect rate limits
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (platformError) {
          logger.error(`Error syncing questions from ${platform}:`, {
            error: platformError.message,
            scope,
            platform
          });

          syncResults.errors.push({
            platform,
            error: platformError.message
          });
        }
      }

      logger.info('Question sync completed', {
        scope,
        totalSynced: syncResults.totalSynced,
        platforms: Object.keys(syncResults.platforms),
        errors: syncResults.errors.length
      });

      return syncResults;
    } catch (error) {
      logger.error('Error in syncQuestionsFromAllPlatforms:', error);
      throw error;
    }
  }

  /**
   * Generate sync statistics report
   */
  async generateSyncReport(since = null) {
    try {
      const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours

      const { CustomerQuestion } = require('../models');

      const stats = await CustomerQuestion.findAll({
        attributes: [
          'platform',
          'status',
          [
            CustomerQuestion.sequelize.fn(
              'COUNT',
              CustomerQuestion.sequelize.col('id')
            ),
            'count'
          ],
          [
            CustomerQuestion.sequelize.fn(
              'MAX',
              CustomerQuestion.sequelize.col('creation_date')
            ),
            'latest_question'
          ]
        ],
        where: {
          creation_date: {
            [Op.gte]: sinceDate
          }
        },
        group: ['platform', 'status'],
        raw: true
      });

      return {
        period: `Since ${sinceDate.toISOString()}`,
        lastSyncTimes: Object.fromEntries(this.lastSyncTimes),
        stats,
        isRunning: this.isRunning
      };
    } catch (error) {
      logger.error('Error generating sync report:', error);
      throw error;
    }
  }

  /**
   * Get job status and statistics
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      scheduledJobs: this.schedules.map((s) => ({
        name: s.name,
        enabled: s.enabled
      })),
      lastSyncTimes: Object.fromEntries(this.lastSyncTimes),
      initialized: this.questionService.initialized
    };
  }

  /**
   * Force sync now (manual trigger)
   */
  async forceSyncNow(options = {}) {
    logger.info('Force sync triggered', options);

    return await this.syncQuestionsFromAllPlatforms({
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      scope: 'manual',
      ...options
    });
  }

  /**
   * Check status updates for existing unanswered questions
   * This ensures that questions answered on the platform get their status updated locally
   */
  async syncExistingQuestionStatuses() {
    try {
      logger.info('Starting status sync for existing unanswered questions');

      // Get all unanswered questions from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const CustomerQuestion = require('../models/CustomerQuestion');

      const unansweredQuestions = await CustomerQuestion.findAll({
        where: {
          status: 'WAITING_FOR_ANSWER',
          creation_date: {
            [Op.gte]: thirtyDaysAgo
          }
        },
        order: [['creation_date', 'DESC']]
      });

      logger.info(
        `Found ${unansweredQuestions.length} unanswered questions to check`
      );

      let statusUpdates = 0;

      for (const question of unansweredQuestions) {
        try {
          const platform = question.platform;
          const platformQuestionId = question.platform_question_id;

          if (!this.questionService.platformServices[platform]) {
            continue;
          }

          // Get the current status from the platform
          const platformService =
            this.questionService.platformServices[platform];
          const updatedQuestion = await platformService.getQuestionByNumber(
            platformQuestionId
          );

          if (updatedQuestion && updatedQuestion.status !== question.status) {
            // Status has changed on the platform, update locally
            await question.update({
              status: updatedQuestion.status,
              answered_date: updatedQuestion.answered_date,
              last_modified_at: updatedQuestion.last_modified_at || new Date()
            });

            statusUpdates++;
            logger.info(
              `Updated question ${question.id} status from ${question.status} to ${updatedQuestion.status}`,
              {
                platform,
                platformQuestionId
              }
            );
          }
        } catch (error) {
          logger.warn(
            `Failed to check status for question ${question.id}:`,
            error.message
          );
        }
      }

      logger.info(`Status sync completed: ${statusUpdates} questions updated`);
      return statusUpdates;
    } catch (error) {
      logger.error('Error in status sync for existing questions:', error);
      return 0;
    }
  }
}

module.exports = CustomerQuestionSyncJobService;
