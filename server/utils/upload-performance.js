// Upload Performance Monitor and Optimizer
const compression = require("compression");
const cluster = require("cluster");
const os = require("os");

class UploadPerformanceOptimizer {
  constructor() {
    this.uploadStats = {
      totalUploads: 0,
      successfulUploads: 0,
      failedUploads: 0,
      averageUploadTime: 0,
      largestFile: 0,
      totalDataProcessed: 0,
    };
  }

  // Streaming file processor for large files
  async processLargeFile(fileBuffer, options = {}) {
    const startTime = Date.now();
    const chunkSize = options.chunkSize || 64 * 1024; // 64KB chunks

    console.log(
      `🚀 Processing large file: ${fileBuffer.length} bytes in ${chunkSize} byte chunks`
    );

    try {
      // Process file in chunks to prevent memory spikes
      const chunks = [];
      for (let i = 0; i < fileBuffer.length; i += chunkSize) {
        const chunk = fileBuffer.slice(i, i + chunkSize);
        chunks.push(await this.processChunk(chunk, i));

        // Yield control periodically
        if (i % (chunkSize * 10) === 0) {
          await new Promise((resolve) => setImmediate(resolve));
        }
      }

      const processingTime = Date.now() - startTime;
      console.log(`✅ File processed successfully in ${processingTime}ms`);

      this.updateStats("success", fileBuffer.length, processingTime);

      return {
        success: true,
        chunks: chunks.length,
        processingTime,
        fileSize: fileBuffer.length,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateStats("failed", fileBuffer.length, processingTime);
      throw error;
    }
  }

  async processChunk(chunk, offset) {
    // Simulated chunk processing - replace with actual logic
    return {
      offset,
      size: chunk.length,
      checksum: this.calculateChecksum(chunk),
    };
  }

  calculateChecksum(buffer) {
    const crypto = require("crypto");
    return crypto.createHash("md5").update(buffer).digest("hex");
  }

  updateStats(result, fileSize, processingTime) {
    this.uploadStats.totalUploads++;

    if (result === "success") {
      this.uploadStats.successfulUploads++;
    } else {
      this.uploadStats.failedUploads++;
    }

    this.uploadStats.totalDataProcessed += fileSize;
    this.uploadStats.largestFile = Math.max(
      this.uploadStats.largestFile,
      fileSize
    );

    // Calculate rolling average
    const totalTime =
      this.uploadStats.averageUploadTime * (this.uploadStats.totalUploads - 1) +
      processingTime;
    this.uploadStats.averageUploadTime =
      totalTime / this.uploadStats.totalUploads;
  }

  getStats() {
    return {
      ...this.uploadStats,
      successRate:
        (
          (this.uploadStats.successfulUploads / this.uploadStats.totalUploads) *
          100
        ).toFixed(2) + "%",
      averageUploadTimeFormatted:
        this.uploadStats.averageUploadTime.toFixed(2) + "ms",
      totalDataProcessedFormatted: this.formatBytes(
        this.uploadStats.totalDataProcessed
      ),
      largestFileFormatted: this.formatBytes(this.uploadStats.largestFile),
    };
  }

  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // Memory pressure monitoring
  monitorMemoryUsage() {
    const usage = process.memoryUsage();
    const total = os.totalmem();
    const free = os.freemem();

    return {
      processMemory: {
        rss: this.formatBytes(usage.rss),
        heapTotal: this.formatBytes(usage.heapTotal),
        heapUsed: this.formatBytes(usage.heapUsed),
        external: this.formatBytes(usage.external),
      },
      systemMemory: {
        total: this.formatBytes(total),
        free: this.formatBytes(free),
        used: this.formatBytes(total - free),
        freePercentage: ((free / total) * 100).toFixed(2) + "%",
      },
      recommendation: free < total * 0.1 ? "HIGH_MEMORY_USAGE" : "NORMAL",
    };
  }

  // Auto-scaling recommendations
  getOptimizationRecommendations() {
    const memStats = this.monitorMemoryUsage();
    const uploadStats = this.getStats();

    const recommendations = [];

    if (
      this.uploadStats.failedUploads >
      this.uploadStats.successfulUploads * 0.1
    ) {
      recommendations.push({
        type: "HIGH_FAILURE_RATE",
        message: "Consider implementing retry logic and better error handling",
        priority: "HIGH",
      });
    }

    if (this.uploadStats.averageUploadTime > 30000) {
      // 30 seconds
      recommendations.push({
        type: "SLOW_PROCESSING",
        message: "Consider implementing background job processing",
        priority: "MEDIUM",
      });
    }

    if (memStats.systemMemory.freePercentage < 20) {
      recommendations.push({
        type: "MEMORY_PRESSURE",
        message: "Consider implementing disk-based processing for large files",
        priority: "HIGH",
      });
    }

    if (this.uploadStats.largestFile > 50 * 1024 * 1024) {
      // 50MB
      recommendations.push({
        type: "LARGE_FILES",
        message: "Consider implementing resumable uploads for large files",
        priority: "MEDIUM",
      });
    }

    return {
      currentStats: uploadStats,
      memoryStatus: memStats,
      recommendations,
      timestamp: new Date().toISOString(),
    };
  }
}

// Compression middleware for responses
const compressionMiddleware = compression({
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balanced compression
  threshold: 1024, // Only compress responses > 1KB
});

// Request timeout handler
const uploadTimeoutHandler = (timeoutMs = 5 * 60 * 1000) => {
  // 5 minutes default
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message:
            "Upload timeout. Please try uploading a smaller file or check your connection.",
          error: "UPLOAD_TIMEOUT",
          timeoutMs,
        });
      }
    }, timeoutMs);

    // Clear timeout on response finish
    res.on("finish", () => clearTimeout(timer));
    res.on("close", () => clearTimeout(timer));

    next();
  };
};

module.exports = {
  UploadPerformanceOptimizer,
  compressionMiddleware,
  uploadTimeoutHandler,
};
