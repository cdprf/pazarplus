/**
 * Intelligent SKU Classifier
 * Distinguishes between barcodes and SKUs, learns patterns dynamically
 */

class IntelligentSKUClassifier {
  constructor() {
    this.barcodePatterns = [
      // EAN-13: 13 digits
      /^\d{13}$/,
      // EAN-8: 8 digits
      /^\d{8}$/,
      // UPC-A: 12 digits
      /^\d{12}$/,
      // UPC-E: 6 digits with specific format
      /^\d{6}$/,
      // ISBN-10: 10 digits with possible dashes
      /^(?:\d{9}[\dX]|\d{1,5}-\d{1,7}-\d{1,7}-[\dX])$/,
      // ISBN-13: 13 digits starting with 978 or 979
      /^97[89]\d{10}$/,
      // Code 128: Mixed alphanumeric but usually long
      /^[A-Z0-9]{10,}$/,
      // Random long alphanumeric (likely barcode)
      /^[A-Z0-9]{15,}$/,
    ];

    this.skuPatterns = [
      // Common SKU patterns with separators
      /^[A-Z]+[-_\.][A-Z0-9]+[-_\.][A-Z0-9]+/,
      // Brand-Product-Variant pattern
      /^[A-Z]{2,4}[-_]?[A-Z0-9]{3,8}[-_]?[A-Z0-9]{1,5}$/,
      // Simple alphanumeric with length constraints
      /^[A-Z0-9]{4,15}$/,
    ];

    this.learnedPatterns = new Map();
    this.userDefinedPatterns = new Map();
  }

  /**
   * Main classification function
   */
  classify(code) {
    if (!code || typeof code !== "string") {
      return {
        type: "invalid",
        confidence: 0,
        reason: "Empty or invalid input",
      };
    }

    const normalizedCode = code.trim().toUpperCase();

    // Check if it's a barcode
    const barcodeResult = this.isBarcode(normalizedCode);
    if (barcodeResult.isBarcode) {
      return {
        type: "barcode",
        confidence: barcodeResult.confidence,
        reason: barcodeResult.reason,
        original: code,
        normalized: normalizedCode,
      };
    }

    // Check if it's a known SKU pattern
    const skuResult = this.isSKU(normalizedCode);
    if (skuResult.isSKU) {
      return {
        type: "sku",
        confidence: skuResult.confidence,
        reason: skuResult.reason,
        pattern: skuResult.pattern,
        original: code,
        normalized: normalizedCode,
        parsed: skuResult.parsed,
      };
    }

    // Unrecognized pattern
    return {
      type: "unrecognized",
      confidence: 0,
      reason: "Pattern not recognized",
      original: code,
      normalized: normalizedCode,
      suggestions: this.generateSuggestions(normalizedCode),
    };
  }

  /**
   * Check if code is a barcode
   */
  isBarcode(code) {
    // Check length and composition
    if (code.length >= 12 && /^\d+$/.test(code)) {
      return {
        isBarcode: true,
        confidence: 0.9,
        reason: "Numeric code with barcode length pattern",
      };
    }

    // Check against known barcode patterns
    for (const pattern of this.barcodePatterns) {
      if (pattern.test(code)) {
        return {
          isBarcode: true,
          confidence: 0.85,
          reason: `Matches barcode pattern: ${pattern}`,
        };
      }
    }

    // Long alphanumeric without clear structure
    if (code.length > 15 && !/[-_\.]/.test(code)) {
      return {
        isBarcode: true,
        confidence: 0.7,
        reason: "Long unstructured alphanumeric code",
      };
    }

    return { isBarcode: false, confidence: 0, reason: "Not a barcode pattern" };
  }

  /**
   * Check if code is a SKU
   */
  isSKU(code) {
    // Check user-defined patterns first
    for (const [patternName, pattern] of this.userDefinedPatterns) {
      const result = this.testPattern(code, pattern);
      if (result.matches) {
        return {
          isSKU: true,
          confidence: 0.95,
          reason: `Matches user-defined pattern: ${patternName}`,
          pattern: patternName,
          parsed: result.parsed,
        };
      }
    }

    // Check learned patterns
    for (const [patternName, pattern] of this.learnedPatterns) {
      const result = this.testPattern(code, pattern);
      if (result.matches) {
        return {
          isSKU: true,
          confidence: 0.8,
          reason: `Matches learned pattern: ${patternName}`,
          pattern: patternName,
          parsed: result.parsed,
        };
      }
    }

    // Check built-in SKU patterns
    for (const pattern of this.skuPatterns) {
      if (pattern.test(code)) {
        const parsed = this.parseWithBuiltinPattern(code, pattern);
        return {
          isSKU: true,
          confidence: 0.6,
          reason: `Matches built-in SKU pattern`,
          pattern: "builtin",
          parsed,
        };
      }
    }

    return { isSKU: false, confidence: 0, reason: "No SKU pattern matched" };
  }

