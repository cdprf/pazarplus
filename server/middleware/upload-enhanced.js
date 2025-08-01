// Enhanced Upload Middleware with Better Error Handling
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create upload directory if it doesn't exist
const uploadDir = path.join(__dirname, "..", "uploads", "imports");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Enhanced memory storage with compression support
const storage = multer.memoryStorage();

// More comprehensive file filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain", // Support plain text CSV files
  ];

  const allowedExtensions = [".csv", ".xlsx", ".xls", ".txt"];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  // Log file details for debugging
  console.log("📄 File validation:", {
    originalname: file.originalname,
    mimetype: file.mimetype,
    extension: fileExtension,
    size: file.size,
  });

  if (
    allowedTypes.includes(file.mimetype) ||
    allowedExtensions.includes(fileExtension)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type: ${
          file.mimetype
        }. Allowed: ${allowedExtensions.join(", ")}`
      ),
      false
    );
  }
};

// Progressive upload limits based on file size detection
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 1,
    fieldNameSize: 2048, // Increased from 1024
    fieldSize: 20 * 1024 * 1024, // Increased to 20MB
    fields: 100, // Increased from 50
    parts: 120, // Increased from 60
    headerPairs: 5000, // Increased from 2000
  },
});

// Enhanced error handler with response safety
const handleUploadErrors = (error, req, res, next) => {
  // Prevent double response sending
  if (res.headersSent) {
    console.log("⚠️ Headers already sent, skipping error response");
    return next(error);
  }

  const errorDetails = {
    hasError: !!error,
    errorType: error ? error.constructor.name : "none",
    errorCode: error ? error.code : "none",
    errorMessage: error ? error.message : "none",
    isMulterError: error instanceof multer.MulterError,
    contentType: req.headers["content-type"],
    contentLength: req.headers["content-length"],
    hasFile: !!req.file,
    requestComplete: req.complete !== false,
    requestReadable: req.readable,
    requestDestroyed: req.destroyed,
    timestamp: new Date().toISOString(),
  };

  console.log("🔍 ENHANCED MULTER DEBUG:", errorDetails);

  if (error instanceof multer.MulterError) {
    const errorResponses = {
      LIMIT_FILE_SIZE: {
        message: "File too large. Maximum size is 100MB.",
        error: "FILE_TOO_LARGE",
        maxSize: "100MB",
      },
      LIMIT_FILE_COUNT: {
        message: "Too many files. Only one file is allowed.",
        error: "TOO_MANY_FILES",
        maxFiles: 1,
      },
      LIMIT_UNEXPECTED_FILE: {
        message: "Unexpected file field. Expected field name: 'file'",
        error: "UNEXPECTED_FILE",
        expectedField: "file",
      },
      LIMIT_PART_COUNT: {
        message: "Too many parts in multipart form.",
        error: "TOO_MANY_PARTS",
        maxParts: 120,
      },
      LIMIT_FIELD_COUNT: {
        message: "Too many fields in form.",
        error: "TOO_MANY_FIELDS",
        maxFields: 100,
      },
      LIMIT_FIELD_KEY: {
        message: "Field name too long.",
        error: "FIELD_NAME_TOO_LONG",
        maxLength: "2KB",
      },
      LIMIT_FIELD_VALUE: {
        message: "Field value too large.",
        error: "FIELD_VALUE_TOO_LARGE",
        maxSize: "20MB",
      },
    };

    const response = errorResponses[error.code] || {
      message: `Multer error: ${error.message}`,
      error: "MULTER_ERROR",
    };

    return res.status(400).json({
      success: false,
      ...response,
      details: errorDetails,
    });
  }

  if (error) {
    // Handle specific non-multer errors
    if (error.message.includes("Unexpected end of form")) {
      return res.status(400).json({
        success: false,
        message:
          "Upload was interrupted. Please try again with a stable connection.",
        error: "UPLOAD_INTERRUPTED",
        suggestions: [
          "Check your internet connection",
          "Try uploading a smaller file first",
          "Ensure the file is not corrupted",
          "Clear browser cache and try again",
        ],
        details: errorDetails,
      });
    }

    if (error.message.includes("ECONNRESET")) {
      return res.status(400).json({
        success: false,
        message: "Connection reset during upload. Please try again.",
        error: "CONNECTION_RESET",
        details: errorDetails,
      });
    }

    return res.status(400).json({
      success: false,
      message: `Upload error: ${error.message}`,
      error: "UPLOAD_ERROR",
      details: errorDetails,
    });
  }

  next();
};

// File processing utilities
const processUploadedFile = async (file) => {
  if (!file || !file.buffer) {
    throw new Error("No file buffer provided");
  }

  // Validate file integrity
  if (file.buffer.length === 0) {
    throw new Error("Uploaded file is empty");
  }

  // Add processing metadata
  const processedFile = {
    ...file,
    processedAt: new Date().toISOString(),
    bufferSize: file.buffer.length,
    isValid: true,
  };

  return processedFile;
};

// Optional: Save to disk for backup/processing
const saveMemoryFileToDisk = async (file) => {
  if (!file || !file.buffer) {
    throw new Error("No file buffer provided");
  }

  const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
  const fileExtension = path.extname(file.originalname);
  const filename = `import-${uniqueSuffix}${fileExtension}`;
  const filePath = path.join(uploadDir, filename);

  try {
    await fs.promises.writeFile(filePath, file.buffer);

    // Verify file was written correctly
    const stats = await fs.promises.stat(filePath);
    if (stats.size !== file.buffer.length) {
      throw new Error("File write verification failed");
    }

    file.path = filePath;
    file.filename = filename;
    file.diskSize = stats.size;

    return file;
  } catch (error) {
    console.error("Failed to save file to disk:", error);
    throw new Error(`Disk save failed: ${error.message}`);
  }
};

// Upload progress tracking (for future WebSocket integration)
const trackUploadProgress = (req, res, next) => {
  const startTime = Date.now();
  const contentLength = parseInt(req.headers["content-length"]) || 0;

  req.uploadProgress = {
    startTime,
    contentLength,
    bytesReceived: 0,
  };

  // Track progress
  req.on("data", (chunk) => {
    req.uploadProgress.bytesReceived += chunk.length;
    const progress = (req.uploadProgress.bytesReceived / contentLength) * 100;

    // Could emit WebSocket events here for real-time progress
    if (progress % 25 === 0) {
      // Log every 25%
      console.log(`📊 Upload progress: ${Math.round(progress)}%`);
    }
  });

  next();
};

module.exports = {
  upload,
  handleUploadErrors,
  processUploadedFile,
  saveMemoryFileToDisk,
  trackUploadProgress,
  uploadDir,
};
