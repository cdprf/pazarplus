// Import necessary modules
const { Op } = require("sequelize");
const { CustomerQuestion, ReplyTemplate } = require("../models");
const CustomerQuestionService = require("../services/CustomerQuestionService");
const { validationResult } = require("express-validator");
const debug = require("debug")("pazar:controller:questions");

class CustomerQuestionController {
  constructor() {
    this.questionService = new CustomerQuestionService();
    this.initialized = false;
  }

  /**
   * Initialize the question service with platform configurations (lazy initialization)
   */
  async ensureInitialized() {
    if (this.initialized) {
      return;
    }

    try {
      // Get platform configurations from database
      debug("Loading platform configurations from database...");
      const platformConfigs = await this.questionService.loadPlatformConfigs();
      debug("Platform configurations loaded:", Object.keys(platformConfigs));

      await this.questionService.initialize(platformConfigs);
      debug("Customer question service initialized successfully");
      this.initialized = true;
      return true;
    } catch (error) {
      debug("Error initializing customer question service:", error.message);
      // Don't throw error - allow service to work without platform configs
      this.initialized = true;
      return false;
    }
  }

  /**
   * Get questions with filters and pagination
   */
  async getQuestions(req, res) {
    debug("Getting questions with filters and pagination");
    try {
      await this.ensureInitialized();

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
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
        page = 1,
        limit = 20,
        sort_by = "creation_date",
        sort_order = "DESC",
      } = req.query;

      const options = {
        platform,
        status,
        assigned_to: assigned_to ? parseInt(assigned_to) : undefined,
        customer_name,
        priority,
        startDate: start_date ? new Date(start_date) : undefined,
        endDate: end_date ? new Date(end_date) : undefined,
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy: sort_by,
        sortOrder: sort_order,
      };

      const result = await this.questionService.getQuestions(options);

      res.json({
        success: true,
        data: result.questions,
        pagination: result.pagination,
      });
    } catch (error) {
      debug("Error getting questions:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to get questions",
        error: error.message,
      });
    }
  }

  /**
   * Get a specific question by ID
   */
  async getQuestionById(req, res) {
    try {
      const { id } = req.params;
      const question = await this.questionService.getQuestionById(parseInt(id));

      res.json({
        success: true,
        data: question,
      });
    } catch (error) {
      debug("Error getting question by ID:", error.message);

      if (error.message === "Question not found") {
        return res.status(404).json({
          success: false,
          message: "Question not found",
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to get question",
        error: error.message,
      });
    }
  }

  /**
   * Reply to a question
   */
  async replyToQuestion(req, res) {
    try {
      await this.ensureInitialized();
      debug("Replying to question...");

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        debug("Validation errors:", errors.array());
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      const { text, type = "answer", template_id, attachments } = req.body;
      const userId = req.user?.id || null; // Handle case where user is not authenticated

      debug("Question ID:", id);
      debug("Reply data:", {
        text: text?.substring(0, 50) + "...",
        type,
        template_id,
        userId,
      });

      const replyData = {
        text,
        type,
        template_id: template_id ? parseInt(template_id) : undefined,
        attachments,
      };

      const reply = await this.questionService.replyToQuestion(
        parseInt(id),
        replyData,
        userId
      );
      debug("Reply sent successfully:", reply.id);

      // Provide more detailed success message based on reply status
      let successMessage = "Reply sent successfully";
      if (reply.status === "sent") {
        successMessage = "Yanıt başarıyla platforma gönderildi";
      } else if (
        reply.status === "failed" &&
        reply.error_message?.includes("already answered")
      ) {
        successMessage = "Soru daha önce yanıtlanmış olarak güncellendi";
      } else if (reply.status === "failed") {
        successMessage = "Yanıt kaydedildi ancak platforma gönderilemedi";
      }

      res.json({
        success: true,
        message: successMessage,
        data: reply,
      });
    } catch (error) {
      debug("Error replying to question:", error.message);
      debug("Error stack:", error.stack);
      res.status(500).json({
        success: false,
        message: "Failed to send reply",
        error: error.message,
      });
    }
  }

  /**
   * Sync questions from platforms
   */
  async syncQuestions(req, res) {
    try {
      await this.ensureInitialized();

      const { platforms, start_date, end_date } = req.body;

      const options = {};
      if (start_date) {
        options.startDate = new Date(start_date);
      }
      if (end_date) {
        options.endDate = new Date(end_date);
      }
      if (platforms) {
        options.platforms = platforms;
      }

      debug("Starting question sync with options:", options);

      const result = await this.questionService.syncAllQuestions(options);

      res.json({
        success: result.success,
        message: `Synced ${result.totalSynced} questions`,
        data: result,
      });
    } catch (error) {
      debug("Error syncing questions:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to sync questions",
        error: error.message,
      });
    }
  }

  /**
   * Get question statistics
   */
  async getQuestionStats(req, res) {
    try {
      const { platform, start_date, end_date } = req.query;

      const options = {
        platform,
        startDate: start_date ? new Date(start_date) : undefined,
        endDate: end_date ? new Date(end_date) : undefined,
      };

      const stats = await this.questionService.getQuestionStats(options);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      debug("Error getting question stats:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to get question statistics",
        error: error.message,
      });
    }
  }

  /**
   * Get reply templates
   */
  async getReplyTemplates(req, res) {
    try {
      debug("Getting reply templates...");
      const { category } = req.query;
      debug("Category filter:", category);

      const templates = await this.questionService.getReplyTemplates(category);
      debug("Templates retrieved:", templates.length);

      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      debug("Error getting reply templates:", error.message);
      debug("Error stack:", error.stack);
      res.status(500).json({
        success: false,
        message: "Failed to get reply templates",
        error: error.message,
      });
    }
  }

  /**
   * Create or update reply template
   */
  async saveReplyTemplate(req, res) {
    try {
      debug("Saving reply template...");
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        debug("Validation errors:", errors.array());
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const templateData = req.body;
      const userId = req.user?.id || null; // Handle case where user is not authenticated
      debug("Template data:", templateData);
      debug("User ID:", userId);

      const template = await this.questionService.saveReplyTemplate(
        templateData,
        userId
      );
      debug("Template saved:", template.id);

      res.json({
        success: true,
        message: templateData.id
          ? "Template updated successfully"
          : "Template created successfully",
        data: template,
      });
    } catch (error) {
      debug("Error saving reply template:", error.message);
      debug("Error stack:", error.stack);
      res.status(500).json({
        success: false,
        message: "Failed to save reply template",
        error: error.message,
      });
    }
  }

  /**
   * Delete reply template
   */
  async deleteReplyTemplate(req, res) {
    try {
      const { id } = req.params;

      const template = await ReplyTemplate.findByPk(parseInt(id));
      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Template not found",
        });
      }

      await template.update({ isActive: false });

      res.json({
        success: true,
        message: "Template deleted successfully",
      });
    } catch (error) {
      debug("Error deleting reply template:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to delete reply template",
        error: error.message,
      });
    }
  }

  /**
   * Get template suggestions for a question
   */
  async getTemplateSuggestions(req, res) {
    try {
      const { id } = req.params;
      const { limit = 3 } = req.query;

      const question = await this.questionService.getQuestionById(parseInt(id));

      const suggestions = await this.questionService.suggestTemplates(
        question.question_text,
        question.platform,
        parseInt(limit)
      );

      res.json({
        success: true,
        data: suggestions,
      });
    } catch (error) {
      debug("Error getting template suggestions:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to get template suggestions",
        error: error.message,
      });
    }
  }

  /**
   * Assign question to user
   */
  async assignQuestion(req, res) {
    try {
      const { id } = req.params;
      const { assigned_to } = req.body;

      const question = await CustomerQuestion.findByPk(parseInt(id));
      if (!question) {
        return res.status(404).json({
          success: false,
          message: "Question not found",
        });
      }

      await question.update({
        assigned_to: assigned_to ? parseInt(assigned_to) : null,
      });

      res.json({
        success: true,
        message: "Question assigned successfully",
        data: question,
      });
    } catch (error) {
      debug("Error assigning question:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to assign question",
        error: error.message,
      });
    }
  }

  /**
   * Update question priority
   */
  async updateQuestionPriority(req, res) {
    try {
      const { id } = req.params;
      const { priority } = req.body;

      const question = await CustomerQuestion.findByPk(parseInt(id));
      if (!question) {
        return res.status(404).json({
          success: false,
          message: "Question not found",
        });
      }

      await question.update({ priority });

      res.json({
        success: true,
        message: "Question priority updated successfully",
        data: question,
      });
    } catch (error) {
      debug("Error updating question priority:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to update question priority",
        error: error.message,
      });
    }
  }

  /**
   * Add internal note to question
   */
  async addInternalNote(req, res) {
    try {
      const { id } = req.params;
      const { note } = req.body;
      const userId = req.user?.id || null; // Handle case where user is not authenticated

      const question = await CustomerQuestion.findByPk(parseInt(id));
      if (!question) {
        return res.status(404).json({
          success: false,
          message: "Question not found",
        });
      }

      const currentNotes = question.internal_notes || "";
      const timestamp = new Date().toISOString();
      const userName = req.user?.name || req.user?.email || "Anonymous";
      const newNote = `[${timestamp}] ${userName}: ${note}`;
      const updatedNotes = currentNotes
        ? `${currentNotes}\n${newNote}`
        : newNote;

      await question.update({ internal_notes: updatedNotes });

      res.json({
        success: true,
        message: "Internal note added successfully",
        data: question,
      });
    } catch (error) {
      debug("Error adding internal note:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to add internal note",
        error: error.message,
      });
    }
  }

  /**
   * Get dashboard data
   */
  async getDashboardData(req, res) {
    try {
      const { days = 30 } = req.query;
      const endDate = new Date();
      const startDate = new Date(
        endDate.getTime() - days * 24 * 60 * 60 * 1000
      );

      // Get stats for the period
      const stats = await this.questionService.getQuestionStats({
        startDate,
        endDate,
      });

      // Get urgent questions
      const urgentQuestions = await this.questionService.getQuestions({
        priority: "urgent",
        status: "WAITING_FOR_ANSWER",
        limit: 10,
      });

      // Get overdue questions (expire_date passed)
      const overdueQuestions = await CustomerQuestion.findAll({
        where: {
          status: "WAITING_FOR_ANSWER",
          expire_date: { [Op.lt]: new Date() },
        },
        limit: 10,
        order: [["expire_date", "ASC"]],
      });

      res.json({
        success: true,
        data: {
          stats,
          urgentQuestions: urgentQuestions.questions,
          overdueQuestions,
          summary: {
            totalQuestions: stats.totalQuestions,
            pendingCount: urgentQuestions.pagination.totalItems,
            overdueCount: overdueQuestions.length,
          },
        },
      });
    } catch (error) {
      debug("Error getting dashboard data:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to get dashboard data",
        error: error.message,
      });
    }
  }

  /**
   * Get questions by customer email
   */
  async getQuestionsByCustomer(req, res) {
    try {
      const { email } = req.params;
      const {
        page = 1,
        limit = 10,
        sort_by = "creation_date",
        sort_order = "DESC",
      } = req.query;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Customer email is required",
        });
      }

      const options = {
        customer_email: decodeURIComponent(email),
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy: sort_by,
        sortOrder: sort_order,
      };

      const result = await this.questionService.getQuestions(options);

      res.json({
        success: true,
        data: result.questions,
        pagination: result.pagination,
      });
    } catch (error) {
      debug("Error getting questions by customer:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to get customer questions",
        error: error.message,
      });
    }
  }
}

module.exports = CustomerQuestionController;
