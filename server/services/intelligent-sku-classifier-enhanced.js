const logger = require("../utils/logger");
/**
 * Enhanced Intelligent SKU Classifier
 * Advanced barcode vs SKU detection with data-driven learning
 * Addresses specific case: "nwadas003orj" should be detected as SKU
 */

class IntelligentSKUClassifier {
  constructor() {
    this.initializePatterns();
    this.learnedPatterns = new Map();
    this.confidence_threshold = 0.4;
  }

  initializePatterns() {
    // Enhanced barcode patterns based on international standards and data analysis
    this.barcodePatterns = {
      // Standard barcode formats
      ean13: {
        regex: /^\d{13}$/,
        confidence: 0.95,
        description: 'EAN-13 standard barcode'
      },
      ean8: {
        regex: /^\d{8}$/,
        confidence: 0.95,
        description: 'EAN-8 standard barcode'
      },
      upc: {
        regex: /^\d{12}$/,
        confidence: 0.95,
        description: 'UPC standard barcode'
      },
      isbn: {
        regex: /^97[89]\d{10}$/,
        confidence: 0.98,
        description: 'ISBN barcode format'
      },
      // Platform-specific patterns from data analysis
      turkishEan: {
        regex: /^8690\d{9}$/,
        confidence: 0.96,
        description: 'Turkish EAN-13 barcode'
      },
      platformGenerated: {
        regex: /^MX8SL\d+$/,
        confidence: 0.92,
        description: 'Platform-generated barcode'
      },
      systemGenerated: {
        regex: /^TY[A-Z0-9]{10,}$/,
        confidence: 0.88,
        description: 'System-generated barcode'
      },
      // Generic patterns
      longNumeric: {
        regex: /^\d{10,15}$/,
        confidence: 0.75,
        description: 'Long numeric code (likely barcode)'
      },
      numericOnly8Plus: {
        regex: /^\d{8,}$/,
        confidence: 0.7,
        description: '8+ digit numeric code'
      }
    };

    // Enhanced SKU patterns based on real data analysis
    this.skuPatterns = {
      // Specific learned patterns from real data
      notewarePattern: {
        regex: /^NW[A-Z]+-[A-Z0-9]+-[A-Z0-9]+$/i,
        confidence: 0.92,
        description: 'Noteware product SKU pattern'
      },
      hyphenatedStandard: {
        regex: /^[A-Z]{2,6}-[A-Z0-9]{2,6}-[A-Z0-9]{1,8}$/i,
        confidence: 0.85,
        description: 'Standard hyphenated SKU pattern'
      },
      // CRITICAL: Pattern for codes like "nwadas003orj"
      alphaNumericMixed: {
        regex: /^[a-z]+[0-9]{2,}[a-z]*$/i,
        confidence: 0.75,
        description: 'Mixed alphanumeric SKU without separators'
      },
      prefixedVariant: {
        regex: /^(KASA|ETIK|NWAD|NWK|NWHD)-.*$/i,
        confidence: 0.88,
        description: 'Product category prefixed SKU'
      },
      companyBranded: {
        regex: /^(COMP|BRAND|NIKE|ASUS|HP|LENOVO)-.*$/i,
        confidence: 0.82,
        description: 'Brand-prefixed SKU'
      },
      // General SKU characteristics
      mixedAlphaNumeric: {
        regex: /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9\-_\.]{4,30}$/,
        confidence: 0.65,
        description: 'Mixed alphanumeric with possible separators'
      }
    };

