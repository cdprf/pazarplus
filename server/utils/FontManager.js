// Cross-platform font manager for PDF generation
// Ensures Turkish character support across different devices and environments

const fs = require("fs");
const path = require("path");
const os = require("os");
const logger = require("../utils/logger");

class FontManager {
  constructor() {
    this.registeredFonts = new Set();
    this.fontPaths = this.detectFontPaths();
    this.fallbackFonts = this.getFallbackFonts();
  }

  /**
   * Detect font paths for different operating systems and environments
   */
  detectFontPaths() {
    const platform = os.platform();
    const appFontsPath = path.join(__dirname, "../fonts");

    const paths = {
      // Application bundled fonts (highest priority)
      app: appFontsPath,

      // System font paths by platform
      system: this.getSystemFontPaths(platform),

      // Container/Docker paths
      container: [
        "/usr/share/fonts",
        "/usr/local/share/fonts",
        "/app/fonts",
        "/fonts",
      ],
    };

    logger.info("Font paths detected", { platform, paths });
    return paths;
  }

  /**
   * Get system font paths based on platform
   */
  getSystemFontPaths(platform) {
    switch (platform) {
      case "darwin": // macOS
        return [
          "/Library/Fonts",
          "/System/Library/Fonts",
          path.join(os.homedir(), "Library/Fonts"),
        ];

      case "win32": // Windows
        return [
          "C:\\Windows\\Fonts",
          path.join(os.homedir(), "AppData\\Local\\Microsoft\\Windows\\Fonts"),
        ];

      case "linux": // Linux
        return [
          "/usr/share/fonts",
          "/usr/local/share/fonts",
          "/usr/share/fonts/truetype",
          "/usr/share/fonts/TTF",
          path.join(os.homedir(), ".fonts"),
          path.join(os.homedir(), ".local/share/fonts"),
        ];

      default:
        return ["/usr/share/fonts", "/usr/local/share/fonts"];
    }
  }

  /**
   * Get fallback fonts in order of preference for Unicode support
   */
  getFallbackFonts() {
    return [
      // Primary Unicode fonts (most likely to exist)
      { name: "DejaVuSans", files: ["DejaVuSans.ttf", "DejaVuSans-Bold.ttf"] },

      // Fallback to built-in PDFKit fonts
      { name: "Helvetica", builtin: true },
    ];
  }

  /**
   * Find a font file across all possible locations
   */
  findFontFile(filename) {
    const searchPaths = [
      this.fontPaths.app,
      ...this.fontPaths.system,
      ...this.fontPaths.container,
    ];

    for (const searchPath of searchPaths) {
      if (!fs.existsSync(searchPath)) continue;

      const fontPath = path.join(searchPath, filename);
      if (fs.existsSync(fontPath)) {
        try {
          // Verify it's a valid font file
          const stats = fs.statSync(fontPath);
          if (stats.size > 1000) {
            // Font files should be reasonably sized
            logger.debug(`Font found: ${fontPath}`);
            return fontPath;
          }
        } catch (error) {
          logger.warn(`Font file access error: ${fontPath}`, error);
        }
      }
    }

    return null;
  }

  /**
   * Register fonts with PDFDocument for Unicode support
   */
  async registerFonts(doc) {
    let registeredCount = 0;
    const results = { success: [], failed: [], fallback: null };

    // Try to register each fallback font in order
    for (const fontGroup of this.fallbackFonts) {
      if (fontGroup.builtin) {
        // Built-in font - no registration needed
        results.fallback = fontGroup.name;
        continue;
      }

      let groupRegistered = false;

      for (const fontFile of fontGroup.files) {
        const fontPath = this.findFontFile(fontFile);

        if (fontPath) {
          try {
            const fontName = this.getFontRegistrationName(fontFile);
            doc.registerFont(fontName, fontPath);

            this.registeredFonts.add(fontName);
            results.success.push({ name: fontName, path: fontPath });
            registeredCount++;
            groupRegistered = true;

            logger.debug(`Font registered successfully: ${fontName}`, {
              path: fontPath,
            });
          } catch (error) {
            results.failed.push({
              file: fontFile,
              path: fontPath,
              error: error.message,
            });
            logger.debug(`Failed to register font: ${fontFile}`, error);
          }
        } else {
          results.failed.push({ file: fontFile, error: "File not found" });
        }
      }

      // If we successfully registered at least one font from this group, we're good
      if (groupRegistered && !results.fallback) {
        results.fallback = fontGroup.name;
      }
    }

    // Log registration summary
    logger.info("Font registration completed", {
      registered: registeredCount,
      fallback: results.fallback,
      platform: os.platform(),
    });

    if (registeredCount === 0) {
      logger.warn(
        "No Unicode fonts registered - Turkish characters may not display correctly"
      );
    }

    return results;
  }

