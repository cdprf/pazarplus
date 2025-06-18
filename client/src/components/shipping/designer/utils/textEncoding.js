// Text encoding utilities using proper internationalization

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
  // Build font stack with DejaVu Sans prioritized to match PDF output
  const unicodeFonts = [
    '"DejaVu Sans"',
    '"Segoe UI"',
    '"Noto Sans"',
    '"Liberation Sans"',
    '"Helvetica Neue"',
    "Arial",
    "sans-serif",
  ];

  // If no preferred font specified, use DejaVu Sans first for PDF consistency
  if (!preferredFont) {
    return unicodeFonts.join(", ");
  }

  // If user prefers Arial, Helvetica, or similar, still prioritize DejaVu Sans for consistency
  const systemFonts = ["Arial", "Helvetica", "Times New Roman", "Courier New"];
  if (systemFonts.includes(preferredFont)) {
    return unicodeFonts.join(", ");
  }

  // For other custom fonts, include user preference but still use DejaVu Sans as fallback
  return `"${preferredFont}", ${unicodeFonts.join(", ")}`;
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
