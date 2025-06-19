// Text encoding utilities using proper internationalization

/**
 * Detect encoding issues in text
 * @param {string} text - Input text to analyze
 * @returns {Object} - Analysis results
 */
export const detectEncodingIssues = (text) => {
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

  // Check for invisible/control characters
  // eslint-disable-next-line no-control-regex
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
      type: "bidi-chars",
      message: "Contains bidirectional text markers",
      severity: "info",
    });
  }

  // Check for mixed scripts (might be problematic for some fonts)
  const hasLatin = /[A-Za-z]/.test(text);
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  const hasCyrillic = /[\u0400-\u04FF]/.test(text);
  const hasGreek = /[\u0370-\u03FF]/.test(text);
  const hasTurkish = /[çğıöşüÇĞİÖŞÜ]/.test(text);

  const scriptCount = [hasLatin, hasArabic, hasCyrillic, hasGreek].filter(
    Boolean
  ).length;
  if (scriptCount > 1) {
    issues.push({
      type: "mixed-scripts",
      message: "Contains mixed scripts - may need Unicode font",
      severity: "info",
    });
  }

  // Turkish-specific checks
  if (hasTurkish) {
    issues.push({
      type: "turkish-chars",
      message: "Contains Turkish characters - Unicode font recommended",
      severity: "success",
    });
  }

  return {
    hasIssues: issues.some((i) => i.severity === "error"),
    hasWarnings: issues.some((i) => i.severity === "warning"),
    hasInfo: issues.some(
      (i) => i.severity === "info" || i.severity === "success"
    ),
    issues,
    scriptInfo: { hasLatin, hasArabic, hasCyrillic, hasGreek, hasTurkish },
  };
};

/**
 * Ensures proper text encoding using Unicode normalization
 * @param {string} text - Input text
 * @returns {string} - Properly normalized text
 */
export const ensureProperEncoding = (text) => {
  if (!text || typeof text !== "string") return text;

  // Use Unicode normalization - NFC is the most common form
  return text.normalize("NFC");
};

/**
 * Sanitizes text for barcode generation using transliteration
 * @param {string} text - Input text
 * @returns {string} - ASCII-safe text for barcodes
 */
export const sanitizeForBarcode = (text) => {
  if (!text || typeof text !== "string") return text;

  // Use proper transliteration instead of hardcoded mappings
  try {
    // First normalize the text
    const normalized = text.normalize("NFD");

    // Remove diacritical marks and convert to ASCII
    const ascii = normalized.replace(/[\u0300-\u036f]/g, "");

    // Additional cleanup for remaining non-ASCII characters
    return ascii
      .replace(/[^\u0020-\u007F]/g, "") // Remove non-printable ASCII
      .replace(/[^A-Za-z0-9\s\-.]/g, "") // Keep only safe characters
      .trim();
  } catch (error) {
    console.warn("Barcode sanitization failed, using fallback:", error);
    // Fallback: keep only alphanumeric
    return text.replace(/[^A-Za-z0-9]/g, "");
  }
};

/**
 * Formats text for display using Intl API
 * @param {string} text - Input text
 * @param {string} elementType - Type of element for special formatting
 * @param {string} locale - Locale for formatting (default: tr-TR)
 * @returns {string} - Formatted text
 */
export const formatTextForDisplay = (
  text,
  elementType = "text",
  locale = "tr-TR"
) => {
  if (!text || typeof text !== "string") return text;

  // Ensure proper encoding first
  let formatted = ensureProperEncoding(text);

  // Element-specific formatting using Intl API
  switch (elementType) {
    case "barcode":
      return sanitizeForBarcode(formatted);

    case "date":
      try {
        const date = new Date(formatted);
        if (!isNaN(date.getTime())) {
          return new Intl.DateTimeFormat(locale, {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(date);
        }
      } catch (e) {
        // Not a date, return as-is
      }
      return formatted;

    case "currency":
      try {
        const number = parseFloat(formatted);
        if (!isNaN(number)) {
          return new Intl.NumberFormat(locale, {
            style: "currency",
            currency: "TRY",
          }).format(number);
        }
      } catch (e) {
        // Not a number, return as-is
      }
      return formatted;

    case "number":
      try {
        const number = parseFloat(formatted);
        if (!isNaN(number)) {
          return new Intl.NumberFormat(locale).format(number);
        }
      } catch (e) {
        // Not a number, return as-is
      }
      return formatted;

    default:
      return formatted;
  }
};

/**
 * Gets appropriate font stack for text rendering
 * Prioritizes DejaVu Sans to match PDF output for better preview accuracy
 * @param {string} text - Input text to analyze
 * @param {string} preferredFont - User's preferred font
 * @returns {string} - CSS font stack
 */
export const getOptimalFontStack = (text, preferredFont = null) => {
  // Define fallback fonts for different categories
  const fallbackFonts = {
    "sans-serif": [
      '"DejaVu Sans"',
      '"Segoe UI"',
      '"Noto Sans"',
      '"Liberation Sans"',
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ],
    serif: ['"DejaVu Serif"', '"Times New Roman"', "Georgia", "serif"],
    monospace: ['"DejaVu Sans Mono"', '"Courier New"', "Monaco", "monospace"],
  };

  // If no preferred font specified, use DejaVu Sans as default
  if (!preferredFont) {
    return fallbackFonts["sans-serif"].join(", ");
  }

  // Clean up font name (remove quotes if present)
  const cleanFont = preferredFont.replace(/['"]/g, "");

  // Determine font category based on font name
  let category = "sans-serif";
  if (
    cleanFont.toLowerCase().includes("times") ||
    cleanFont.toLowerCase().includes("serif") ||
    cleanFont.toLowerCase().includes("georgia")
  ) {
    category = "serif";
  } else if (
    cleanFont.toLowerCase().includes("courier") ||
    cleanFont.toLowerCase().includes("mono") ||
    cleanFont.toLowerCase().includes("consolas")
  ) {
    category = "monospace";
  }

  // Build font stack with user's preferred font first, then fallbacks
  const fontStack = [`"${cleanFont}"`, ...fallbackFonts[category]];

  // Remove duplicates while preserving order
  const uniqueFonts = [...new Set(fontStack)];

  return uniqueFonts.join(", ");
};

/**
 * Validates text encoding and suggests fixes
 * @param {string} text - Input text
 * @returns {Object} - Validation result with suggestions
 */
export const validateTextEncoding = (text) => {
  if (!text || typeof text !== "string") {
    return { isValid: true, issues: [], suggestions: [] };
  }

  const issues = [];
  const suggestions = [];

  // Check for common encoding issues
  if (text.includes("�")) {
    issues.push("Contains replacement characters (�)");
    suggestions.push(
      "Text may have encoding issues - try re-entering the text"
    );
  }

  // Check for mixed encoding patterns
  if (/[\x80-\xFF]/.test(text)) {
    issues.push("Contains high-byte characters that may cause issues");
    suggestions.push("Consider using Unicode normalization");
  }

  // Check for very long strings that might cause rendering issues
  if (text.length > 1000) {
    issues.push("Text is very long and may cause performance issues");
    suggestions.push(
      "Consider shortening the text or splitting into multiple elements"
    );
  }

  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
    normalizedText: ensureProperEncoding(text),
  };
};
