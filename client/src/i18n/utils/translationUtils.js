import logger from "../../utils/logger.js";
import i18n from "../index";

/**
 * Enhanced translation utilities with better error handling and fallbacks
 */
export class TranslationUtils {
  static missingKeys = new Set();
  static logMissingKeys = true;

  /**
   * Safe translation function with fallback
   * @param {string} key - Translation key
   * @param {object} options - Translation options
   * @param {string} fallback - Fallback text if translation is missing
   * @returns {string} Translated text or fallback
   */
  static t(key, options = {}, fallback = null) {
    try {
      if (!i18n.isInitialized) {
        logger.warn("i18n not initialized, using fallback");
        return fallback || key;
      }

      const translated = i18n.t(key, options);

      // Check if translation is missing (i18next returns the key if not found)
      if (translated === key && !this.keyExists(key)) {
        this.logMissingKey(key);
        return fallback || this.generateFallback(key);
      }

      return translated;
    } catch (error) {
      logger.error("Translation error:", error);
      this.logMissingKey(key);
      return fallback || this.generateFallback(key);
    }
  }

  /**
   * Check if a translation key exists
   * @param {string} key - Translation key
   * @returns {boolean} True if key exists
   */
  static keyExists(key) {
    try {
      return i18n.exists(key);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get plural translation with fallback
   * @param {string} key - Translation key
   * @param {number} count - Count for pluralization
   * @param {object} options - Translation options
   * @param {string} fallback - Fallback text
   * @returns {string} Translated text
   */
  static tp(key, count, options = {}, fallback = null) {
    const opts = { ...options, count };
    return this.t(key, opts, fallback);
  }

  /**
   * Get translation with interpolation
   * @param {string} key - Translation key
   * @param {object} interpolations - Values to interpolate
   * @param {string} fallback - Fallback text
   * @returns {string} Translated text
   */
  static ti(key, interpolations = {}, fallback = null) {
    return this.t(key, interpolations, fallback);
  }

  /**
   * Get nested translation
   * @param {string} namespace - Namespace
   * @param {string} key - Translation key
   * @param {object} options - Translation options
   * @param {string} fallback - Fallback text
   * @returns {string} Translated text
   */
  static tn(namespace, key, options = {}, fallback = null) {
    const fullKey = `${namespace}.${key}`;
    return this.t(fullKey, options, fallback);
  }

  /**
   * Get common translation (buttons, labels, etc.)
   * @param {string} key - Translation key
   * @param {object} options - Translation options
   * @param {string} fallback - Fallback text
   * @returns {string} Translated text
   */
  static tc(key, options = {}, fallback = null) {
    return this.tn("common", key, options, fallback);
  }

  /**
   * Get business translation
   * @param {string} key - Translation key
   * @param {object} options - Translation options
   * @param {string} fallback - Fallback text
   * @returns {string} Translated text
   */
  static tb(key, options = {}, fallback = null) {
    return this.tn("business", key, options, fallback);
  }

  /**
   * Get navigation translation
   * @param {string} key - Translation key
   * @param {object} options - Translation options
   * @param {string} fallback - Fallback text
   * @returns {string} Translated text
   */
  static tnav(key, options = {}, fallback = null) {
    return this.tn("navigation", key, options, fallback);
  }

  /**
   * Generate a human-readable fallback from key
   * @param {string} key - Translation key
   * @returns {string} Human-readable fallback
   */
  static generateFallback(key) {
    if (!key) return "";

    // Extract the last part of the key
    const parts = key.split(".");
    const lastPart = parts[parts.length - 1];

    // Convert camelCase/snake_case to readable text
    return lastPart
      .replace(/([A-Z])/g, " $1") // Add space before capital letters
      .replace(/_/g, " ") // Replace underscores with spaces
      .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
      .trim();
  }

  /**
   * Log missing translation key
   * @param {string} key - Missing key
   */
  static logMissingKey(key) {
    if (!this.logMissingKeys) return;

    if (!this.missingKeys.has(key)) {
      this.missingKeys.add(key);
      logger.warn(`Missing translation key: ${key}`);
    }
  }

  /**
   * Get all missing keys
   * @returns {Array} Array of missing keys
   */
  static getMissingKeys() {
    return Array.from(this.missingKeys);
  }

  /**
   * Clear missing keys log
   */
  static clearMissingKeys() {
    this.missingKeys.clear();
  }

  /**
   * Enable/disable missing key logging
   * @param {boolean} enabled - Whether to log missing keys
   */
  static setLogging(enabled) {
    this.logMissingKeys = enabled;
  }

  /**
   * Format date with current locale
   * @param {Date|string} date - Date to format
   * @param {object} options - Intl.DateTimeFormat options
   * @returns {string} Formatted date
   */
  static formatDate(date, options = {}) {
    try {
      const currentLanguage = i18n.language || "tr";
      const locale = currentLanguage === "tr" ? "tr-TR" : "en-US";
      return new Intl.DateTimeFormat(locale, options).format(new Date(date));
    } catch (error) {
      logger.error("Date formatting error:", error);
      return date?.toString() || "";
    }
  }

  /**
   * Format number with current locale
   * @param {number} number - Number to format
   * @param {object} options - Intl.NumberFormat options
   * @returns {string} Formatted number
   */
  static formatNumber(number, options = {}) {
    try {
      const currentLanguage = i18n.language || "tr";
      const locale = currentLanguage === "tr" ? "tr-TR" : "en-US";
      return new Intl.NumberFormat(locale, options).format(number);
    } catch (error) {
      logger.error("Number formatting error:", error);
      return number?.toString() || "";
    }
  }

  /**
   * Format currency with current locale
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code (default: TRY)
   * @param {object} options - Additional formatting options
   * @returns {string} Formatted currency
   */
  static formatCurrency(amount, currency = "TRY", options = {}) {
    const defaultOptions = {
      style: "currency",
      currency: currency,
      ...options,
    };
    return this.formatNumber(amount, defaultOptions);
  }

  /**
   * Get relative time string
   * @param {Date|string} date - Date to compare
   * @returns {string} Relative time string
   */
  static getRelativeTime(date) {
    try {
      const currentLanguage = i18n.language || "tr";
      const locale = currentLanguage === "tr" ? "tr-TR" : "en-US";
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

      const now = new Date();
      const targetDate = new Date(date);
      const diffInSeconds = Math.floor((targetDate - now) / 1000);

      const intervals = [
        { unit: "year", seconds: 31536000 },
        { unit: "month", seconds: 2592000 },
        { unit: "day", seconds: 86400 },
        { unit: "hour", seconds: 3600 },
        { unit: "minute", seconds: 60 },
        { unit: "second", seconds: 1 },
      ];

      for (const interval of intervals) {
        const count = Math.floor(Math.abs(diffInSeconds) / interval.seconds);
        if (count >= 1) {
          return rtf.format(diffInSeconds < 0 ? -count : count, interval.unit);
        }
      }

      return rtf.format(0, "second");
    } catch (error) {
      logger.error("Relative time formatting error:", error);
      return date?.toString() || "";
    }
  }

  /**
   * Check if current language is RTL
   * @returns {boolean} True if RTL language
   */
  static isRTL() {
    const currentLanguage = i18n.language || "tr";
    const rtlLanguages = ["ar", "he", "fa", "ur"];
    return rtlLanguages.includes(currentLanguage);
  }

  /**
   * Get text direction for current language
   * @returns {string} 'rtl' or 'ltr'
   */
  static getTextDirection() {
    return this.isRTL() ? "rtl" : "ltr";
  }

  /**
   * Apply text direction to element
   * @param {HTMLElement} element - Element to apply direction
   */
  static applyTextDirection(element) {
    if (element) {
      element.dir = this.getTextDirection();
    }
  }

  /**
   * Validate translation completeness for a language
   * @param {string} language - Language code to validate
   * @param {object} referenceTranslations - Reference translation object
   * @returns {object} Validation result
   */
  static validateTranslations(language, referenceTranslations) {
    const results = {
      missing: [],
      extra: [],
      total: 0,
      translated: 0,
      percentage: 0,
    };

    try {
      const currentTranslations =
        i18n.getResourceBundle(language, "translation") || {};

      const validateLevel = (ref, current, path = "") => {
        for (const key in ref) {
          const currentPath = path ? `${path}.${key}` : key;
          results.total++;

          if (typeof ref[key] === "object" && ref[key] !== null) {
            if (!current[key] || typeof current[key] !== "object") {
              results.missing.push(currentPath);
            } else {
              validateLevel(ref[key], current[key], currentPath);
            }
          } else {
            if (current[key] === undefined) {
              results.missing.push(currentPath);
            } else {
              results.translated++;
            }
          }
        }

        // Check for extra keys
        for (const key in current) {
          const currentPath = path ? `${path}.${key}` : key;
          if (ref[key] === undefined) {
            results.extra.push(currentPath);
          }
        }
      };

      validateLevel(referenceTranslations, currentTranslations);
      results.percentage =
        results.total > 0 ? (results.translated / results.total) * 100 : 0;
    } catch (error) {
      logger.error("Translation validation error:", error);
    }

    return results;
  }
}

// Create shortcuts for common usage
export const t = TranslationUtils.t.bind(TranslationUtils);
export const tp = TranslationUtils.tp.bind(TranslationUtils);
export const ti = TranslationUtils.ti.bind(TranslationUtils);
export const tn = TranslationUtils.tn.bind(TranslationUtils);
export const tc = TranslationUtils.tc.bind(TranslationUtils);
export const tb = TranslationUtils.tb.bind(TranslationUtils);
export const tnav = TranslationUtils.tnav.bind(TranslationUtils);

export default TranslationUtils;