  /**
   * Test a code against a specific pattern
   */
  testPattern(code, pattern) {
    try {
      if (pattern.regex && pattern.regex.test(code)) {
        return {
          matches: true,
          parsed: this.parseWithPattern(code, pattern),
        };
      }
    } catch (error) {
      console.warn("Pattern test error:", error);
    }

    return { matches: false };
  }

  /**
   * Parse code with a specific pattern
   */
  parseWithPattern(code, pattern) {
    if (!pattern.groups) {
      return { raw: code };
    }

    const match = code.match(pattern.regex);
    if (!match) {
      return { raw: code };
    }

    const parsed = { raw: code };
    pattern.groups.forEach((group, index) => {
      if (match[index + 1]) {
        parsed[group] = match[index + 1];
      }
    });

    return parsed;
  }

  /**
   * Parse with built-in pattern (simple fallback)
   */
  parseWithBuiltinPattern(code, pattern) {
    // Simple parsing for built-in patterns
    const parts = code.split(/[-_\.]/);
    if (parts.length >= 2) {
      return {
        raw: code,
        prefix: parts[0],
        main: parts[1],
        suffix: parts.length > 2 ? parts.slice(2).join("-") : null,
      };
    }
    return { raw: code };
  }

  /**
   * Generate suggestions for unrecognized patterns
   */
  generateSuggestions(code) {
    const suggestions = [];

    // Suggest if it might be a barcode
    if (code.length >= 8 && /^\d+$/.test(code)) {
      suggestions.push({
        type: "barcode",
        reason: "Looks like a numeric barcode",
        action: "Mark as barcode and enter corresponding SKU",
      });
    }

    // Suggest pattern creation
    suggestions.push({
      type: "create_pattern",
      reason: "Create a new SKU pattern for similar codes",
      action: "Define pattern structure",
    });

    // Suggest manual classification
    suggestions.push({
      type: "manual",
      reason: "Manually classify this code",
      action: "Specify code type and structure",
    });

    return suggestions;
  }

  /**
   * Pattern Learning and Management Methods
   */