  /**
   * Get font registration name from filename
   */
  getFontRegistrationName(filename) {
    const baseName = path.parse(filename).name;

    // Map common font files to registration names
    const nameMap = {
      DejaVuSans: "DejaVuSans",
      "DejaVuSans-Bold": "DejaVuSans-Bold",
      "LiberationSans-Regular": "LiberationSans",
      "LiberationSans-Bold": "LiberationSans-Bold",
      "NotoSans-Regular": "NotoSans",
      "NotoSans-Bold": "NotoSans-Bold",
      ArialUnicodeMS: "ArialUnicodeMS",
      segoeui: "SegoeUI",
      segoeuib: "SegoeUI-Bold",
      "Ubuntu-R": "Ubuntu",
      "Ubuntu-B": "Ubuntu-Bold",
    };

    return nameMap[baseName] || baseName;
  }

  /**
   * Get the best available font for Unicode text
   */
  getBestUnicodeFont(text = "", weight = "normal") {
    const needsUnicode = /[^\x00-\x7F]/.test(text);

    if (!needsUnicode) {
      // ASCII text - any font will work
      return weight === "bold" ? "Helvetica-Bold" : "Helvetica";
    }

    // Unicode text - try registered fonts in preference order
    const preferredFonts = [
      { regular: "DejaVuSans", bold: "DejaVuSans-Bold" },
      { regular: "LiberationSans", bold: "LiberationSans-Bold" },
      { regular: "NotoSans", bold: "NotoSans-Bold" },
      { regular: "ArialUnicodeMS", bold: "ArialUnicodeMS" },
      { regular: "SegoeUI", bold: "SegoeUI-Bold" },
      { regular: "Ubuntu", bold: "Ubuntu-Bold" },
    ];

    for (const fontPair of preferredFonts) {
      const fontName = weight === "bold" ? fontPair.bold : fontPair.regular;
      if (this.registeredFonts.has(fontName)) {
        return fontName;
      }
    }

    // Fallback to built-in fonts
    logger.warn("No Unicode fonts available, using Helvetica fallback", {
      text: text.substring(0, 50),
    });
    return weight === "bold" ? "Helvetica-Bold" : "Helvetica";
  }

  /**
   * Validate text encoding and suggest the best font
   */
  validateAndGetFont(text, requestedFont = null, weight = "normal") {
    // Normalize text
    const normalizedText = text ? text.normalize("NFC") : "";

    // Check if requested font is available
    if (requestedFont && this.registeredFonts.has(requestedFont)) {
      return { font: requestedFont, text: normalizedText };
    }

    // Get best available font
    const bestFont = this.getBestUnicodeFont(normalizedText, weight);

    return { font: bestFont, text: normalizedText };
  }

