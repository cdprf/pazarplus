// Advanced File Security and Validation
const crypto = require("crypto");
const path = require("path");

class FileSecurityValidator {
  constructor() {
    // Malicious file signatures to detect
    this.maliciousSignatures = [
      "4d5a", // PE executable
      "7f454c46", // ELF executable
      "cafebabe", // Java class file
      "504b0304", // ZIP archive (could contain malicious files)
      "377abcaf271c", // 7z archive
      "1f8b08", // GZIP
      "425a68", // BZIP2
    ];

    // Safe CSV/Excel signatures
    this.safeSignatures = [
      "fffe", // UTF-16 BOM
      "efbbbf", // UTF-8 BOM
      "504b0304", // XLSX (ZIP-based, but we'll validate content)
      "d0cf11e0a1b11ae1", // Old Excel format
    ];
  }

  async validateFile(file) {
    const results = {
      isValid: true,
      errors: [],
      warnings: [],
      securityScore: 100,
      fileInfo: {},
    };

    try {
      // 1. Basic file validation
      await this.validateBasicProperties(file, results);

      // 2. File signature validation
      await this.validateFileSignature(file, results);

      // 3. Content validation
      await this.validateFileContent(file, results);

      // 4. Security scanning
      await this.performSecurityScan(file, results);

      // 5. Calculate final security score
      this.calculateSecurityScore(results);
    } catch (error) {
      results.isValid = false;
      results.errors.push(`Validation error: ${error.message}`);
      results.securityScore = 0;
    }

    return results;
  }

  async validateBasicProperties(file, results) {
    results.fileInfo = {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      extension: path.extname(file.originalname).toLowerCase(),
    };

    // File name validation
    const fileName = file.originalname;
    if (!fileName || fileName.trim() === "") {
      results.errors.push("File name is required");
      results.securityScore -= 20;
    }

    // Dangerous characters in filename
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (dangerousChars.test(fileName)) {
      results.errors.push("File name contains dangerous characters");
      results.securityScore -= 15;
    }

    // Path traversal attempts
    if (
      fileName.includes("..") ||
      fileName.includes("./") ||
      fileName.includes("..\\")
    ) {
      results.errors.push("File name contains path traversal attempts");
      results.securityScore -= 30;
    }

    // Extension validation
    const allowedExtensions = [".csv", ".xlsx", ".xls", ".txt"];
    if (!allowedExtensions.includes(results.fileInfo.extension)) {
      results.errors.push(
        `Invalid file extension. Allowed: ${allowedExtensions.join(", ")}`
      );
      results.securityScore -= 25;
    }

    // Size validation
    if (file.size > 100 * 1024 * 1024) {
      // 100MB
      results.errors.push("File size exceeds 100MB limit");
      results.securityScore -= 20;
    }

    if (file.size === 0) {
      results.errors.push("File is empty");
      results.securityScore -= 30;
    }
  }

  async validateFileSignature(file, results) {
    if (!file.buffer || file.buffer.length < 10) {
      results.warnings.push("File too small for signature validation");
      return;
    }

    const firstBytes = file.buffer.slice(0, 10);
    const signature = firstBytes.toString("hex").toLowerCase();

    results.fileInfo.signature = signature;

    // Check for malicious signatures
    for (const malSig of this.maliciousSignatures) {
      if (signature.startsWith(malSig)) {
        results.errors.push(
          `Potentially malicious file signature detected: ${malSig}`
        );
        results.securityScore -= 50;
        break;
      }
    }

    // Validate against expected formats
    const extension = results.fileInfo.extension;

    if (extension === ".xlsx") {
      // XLSX files should start with ZIP signature
      if (!signature.startsWith("504b0304")) {
        results.warnings.push("XLSX file does not have expected ZIP signature");
        results.securityScore -= 10;
      }
    } else if (extension === ".xls") {
      // Old Excel format
      if (!signature.startsWith("d0cf11e0")) {
        results.warnings.push(
          "XLS file does not have expected Excel signature"
        );
        results.securityScore -= 10;
      }
    }
    // CSV and TXT files don't have specific signatures, content validation is more important
  }

  async validateFileContent(file, results) {
    const extension = results.fileInfo.extension;

    try {
      if (extension === ".csv" || extension === ".txt") {
        await this.validateCSVContent(file, results);
      } else if (extension === ".xlsx" || extension === ".xls") {
        await this.validateExcelContent(file, results);
      }
    } catch (error) {
      results.errors.push(`Content validation failed: ${error.message}`);
      results.securityScore -= 15;
    }
  }

