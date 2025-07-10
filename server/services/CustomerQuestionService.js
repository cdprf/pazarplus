// Platform service imports
const TrendyolQuestionService = require('./TrendyolQuestionService');
const HepsiBuradaQuestionService = require('./HepsiBuradaQuestionService');
const N11QuestionService = require('./N11QuestionService');
const CustomerQuestion = require('../models/CustomerQuestion');
const CustomerReply = require('../models/CustomerReply');
const ReplyTemplate = require('../models/ReplyTemplate');
const QuestionStats = require('../models/QuestionStats');
const Customer = require('../models/Customer');
const PlatformConnection = require('../models/PlatformConnection');
const { Op, Sequelize } = require('sequelize');

let debug;
try {
  debug = require('debug')('pazar:customer:questions');
} catch (error) {
  debug = () => {}; // No-op function if debug is not available
}

class CustomerQuestionService {
  constructor() {
    this.platformServices = {};
    this.initialized = false;
  }

  /**
   * Load platform configurations from database
   */
  async loadPlatformConfigs(userId = null) {
    try {
      const whereClause = {
        status: 'active',
        isActive: true,
        platformType: {
          [Op.in]: ['trendyol', 'hepsiburada', 'n11']
        }
      };

      if (userId) {
        whereClause.userId = userId;
      }

      const connections = await PlatformConnection.findAll({
        where: whereClause,
        order: [
          ['isDefault', 'DESC'],
          ['createdAt', 'DESC']
        ]
      });

      const platformConfigs = {};

      for (const connection of connections) {
        const platformType = connection.platformType;
        if (!platformConfigs[platformType]) {
          // Use the first (default or most recent) connection for each platform
          platformConfigs[platformType] = {
            enabled: true,
            isTest: connection.environment !== 'production',
            ...connection.credentials
          };
        }
      }

      debug(
        'Loaded platform configs from database:',
        Object.keys(platformConfigs)
      );

      // Check if no configurations were found
      if (Object.keys(platformConfigs).length === 0) {
        debug(
          'No platform connections found in database. System may need configuration.'
        );
      }

      return platformConfigs;
    } catch (error) {
      debug('Error loading platform configs from database:', error.message);
      // Fallback to empty configs if database fails
      return {};
    }
  }

  /**
   * Initialize platform services with configurations
   */
  async initialize(platformConfigs) {
    try {
      // Initialize Trendyol service
      if (platformConfigs.trendyol && platformConfigs.trendyol.enabled) {
        this.platformServices.trendyol = new TrendyolQuestionService(
          platformConfigs.trendyol
        );
        debug('Trendyol question service initialized');
      }

      // Initialize HepsiBurada service
      if (platformConfigs.hepsiburada && platformConfigs.hepsiburada.enabled) {
        this.platformServices.hepsiburada = new HepsiBuradaQuestionService(
          platformConfigs.hepsiburada
        );
        debug('HepsiBurada question service initialized');
      }

      // Initialize N11 service with timeout protection
      if (platformConfigs.n11 && platformConfigs.n11.enabled) {
        try {
          // Map credentials for N11 service
          const n11Config = {
            ...platformConfigs.n11,
            secretKey: platformConfigs.n11.apiSecret // Map apiSecret to secretKey
          };

          this.platformServices.n11 = new N11QuestionService(n11Config);
          debug('N11 question service initialized');

          // Add a small delay to prevent immediate hanging
          await new Promise((resolve) => setTimeout(resolve, 100));
          debug('N11 question service post-initialization delay completed');
        } catch (error) {
          debug('Error initializing N11 question service:', error.message);
          // Continue without N11 service if it fails
        }
      }

      this.initialized = true;
      debug(
        'Customer question service initialized for platforms:',
        Object.keys(this.platformServices)
      );

      // Warn if no platforms were initialized
      if (Object.keys(this.platformServices).length === 0) {
        debug(
          'Warning: No platform services initialized. Check platform connections in database.'
        );
      }
    } catch (error) {
      debug('Error initializing customer question service:', error.message);
      throw error;
    }
  }

