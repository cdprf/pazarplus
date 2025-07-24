import logger from "../utils/logger";
/**
 * Font Service
 * Client-side service for font management and text validation
 */

import api from "./api.js";

class FontService {
  constructor() {
    this.cachedFonts = null;
    this.fontCache = new Map();
  }

  /**
   * Get available system fonts
   */
  async getAvailableFonts(useCache = true) {
    if (useCache && this.cachedFonts) {
      return this.cachedFonts;
    }

    try {
      const response = await api.get("/fonts/available");
      this.cachedFonts = response.data.data;
      return this.cachedFonts;
    } catch (error) {
      logger.error("Failed to fetch available fonts:", error);
      // Return fallback fonts if API fails
      return this.getFallbackFonts();
    }
  }

  /**
   * Get fallback fonts when API is unavailable
   */
  getFallbackFonts() {
    return [
      {
        name: "DejaVu Sans",
        family: "DejaVuSans",
        category: "sans-serif",
        unicodeSupport: true,
      },
      {
        name: "Helvetica",
        family: "Helvetica",
        category: "sans-serif",
        unicodeSupport: false,
      },
      {
        name: "Arial",
        family: "Arial",
        category: "sans-serif",
        unicodeSupport: false,
      },
      {
        name: "Times New Roman",
        family: "Times-Roman",
        category: "serif",
        unicodeSupport: false,
      },
      {
        name: "Courier New",
        family: "Courier",
        category: "monospace",
        unicodeSupport: false,
      },
    ];
  }

  /**
   * Validate text content with selected font
   */
  async validateText(text, fontFamily, weight = "normal") {
    if (!text || !text.trim()) {
      return {
        isValid: true,
        issues: [],
        suggestions: [],
      };
    }

    try {
      const response = await api.post("/fonts/validate-text", {
        text,
        fontFamily,
        weight,
      });

      const data = response.data.data;

      return {
        isValid: !data.hasEncodingIssues,
        processedText: data.processedText,
        recommendedFont: data.recommendedFont,
        fontChanged: data.fontChanged,
        hasEncodingIssues: data.hasEncodingIssues,
        hasComplexUnicode: data.hasComplexUnicode,
        issues: this.extractIssues(data.suggestions),
        suggestions: data.suggestions,
      };
    } catch (error) {
      logger.error("Text validation failed:", error);
      // Fallback to client-side validation
      return this.validateTextClientSide(text, fontFamily);
    }
  }

  /**
   * Client-side text validation fallback
   */
  validateTextClientSide(text, fontFamily) {
    const issues = [];
    const suggestions = [];

    // Check for replacement characters
    if (text.includes("�")) {
      issues.push("Contains replacement characters (�)");
      suggestions.push({
        type: "error",
        message:
          "Text contains replacement characters. Try re-entering the text.",
        action: "fix-encoding",
      });
    }

    // Check for complex Unicode
    const hasComplexUnicode = /[^\u0000-\u00FF]/.test(text); // eslint-disable-line no-control-regex
    if (hasComplexUnicode) {
      suggestions.push({
        type: "info",
        message:
          "Text contains special characters. Consider using DejaVu Sans for better compatibility.",
        action: "font-recommendation",
      });
    }

    // Check for Turkish characters
    if (/[çğıöşüÇĞİÖŞÜ]/.test(text)) {
      suggestions.push({
        type: "success",
        message:
          "Turkish characters detected. Using Unicode-compatible font recommended.",
        action: "turkish-optimization",
      });
    }

    return {
      isValid: issues.length === 0,
      processedText: text,
      recommendedFont: hasComplexUnicode ? "DejaVuSans" : fontFamily,
      fontChanged: hasComplexUnicode && fontFamily !== "DejaVuSans",
      hasEncodingIssues: issues.length > 0,
      hasComplexUnicode,
      issues,
      suggestions,
    };
  }

  /**
   * Extract issues from suggestions
   */
  extractIssues(suggestions) {
    return suggestions.filter((s) => s.type === "error").map((s) => s.message);
  }

  /**
   * Get font options for dropdown
   */
  async getFontOptions() {
    const fonts = await this.getAvailableFonts();

    return fonts.map((font) => ({
      value: this.getCSSFontFamily(font),
      label: font.name,
      category: font.category,
      unicodeSupport: font.unicodeSupport,
      isRecommended: font.unicodeSupport,
    }));
  }

  /**
   * Get CSS-compatible font family name
   */
  getCSSFontFamily(font) {
    // Use the font name for CSS, but clean it up for better compatibility
    let fontFamily = font.name || font.family;

    // Handle special cases where system font names don't match CSS names
    const fontNameMap = {
      "Arial Unicode": "Arial Unicode MS",
      "Times-Roman": "Times New Roman",
      Courier: "Courier New",
      HelveticaNeue: "Helvetica Neue",
      LucidaGrande: "Lucida Grande",
      DejaVuSans: "DejaVu Sans",
      "DejaVuSans Bold": "DejaVu Sans",
    };

    // Check if we have a mapping for this font
    if (fontNameMap[fontFamily]) {
      fontFamily = fontNameMap[fontFamily];
    }

    // For system fonts with spaces, ensure they're properly quoted in CSS
    if (fontFamily.includes(" ") && !fontFamily.startsWith('"')) {
      fontFamily = `"${fontFamily}"`;
    }

    return fontFamily;
  }

  /**
   * Get grouped font options for better UI
   */
  async getGroupedFontOptions() {
    const fonts = await this.getAvailableFonts();

    const groups = {
      recommended: fonts.filter((f) => f.unicodeSupport),
      "sans-serif": fonts.filter(
        (f) => f.category === "sans-serif" && !f.unicodeSupport
      ),
      serif: fonts.filter((f) => f.category === "serif"),
      monospace: fonts.filter((f) => f.category === "monospace"),
    };

    return Object.entries(groups)
      .filter(([_, fonts]) => fonts.length > 0)
      .map(([category, fonts]) => ({
        label: this.getCategoryLabel(category),
        options: fonts.map((font) => ({
          value: this.getCSSFontFamily(font),
          label: font.name,
          unicodeSupport: font.unicodeSupport,
        })),
      }));
  }

  /**
   * Get human-readable category labels
   */
  getCategoryLabel(category) {
    const labels = {
      recommended: "✨ Recommended (Unicode Support)",
      "sans-serif": "Sans Serif",
      serif: "Serif",
      monospace: "Monospace",
    };
    return labels[category] || category;
  }

  /**
   * Check if font supports Unicode characters
   */
  async fontSupportsUnicode(fontFamily) {
    const fonts = await this.getAvailableFonts();
    const font = fonts.find((f) => f.family === fontFamily);
    return font ? font.unicodeSupport : false;
  }

  /**
   * Get best font for given text
   */
  async getBestFontForText(text, preferredFont = null) {
    const validation = await this.validateText(text, preferredFont);
    return validation.recommendedFont || preferredFont || "DejaVuSans";
  }

  /**
   * Clear font cache
   */
  clearCache() {
    this.cachedFonts = null;
    this.fontCache.clear();
  }
}

const fontService = new FontService();
export default fontService;
