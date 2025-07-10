// Simplified Customer Question Service without platform service initialization
const { Op, Sequelize } = require('sequelize');
const debug = require('debug')('pazar:customer:questions:simplified');

class SimplifiedCustomerQuestionService {
  constructor() {
    // No platform services initialization - just basic database operations
    this.platformServices = {};
    this.initialized = true; // Mark as initialized immediately
    debug(
      'SimplifiedCustomerQuestionService instantiated without platform services'
    );
  }

  /**
   * Get questions with filtering and pagination - database version
   */
  async getQuestions(options = {}) {
    try {
      debug('Getting questions from database with options:', options);

      // Lazy load models
      const { CustomerQuestion } = require('../models');

      const {
        platform,
        status,
        assigned_to,
        customer_name,
        priority,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortBy = 'creation_date',
        sortOrder = 'DESC',
        search
      } = options;

      // Build where clause
      const whereClause = {};

      if (platform) {
        whereClause.platform = platform;
      }

      if (status) {
        whereClause.status = status;
      }

      if (assigned_to) {
        whereClause.assigned_to = assigned_to;
      }

      if (customer_name) {
        whereClause.customer_name = {
          [Op.iLike]: `%${customer_name}%`
        };
      }

      if (priority) {
        whereClause.priority = priority;
      }

      if (startDate) {
        whereClause.creation_date = {
          ...whereClause.creation_date,
          [Op.gte]: startDate
        };
      }

      if (endDate) {
        whereClause.creation_date = {
          ...whereClause.creation_date,
          [Op.lte]: endDate
        };
      }

      if (search) {
        whereClause[Op.or] = [
          {
            customer_name: {
              [Op.iLike]: `%${search}%`
            }
          },
          {
            question_text: {
              [Op.iLike]: `%${search}%`
            }
          },
          {
            answer_text: {
              [Op.iLike]: `%${search}%`
            }
          }
        ];
      }

      // Calculate pagination
      const offset = (page - 1) * limit;

      // Build order clause
      const orderClause = [[sortBy, sortOrder.toUpperCase()]];

      debug('Database query options:', {
        where: whereClause,
        limit,
        offset,
        order: orderClause
      });

      // Try to get questions from database
      try {
        // Lazy load CustomerReply model as well
        const { CustomerReply } = require('../models');

        const { count, rows: questions } =
          await CustomerQuestion.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: orderClause
          });

        const totalPages = Math.ceil(count / limit);

        debug(`Found ${count} questions in database`);

        return {
          questions,
          pagination: {
            page,
            limit,
            totalItems: count,
            totalPages
          }
        };
      } catch (dbError) {
        debug('Database query failed:', dbError.message);
        throw dbError;
      }
    } catch (error) {
      debug('Error in getQuestions:', error.message);
      throw error;
    }
  }

  /**
   * Get questions for a specific customer
   */
  async getQuestionsByCustomer(email, options = {}) {
    try {
      debug(`Getting questions for customer: ${email}`);

      const { CustomerQuestion } = require('../models');

      const {
        status,
        platform,
        page = 1,
        limit = 20,
        sortBy = 'creation_date',
        sortOrder = 'DESC'
      } = options;

      // Build where clause
      const whereClause = {
        customer_email: email
      };

      if (status) {
        whereClause.status = status;
      }

      if (platform) {
        whereClause.platform = platform;
      }

      // Calculate pagination
      const offset = (page - 1) * limit;

      // Try database query with fallback
      try {
        const { count, rows: questions } =
          await CustomerQuestion.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [[sortBy, sortOrder.toUpperCase()]]
          });

        const totalPages = Math.ceil(count / limit);

        return {
          questions,
          pagination: {
            page,
            limit,
            totalItems: count,
            totalPages
          }
        };
      } catch (dbError) {
        debug('Database query failed:', dbError.message);
        throw dbError;
      }
    } catch (error) {
      debug('Error getting questions by customer:', error.message);
      throw error;
    }
  }

  /**
   * Get question by ID
   */
  async getQuestionById(id) {
    try {
      debug(`Getting question by ID: ${id}`);

      const { CustomerQuestion } = require('../models');

      try {
        const question = await CustomerQuestion.findByPk(id);

        if (question) {
          debug(`Found question: ${question.question_text}`);
          return question;
        } else {
          debug(`Question ${id} not found in database`);
          return null;
        }
      } catch (dbError) {
        debug('Database query failed:', dbError.message);
        throw dbError;
      }
    } catch (error) {
      debug('Error getting question by ID:', error.message);
      throw error;
    }
  }

  /**
   * Update question status
   */
  async updateQuestionStatus(id, status, updatedBy = null) {
    try {
      debug(`Updating question ${id} status to: ${status}`);

      const { CustomerQuestion } = require('../models');

      try {
        const question = await CustomerQuestion.findByPk(id);

        if (!question) {
          debug(`Question ${id} not found`);
          return null;
        }

        const updatedQuestion = await question.update({
          status,
          updated_at: new Date(),
          ...(updatedBy && { updated_by: updatedBy })
        });

        debug(`Question ${id} status updated successfully`);
        return updatedQuestion;
      } catch (dbError) {
        debug('Database update failed:', dbError.message);
        throw dbError;
      }
    } catch (error) {
      debug('Error updating question status:', error.message);
      throw error;
    }
  }

  /**
   * Get question statistics
   */
  async getQuestionStats(timeframe = '30d') {
    try {
      debug('Getting question statistics for timeframe:', timeframe);

      const { CustomerQuestion } = require('../models');

      // Calculate date range
      const now = new Date();
      let startDate;

      switch (timeframe) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      try {
        // Try to get stats from database
        const [
          totalQuestions,
          waitingQuestions,
          answeredQuestions,
          rejectedQuestions,
          autoClosedQuestions,
          questionsByPlatform,
          questionsByPriority
        ] = await Promise.all([
          CustomerQuestion.count({
            where: {
              creation_date: {
                [Op.gte]: startDate
              }
            }
          }),
          CustomerQuestion.count({
            where: {
              status: 'WAITING_FOR_ANSWER',
              creation_date: {
                [Op.gte]: startDate
              }
            }
          }),
          CustomerQuestion.count({
            where: {
              status: 'ANSWERED',
              creation_date: {
                [Op.gte]: startDate
              }
            }
          }),
          CustomerQuestion.count({
            where: {
              status: 'REJECTED',
              creation_date: {
                [Op.gte]: startDate
              }
            }
          }),
          CustomerQuestion.count({
            where: {
              status: 'AUTO_CLOSED',
              creation_date: {
                [Op.gte]: startDate
              }
            }
          }),
          CustomerQuestion.findAll({
            where: {
              creation_date: {
                [Op.gte]: startDate
              }
            },
            attributes: [
              'platform',
              [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
            ],
            group: ['platform'],
            raw: true
          }),
          CustomerQuestion.findAll({
            where: {
              creation_date: {
                [Op.gte]: startDate
              }
            },
            attributes: [
              'priority',
              [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
            ],
            group: ['priority'],
            raw: true
          })
        ]);

        const stats = {
          timeframe,
          totalQuestions,
          openQuestions: waitingQuestions, // Map waiting to open for frontend compatibility
          answeredQuestions,
          rejectedQuestions,
          autoClosedQuestions,
          responseRate:
            totalQuestions > 0
              ? ((answeredQuestions / totalQuestions) * 100).toFixed(2)
              : 0,
          platformDistribution: questionsByPlatform,
          priorityDistribution: questionsByPriority
        };

        debug('Database statistics calculated successfully');
        return stats;
      } catch (dbError) {
        debug('Database stats query failed:', dbError.message);
        throw dbError;
      }
    } catch (error) {
      debug('Error getting question statistics:', error.message);
      throw error;
    }
  }

  /**
   * Reply to a question (simplified version - creates reply record but no platform integration)
   */
  async replyToQuestion(questionId, replyData, userId) {
    try {
      debug(`Replying to question ${questionId} with simplified service`);

      // Lazy load models
      const { CustomerQuestion, CustomerReply } = require('../models');

      const question = await this.getQuestionById(questionId);
      if (!question) {
        throw new Error(`Question with ID ${questionId} not found`);
      }

      // Validate userId - ensure it's a valid UUID format, fallback to default user if needed
      let validUserId = userId;
      if (
        !userId ||
        typeof userId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          userId
        )
      ) {
        debug(`Invalid userId "${userId}", using default user`);
        validUserId = '38d86fd2-bf87-4271-b49d-f1a7645ee4ef'; // Default to existing user
      }

      // Create reply record
      const reply = await CustomerReply.create({
        question_id: questionId,
        platform: question.platform,
        reply_text: replyData.text,
        reply_type: replyData.type || 'answer',
        from_type: 'merchant',
        created_by: null, // Set to null for now due to schema mismatch (expects integer, but users have UUID)
        creation_date: new Date(),
        status: 'draft', // Start as draft since no platform integration
        template_id: replyData.template_id,
        attachments: replyData.attachments || []
      });

      debug(`Reply created with ID ${reply.id} for question ${questionId}`);

      // Update question status
      await question.update({
        status: replyData.type === 'reject' ? 'REJECTED' : 'ANSWERED',
        answered_date: new Date()
      });

      debug(`Question ${questionId} status updated to ${question.status}`);

      // Since this is simplified service without platform integration,
      // we keep the reply as "draft" with a message explaining the situation
      await reply.update({
        status: 'draft',
        error_message:
          'Reply created but not sent to platform - platform services not initialized'
      });

      return reply;
    } catch (error) {
      debug('Error replying to question:', error.message);
      throw error;
    }
  }

  /**
   * Sync questions from platforms (placeholder - no actual platform integration)
   */
  async syncQuestions(platforms = []) {
    debug('Sync questions called - but no platform services initialized');

    return {
      success: true,
      message: 'Sync not performed - platform services not initialized',
      synced: 0,
      platforms: []
    };
  }
}

module.exports = SimplifiedCustomerQuestionService;