  /**
   * Sync questions from all enabled platforms
   */
  async syncAllQuestions(options = {}) {
    if (!this.initialized) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    const {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      endDate = new Date(),
      platforms = Object.keys(this.platformServices)
    } = options;

    const results = {
      success: true,
      platforms: {},
      totalSynced: 0,
      errors: []
    };

    // Check if any platforms are available
    if (platforms.length === 0) {
      const errorMsg =
        'No platform services available. Please configure platform connections first.';
      results.errors.push(errorMsg);
      results.success = false;
      debug(errorMsg);
      return results;
    }

    for (const platform of platforms) {
      if (!this.platformServices[platform]) {
        const error = `Platform service not available: ${platform}`;
        results.errors.push(error);
        debug(error);
        continue;
      }

      try {
        debug(`Syncing questions from ${platform}...`);
        const syncResult = await this.syncPlatformQuestions(platform, {
          startDate,
          endDate
        });
        results.platforms[platform] = syncResult;
        results.totalSynced += syncResult.synced;
        debug(`Synced ${syncResult.synced} questions from ${platform}`);
      } catch (error) {
        const errorMsg = `Error syncing ${platform}: ${error.message}`;
        results.errors.push(errorMsg);
        results.platforms[platform] = { error: error.message, synced: 0 };
        debug(errorMsg);
      }
    }

    results.success = results.errors.length === 0;
    return results;
  }

  /**
   * Sync questions from a specific platform
   */
  async syncPlatformQuestions(platform, options = {}) {
    const service = this.platformServices[platform];
    if (!service) {
      throw new Error(`Platform service not available: ${platform}`);
    }

    const { startDate, endDate } = options;
    // HepsiBurada uses 1-based pagination, others use 0-based
    let page = platform === 'hepsiburada' ? 1 : 0;
    let hasMore = true;
    let totalSynced = 0;

    while (hasMore) {
      try {
        const response = await service.getQuestions({
          startDate,
          endDate,
          page,
          size: 50
        });

        // Handle different response formats
        let questions = [];
        if (platform === 'trendyol') {
          // Trendyol returns {content: [...], page, size, totalElements, totalPages}
          questions = response.content || [];
        } else {
          // Other platforms return {questions: [...], pagination: {...}}
          questions = response.questions || [];
        }

        if (!questions || questions.length === 0) {
          hasMore = false;
          break;
        }

        // Process each question
        for (const questionData of questions) {
          try {
            // For Trendyol, we need to normalize the data before saving
            const normalizedData =
              platform === 'trendyol'
                ? service.normalizeQuestionData(questionData)
                : questionData;

            await this.saveOrUpdateQuestion(normalizedData);
            totalSynced++;
          } catch (error) {
            debug(
              `Error saving question ${questionData.platform_question_id}:`,
              error.message
            );
            // Log the full error for debugging
            console.error(
              `Failed to save question ${questionData.platform_question_id} from ${platform}:`,
              error
            );
          }
        }

        // Check if there are more pages
        if (platform === 'trendyol') {
          // Trendyol format: {page, totalPages, ...}
          hasMore = page < response.totalPages - 1;
          page++;
        } else if (response.pagination) {
          // HepsiBurada and other platforms: {pagination: {currentPage, totalPages, hasNext, ...}}
          if (platform === 'hepsiburada') {
            hasMore = response.pagination.hasNext;
            page = response.pagination.currentPage + 1;
          } else {
            // N11 and other platforms
            hasMore = page < response.pagination.totalPages - 1;
            page++;
          }
        } else {
          hasMore = false;
        }

        // Add delay to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        debug(`Error fetching page ${page} from ${platform}:`, error.message);
        hasMore = false;
      }
    }

    return { synced: totalSynced };
  }