  /**
   * Get list of available fonts for UI selection
   */
  async getAvailableFonts() {
    const fonts = [];

    // Add system fonts that are commonly available
    const systemFonts = [
      {
        name: "DejaVu Sans",
        family: "DejaVuSans",
        category: "sans-serif",
        unicodeSupport: true,
      },
      {
        name: "Liberation Sans",
        family: "LiberationSans",
        category: "sans-serif",
        unicodeSupport: true,
      },
      {
        name: "Noto Sans",
        family: "NotoSans",
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

    // Add detected system fonts
    const detectedFonts = await this.detectSystemFonts();

    // Combine and prioritize fonts
    const allFonts = [...systemFonts];

    // Add detected fonts that aren't already in the list
    detectedFonts.forEach((font) => {
      if (!allFonts.find((f) => f.family === font.family)) {
        allFonts.push(font);
      }
    });

    // Sort by Unicode support (Unicode fonts first) and then alphabetically
    return allFonts.sort((a, b) => {
      if (a.unicodeSupport && !b.unicodeSupport) return -1;
      if (!a.unicodeSupport && b.unicodeSupport) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Detect system fonts available on the current platform
   */
  detectSystemFonts() {
    const fonts = [];
    const platform = os.platform();

    try {
      // Check for common system fonts
      const commonFonts = this.getCommonSystemFonts(platform);

      commonFonts.forEach((fontInfo) => {
        const fontPath = this.findFontFile(fontInfo.filename);
        if (fontPath) {
          fonts.push({
            name: fontInfo.name,
            family: fontInfo.family,
            category: fontInfo.category,
            unicodeSupport: fontInfo.unicodeSupport,
            path: fontPath,
            available: true,
          });
        }
      });

      logger.info(`Detected ${fonts.length} system fonts on ${platform}`);
      return fonts;
    } catch (error) {
      logger.warn("Failed to detect system fonts", { error: error.message });
      return [];
    }
  }

  /**
   * Get common system fonts for different platforms
   */
  getCommonSystemFonts(platform) {
    const commonFonts = {
      darwin: [
        // macOS
        {
          name: "SF Pro",
          family: "SF-Pro",
          filename: "SF-Pro.ttf",
          category: "sans-serif",
          unicodeSupport: true,
        },
        {
          name: "Helvetica Neue",
          family: "HelveticaNeue",
          filename: "HelveticaNeue.ttc",
          category: "sans-serif",
          unicodeSupport: false,
        },
        {
          name: "Arial",
          family: "Arial",
          filename: "Arial.ttf",
          category: "sans-serif",
          unicodeSupport: false,
        },
        {
          name: "Times New Roman",
          family: "TimesNewRoman",
          filename: "Times New Roman.ttf",
          category: "serif",
          unicodeSupport: false,
        },
        {
          name: "Courier New",
          family: "CourierNew",
          filename: "Courier New.ttf",
          category: "monospace",
          unicodeSupport: false,
        },
      ],
      win32: [
        // Windows
        {
          name: "Segoe UI",
          family: "SegoeUI",
          filename: "segoeui.ttf",
          category: "sans-serif",
          unicodeSupport: true,
        },
        {
          name: "Arial",
          family: "Arial",
          filename: "arial.ttf",
          category: "sans-serif",
          unicodeSupport: false,
        },
        {
          name: "Times New Roman",
          family: "TimesNewRoman",
          filename: "times.ttf",
          category: "serif",
          unicodeSupport: false,
        },
        {
          name: "Courier New",
          family: "CourierNew",
          filename: "cour.ttf",
          category: "monospace",
          unicodeSupport: false,
        },
        {
          name: "Calibri",
          family: "Calibri",
          filename: "calibri.ttf",
          category: "sans-serif",
          unicodeSupport: true,
        },
      ],
      linux: [
        // Linux
        {
          name: "Ubuntu",
          family: "Ubuntu",
          filename: "Ubuntu-R.ttf",
          category: "sans-serif",
          unicodeSupport: true,
        },
        {
          name: "DejaVu Sans",
          family: "DejaVuSans",
          filename: "DejaVuSans.ttf",
          category: "sans-serif",
          unicodeSupport: true,
        },
        {
          name: "Liberation Sans",
          family: "LiberationSans",
          filename: "LiberationSans-Regular.ttf",
          category: "sans-serif",
          unicodeSupport: true,
        },
        {
          name: "Noto Sans",
          family: "NotoSans",
          filename: "NotoSans-Regular.ttf",
          category: "sans-serif",
          unicodeSupport: true,
        },
      ],
    };

    return commonFonts[platform] || commonFonts.linux;
  }

  /**
   * Detect all available system fonts
   */
  async detectSystemFonts() {
    const fonts = [];
    const fontMap = new Map();

    // Get all search paths
    const searchPaths = [
      this.fontPaths.app,
      ...this.fontPaths.system,
      ...this.fontPaths.container,
    ];

    for (const searchPath of searchPaths) {
      if (!fs.existsSync(searchPath)) continue;

      try {
        const files = fs.readdirSync(searchPath);

        for (const file of files) {
          const filePath = path.join(searchPath, file);

          // Check if it's a font file
          if (this.isFontFile(file)) {
            const fontName = this.extractFontName(file);

            if (!fontMap.has(fontName)) {
              const fontInfo = {
                name: fontName,
                family: fontName,
                path: filePath,
                type: this.getFontType(file),
                unicodeSupport: this.checkUnicodeSupport(file),
                weight: "normal",
                style: "normal",
              };

              fontMap.set(fontName, fontInfo);
              fonts.push(fontInfo);
            }
          }
        }
      } catch (error) {
        logger.debug(`Failed to read font directory: ${searchPath}`, {
          error: error.message,
        });
      }
    }

    logger.info(`Detected ${fonts.length} system fonts on ${os.platform()}`);
    return fonts;
  }

  /**
   * Check if file is a font file
   */
  isFontFile(filename) {
    const fontExtensions = [
      ".ttf",
      ".otf",
      ".woff",
      ".woff2",
      ".ttc",
      ".dfont",
    ];
    const ext = path.extname(filename).toLowerCase();
    return fontExtensions.includes(ext);
  }

  /**
   * Extract font name from filename
   */
  extractFontName(filename) {
    // Remove extension
    let name = path.basename(filename, path.extname(filename));

    // Clean up common patterns
    name = name.replace(/[-_]/g, " ");
    name = name.replace(/\b\w/g, (l) => l.toUpperCase());

    return name;
  }

  /**
   * Get font type from extension
   */
  getFontType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const typeMap = {
      ".ttf": "TrueType",
      ".otf": "OpenType",
      ".woff": "WOFF",
      ".woff2": "WOFF2",
      ".ttc": "TrueType Collection",
      ".dfont": "Datafork",
    };
    return typeMap[ext] || "Unknown";
  }

  /**
   * Check if font supports Unicode (simplified check)
   */
  checkUnicodeSupport(filename) {
    // Simplified check based on font name and type
    const name = filename.toLowerCase();
    const unicodeFonts = [
      "dejavu",
      "liberation",
      "noto",
      "arial",
      "helvetica",
      "times",
      "courier",
    ];
    return unicodeFonts.some((font) => name.includes(font));
  }

  /**
   * Test if a font can properly render given text
   */
  async testFontRendering(fontFamily, text) {
    try {
      // This is a simplified test - in a real implementation,
      // you might want to use a more sophisticated method
      const hasUnicodeChars = /[^\x00-\x7F]/.test(text);
      const fontInfo = (await this.getAvailableFonts()).find(
        (f) => f.family === fontFamily
      );

      if (!fontInfo) {
        return { canRender: false, reason: "Font not found" };
      }

      if (hasUnicodeChars && !fontInfo.unicodeSupport) {
        return {
          canRender: false,
          reason: "Font does not support Unicode characters",
          suggestion: "Use DejaVu Sans or another Unicode-capable font",
        };
      }

      return { canRender: true };
    } catch (error) {
      return { canRender: false, reason: error.message };
    }
  }

  /**
   * Validate text encoding and detect issues
   */
  validateTextEncoding(text) {
    if (!text || typeof text !== "string") {
      return { hasIssues: false, issues: [] };
    }

    const issues = [];

    // Check for replacement characters
    if (text.includes("�")) {
      issues.push({
        type: "replacement-char",
        message: "Contains replacement characters (�)",
        severity: "error",
      });
    }

    // Check for control characters
    if (/[\u0000-\u001F\u007F-\u009F]/.test(text)) {
      issues.push({
        type: "control-chars",
        message: "Contains control characters",
        severity: "warning",
      });
    }

    // Check for bidirectional text marks
    if (/[\u200E\u200F\u202A-\u202E]/.test(text)) {
      issues.push({
        type: "bidi-marks",
        message: "Contains bidirectional text marks",
        severity: "info",
      });
    }

    return {
      hasIssues: issues.length > 0,
      issues,
      text,
      hasUnicode: /[^\x00-\x7F]/.test(text),
    };
  }

  /**
   * Validate font availability and support
   */
  async validateFont(fontFamily) {
    if (!fontFamily || typeof fontFamily !== "string") {
      return {
        isValid: false,
        reason: "Font family not specified",
        suggestion: "Please specify a valid font family name",
      };
    }

    const availableFonts = await this.getAvailableFonts();
    const font = availableFonts.find(
      (f) => f.family.toLowerCase() === fontFamily.toLowerCase()
    );

    if (!font) {
      return {
        isValid: false,
        reason: "Font not found in system",
        suggestion: "Use one of the available fonts",
        availableFonts: availableFonts.slice(0, 5).map((f) => f.family),
      };
    }

    return {
      isValid: true,
      font: font,
      unicodeSupport: font.unicodeSupport || false,
    };
  }

  /**
   * Validate text compatibility with specific font
   */
  async validateTextWithFont(text, fontFamily) {
    const textValidation = this.validateTextEncoding(text);
    const fontValidation = await this.validateFont(fontFamily);

    if (!fontValidation.isValid) {
      return {
        compatible: false,
        reason: fontValidation.reason,
        suggestion: fontValidation.suggestion,
        textIssues: textValidation.issues,
        fontIssues: [fontValidation.reason],
      };
    }

    const hasUnicode = textValidation.hasUnicode;
    const fontSupportsUnicode = fontValidation.font.unicodeSupport;

    if (hasUnicode && !fontSupportsUnicode) {
      return {
        compatible: false,
        reason: "Font does not support Unicode characters in the text",
        suggestion: "Use a Unicode-capable font like DejaVu Sans",
        textIssues: textValidation.issues,
        fontIssues: ["No Unicode support"],
      };
    }

    return {
      compatible: true,
      textIssues: textValidation.issues,
      fontIssues: [],
      font: fontValidation.font,
    };
  }
}

module.exports = FontManager;
