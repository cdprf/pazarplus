const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create upload directory if it doesn't exist
const uploadDir = path.join(__dirname, "..", "uploads", "imports");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads (using memory storage for better reliability)
const storage = multer.memoryStorage();

// File filter to accept only CSV and Excel files
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/csv",
  ];

  const allowedExtensions = [".csv", ".xlsx", ".xls"];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (
    allowedTypes.includes(file.mimetype) ||
    allowedExtensions.includes(fileExtension)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type. Allowed types: ${allowedExtensions.join(", ")}`
      ),
      false
    );
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB limit
    files: 1, // Only one file at a time
    fieldNameSize: 1024, // Increase field name size limit
    fieldSize: 10 * 1024 * 1024, // Increase individual field size limit
    fields: 50, // Increase number of non-file fields allowed
    parts: 60, // Increase total number of parts
    headerPairs: 2000, // Increase header pairs limit
  },
});

// Middleware to handle upload errors
const handleUploadErrors = (error, req, res, next) => {
  console.log("🔍 MULTER DEBUG:", {
    hasError: !!error,
    errorType: error ? error.constructor.name : "none",
    errorCode: error ? error.code : "none",
    errorMessage: error ? error.message : "none",
    isMulterError: error instanceof multer.MulterError,
    contentType: req.headers["content-type"],
    contentLength: req.headers["content-length"],
    hasFile: !!req.file,
    requestComplete: req.complete,
    requestReadable: req.readable,
    requestDestroyed: req.destroyed,
  });

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 100MB.",
        error: "FILE_TOO_LARGE",
      });
    } else if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Only one file is allowed.",
        error: "TOO_MANY_FILES",
      });
    } else if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Unexpected file field.",
        error: "UNEXPECTED_FILE",
      });
    } else if (error.code === "LIMIT_PART_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many parts in multipart form.",
        error: "TOO_MANY_PARTS",
      });
    } else if (error.code === "LIMIT_FIELD_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many fields in form.",
        error: "TOO_MANY_FIELDS",
      });
    }
  } else if (error) {
    // Handle non-multer errors like "Unexpected end of form"
    if (error.message.includes("Unexpected end of form")) {
      return res.status(400).json({
        success: false,
        message: "Upload was interrupted or corrupted. Please try again.",
        error: "UPLOAD_INTERRUPTED",
        details:
          "The file upload was not completed properly. This can happen due to network issues or browser interruptions.",
      });
    }

    return res.status(400).json({
      success: false,
      message: `Upload error: ${error.message}`,
      error: "UPLOAD_ERROR",
    });
  }
  next();
};

// Helper function to save memory storage file to disk if needed
const saveMemoryFileToDisk = async (file) => {
  if (!file || !file.buffer) {
    throw new Error("No file buffer provided");
  }

  const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
  const fileExtension = path.extname(file.originalname);
  const filename = `import-${uniqueSuffix}${fileExtension}`;
  const filePath = path.join(uploadDir, filename);

  // Write buffer to disk
  await fs.promises.writeFile(filePath, file.buffer);

  // Add path and filename to file object for backward compatibility
  file.path = filePath;
  file.filename = filename;

  return file;
};

module.exports = {
  upload,
  handleUploadErrors,
  saveMemoryFileToDisk,
};