  /**
   * Save or update a question in the database
   */
  async saveOrUpdateQuestion(questionData) {
    try {
      // Find existing question
      let question = await CustomerQuestion.findOne({
        where: {
          platform: questionData.platform,
          platform_question_id: questionData.platform_question_id
        }
      });

      if (question) {
        // Update existing question
        await question.update(questionData);
        debug(
          `Updated question ${questionData.platform_question_id} from ${questionData.platform}`
        );
      } else {
        // Create new question
        question = await CustomerQuestion.create(questionData);
        debug(
          `Created question ${questionData.platform_question_id} from ${questionData.platform}`
        );
      }

      // Update similar questions count
      await this.updateSimilarQuestionsCount(question);

      // Link to customer if possible
      await this.linkToCustomer(question);

      return question;
    } catch (error) {
      debug('Error saving question:', error.message);
      throw error;
    }
  }

  /**
   * Update similar questions count based on question hash
   */
  async updateSimilarQuestionsCount(question) {
    try {
      if (!question.question_hash) {return;}

      const similarCount = await CustomerQuestion.count({
        where: {
          question_hash: question.question_hash,
          id: { [Op.ne]: question.id }
        }
      });

      await question.update({ similar_questions_count: similarCount });
    } catch (error) {
      debug('Error updating similar questions count:', error.message);
    }
  }

  /**
   * Link question to customer profile if exists
   */
  async linkToCustomer(question) {
    try {
      if (!question.customer_name) {return;}

      const customer = await Customer.findOne({
        where: {
          [Op.or]: [
            { name: question.customer_name },
            { email: question.customer_name },
            { phone: question.customer_name }
          ]
        }
      });

      if (customer) {
        await question.update({
          customer_id: customer.id,
          customer_name: customer.name
        });
        debug(`Linked question ${question.id} to customer ${customer.id}`);
      }
    } catch (error) {
      debug('Error linking to customer:', error.message);
    }
  }