  async validateCSVContent(file, results) {
    const content = file.buffer.toString(
      "utf8",
      0,
      Math.min(file.buffer.length, 1024 * 10)
    ); // First 10KB

    // Check for script injection attempts
    const scriptPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /eval\(/i,
      /expression\(/i,
    ];

    for (const pattern of scriptPatterns) {
      if (pattern.test(content)) {
        results.errors.push(
          "Potential script injection detected in CSV content"
        );
        results.securityScore -= 30;
        break;
      }
    }

    // Check for SQL injection patterns
    const sqlPatterns = [
      /union\s+select/i,
      /drop\s+table/i,
      /delete\s+from/i,
      /insert\s+into/i,
      /update\s+set/i,
      /--\s*$/m,
      /\/\*.*\*\//,
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(content)) {
        results.warnings.push("Potential SQL injection pattern detected");
        results.securityScore -= 15;
        break;
      }
    }

    // Validate CSV structure
    const lines = content.split("\n").slice(0, 5); // Check first 5 lines
    if (lines.length > 0) {
      const headerColumns = lines[0].split(",").length;

      // Check for consistent column count
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() && lines[i].split(",").length !== headerColumns) {
          results.warnings.push("Inconsistent column count detected in CSV");
          results.securityScore -= 5;
          break;
        }
      }
    }
  }

  async validateExcelContent(file, results) {
    // For Excel files, we'll do basic validation
    // More thorough validation would require parsing the Excel file

    // Check file size vs content ratio
    const minExpectedSize = 1024; // 1KB minimum for valid Excel
    if (file.size < minExpectedSize) {
      results.warnings.push("Excel file seems too small to contain valid data");
      results.securityScore -= 10;
    }

    // Check for embedded objects (could contain malicious content)
    const embedPatterns = [
      Buffer.from("Embedded", "utf8"),
      Buffer.from("Object", "utf8"),
      Buffer.from("OLE", "utf8"),
    ];

    for (const pattern of embedPatterns) {
      if (file.buffer.includes(pattern)) {
        results.warnings.push("Excel file may contain embedded objects");
        results.securityScore -= 15;
        break;
      }
    }
  }

  async performSecurityScan(file, results) {
    // Generate file hash for tracking
    const hash = crypto.createHash("sha256").update(file.buffer).digest("hex");
    results.fileInfo.sha256 = hash;

    // Check entropy (random data could indicate encryption/packing)
    const entropy = this.calculateEntropy(file.buffer.slice(0, 1024)); // First 1KB
    results.fileInfo.entropy = entropy;

    if (entropy > 7.5) {
      results.warnings.push(
        "High entropy detected - file may be compressed or encrypted"
      );
      results.securityScore -= 10;
    }

    // Check for null bytes (could indicate binary content in text file)
    if (
      results.fileInfo.extension === ".csv" ||
      results.fileInfo.extension === ".txt"
    ) {
      const hasNullBytes = file.buffer.includes(0);
      if (hasNullBytes) {
        results.warnings.push("Null bytes detected in text file");
        results.securityScore -= 15;
      }
    }

    // Rate limiting check (would need to implement with Redis/database)
    results.fileInfo.uploadTimestamp = new Date().toISOString();
  }

  calculateEntropy(buffer) {
    const frequency = new Array(256).fill(0);

    for (let i = 0; i < buffer.length; i++) {
      frequency[buffer[i]]++;
    }

    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (frequency[i] > 0) {
        const p = frequency[i] / buffer.length;
        entropy -= p * Math.log2(p);
      }
    }

    return entropy;
  }

  calculateSecurityScore(results) {
    // Ensure score doesn't go below 0
    results.securityScore = Math.max(0, results.securityScore);

    // Set validation status based on score
    if (results.securityScore < 50) {
      results.isValid = false;
      results.errors.push(
        `Security score too low: ${results.securityScore}/100`
      );
    } else if (results.securityScore < 70) {
      results.warnings.push(`Low security score: ${results.securityScore}/100`);
    }
  }

  // Sanitize filename for safe storage
  sanitizeFilename(originalName) {
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);

    // Remove dangerous characters
    const safeName = baseName
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .replace(/_{2,}/g, "_")
      .replace(/^_|_$/g, "");

    // Generate unique suffix
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);

    return `${safeName}_${timestamp}_${random}${extension}`;
  }
}

// Rate limiting for uploads
class UploadRateLimiter {
  constructor() {
    this.attempts = new Map(); // In production, use Redis
  }

  checkRateLimit(identifier, maxAttempts = 10, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!this.attempts.has(identifier)) {
      this.attempts.set(identifier, []);
    }

    const userAttempts = this.attempts.get(identifier);

    // Remove old attempts
    const recentAttempts = userAttempts.filter((time) => time > windowStart);
    this.attempts.set(identifier, recentAttempts);

    if (recentAttempts.length >= maxAttempts) {
      return {
        allowed: false,
        retryAfter: Math.ceil((recentAttempts[0] + windowMs - now) / 1000),
        attemptsRemaining: 0,
      };
    }

    // Record this attempt
    recentAttempts.push(now);

    return {
      allowed: true,
      retryAfter: 0,
      attemptsRemaining: maxAttempts - recentAttempts.length,
    };
  }
}

module.exports = {
  FileSecurityValidator,
  UploadRateLimiter,
};
