/**
 * Enhanced SKU Pattern Analyzer
 * Analyzes existing data to create intelligent barcode vs SKU classification
 */

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

class EnhancedSKUPatternAnalyzer {
  constructor() {
    this.dbPath = path.join(__dirname, "server", "database.sqlite");
    this.patterns = {
      barcode: [],
      sku: [],
      learned: [],
    };

    // Known barcode patterns from research
    this.barcodeFormats = {
      ean13: /^\d{13}$/, // 13 digits
      ean8: /^\d{8}$/, // 8 digits
      upc: /^\d{12}$/, // 12 digits
      isbn: /^97[89]\d{10}$/, // ISBN format
      code128: /^[\x00-\x7F]{1,48}$/, // ASCII characters
      numericOnly: /^\d+$/, // Pure numeric
      longNumeric: /^\d{10,}$/, // 10+ digits (likely barcode)
    };

    // SKU pattern characteristics from data analysis
    this.skuCharacteristics = {
      hasAlphaAndNumeric: /^(?=.*[a-zA-Z])(?=.*\d)/,
      hasSeparators: /[-_\.]/,
      hasRepeatedPatterns: /([a-zA-Z]{2,})-?([a-zA-Z]{2,})-?/,
      hasVersioning: /[vV]\d+|v?\d+$/,
      hasVariantCodes: /-(A|B|TR|UK|RGB|LED|SYH|BEYAZ|KIRMIZI)$/i,
      commonPrefixes: /^(NW|KASA|ETIK|DerweLLQNW|Tablet)/i,
      typicalSKULength: /^.{6,30}$/,
    };
  }