  /**
   * Get questions with filters and pagination
   */
  async getQuestions(options = {}) {
    const {
      platform,
      status,
      assigned_to,
      customer_name,
      customer_email,
      priority,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'creation_date',
      sortOrder = 'DESC'
    } = options;

    const whereClause = {};
    if (platform) {whereClause.platform = platform;}
    if (status) {whereClause.status = status;}
    if (assigned_to) {whereClause.assigned_to = assigned_to;}
    if (priority) {whereClause.priority = priority;}
    if (customer_name) {
      whereClause.customer_name = { [Op.iLike]: `%${customer_name}%` };
    }
    if (customer_email) {
      whereClause.customer_email = { [Op.iLike]: `%${customer_email}%` };
    }
    if (startDate || endDate) {
      whereClause.creation_date = {};
      if (startDate) {whereClause.creation_date[Op.gte] = startDate;}
      if (endDate) {whereClause.creation_date[Op.lte] = endDate;}
    }

    const result = await CustomerQuestion.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: CustomerReply,
          as: 'replies',
          order: [['creation_date', 'ASC']]
        }
      ],
      order: [[sortBy, sortOrder]],
      limit,
      offset: (page - 1) * limit
    });

    return {
      questions: result.rows,
      pagination: {
        page,
        limit,
        totalItems: result.count,
        totalPages: Math.ceil(result.count / limit)
      }
    };
  }

  /**
   * Get question by ID with replies
   */
  async getQuestionById(id) {
    const question = await CustomerQuestion.findByPk(id, {
      include: [
        {
          model: CustomerReply,
          as: 'replies',
          order: [['creation_date', 'ASC']]
        }
      ]
    });

    if (!question) {
      throw new Error('Question not found');
    }

    return question;
  }

  /**
   * Reply to a question
   */
  async replyToQuestion(questionId, replyData, userId) {
    try {
      const question = await this.getQuestionById(questionId);

      // Create reply record
      const reply = await CustomerReply.create({
        question_id: questionId,
        platform: question.platform,
        reply_text: replyData.text,
        reply_type: replyData.type || 'answer',
        from_type: 'merchant',
        created_by: userId,
        creation_date: new Date(),
        status: 'draft',
        template_id: replyData.template_id,
        attachments: replyData.attachments || []
      });

      // Send reply to platform
      const platformService = this.platformServices[question.platform];
      if (!platformService) {
        throw new Error(`Platform service not available: ${question.platform}`);
      }

      let platformResponse;
      if (replyData.type === 'reject') {
        platformResponse = await platformService.reportQuestion(
          question.platform_question_id,
          replyData.text
        );
      } else {
        if (question.platform === 'hepsiburada') {
          platformResponse = await platformService.answerQuestion(
            question.platform_question_id,
            replyData.text,
            replyData.attachments || []
          );
        } else {
          platformResponse = await platformService.answerQuestion(
            question.platform_question_id,
            replyData.text
          );
        }
      }

      // Update reply status
      if (platformResponse.success) {
        await reply.update({
          status: 'sent',
          sent_date: new Date(),
          platform_reply_id: platformResponse.response?.id?.toString()
        });

        // Update question status
        await question.update({
          status: replyData.type === 'reject' ? 'REJECTED' : 'ANSWERED',
          answered_date: new Date()
        });

        // Update template usage if used
        if (replyData.template_id) {
          await this.updateTemplateUsage(replyData.template_id);
        }
      } else {
        await reply.update({
          status: 'failed',
          error_message: platformResponse.error || 'Platform request failed'
        });
      }

      return reply;
    } catch (error) {
      debug('Error replying to question:', error.message);
      throw error;
    }
  }

  /**
   * Get question statistics
   */
  async getQuestionStats(options = {}) {
    const {
      platform,
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date()
    } = options;

    const whereClause = {
      creation_date: {
        [Op.between]: [startDate, endDate]
      }
    };
    if (platform) {whereClause.platform = platform;}

    const stats = await CustomerQuestion.findAll({
      attributes: [
        'platform',
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        [
          Sequelize.fn(
            'AVG',
            Sequelize.literal(
              'EXTRACT(EPOCH FROM (answered_date - creation_date))/3600'
            )
          ),
          'avg_response_time_hours'
        ]
      ],
      where: whereClause,
      group: ['platform', 'status']
    });

    // Get frequent questions
    const frequentQuestions = await CustomerQuestion.findAll({
      attributes: [
        'question_hash',
        'question_text',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: whereClause,
      group: ['question_hash', 'question_text'],
      having: Sequelize.literal('COUNT(id) > 1'),
      order: [[Sequelize.literal('count'), 'DESC']],
      limit: 10
    });

    return {
      statusCounts: stats,
      frequentQuestions: frequentQuestions.map((q) => ({
        hash: q.question_hash,
        text: q.question_text,
        count: parseInt(q.getDataValue('count'))
      })),
      totalQuestions: await CustomerQuestion.count({ where: whereClause })
    };
  }

  /**
   * Get reply templates
   */
  async getReplyTemplates(category = null) {
    const whereClause = { isActive: true };
    if (category) {whereClause.category = category;}

    return await ReplyTemplate.findAll({
      where: whereClause,
      order: [
        ['usageCount', 'DESC'],
        ['name', 'ASC']
      ]
    });
  }

  /**
   * Create or update reply template
   */
  async saveReplyTemplate(templateData, userId) {
    if (templateData.id) {
      const template = await ReplyTemplate.findByPk(templateData.id);
      if (!template) {
        throw new Error('Template not found');
      }
      return await template.update({
        ...templateData,
        userId
      });
    } else {
      return await ReplyTemplate.create({
        ...templateData,
        userId
      });
    }
  }

  /**
   * Update template usage count
   */
  async updateTemplateUsage(templateId) {
    try {
      const template = await ReplyTemplate.findByPk(templateId);
      if (template) {
        await template.update({
          usageCount: template.usageCount + 1,
          lastUsed: new Date()
        });
      }
    } catch (error) {
      debug('Error updating template usage:', error.message);
    }
  }

  /**
   * Auto-suggest templates based on question text
   */
  async suggestTemplates(questionText, platform = null, limit = 3) {
    const keywords = this.extractKeywords(questionText);

    const whereClause = {
      is_active: true,
      is_auto_suggest: true
    };

    if (platform) {
      whereClause[Op.or] = [
        { platforms: { [Op.contains]: [platform] } },
        { platforms: { [Op.contains]: ['all'] } }
      ];
    }

    const templates = await ReplyTemplate.findAll({
      where: whereClause,
      order: [['usageCount', 'DESC']]
    });

    // Score templates based on keyword matches
    const scoredTemplates = templates.map((template) => {
      const templateKeywords = template.keywords || [];
      const matchScore = keywords.reduce((score, keyword) => {
        return templateKeywords.some(
          (tk) =>
            tk.toLowerCase().includes(keyword.toLowerCase()) ||
            keyword.toLowerCase().includes(tk.toLowerCase())
        )
          ? score + 1
          : score;
      }, 0);

      return { template, score: matchScore };
    });

    return scoredTemplates
      .filter((st) => st.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((st) => st.template);
  }

  /**
   * Extract keywords from question text
   */
  extractKeywords(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .slice(0, 10); // Take first 10 meaningful words
  }

  /**
   * Generate daily statistics
   */
  async generateDailyStats(date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const platforms = ['trendyol', 'hepsiburada', 'n11', 'all'];

    for (const platform of platforms) {
      const whereClause = {
        creation_date: {
          [Op.between]: [startOfDay, endOfDay]
        }
      };

      if (platform !== 'all') {
        whereClause.platform = platform;
      }

      const stats = await CustomerQuestion.findAll({
        attributes: [
          'status',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        where: whereClause,
        group: ['status']
      });

      // Calculate response time metrics
      const responseTimeStats = await CustomerQuestion.findAll({
        attributes: [
          [
            Sequelize.fn(
              'AVG',
              Sequelize.literal(
                'EXTRACT(EPOCH FROM (answered_date - creation_date))/3600'
              )
            ),
            'avg_hours'
          ],
          [
            Sequelize.fn(
              'MAX',
              Sequelize.literal(
                'EXTRACT(EPOCH FROM (answered_date - creation_date))/3600'
              )
            ),
            'max_hours'
          ],
          [
            Sequelize.fn(
              'MIN',
              Sequelize.literal(
                'EXTRACT(EPOCH FROM (answered_date - creation_date))/3600'
              )
            ),
            'min_hours'
          ]
        ],
        where: {
          ...whereClause,
          answered_date: { [Op.not]: null }
        }
      });

      const statsData = {
        date: startOfDay.toISOString().split('T')[0],
        platform,
        total_questions: 0,
        waiting_for_answer: 0,
        answered: 0,
        rejected: 0,
        auto_closed: 0
      };

      // Populate status counts
      stats.forEach((stat) => {
        const count = parseInt(stat.getDataValue('count'));
        statsData.total_questions += count;

        switch (stat.status) {
        case 'WAITING_FOR_ANSWER':
          statsData.waiting_for_answer = count;
          break;
        case 'ANSWERED':
          statsData.answered = count;
          break;
        case 'REJECTED':
          statsData.rejected = count;
          break;
        case 'AUTO_CLOSED':
          statsData.auto_closed = count;
          break;
        }
      });

      // Add response time metrics
      if (responseTimeStats.length > 0) {
        const rtStats = responseTimeStats[0];
        statsData.avg_response_time_hours =
          parseFloat(rtStats.getDataValue('avg_hours')) || null;
        statsData.max_response_time_hours =
          parseFloat(rtStats.getDataValue('max_hours')) || null;
        statsData.min_response_time_hours =
          parseFloat(rtStats.getDataValue('min_hours')) || null;
      }

      // Save or update stats
      await QuestionStats.upsert(statsData, {
        conflictFields: ['date', 'platform']
      });
    }
  }
}

module.exports = CustomerQuestionService;
