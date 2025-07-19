const fs = require("fs").promises;
const path = require("path");

/**
 * Translation Service for managing i18n translations
 * Handles file-based translation storage and API operations
 */
class TranslationService {
  constructor() {
    this.translationsPath = path.join(__dirname, "../client/src/i18n/locales");
    this.backupPath = path.join(__dirname, "../backups/translations");
  }

  /**
   * Get all translations for a specific language
   */
  async getTranslations(language = "en") {
    try {
      const filePath = path.join(this.translationsPath, `${language}.json`);
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error reading translations for ${language}:`, error);
      throw new Error(`Failed to load translations for ${language}`);
    }
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages() {
    try {
      const files = await fs.readdir(this.translationsPath);
      const languages = files
        .filter((file) => file.endsWith(".json"))
        .map((file) => file.replace(".json", ""));

      return languages.map((code) => ({
        code,
        name: this.getLanguageName(code),
        flag: this.getLanguageFlag(code),
      }));
    } catch (error) {
      console.error("Error getting supported languages:", error);
      return [
        { code: "en", name: "English", flag: "🇺🇸" },
        { code: "tr", name: "Türkçe", flag: "🇹🇷" },
      ];
    }
  }

  /**
   * Update specific translation key
   */
  async updateTranslation(language, key, value) {
    try {
      // Create backup first
      await this.createBackup(language);

      const translations = await this.getTranslations(language);

      // Support nested keys (e.g., "common.welcome")
      const keys = key.split(".");
      let current = translations;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;

      await this.saveTranslations(language, translations);
      return { success: true, message: "Translation updated successfully" };
    } catch (error) {
      console.error(
        `Error updating translation ${key} for ${language}:`,
        error
      );
      throw new Error(`Failed to update translation: ${error.message}`);
    }
  }

  /**
   * Update multiple translations at once
   */
  async updateTranslations(language, updates) {
    try {
      await this.createBackup(language);

      const translations = await this.getTranslations(language);

      for (const [key, value] of Object.entries(updates)) {
        const keys = key.split(".");
        let current = translations;

        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) {
            current[keys[i]] = {};
          }
          current = current[keys[i]];
        }

        current[keys[keys.length - 1]] = value;
      }

      await this.saveTranslations(language, translations);
      return {
        success: true,
        message: `Updated ${Object.keys(updates).length} translations`,
      };
    } catch (error) {
      console.error(`Error updating translations for ${language}:`, error);
      throw new Error(`Failed to update translations: ${error.message}`);
    }
  }

  /**
   * Save translations to file
   */
  async saveTranslations(language, translations) {
    try {
      const filePath = path.join(this.translationsPath, `${language}.json`);
      const content = JSON.stringify(translations, null, 2);
      await fs.writeFile(filePath, content, "utf8");
    } catch (error) {
      console.error(`Error saving translations for ${language}:`, error);
      throw new Error(`Failed to save translations for ${language}`);
    }
  }

  /**
   * Create backup of current translations
   */
  async createBackup(language) {
    try {
      // Ensure backup directory exists
      await fs.mkdir(this.backupPath, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupFile = path.join(
        this.backupPath,
        `${language}_${timestamp}.json`
      );
      const currentFile = path.join(this.translationsPath, `${language}.json`);

      const content = await fs.readFile(currentFile, "utf8");
      await fs.writeFile(backupFile, content, "utf8");

      console.log(`Backup created: ${backupFile}`);
    } catch (error) {
      console.warn(`Failed to create backup for ${language}:`, error.message);
    }
  }

  /**
   * Export translations as downloadable file
   */
  async exportTranslations(language) {
    try {
      const translations = await this.getTranslations(language);
      return {
        filename: `translations_${language}_${
          new Date().toISOString().split("T")[0]
        }.json`,
        content: JSON.stringify(translations, null, 2),
        contentType: "application/json",
      };
    } catch (error) {
      console.error(`Error exporting translations for ${language}:`, error);
      throw new Error(`Failed to export translations for ${language}`);
    }
  }

  /**
   * Import translations from uploaded file
   */
  async importTranslations(language, content) {
    try {
      // Validate JSON format
      const translations = JSON.parse(content);

      // Create backup before import
      await this.createBackup(language);

      // Save imported translations
      await this.saveTranslations(language, translations);

      return { success: true, message: "Translations imported successfully" };
    } catch (error) {
      console.error(`Error importing translations for ${language}:`, error);
      throw new Error(`Failed to import translations: ${error.message}`);
    }
  }

  /**
   * Get flattened translations for easier editing
   */
  flattenTranslations(obj, prefix = "") {
    const flattened = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        Object.assign(flattened, this.flattenTranslations(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    }

    return flattened;
  }

  /**
   * Get language display name
   */
  getLanguageName(code) {
    const names = {
      en: "English",
      tr: "Türkçe",
      es: "Español",
      fr: "Français",
      de: "Deutsch",
      it: "Italiano",
      pt: "Português",
      ru: "Русский",
      zh: "中文",
      ja: "日本語",
      ko: "한국어",
      ar: "العربية",
    };

    return names[code] || code.toUpperCase();
  }

  /**
   * Get language flag emoji
   */
  getLanguageFlag(code) {
    const flags = {
      en: "🇺🇸",
      tr: "🇹🇷",
      es: "🇪🇸",
      fr: "🇫🇷",
      de: "🇩🇪",
      it: "🇮🇹",
      pt: "🇵🇹",
      ru: "🇷🇺",
      zh: "🇨🇳",
      ja: "🇯🇵",
      ko: "🇰🇷",
      ar: "🇸🇦",
    };

    return flags[code] || "🌐";
  }
}

module.exports = TranslationService;