  async analyzeExistingData() {
    console.log("🔍 Analyzing existing data patterns...");

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(
        this.dbPath,
        sqlite3.OPEN_READONLY,
        (err) => {
          if (err) {
            console.error("Database connection error:", err);
            reject(err);
            return;
          }
        }
      );

      // Get all SKUs and barcodes from products
      const query = `
                SELECT sku, barcode, name 
                FROM products 
                WHERE (sku IS NOT NULL AND sku != '') 
                   OR (barcode IS NOT NULL AND barcode != '')
            `;

      db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        console.log(`📊 Found ${rows.length} products to analyze`);

        const analysis = {
          skus: [],
          barcodes: [],
          patterns: {
            sku: {},
            barcode: {},
          },
          statistics: {
            totalProducts: rows.length,
            skuCount: 0,
            barcodeCount: 0,
            bothPresent: 0,
          },
        };

        rows.forEach((row) => {
          if (row.sku && row.sku.trim()) {
            analysis.skus.push({
              code: row.sku.trim(),
              name: row.name,
              type: "sku",
            });
            analysis.statistics.skuCount++;
          }

          if (row.barcode && row.barcode.trim()) {
            analysis.barcodes.push({
              code: row.barcode.trim(),
              name: row.name,
              type: "barcode",
            });
            analysis.statistics.barcodeCount++;
          }

          if (row.sku && row.barcode) {
            analysis.statistics.bothPresent++;
          }
        });

        // Analyze patterns
        analysis.patterns.sku = this.analyzeCodePatterns(analysis.skus, "sku");
        analysis.patterns.barcode = this.analyzeCodePatterns(
          analysis.barcodes,
          "barcode"
        );

        console.log("📈 Analysis complete:");
        console.log(`   SKUs: ${analysis.statistics.skuCount}`);
        console.log(`   Barcodes: ${analysis.statistics.barcodeCount}`);
        console.log(`   Both present: ${analysis.statistics.bothPresent}`);

        db.close();
        resolve(analysis);
      });
    });
  }

  analyzeCodePatterns(codes, type) {
    const patterns = {
      lengths: {},
      characterTypes: {
        alphaNumeric: 0,
        numericOnly: 0,
        hasSpecialChars: 0,
      },
      commonPrefixes: {},
      commonSuffixes: {},
      separatorUsage: {
        hyphen: 0,
        underscore: 0,
        none: 0,
      },
      samples: codes.slice(0, 10).map((c) => c.code),
    };

    codes.forEach(({ code }) => {
      // Length analysis
      const length = code.length;
      patterns.lengths[length] = (patterns.lengths[length] || 0) + 1;

      // Character type analysis
      if (/^[a-zA-Z0-9]+$/.test(code)) {
        if (/\d/.test(code) && /[a-zA-Z]/.test(code)) {
          patterns.characterTypes.alphaNumeric++;
        } else if (/^\d+$/.test(code)) {
          patterns.characterTypes.numericOnly++;
        }
      } else {
        patterns.characterTypes.hasSpecialChars++;
      }

      // Separator analysis
      if (code.includes("-")) {
        patterns.separatorUsage.hyphen++;
      } else if (code.includes("_")) {
        patterns.separatorUsage.underscore++;
      } else {
        patterns.separatorUsage.none++;
      }

      // Prefix analysis (first 2-4 characters)
      if (code.length >= 3) {
        const prefix = code.substring(0, Math.min(4, code.length));
        patterns.commonPrefixes[prefix] =
          (patterns.commonPrefixes[prefix] || 0) + 1;
      }

      // Suffix analysis (last 2-4 characters)
      if (code.length >= 3) {
        const suffix = code.substring(Math.max(0, code.length - 4));
        patterns.commonSuffixes[suffix] =
          (patterns.commonSuffixes[suffix] || 0) + 1;
      }
    });

    return patterns;
  }

  createImprovedClassifier(analysisData) {
    console.log("🧠 Creating improved classifier based on data analysis...");

    return {
      classifyCode: (code) => {
        const result = {
          type: "unknown",
          confidence: 0,
          reason: "",
          features: this.extractFeatures(code),
          original: code,
          normalized: code.trim(),
        };

        // Apply multi-layered classification
        const classifications = [
          this.classifyByBarcodeFormats(code),
          this.classifyByDataPatterns(code, analysisData),
          this.classifyByLearntPatterns(code),
          this.classifyByCharacteristics(code),
        ];

        // Weight and combine classifications
        let barcodeScore = 0;
        let skuScore = 0;
        let totalWeight = 0;

        classifications.forEach((classification, index) => {
          const weight = [0.4, 0.3, 0.2, 0.1][index]; // Decreasing weights
          totalWeight += weight;

          if (classification.type === "barcode") {
            barcodeScore += classification.confidence * weight;
          } else if (classification.type === "sku") {
            skuScore += classification.confidence * weight;
          }
        });

        // Normalize scores
        barcodeScore /= totalWeight;
        skuScore /= totalWeight;

        // Make final decision
        if (barcodeScore > skuScore && barcodeScore > 0.5) {
          result.type = "barcode";
          result.confidence = barcodeScore;
          result.reason = "Pattern analysis indicates barcode format";
        } else if (skuScore > barcodeScore && skuScore > 0.4) {
          result.type = "sku";
          result.confidence = skuScore;
          result.reason = "Pattern analysis indicates SKU format";
        } else {
          result.type = "sku"; // Default to SKU for ambiguous cases
          result.confidence = Math.max(skuScore, 0.3);
          result.reason = "Ambiguous pattern, defaulting to SKU";
        }

        return result;
      },
    };
  }

  classifyByBarcodeFormats(code) {
    const result = { type: "unknown", confidence: 0, details: [] };

    // Check against known barcode formats
    for (const [format, regex] of Object.entries(this.barcodeFormats)) {
      if (regex.test(code)) {
        let confidence = 0.9;

        // Adjust confidence based on format
        switch (format) {
          case "ean13":
          case "ean8":
          case "upc":
            confidence = 0.95;
            break;
          case "isbn":
            confidence = 0.98;
            break;
          case "longNumeric":
            confidence = 0.8; // Lower confidence for generic long numbers
            break;
          case "numericOnly":
            confidence = code.length >= 8 ? 0.7 : 0.3;
            break;
        }

        result.type = "barcode";
        result.confidence = Math.max(result.confidence, confidence);
        result.details.push(`Matches ${format} pattern`);
      }
    }

    return result;
  }

  classifyByDataPatterns(code, analysisData) {
    const result = { type: "unknown", confidence: 0, details: [] };

    // Check if code matches learned SKU patterns
    const skuPatterns = analysisData.patterns.sku;
    const barcodePatterns = analysisData.patterns.barcode;

    let skuScore = 0;
    let barcodeScore = 0;

    // Length-based scoring
    const codeLength = code.length;
    const skuLengths = Object.keys(skuPatterns.lengths).map(Number);
    const barcodeLengths = Object.keys(barcodePatterns.lengths).map(Number);

    if (skuLengths.includes(codeLength)) {
      skuScore += 0.3;
    }
    if (barcodeLengths.includes(codeLength)) {
      barcodeScore += 0.3;
    }

    // Character composition scoring
    if (/^[a-zA-Z0-9]+$/.test(code)) {
      if (/\d/.test(code) && /[a-zA-Z]/.test(code)) {
        // Has both letters and numbers - more likely SKU
        skuScore += 0.4;
        result.details.push("Contains both letters and numbers");
      } else if (/^\d+$/.test(code)) {
        // Pure numeric - more likely barcode
        barcodeScore += 0.5;
        result.details.push("Pure numeric code");
      }
    }

    // Separator analysis
    if (code.includes("-") || code.includes("_")) {
      skuScore += 0.3;
      result.details.push("Contains separators (typical for SKUs)");
    }

    // Prefix matching
    for (const prefix of Object.keys(skuPatterns.commonPrefixes)) {
      if (code.startsWith(prefix)) {
        skuScore += 0.2;
        result.details.push(`Matches common SKU prefix: ${prefix}`);
        break;
      }
    }

    if (skuScore > barcodeScore) {
      result.type = "sku";
      result.confidence = Math.min(skuScore, 0.9);
    } else if (barcodeScore > skuScore) {
      result.type = "barcode";
      result.confidence = Math.min(barcodeScore, 0.9);
    }

    return result;
  }

  classifyByLearntPatterns(code) {
    const result = { type: "unknown", confidence: 0, details: [] };

    // Check for specific patterns observed in the data
    const skuIndicators = [
      {
        pattern: /^NW[A-Z]+-[A-Z0-9]+-[A-Z0-9]+$/i,
        confidence: 0.9,
        desc: "Noteware SKU pattern",
      },
      {
        pattern: /^[A-Z]+-[A-Z0-9]+-[A-Z0-9]+$/i,
        confidence: 0.7,
        desc: "Standard hyphenated SKU",
      },
      {
        pattern: /^[a-z]+[0-9]+$/i,
        confidence: 0.6,
        desc: "Alphanumeric no separators",
      },
      {
        pattern: /[a-zA-Z]{2,}[0-9]{2,}/,
        confidence: 0.5,
        desc: "Mixed alpha-numeric",
      },
    ];

    const barcodeIndicators = [
      {
        pattern: /^[0-9]{8,15}$/,
        confidence: 0.8,
        desc: "Standard barcode length",
      },
      {
        pattern: /^8690\d{9}$/,
        confidence: 0.95,
        desc: "Turkish EAN-13 barcode",
      },
      {
        pattern: /^MX8SL\d+$/,
        confidence: 0.9,
        desc: "Platform-generated barcode",
      },
      {
        pattern: /^TYBG[A-Z0-9]+$/,
        confidence: 0.85,
        desc: "System-generated barcode",
      },
    ];

    // Test against SKU patterns
    for (const indicator of skuIndicators) {
      if (indicator.pattern.test(code)) {
        result.type = "sku";
        result.confidence = Math.max(result.confidence, indicator.confidence);
        result.details.push(indicator.desc);
        break;
      }
    }

    // Test against barcode patterns
    for (const indicator of barcodeIndicators) {
      if (indicator.pattern.test(code)) {
        // Only override if confidence is higher
        if (indicator.confidence > result.confidence) {
          result.type = "barcode";
          result.confidence = indicator.confidence;
          result.details = [indicator.desc];
        }
        break;
      }
    }

    return result;
  }

  classifyByCharacteristics(code) {
    const result = { type: "sku", confidence: 0.4, details: [] };

    // SKU characteristics analysis
    let skuScore = 0;

    if (this.skuCharacteristics.hasAlphaAndNumeric.test(code)) {
      skuScore += 0.3;
      result.details.push("Has both letters and numbers");
    }

    if (this.skuCharacteristics.hasSeparators.test(code)) {
      skuScore += 0.2;
      result.details.push("Uses separators");
    }

    if (this.skuCharacteristics.hasRepeatedPatterns.test(code)) {
      skuScore += 0.2;
      result.details.push("Has repeated pattern structure");
    }

    if (this.skuCharacteristics.commonPrefixes.test(code)) {
      skuScore += 0.2;
      result.details.push("Matches common SKU prefix");
    }

    if (this.skuCharacteristics.typicalSKULength.test(code)) {
      skuScore += 0.1;
      result.details.push("Within typical SKU length range");
    }

    result.confidence = Math.min(0.4 + skuScore, 0.8);

    return result;
  }

  extractFeatures(code) {
    return {
      length: code.length,
      hasLetters: /[a-zA-Z]/.test(code),
      hasNumbers: /\d/.test(code),
      hasSpecialChars: /[^a-zA-Z0-9]/.test(code),
      hasSeparators: /[-_\.]/.test(code),
      isNumericOnly: /^\d+$/.test(code),
      isAlphaOnly: /^[a-zA-Z]+$/.test(code),
      startsWithLetter: /^[a-zA-Z]/.test(code),
      endsWithNumber: /\d$/.test(code),
      hasRepeatedChars: /(.)\1{2,}/.test(code),
    };
  }

  async testSpecificCase(code = "nwadas003orj") {
    console.log(`\n🧪 Testing specific case: "${code}"`);

    const analysisData = await this.analyzeExistingData();
    const classifier = this.createImprovedClassifier(analysisData);
    const result = classifier.classifyCode(code);

    console.log("Result:", JSON.stringify(result, null, 2));
    return result;
  }

  async generateImprovedService() {
    console.log("🚀 Generating improved classification service...");

    const analysisData = await this.analyzeExistingData();
    const classifier = this.createImprovedClassifier(analysisData);

    // Test with various examples
    const testCases = [
      "nwadas003orj",
      "8690632021850",
      "NWAD-SA003-A2542",
      "MX8SL76022717",
      "123456789012",
      "COMP-NIKE-001-RGB",
      "DerweLLQNW10",
      "nwb-tb1",
    ];

    console.log("\n📋 Testing improved classifier:");
    testCases.forEach((testCode) => {
      const result = classifier.classifyCode(testCode);
      console.log(
        `${testCode}: ${result.type} (${(result.confidence * 100).toFixed(
          1
        )}%) - ${result.reason}`
      );
    });

    return classifier;
  }
}

// Run the analyzer
if (require.main === module) {
  const analyzer = new EnhancedSKUPatternAnalyzer();

  analyzer
    .generateImprovedService()
    .then(() => {
      console.log("\n✅ Enhanced SKU pattern analysis complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Error:", error);
      process.exit(1);
    });
}

module.exports = EnhancedSKUPatternAnalyzer;
