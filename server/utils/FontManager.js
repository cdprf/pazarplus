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
      // Primary Unicode fonts
      { name: "DejaVuSans", files: ["DejaVuSans.ttf", "DejaVuSans-Bold.ttf"] },
      {
        name: "LiberationSans",
        files: ["LiberationSans-Regular.ttf", "LiberationSans-Bold.ttf"],
      },
      {
        name: "NotoSans",
        files: ["NotoSans-Regular.ttf", "NotoSans-Bold.ttf"],
      },

      // System fonts with Unicode support
      { name: "ArialUnicodeMS", files: ["ArialUnicodeMS.ttf"] },
      { name: "SegoeUI", files: ["segoeui.ttf", "segoeuib.ttf"] },
      { name: "Ubuntu", files: ["Ubuntu-R.ttf", "Ubuntu-B.ttf"] },

      // Fallback to built-in PDFKit fonts (limited Unicode)
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

            logger.info(`Font registered successfully: ${fontName}`, {
              path: fontPath,
            });
          } catch (error) {
            results.failed.push({
              file: fontFile,
              path: fontPath,
              error: error.message,
            });
            logger.warn(`Failed to register font: ${fontFile}`, error);
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
}

module.exports = FontManager;