  /**
   * Learn pattern from examples
   */
  learnPattern(name, patternDefinition, examples = []) {
    try {
      const pattern = {
        name,
        regex: patternDefinition.regex,
        groups: patternDefinition.groups,
        description: patternDefinition.description || "",
        examples: examples,
        learnedAt: new Date(),
        confidence: 0.8, // Initial confidence for learned patterns
      };

      this.learnedPatterns.set(name, pattern);

      return {
        success: true,
        pattern,
        message: `Pattern ${name} learned successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Add user-defined pattern
   */
  addUserPattern(name, patternDefinition) {
    try {
      const pattern = {
        name,
        regex: patternDefinition.regex,
        description: patternDefinition.description || "",
        examples: patternDefinition.examples || [],
        userDefined: true,
        createdAt: patternDefinition.createdAt || new Date(),
        updatedAt: new Date(),
      };

      this.userDefinedPatterns.set(name, pattern);

      return {
        success: true,
        pattern,
        message: `User pattern ${name} added successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Learn from user feedback
   */
  learnFromFeedback(code, expectedType, confidence = 0.8) {
    try {
      // Store feedback for learning
      const feedback = {
        code,
        expectedType,
        confidence,
        timestamp: new Date(),
      };

      // In a real implementation, this would use machine learning
      // For now, we'll create a simple pattern based on the feedback
      if (expectedType === "sku" && confidence > 0.7) {
        const pattern = this.extractPatternFromCode(code);
        if (pattern) {
          const patternName = `learned_${Date.now()}`;
          this.learnedPatterns.set(patternName, {
            name: patternName,
            regex: pattern,
            description: `Learned from user feedback for: ${code}`,
            confidence: confidence,
            learnedAt: new Date(),
            source: "user_feedback",
          });
        }
      }

      return {
        success: true,
        feedback,
        message: "Feedback processed successfully",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Extract pattern from code (simple heuristic)
   */
  extractPatternFromCode(code) {
    // Simple pattern extraction based on code structure
    if (/^[A-Z]+-[A-Z]+-[0-9]+$/.test(code)) {
      return /^[A-Z]+-[A-Z]+-[0-9]+$/;
    }
    if (/^[A-Z]+[A-Z]+-[A-Z]+[0-9]+-[A-Z0-9]+$/.test(code)) {
      return /^[A-Z]+[A-Z]+-[A-Z]+[0-9]+-[A-Z0-9]+$/;
    }
    return null;
  }

  /**
   * Get all patterns
   */
  getAllPatterns() {
    return {
      builtin: Array.from({ length: this.skuPatterns.length }, (_, i) => ({
        name: `builtin_${i}`,
        regex: this.skuPatterns[i],
        type: "builtin",
      })),
      userDefined: Array.from(this.userDefinedPatterns.values()),
      learned: Array.from(this.learnedPatterns.values()),
    };
  }

  /**
   * Remove user pattern
   */
  removeUserPattern(name) {
    if (this.userDefinedPatterns.has(name)) {
      const removed = this.userDefinedPatterns.get(name);
      this.userDefinedPatterns.delete(name);
      return {
        success: true,
        pattern: removed,
        message: `User pattern ${name} removed successfully`,
      };
    }
    return {
      success: false,
      message: `User pattern ${name} not found`,
    };
  }

  /**
   * Clear learned patterns
   */
  clearLearnedPatterns() {
    const count = this.learnedPatterns.size;
    this.learnedPatterns.clear();
    return {
      success: true,
      message: `Cleared ${count} learned patterns`,
    };
  }

  /**
   * Remove a pattern
   */
  removePattern(patternName, type = "learned") {
    if (type === "user") {
      return this.userDefinedPatterns.delete(patternName);
    } else if (type === "learned") {
      return this.learnedPatterns.delete(patternName);
    }
    return false;
  }

  /**
   * Update pattern confidence based on feedback
   */
  updatePatternConfidence(patternName, isCorrect) {
    const pattern =
      this.learnedPatterns.get(patternName) ||
      this.userDefinedPatterns.get(patternName);
    if (pattern) {
      if (isCorrect) {
        pattern.confidence = Math.min(0.95, pattern.confidence + 0.05);
      } else {
        pattern.confidence = Math.max(0.3, pattern.confidence - 0.1);
      }
      return pattern.confidence;
    }
    return null;
  }

  /**
   * Analyze a batch of codes to suggest patterns
   */
  analyzeCodeBatch(codes) {
    const analysis = {
      barcodes: [],
      skus: [],
      unrecognized: [],
      suggestedPatterns: [],
    };

    codes.forEach((code) => {
      const result = this.classify(code);
      if (result.type === "barcode") {
        analysis.barcodes.push(result);
      } else if (result.type === "sku") {
        analysis.skus.push(result);
      } else {
        analysis.unrecognized.push(result);
      }
    });

    // Analyze unrecognized codes for common patterns
    if (analysis.unrecognized.length > 0) {
      analysis.suggestedPatterns = this.findCommonPatterns(
        analysis.unrecognized.map((r) => r.normalized)
      );
    }

    return analysis;
  }

  /**
   * Find common patterns in unrecognized codes
   */
  findCommonPatterns(codes) {
    const patterns = [];

    // Group by length
    const lengthGroups = {};
    codes.forEach((code) => {
      const len = code.length;
      if (!lengthGroups[len]) lengthGroups[len] = [];
      lengthGroups[len].push(code);
    });

    // Analyze each length group
    Object.entries(lengthGroups).forEach(([length, groupCodes]) => {
      if (groupCodes.length >= 2) {
        const commonPattern = this.extractCommonPattern(groupCodes);
        if (commonPattern) {
          patterns.push({
            length: parseInt(length),
            codeCount: groupCodes.length,
            suggestedRegex: commonPattern.regex,
            examples: groupCodes.slice(0, 3),
            confidence: commonPattern.confidence,
          });
        }
      }
    });

    return patterns;
  }

  /**
   * Extract common pattern from similar codes
   */
  extractCommonPattern(codes) {
    if (codes.length < 2) return null;

    // Find common structure
    const firstCode = codes[0];
    let pattern = "";
    let hasCommonStructure = true;

    for (let i = 0; i < firstCode.length; i++) {
      const char = firstCode[i];
      const allSameType = codes.every((code) => {
        if (i >= code.length) return false;
        const codeChar = code[i];
        return (
          (/\d/.test(char) && /\d/.test(codeChar)) ||
          (/[A-Z]/.test(char) && /[A-Z]/.test(codeChar)) ||
          (char === codeChar && /[-_\.]/.test(char))
        );
      });

      if (allSameType) {
        if (/\d/.test(char)) {
          pattern += "\\d";
        } else if (/[A-Z]/.test(char)) {
          pattern += "[A-Z]";
        } else {
          pattern += char;
        }
      } else {
        hasCommonStructure = false;
        break;
      }
    }

    if (hasCommonStructure && pattern.length > 3) {
      return {
        regex: `^${pattern}$`,
        confidence: 0.7,
      };
    }

    return null;
  }
}

module.exports = IntelligentSKUClassifier;
