// Enhanced Simple Customer Question Controller with database functionality but no platform services
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const debug = require('debug')('pazar:controller:questions:enhanced');

class EnhancedSimpleCustomerQuestionController {
  constructor() {
    // No async initialization - models will be loaded on demand
    this.initialized = false;
    debug(
      'EnhancedSimpleCustomerQuestionController instantiated without async operations'
    );
  }

  /**
   * Get questions with filters and pagination - with database queries
   */
  async getQuestions(req, res) {
    try {
      // Lazy load models only when needed
      const { CustomerQuestion } = require('../models');

      debug('Getting questions with filters and pagination from database');

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const {
        platform,
        status,
        assigned_to,
        customer_name,
        priority,
        start_date,
        end_date,
        search,
        page = 1,
        limit = 20,
        sort_by = 'creation_date',
        sort_order = 'DESC'
      } = req.query;

      // Build where clause for filtering
      const whereClause = {};

      if (platform) {
        whereClause.platform = platform;
      }

      if (status) {
        whereClause.status = status;
      }

      if (assigned_to) {
        whereClause.assigned_to = parseInt(assigned_to);
      }

      if (customer_name) {
        whereClause.customer_name = {
          [Op.iLike]: `%${customer_name}%`
        };
      }

      // Handle general search parameter
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
            product_name: {
              [Op.iLike]: `%${search}%`
            }
          }
        ];
      }

      if (priority) {
        whereClause.priority = priority;
      }

      if (start_date) {
        whereClause.creation_date = {
          ...whereClause.creation_date,
          [Op.gte]: new Date(start_date)
        };
      }

      if (end_date) {
        whereClause.creation_date = {
          ...whereClause.creation_date,
          [Op.lte]: new Date(end_date)
        };
      }

      // Calculate pagination
      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);
      const offset = (pageNumber - 1) * limitNumber;

      // Build order clause
      const orderClause = [[sort_by, sort_order.toUpperCase()]];

      debug('Query options:', {
        where: whereClause,
        limit: limitNumber,
        offset,
        order: orderClause
      });

      // Get questions from database
      const { count, rows: questions } = await CustomerQuestion.findAndCountAll(
        {
          where: whereClause,
          limit: limitNumber,
          offset,
          order: orderClause
        }
      );

      const totalPages = Math.ceil(count / limitNumber);

      debug(
        `Found ${count} questions, returning page ${pageNumber} of ${totalPages}`
      );

      res.json({
        success: true,
        data: questions,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          totalItems: count,
          totalPages
        }
      });
    } catch (error) {
      debug('Error getting questions:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to get questions',
        error: error.message
      });
    }
  }

  /**
   * Get questions for a specific customer
   */
  async getQuestionsByCustomer(req, res) {
    try {
      const { CustomerQuestion } = require('../models');
      const { email } = req.params;

      debug(`Getting questions for customer: ${email}`);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const {
        status,
        platform,
        page = 1,
        limit = 20,
        sort_by = 'creation_date',
        sort_order = 'DESC'
      } = req.query;

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
      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);
      const offset = (pageNumber - 1) * limitNumber;

      // Build order clause
      const orderClause = [[sort_by, sort_order.toUpperCase()]];

      // Get questions from database
      const { count, rows: questions } = await CustomerQuestion.findAndCountAll(
        {
          where: whereClause,
          limit: limitNumber,
          offset,
          order: orderClause
        }
      );

      const totalPages = Math.ceil(count / limitNumber);

      debug(`Found ${count} questions for customer ${email}`);

      res.json({
        success: true,
        data: questions,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          totalItems: count,
          totalPages
        }
      });
    } catch (error) {
      debug('Error getting questions by customer:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to get questions for customer',
        error: error.message
      });
    }
  }

  /**
   * Get a specific question by ID
   */
  async getQuestion(req, res) {
    try {
      const { CustomerQuestion } = require('../models');
      const { id } = req.params;

      debug(`Getting question with ID: ${id}`);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const question = await CustomerQuestion.findByPk(id);

      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found'
        });
      }

      debug(`Found question: ${question.subject}`);

      res.json({
        success: true,
        data: question
      });
    } catch (error) {
      debug('Error getting question:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to get question',
        error: error.message
      });
    }
  }

  /**
   * Update question status
   */
  async updateQuestionStatus(req, res) {
    try {
      const { CustomerQuestion } = require('../models');
      const { id } = req.params;
      const { status } = req.body;

      debug(`Updating question ${id} status to: ${status}`);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const question = await CustomerQuestion.findByPk(id);

      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found'
        });
      }

      const updatedQuestion = await question.update({
        status,
        updated_at: new Date()
      });

      debug(`Question ${id} status updated successfully`);

      res.json({
        success: true,
        message: 'Question status updated successfully',
        data: updatedQuestion
      });
    } catch (error) {
      debug('Error updating question status:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to update question status',
        error: error.message
      });
    }
  }

  /**
   * Create a reply to a question
   */
  async createReply(req, res) {
    try {
      const { CustomerReply } = require('../models');
      const { id } = req.params;
      const { message, reply_type = 'manual' } = req.body;

      debug(`Creating reply for question ${id}`);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      // Create the reply
      const reply = await CustomerReply.create({
        question_id: parseInt(id),
        message,
        reply_type,
        created_at: new Date(),
        updated_at: new Date()
      });

      debug(`Reply created successfully with ID: ${reply.id}`);

      res.status(201).json({
        success: true,
        message: 'Reply created successfully',
        data: reply
      });
    } catch (error) {
      debug('Error creating reply:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to create reply',
        error: error.message
      });
    }
  }

  /**
   * Get question statistics
   */
  async getQuestionStats(req, res) {
    try {
      const { CustomerQuestion } = require('../models');
      const { Sequelize } = require('sequelize');

      debug('Getting question statistics');

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { timeframe = '30d' } = req.query;

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

      // Get various statistics
      const [
        totalQuestions,
        openQuestions,
        answeredQuestions,
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
            status: 'open',
            creation_date: {
              [Op.gte]: startDate
            }
          }
        }),
        CustomerQuestion.count({
          where: {
            status: 'answered',
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
        openQuestions,
        answeredQuestions,
        responseRate:
          totalQuestions > 0
            ? ((answeredQuestions / totalQuestions) * 100).toFixed(2)
            : 0,
        platformDistribution: questionsByPlatform,
        priorityDistribution: questionsByPriority
      };

      debug('Question statistics calculated successfully');

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      debug('Error getting question statistics:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to get question statistics',
        error: error.message
      });
    }
  }
}

module.exports = EnhancedSimpleCustomerQuestionController;
