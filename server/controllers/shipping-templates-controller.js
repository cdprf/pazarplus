/**
 * Shipping Templates Controller
 * Handles CRUD operations for shipping slip templates
 */

const { User } = require("../models");
const logger = require("../utils/logger");

class ShippingTemplatesController {
  /**
   * Get all shipping templates for the authenticated user
   */
  async getTemplates(req, res) {
    try {
      const userId = req.user.id;

      // Get user settings which may contain templates
      const user = await User.findByPk(userId);
      const settings = user.settings ? JSON.parse(user.settings) : {};
      const templates = settings.shippingTemplates || [];

      res.json({
        success: true,
        data: templates,
        message: "Shipping templates retrieved successfully",
      });
    } catch (error) {
      logger.error(`Failed to get shipping templates: ${error.message}`, {
        error,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to get shipping templates",
        error: error.message,
      });
    }
  }

  /**
   * Get a single shipping template by ID
   */
  async getTemplate(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const user = await User.findByPk(userId);
      const settings = user.settings ? JSON.parse(user.settings) : {};
      const templates = settings.shippingTemplates || [];

      const template = templates.find((t) => t.id === id);

      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Template not found",
        });
      }

      res.json({
        success: true,
        data: template,
        message: "Template retrieved successfully",
      });
    } catch (error) {
      logger.error(`Failed to get shipping template: ${error.message}`, {
        error,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to get template",
        error: error.message,
      });
    }
  }

  /**
   * Create or update a shipping template
   */
  async saveTemplate(req, res) {
    try {
      const userId = req.user.id;
      const templateData = req.body;

      // Validate required fields
      if (!templateData.name) {
        return res.status(400).json({
          success: false,
          message: "Template name is required",
        });
      }

      // Get current user settings
      const user = await User.findByPk(userId);
      const settings = user.settings ? JSON.parse(user.settings) : {};
      const templates = settings.shippingTemplates || [];

      // Generate ID if not provided
      if (!templateData.id) {
        templateData.id = `template_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 15)}`;
        templateData.createdAt = new Date().toISOString();
      }
      templateData.updatedAt = new Date().toISOString();

      // Find existing template or add new one
      const existingIndex = templates.findIndex(
        (t) => t.id === templateData.id
      );
      if (existingIndex >= 0) {
        templates[existingIndex] = templateData;
      } else {
        templates.push(templateData);
      }

      // Update user settings
      settings.shippingTemplates = templates;
      await user.update({
        settings: JSON.stringify(settings),
      });

      res.json({
        success: true,
        data: templateData,
        message: "Template saved successfully",
      });
    } catch (error) {
      logger.error(`Failed to save shipping template: ${error.message}`, {
        error,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to save template",
        error: error.message,
      });
    }
  }

  /**
   * Delete a shipping template
   */
  async deleteTemplate(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const user = await User.findByPk(userId);
      const settings = user.settings ? JSON.parse(user.settings) : {};
      const templates = settings.shippingTemplates || [];

      const templateIndex = templates.findIndex((t) => t.id === id);

      if (templateIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Template not found",
        });
      }

      // Remove template
      templates.splice(templateIndex, 1);

      // Update user settings
      settings.shippingTemplates = templates;
      await user.update({
        settings: JSON.stringify(settings),
      });

      res.json({
        success: true,
        message: "Template deleted successfully",
      });
    } catch (error) {
      logger.error(`Failed to delete shipping template: ${error.message}`, {
        error,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to delete template",
        error: error.message,
      });
    }
  }
}

module.exports = new ShippingTemplatesController();