    // Character composition analysis rules
    this.compositionRules = {
      hasLettersAndNumbers: (code) => /[a-zA-Z]/.test(code) && /\d/.test(code),
      hasSeparators: (code) => /[-_\.]/.test(code),
      isPureNumeric: (code) => /^\d+$/.test(code),
      hasRepeatedInitials: (code) => this.hasRepeatedInitials(code),
      hasTypicalSKULength: (code) => code.length >= 4 && code.length <= 30,
      hasVariantSuffix: (code) =>
        /-(A|B|TR|UK|RGB|LED|SYH|BEYAZ|KIRMIZI|V\d+)$/i.test(code)
    };
  }

  hasRepeatedInitials(code) {
    // Check for repeated 2-3 letter patterns that might indicate brand/type codes
    const matches = code.match(/([A-Z]{2,3})/gi);
    if (!matches || matches.length < 2) {return false;}

    const uniqueMatches = [...new Set(matches.map((m) => m.toUpperCase()))];
    return matches.length > uniqueMatches.length;
  }

  analyzeCharacteristics(code) {
    const characteristics = {
      length: code.length,
      hasLetters: /[a-zA-Z]/.test(code),
      hasNumbers: /\d/.test(code),
      hasSpecialChars: /[^a-zA-Z0-9]/.test(code),
      hasSeparators: /[-_\.]/.test(code),
      isNumericOnly: /^\d+$/.test(code),
      startsWithLetter: /^[a-zA-Z]/.test(code),
      endsWithNumber: /\d$/.test(code),
      alphaNumericRatio: this.calculateAlphaNumericRatio(code),
      separatorCount: (code.match(/[-_\.]/g) || []).length,
      consecutiveNumbers: this.getConsecutiveNumberLength(code),
      consecutiveLetters: this.getConsecutiveLetterLength(code)
    };

    return characteristics;
  }

  calculateAlphaNumericRatio(code) {
    const letters = (code.match(/[a-zA-Z]/g) || []).length;
    const numbers = (code.match(/\d/g) || []).length;
    const total = letters + numbers;

    if (total === 0) {return 0;}
    return letters / total;
  }

  getConsecutiveNumberLength(code) {
    const matches = code.match(/\d+/g);
    return matches ? Math.max(...matches.map((m) => m.length)) : 0;
  }

  getConsecutiveLetterLength(code) {
    const matches = code.match(/[a-zA-Z]+/g);
    return matches ? Math.max(...matches.map((m) => m.length)) : 0;
  }

  classify(code, context = {}) {
    if (!code || typeof code !== 'string') {
      return {
        type: 'unknown',
        confidence: 0,
        reason: 'Invalid input',
        original: code,
        normalized: '',
        characteristics: {},
        patterns: []
      };
    }

    const normalized = code.trim();
    const characteristics = this.analyzeCharacteristics(normalized);

    // Multi-layer classification
    const classifications = [
      this.classifyByBarcodePatterns(normalized),
      this.classifyBySKUPatterns(normalized),
      this.classifyByCharacteristics(normalized, characteristics),
      this.classifyByContext(normalized, context)
    ];

    // Weighted scoring
    let barcodeScore = 0;
    let skuScore = 0;
    const weights = [0.4, 0.3, 0.2, 0.1]; // Decreasing importance
    let totalWeight = 0;

    classifications.forEach((classification, index) => {
      const weight = weights[index];
      totalWeight += weight;

      if (classification.type === 'barcode') {
        barcodeScore += classification.confidence * weight;
      } else if (classification.type === 'sku') {
        skuScore += classification.confidence * weight;
      }
    });

    // Normalize scores
    barcodeScore /= totalWeight;
    skuScore /= totalWeight;

    // Special case handling for edge cases
    const finalClassification = this.makeFinalDecision(
      normalized,
      barcodeScore,
      skuScore,
      characteristics,
      classifications
    );

    return {
      type: finalClassification.type,
      confidence: finalClassification.confidence,
      reason: finalClassification.reason,
      original: code,
      normalized: normalized,
      characteristics: characteristics,
      patterns: classifications.filter((c) => c.confidence > 0.3),
      scores: {
        barcode: barcodeScore,
        sku: skuScore
      }
    };
  }

  classifyByBarcodePatterns(code) {
    let bestMatch = {
      type: 'unknown',
      confidence: 0,
      pattern: null,
      description: ''
    };

    for (const [patternName, pattern] of Object.entries(this.barcodePatterns)) {
      if (pattern.regex.test(code)) {
        if (pattern.confidence > bestMatch.confidence) {
          bestMatch = {
            type: 'barcode',
            confidence: pattern.confidence,
            pattern: patternName,
            description: pattern.description
          };
        }
      }
    }

    return bestMatch;
  }

  classifyBySKUPatterns(code) {
    let bestMatch = {
      type: 'unknown',
      confidence: 0,
      pattern: null,
      description: ''
    };

    for (const [patternName, pattern] of Object.entries(this.skuPatterns)) {
      if (pattern.regex.test(code)) {
        if (pattern.confidence > bestMatch.confidence) {
          bestMatch = {
            type: 'sku',
            confidence: pattern.confidence,
            pattern: patternName,
            description: pattern.description
          };
        }
      }
    }

    return bestMatch;
  }

  classifyByCharacteristics(code, characteristics) {
    let skuScore = 0;
    let barcodeScore = 0;
    const features = [];

    // SKU indicators
    if (characteristics.hasLetters && characteristics.hasNumbers) {
      skuScore += 0.4;
      features.push('Mixed alphanumeric (favors SKU)');
    }

    if (characteristics.hasSeparators) {
      skuScore += 0.3;
      features.push('Contains separators (typical for SKUs)');
    }

    if (characteristics.startsWithLetter) {
      skuScore += 0.2;
      features.push('Starts with letter (common in SKUs)');
    }

    if (
      characteristics.alphaNumericRatio > 0.2 &&
      characteristics.alphaNumericRatio < 0.8
    ) {
      skuScore += 0.2;
      features.push('Balanced alpha-numeric ratio');
    }

    // Barcode indicators
    if (characteristics.isNumericOnly) {
      if (characteristics.length >= 8) {
        barcodeScore += 0.6;
        features.push('Pure numeric 8+ digits (typical barcode)');
      } else {
        barcodeScore += 0.3;
        features.push('Pure numeric but short');
      }
    }

    if (characteristics.consecutiveNumbers >= 8) {
      barcodeScore += 0.4;
      features.push('Long consecutive number sequence');
    }

    // CRITICAL: Special case for codes like "nwadas003orj"
    if (
      !characteristics.hasSeparators &&
      characteristics.hasLetters &&
      characteristics.hasNumbers &&
      characteristics.length >= 6 &&
      characteristics.length <= 20 &&
      characteristics.consecutiveNumbers <= 4
    ) {
      skuScore += 0.5;
      features.push('Alphanumeric without separators (likely SKU)');
    }

    const finalScore = Math.max(skuScore, barcodeScore);
    const type = skuScore > barcodeScore ? 'sku' : 'barcode';

    return {
      type: finalScore > 0.3 ? type : 'unknown',
      confidence: Math.min(finalScore, 0.85),
      features: features,
      description: 'Character-based analysis'
    };
  }

  classifyByContext(code, context) {
    let adjustment = 0;
    const features = [];

    if (context.source === 'barcode_scanner') {
      adjustment += 0.3; // Favor barcode
      features.push('Scanned from barcode scanner');
    }

    if (context.source === 'manual_entry') {
      adjustment -= 0.2; // Favor SKU
      features.push('Manually entered (likely SKU)');
    }

    if (context.productName && context.productName.includes('barcode')) {
      adjustment += 0.2;
      features.push('Product name mentions barcode');
    }

    return {
      type: adjustment > 0 ? 'barcode' : 'sku',
      confidence: Math.abs(adjustment),
      features: features,
      description: 'Context-based analysis'
    };
  }

  makeFinalDecision(
    code,
    barcodeScore,
    skuScore,
    characteristics,
    classifications
  ) {
    // Enhanced decision logic with edge case handling

    // Rule 0: PRIORITY - Check for exact pattern matches with high confidence
    for (const classification of classifications) {
      if (classification.confidence >= 0.9) {
        return {
          type: classification.type,
          confidence: classification.confidence,
          reason: `Exact pattern match: ${classification.description}`
        };
      }
    }

    // Rule 1: High confidence barcode patterns
    if (barcodeScore > 0.8) {
      return {
        type: 'barcode',
        confidence: barcodeScore,
        reason: 'High confidence barcode pattern detected'
      };
    }

    // Rule 2: High confidence SKU patterns
    if (skuScore > 0.7) {
      return {
        type: 'sku',
        confidence: skuScore,
        reason: 'High confidence SKU pattern detected'
      };
    }

    // Rule 3: CRITICAL - Special case for alphanumeric without separators (like "nwadas003orj")
    if (
      !characteristics.hasSeparators &&
      characteristics.hasLetters &&
      characteristics.hasNumbers &&
      characteristics.length >= 6 &&
      characteristics.length <= 25 &&
      !characteristics.isNumericOnly
    ) {
      return {
        type: 'sku',
        confidence: Math.max(0.6, skuScore),
        reason: 'Alphanumeric without separators pattern (typical SKU format)'
      };
    }

    // Rule 4: Pure numeric decision
    if (characteristics.isNumericOnly) {
      if (characteristics.length >= 10) {
        return {
          type: 'barcode',
          confidence: Math.max(0.75, barcodeScore),
          reason: 'Long numeric sequence indicates barcode'
        };
      } else if (characteristics.length >= 8) {
        return {
          type: 'barcode',
          confidence: Math.max(0.65, barcodeScore),
          reason: 'Numeric sequence of barcode length'
        };
      }
    }

    // Rule 5: Default decision based on scores
    if (barcodeScore > skuScore && barcodeScore > 0.4) {
      return {
        type: 'barcode',
        confidence: barcodeScore,
        reason: 'Pattern analysis favors barcode'
      };
    } else if (skuScore > barcodeScore && skuScore > 0.3) {
      return {
        type: 'sku',
        confidence: skuScore,
        reason: 'Pattern analysis favors SKU'
      };
    }

    // Rule 6: Final fallback - default to SKU for ambiguous cases
    return {
      type: 'sku',
      confidence: Math.max(0.4, skuScore),
      reason: 'Ambiguous pattern, defaulting to SKU (safer assumption)'
    };
  }

  // Enhanced learning from user feedback
  learnFromFeedback(code, correctType, confidence = 1.0) {
    const pattern = this.extractLearningPattern(code, correctType);

    if (!this.learnedPatterns.has(correctType)) {
      this.learnedPatterns.set(correctType, []);
    }

    this.learnedPatterns.get(correctType).push({
      pattern: pattern,
      confidence: confidence,
      timestamp: Date.now(),
      code: code
    });

    logger.info(
      `Learned: ${code} -> ${correctType} (confidence: ${confidence})`
    );
  }

  /**
   * Learn from a classification result (wrapper for learnFromFeedback)
   * Used by unified product intelligence service
   */
  async learnFromClassification(code, classification) {
    if (!code || !classification) {return;}

    // Only learn from high-confidence classifications
    if (classification.confidence && classification.confidence > 0.8) {
      this.learnFromFeedback(
        code,
        classification.type,
        classification.confidence
      );
    }
  }

  extractLearningPattern(code, type) {
    const characteristics = this.analyzeCharacteristics(code);

    return {
      length: characteristics.length,
      hasLetters: characteristics.hasLetters,
      hasNumbers: characteristics.hasNumbers,
      hasSeparators: characteristics.hasSeparators,
      startsWithLetter: characteristics.startsWithLetter,
      alphaNumericRatio:
        Math.round(characteristics.alphaNumericRatio * 10) / 10,
      type: type
    };
  }

  // Batch analysis for pattern discovery
  analyzeCodesForPatterns(codes) {
    const results = codes.map((code) => {
      const classification = this.classify(code);
      return {
        code: code,
        classification: classification,
        features: classification.characteristics
      };
    });

    return {
      total: codes.length,
      barcodes: results.filter((r) => r.classification.type === 'barcode'),
      skus: results.filter((r) => r.classification.type === 'sku'),
      patterns: this.discoverPatterns(results),
      timestamp: new Date().toISOString()
    };
  }

  discoverPatterns(results) {
    const patterns = {
      barcode: this.findCommonPatterns(
        results.filter((r) => r.classification.type === 'barcode')
      ),
      sku: this.findCommonPatterns(
        results.filter((r) => r.classification.type === 'sku')
      )
    };

    return patterns;
  }

  findCommonPatterns(typeResults) {
    const patterns = {
      lengthDistribution: {},
      prefixPatterns: {},
      suffixPatterns: {},
      characterComposition: {}
    };

    typeResults.forEach((result) => {
      const code = result.code;
      const length = code.length;

      // Length distribution
      patterns.lengthDistribution[length] =
        (patterns.lengthDistribution[length] || 0) + 1;

      // Prefix patterns (first 2-3 chars)
      if (code.length >= 2) {
        const prefix = code.substring(0, Math.min(3, code.length));
        patterns.prefixPatterns[prefix] =
          (patterns.prefixPatterns[prefix] || 0) + 1;
      }

      // Character composition
      const composition = result.features.isNumericOnly
        ? 'numeric'
        : result.features.hasLetters && result.features.hasNumbers
          ? 'mixed'
          : result.features.hasLetters
            ? 'alpha'
            : 'other';
      patterns.characterComposition[composition] =
        (patterns.characterComposition[composition] || 0) + 1;
    });

    return patterns;
  }

  /**
   * Provide feedback for learning system
   */
  provideFeedback(feedbackData) {
    const { code, expectedType, wasCorrect, comment } = feedbackData;

    if (!code || !expectedType || typeof wasCorrect !== 'boolean') {
      throw new Error('Code, expectedType, and wasCorrect are required');
    }

    // Get current classification for comparison
    const currentClassification = this.classify(code);

    // Store feedback for learning (in a real implementation, this would go to a database)
    const feedback = {
      code,
      originalClassification: currentClassification.type,
      originalConfidence: currentClassification.confidence,
      expectedType,
      wasCorrect,
      comment,
      timestamp: new Date(),
      characteristics: currentClassification.characteristics
    };

    // Log feedback for analysis
    logger.info('Classification feedback received:', {
      code,
      was: currentClassification.type,
      should_be: expectedType,
      correct: wasCorrect
    });

    // In a production system, this would:
    // 1. Store feedback in database
    // 2. Update pattern weights based on feedback
    // 3. Trigger retraining if enough feedback accumulated
    // 4. Adjust confidence thresholds

    return {
      processed: true,
      feedback,
      adjustments: this.suggestAdjustments(feedback, currentClassification)
    };
  }

  /**
   * Suggest pattern adjustments based on feedback
   */
  suggestAdjustments(feedback, classification) {
    const suggestions = [];

    if (!feedback.wasCorrect) {
      if (
        feedback.expectedType === 'sku' &&
        classification.type === 'barcode'
      ) {
        suggestions.push({
          type: 'pattern_adjustment',
          message:
            'Consider adjusting SKU patterns to better match this format',
          pattern: classification.characteristics
        });
      } else if (
        feedback.expectedType === 'barcode' &&
        classification.type === 'sku'
      ) {
        suggestions.push({
          type: 'pattern_adjustment',
          message:
            'Consider adjusting barcode patterns to better match this format',
          pattern: classification.characteristics
        });
      }
    }

    return suggestions;
  }
}

module.exports = IntelligentSKUClassifier;
