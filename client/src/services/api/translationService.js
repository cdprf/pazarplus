import logger from "../../utils/logger.js";
import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5001/api";

class TranslationService {
  constructor() {
    this.apiClient = axios.create({
      baseURL: `${API_BASE_URL}/translations`,
      timeout: 10000,
    });

    // Add auth token to requests
    this.apiClient.interceptors.request.use((config) => {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  /**
   * Get all supported languages with metadata
   */
  async getSupportedLanguages() {
    try {
      const response = await this.apiClient.get("/");
      return response.data;
    } catch (error) {
      logger.error("Error fetching supported languages:", error);
      throw error;
    }
  }

  /**
   * Get translations for a specific language
   */
  async getTranslations(language) {
    try {
      const response = await this.apiClient.get(`/${language}`);
      return response.data;
    } catch (error) {
      logger.error(`Error fetching translations for ${language}:`, error);
      throw error;
    }
  }

  /**
   * Update translations for a specific language
   */
  async updateTranslations(language, translations) {
    try {
      const response = await this.apiClient.put(`/${language}`, {
        translations,
      });
      return response.data;
    } catch (error) {
      logger.error(`Error updating translations for ${language}:`, error);
      throw error;
    }
  }

  /**
   * Add a new translation key-value pair
   */
  async addTranslationKey(language, key, value) {
    try {
      const response = await this.apiClient.post(`/${language}/keys`, {
        key,
        value,
      });
      return response.data;
    } catch (error) {
      logger.error(`Error adding translation key for ${language}:`, error);
      throw error;
    }
  }

  /**
   * Delete a translation key
   */
  async deleteTranslationKey(language, key) {
    try {
      const response = await this.apiClient.delete(
        `/${language}/keys/${encodeURIComponent(key)}`
      );
      return response.data;
    } catch (error) {
      logger.error(`Error deleting translation key for ${language}:`, error);
      throw error;
    }
  }

  /**
   * Export translations for backup
   */
  async exportTranslations(language) {
    try {
      const response = await this.getTranslations(language);
      if (response.success) {
        const dataStr = JSON.stringify(response.data.translations, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });

        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `translations_${language}_${
          new Date().toISOString().split("T")[0]
        }.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return { success: true, message: "Translations exported successfully" };
      }
      throw new Error("Failed to fetch translations for export");
    } catch (error) {
      logger.error(`Error exporting translations for ${language}:`, error);
      throw error;
    }
  }

  /**
   * Import translations from a JSON file
   */
  async importTranslations(language, file) {
    try {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const translations = JSON.parse(event.target.result);
            const response = await this.updateTranslations(
              language,
              translations
            );
            resolve(response);
          } catch (error) {
            reject(new Error("Invalid JSON file or update failed"));
          }
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsText(file);
      });
    } catch (error) {
      logger.error(`Error importing translations for ${language}:`, error);
      throw error;
    }
  }

  /**
   * Validate translation completeness between languages
   */
  async validateTranslations() {
    try {
      const languages = await this.getSupportedLanguages();
      if (!languages.success) {
        throw new Error("Failed to fetch supported languages");
      }

      const validationResults = {};
      const allTranslations = {};

      // Fetch all translations
      for (const lang of languages.data) {
        const result = await this.getTranslations(lang.code);
        if (result.success) {
          allTranslations[lang.code] = this.flattenTranslations(
            result.data.translations
          );
        }
      }

      // Compare translations
      const languageCodes = Object.keys(allTranslations);
      if (languageCodes.length < 2) {
        return {
          success: true,
          data: { message: "Need at least 2 languages to validate" },
        };
      }

      const baseLanguage = languageCodes[0];
      const baseKeys = Object.keys(allTranslations[baseLanguage]);

      for (const lang of languageCodes) {
        const currentKeys = Object.keys(allTranslations[lang]);
        const missing = baseKeys.filter((key) => !currentKeys.includes(key));
        const extra = currentKeys.filter((key) => !baseKeys.includes(key));

        validationResults[lang] = {
          missing,
          extra,
          total: currentKeys.length,
          coverage: (
            ((currentKeys.length - missing.length) / baseKeys.length) *
            100
          ).toFixed(2),
        };
      }

      return {
        success: true,
        data: {
          validationResults,
          baseLanguage,
          totalKeys: baseKeys.length,
        },
      };
    } catch (error) {
      logger.error("Error validating translations:", error);
      throw error;
    }
  }

  /**
   * Helper method to flatten nested translation objects
   */
  flattenTranslations(obj, prefix = "") {
    const flattened = {};
    for (let key in obj) {
      if (typeof obj[key] === "object" && obj[key] !== null) {
        Object.assign(
          flattened,
          this.flattenTranslations(obj[key], `${prefix}${key}.`)
        );
      } else {
        flattened[`${prefix}${key}`] = obj[key];
      }
    }
    return flattened;
  }
}

const translationService = new TranslationService();
export default translationService;
