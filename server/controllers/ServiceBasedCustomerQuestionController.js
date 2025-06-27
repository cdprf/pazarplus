// Enhanced Customer Question Controller with simplified service
const { validationResult } = require("express-validator");
const SimplifiedCustomerQuestionService = require("../services/SimplifiedCustomerQuestionService");
const debug = require("debug")("pazar:controller:questions:with-service");

class ServiceBasedCustomerQuestionController {
  constructor() {
    // Initialize with simplified service (no async operations)
    this.questionService = new SimplifiedCustomerQuestionService();
    this.initialized = true;
    debug(
      "ServiceBasedCustomerQuestionController instantiated with simplified service"
    );
  }

  /**
   * Get questions with filters and pagination
   */
  async getQuestions(req, res) {
    debug("Getting questions with filters and pagination");
    try {
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

      debug("Calling questionService.getQuestions with options:", options);

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
   * Get questions for a specific customer
   */
  async getQuestionsByCustomer(req, res) {
    try {
      const { email } = req.params;
      debug(`Getting questions for customer: ${email}`);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const {
        status,
        platform,
        page = 1,
        limit = 20,
        sort_by = "creation_date",
        sort_order = "DESC",
      } = req.query;

      const options = {
        status,
        platform,
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy: sort_by,
        sortOrder: sort_order,
      };

      const result = await this.questionService.getQuestionsByCustomer(
        email,
        options
      );

      res.json({
        success: true,
        data: result.questions,
        pagination: result.pagination,
      });
    } catch (error) {
      debug("Error getting questions by customer:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to get questions for customer",
        error: error.message,
      });
    }
  }

  /**
   * Get a specific question by ID
   */
  async getQuestion(req, res) {
    try {
      const { id } = req.params;
      debug(`Getting question with ID: ${id}`);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const question = await this.questionService.getQuestionById(id);

      if (!question) {
        return res.status(404).json({
          success: false,
          message: "Question not found",
        });
      }

      res.json({
        success: true,
        data: question,
      });
    } catch (error) {
      debug("Error getting question:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to get question",
        error: error.message,
      });
    }
  }

  /**
   * Update question status
   */
  async updateQuestionStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      debug(`Updating question ${id} status to: ${status}`);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const updatedQuestion = await this.questionService.updateQuestionStatus(
        id,
        status
      );

      if (!updatedQuestion) {
        return res.status(404).json({
          success: false,
          message: "Question not found",
        });
      }

      res.json({
        success: true,
        message: "Question status updated successfully",
        data: updatedQuestion,
      });
    } catch (error) {
      debug("Error updating question status:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to update question status",
        error: error.message,
      });
    }
  }

  /**
   * Create a reply to a question
   */
  async createReply(req, res) {
    try {
      const { id } = req.params;
      const { message, reply_type = "manual" } = req.body;

      debug(`Creating reply for question ${id}`);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      // For now, create mock reply since we don't have reply functionality in service yet
      const reply = {
        id: Math.floor(Math.random() * 1000),
        question_id: parseInt(id),
        message,
        reply_type,
        created_at: new Date(),
      };

      res.status(201).json({
        success: true,
        message: "Reply created successfully",
        data: reply,
      });
    } catch (error) {
      debug("Error creating reply:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to create reply",
        error: error.message,
      });
    }
  }

  /**
   * Get question statistics
   */
  async getQuestionStats(req, res) {
    try {
      debug("Getting question statistics");

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const { timeframe = "30d" } = req.query;

      const stats = await this.questionService.getQuestionStats(timeframe);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      debug("Error getting question statistics:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to get question statistics",
        error: error.message,
      });
    }
  }

  /**
   * Sync questions from platforms
   */
  async syncQuestions(req, res) {
    try {
      debug("Syncing questions from platforms");

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const { platforms } = req.body;

      const result = await this.questionService.syncQuestions(platforms);

      res.json({
        success: true,
        message: "Sync completed",
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
}

module.exports = ServiceBasedCustomerQuestionController;
