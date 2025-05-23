const { PlatformSettingsTemplate } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Get all platform settings templates
 */
async function getTemplates(req, res) {
  try {
    const templates = await PlatformSettingsTemplate.findAll({
      where: { isActive: true }
    });

    return res.status(200).json({
      success: true,
      data: templates
    });
  } catch (error) {
    logger.error(`Failed to get platform templates: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to get platform templates',
      error: error.message
    });
  }
}

/**
 * Get a specific platform settings template
 */
async function getTemplate(req, res) {
  try {
    const template = await PlatformSettingsTemplate.findByPk(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Platform template not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error(`Failed to get platform template: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to get platform template',
      error: error.message
    });
  }
}

/**
 * Create a new platform settings template
 */
async function createTemplate(req, res) {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      platformType,
      name,
      description,
      apiEndpoints,
      authType,
      credentialSchema,
      defaultSettings,
      webhookConfiguration,
      orderMappings,
      productMappings,
      requiredScopes,
      sandboxConfiguration
    } = req.body;

    const template = await PlatformSettingsTemplate.create({
      platformType,
      name,
      description,
      apiEndpoints,
      authType,
      credentialSchema,
      defaultSettings,
      webhookConfiguration,
      orderMappings,
      productMappings,
      requiredScopes,
      sandboxConfiguration
    });

    return res.status(201).json({
      success: true,
      message: 'Platform template created successfully',
      data: template
    });
  } catch (error) {
    logger.error(`Failed to create platform template: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to create platform template',
      error: error.message
    });
  }
}

/**
 * Update a platform settings template
 */
async function updateTemplate(req, res) {
  try {
    const template = await PlatformSettingsTemplate.findByPk(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Platform template not found'
      });
    }

    const updates = { ...req.body };
    delete updates.id; // Prevent updating the ID

    await template.update(updates);

    return res.status(200).json({
      success: true,
      message: 'Platform template updated successfully',
      data: template
    });
  } catch (error) {
    logger.error(`Failed to update platform template: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to update platform template',
      error: error.message
    });
  }
}

/**
 * Delete a platform settings template (soft delete)
 */
async function deleteTemplate(req, res) {
  try {
    const template = await PlatformSettingsTemplate.findByPk(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Platform template not found'
      });
    }

    await template.destroy(); // This will perform a soft delete since we have timestamps: true

    return res.status(200).json({
      success: true,
      message: 'Platform template deleted successfully'
    });
  } catch (error) {
    logger.error(`Failed to delete platform template: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to delete platform template',
      error: error.message
    });
  }
}

// Export functions for route usage
module.exports = {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate
};