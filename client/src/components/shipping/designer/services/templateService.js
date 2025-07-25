import logger from "../../../../utils/logger.js";
import TemplateManager from "../../../../services/TemplateManager";

/**
 * Fetch all templates for the current user
 * @returns {Promise<Array>} - Array of templates
 */
export const fetchTemplates = async () => {
  try {
    // Use the existing TemplateManager service
    return await TemplateManager.getAll();
  } catch (error) {
    logger.error("Error fetching templates:", error);
    throw error;
  }
};

/**
 * Save a template (create or update)
 * @param {Object} template - The template object to save
 * @returns {Promise<Object>} - The saved template
 */
export const saveTemplate = async (template) => {
  try {
    // Use the existing TemplateManager service
    return await TemplateManager.save(template);
  } catch (error) {
    logger.error("Error saving template:", error);
    throw error;
  }
};

/**
 * Delete a template
 * @param {string} templateId - The ID of the template to delete
 * @returns {Promise<boolean>} - True if deletion was successful
 */
export const deleteTemplate = async (templateId) => {
  try {
    // Use the existing TemplateManager service
    return await TemplateManager.delete(templateId);
  } catch (error) {
    logger.error("Error deleting template:", error);
    throw error;
  }
};
