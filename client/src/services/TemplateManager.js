/**
 * TemplateManager service for managing shipping slip templates
 * Used by ShippingSlipDesigner to load, save, and manage templates
 */

import api from "./api";

class TemplateManager {
  /**
   * Get all saved templates
   *
   * @returns {Promise<Array>} Promise resolving to array of template objects
   */
  static async getAll() {
    try {
      // First try to fetch from API if available
      return await this.fetchFromApi();
    } catch (error) {
      console.warn("API fetch failed, falling back to local storage:", error);
      // Fall back to local storage
      return this.fetchFromLocalStorage();
    }
  }

  /**
   * Fetch templates from the API
   *
   * @returns {Promise<Array>} Promise resolving to array of templates
   */
  static async fetchFromApi() {
    try {
      const response = await api.get("/api/shipping/templates");

      // Handle the standard API response format: { success: true, data: [...], message: "..." }
      if (
        response.data &&
        response.data.success &&
        Array.isArray(response.data.data)
      ) {
        // Store in local storage as backup
        localStorage.setItem(
          "shippingTemplates",
          JSON.stringify(response.data.data)
        );
        return response.data.data;
      }

      // Fallback: check if data is directly an array (backward compatibility)
      if (response.data && Array.isArray(response.data)) {
        localStorage.setItem(
          "shippingTemplates",
          JSON.stringify(response.data)
        );
        return response.data;
      }

      throw new Error("Invalid API response format");
    } catch (error) {
      console.warn("Failed to fetch templates from API:", error);
      throw error;
    }
  }

  /**
   * Fetch templates from local storage
   *
   * @returns {Array} Array of template objects
   */
  static fetchFromLocalStorage() {
    try {
      const templatesJson = localStorage.getItem("shippingTemplates");
      if (templatesJson) {
        const templates = JSON.parse(templatesJson);
        return Array.isArray(templates) ? templates : [];
      }
      return [];
    } catch (error) {
      console.error("Failed to load templates from local storage:", error);
      return [];
    }
  }

  /**
   * Get a template by ID
   *
   * @param {string} id Template ID
   * @returns {Promise<Object|null>} Promise resolving to template object or null if not found
   */
  static async getById(id) {
    try {
      // Try API first
      try {
        const response = await api.get(`/api/shipping/templates/${id}`);
        // Handle the standard API response format
        if (response.data && response.data.success && response.data.data) {
          return response.data.data;
        }
        // Fallback: check if data is directly the template (backward compatibility)
        if (response.data && response.data.id) {
          return response.data;
        }
      } catch (apiError) {
        console.warn(
          `Failed to fetch template ${id} from API, checking local storage:`,
          apiError
        );
      }

      // Fall back to local storage
      const templates = this.fetchFromLocalStorage();
      return templates.find((template) => template.id === id) || null;
    } catch (error) {
      console.error(`Failed to get template with ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Save a template
   *
   * @param {Object} template Template object to save
   * @returns {Promise<Object>} Promise resolving to saved template with ID
   */
  static async save(template) {
    if (!template) {
      throw new Error("No template provided");
    }

    // Input validation
    if (!template.name || template.name.trim() === "") {
      throw new Error("Template name is required");
    }
    if (!template.elements || !Array.isArray(template.elements)) {
      throw new Error("Template elements are required and must be an array");
    }
    if (!template.config || typeof template.config !== "object") {
      throw new Error("Template config is required and must be an object");
    }

    try {
      // Ensure template has an ID and timestamps
      const templateToSave = {
        ...template,
        id:
          template.id ||
          `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: template.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      let savedTemplate = null;
      let apiSuccess = false;

      // Try to save to API first
      try {
        const response = await api.post(
          "/api/shipping/templates",
          templateToSave
        );
        // Handle the standard API response format
        if (response.data && response.data.success && response.data.data) {
          savedTemplate = response.data.data;
          apiSuccess = true;
        } else if (response.data && response.data.id) {
          // Fallback: direct data response (backward compatibility)
          savedTemplate = response.data;
          apiSuccess = true;
        }
      } catch (apiError) {
        console.warn(
          "Failed to save template to API, will save locally:",
          apiError.message
        );
        savedTemplate = templateToSave;
      }

      // Always update local storage (as backup or primary storage)
      try {
        const templates = this.fetchFromLocalStorage();
        const updatedTemplates = [
          ...templates.filter((t) => t.id !== templateToSave.id),
          templateToSave,
        ];
        localStorage.setItem(
          "shippingTemplates",
          JSON.stringify(updatedTemplates)
        );
      } catch (storageError) {
        console.error("Failed to save to local storage:", storageError);
        if (!apiSuccess) {
          throw new Error(
            "Failed to save template both to API and local storage"
          );
        }
      }

      return templateToSave;
    } catch (error) {
      console.error("Failed to save template:", error);
      throw error;
    }
  }

  /**
   * Delete a template
   *
   * @param {string} id Template ID to delete
   * @returns {boolean} Success status
   */
  static async delete(id) {
    if (!id) {
      throw new Error("No template ID provided");
    }

    try {
      // Try to delete from API first
      try {
        await api.delete(`/api/shipping/templates/${id}`);
      } catch (apiError) {
        console.warn(`Failed to delete template ${id} from API:`, apiError);
        // Continue with local deletion regardless
      }

      // Delete from local storage
      const templates = this.fetchFromLocalStorage();
      const updatedTemplates = templates.filter(
        (template) => template.id !== id
      );
      localStorage.setItem(
        "shippingTemplates",
        JSON.stringify(updatedTemplates)
      );

      return true;
    } catch (error) {
      console.error(`Failed to delete template ${id}:`, error);
      throw error;
    }
  }

  /**
   * Export template to file
   *
   * @param {Object} template Template to export
   */
  static async export(template) {
    if (!template) {
      throw new Error("No template provided for export");
    }

    try {
      const templateJson = JSON.stringify(template, null, 2);
      const blob = new Blob([templateJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      // Create download link
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = `${template.name.replace(
        /\s+/g,
        "_"
      )}_template.json`;
      document.body.appendChild(downloadLink);
      downloadLink.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
      }, 100);

      return true;
    } catch (error) {
      console.error("Failed to export template:", error);
      throw error;
    }
  }

  /**
   * Import template from file content
   *
   * @param {Object|string} fileContent Template file content or parsed object
   * @returns {Object} Imported template
   */
  static async import(fileContent) {
    try {
      let template;

      if (typeof fileContent === "string") {
        template = JSON.parse(fileContent);
      } else if (fileContent instanceof File) {
        const text = await fileContent.text();
        template = JSON.parse(text);
      } else {
        template = fileContent;
      }

      if (!template || !template.elements || !template.config) {
        throw new Error("Invalid template format");
      }

      // Ensure template has required properties
      const importedTemplate = {
        ...template,
        id: `template_${Date.now()}`, // Generate new ID to prevent conflicts
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        imported: true,
      };

      return importedTemplate;
    } catch (error) {
      console.error("Failed to import template:", error);
      throw error;
    }
  }
}

export default TemplateManager;
