let multer, sharp;
let mediaUploadEnabled = true;

try {
  multer = require("multer");
  sharp = require("sharp");
} catch (error) {
  console.warn("Media upload dependencies not available:", error.message);
  mediaUploadEnabled = false;

  // Create fallback implementations
  multer = {
    diskStorage: () => ({
      destination: (req, file, cb) => cb(new Error("Media upload disabled")),
      filename: (req, file, cb) => cb(new Error("Media upload disabled")),
    }),
    single: () => (req, res, next) => next(new Error("Media upload disabled")),
    array: () => (req, res, next) => next(new Error("Media upload disabled")),
  };

  sharp = {
    resize: () => ({
      toBuffer: () => Promise.reject(new Error("Image processing disabled")),
    }),
  };
}

const path = require("path");
const fs = require("fs").promises;
const logger = require("../utils/logger");

/**
 * Enhanced Media Upload Service
 * Handles file uploads for the enhanced product management system
 */
class MediaUploadService {
  constructor() {
    if (!mediaUploadEnabled) {
      logger.warn("Media upload service disabled - dependencies not available");
      return;
    }

    this.uploadPath = path.join(
      __dirname,
      "..",
      "public",
      "uploads",
      "products"
    );
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.allowedImageTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    this.allowedVideoTypes = ["video/mp4", "video/webm", "video/ogg"];
    this.allowedDocumentTypes = ["application/pdf", "text/plain"];

    this.initializeUploadDirectory();
    this.setupMulter();
  }

  async initializeUploadDirectory() {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
      logger.info(`Media upload directory initialized: ${this.uploadPath}`);
    } catch (error) {
      logger.error("Failed to initialize upload directory:", error);
      throw error;
    }
  }

  setupMulter() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const subfolder = this.getSubfolder(file.mimetype);
        const fullPath = path.join(this.uploadPath, subfolder);

        // Ensure subfolder exists
        fs.mkdir(fullPath, { recursive: true })
          .then(() => cb(null, fullPath))
          .catch((err) => cb(err));
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext);
        const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, "_");
        cb(null, `${sanitizedBaseName}_${uniqueSuffix}${ext}`);
      },
    });

    const fileFilter = (req, file, cb) => {
      const allowedTypes = [
        ...this.allowedImageTypes,
        ...this.allowedVideoTypes,
        ...this.allowedDocumentTypes,
      ];

      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`File type ${file.mimetype} not allowed`), false);
      }
    };

    this.upload = multer({
      storage,
      fileFilter,
      limits: {
        fileSize: this.maxFileSize,
        files: 10, // Maximum 10 files per upload
      },
    });
  }

  getSubfolder(mimetype) {
    if (this.allowedImageTypes.includes(mimetype)) {
      return "images";
    } else if (this.allowedVideoTypes.includes(mimetype)) {
      return "videos";
    } else if (this.allowedDocumentTypes.includes(mimetype)) {
      return "documents";
    }
    return "other";
  }

  getMediaType(mimetype) {
    if (this.allowedImageTypes.includes(mimetype)) {
      return "image";
    } else if (this.allowedVideoTypes.includes(mimetype)) {
      return "video";
    } else if (this.allowedDocumentTypes.includes(mimetype)) {
      return "document";
    }
    return "other";
  }

  /**
   * Process uploaded files and generate metadata
   */
  async processUploadedFiles(files, mainProductId, variantId = null, userId) {
    const { EnhancedProductMedia } = require("../models");
    const processedFiles = [];

    for (const file of files) {
      try {
        const mediaType = this.getMediaType(file.mimetype);
        const relativePath = path.relative(
          path.join(__dirname, "..", "public"),
          file.path
        );

        const mediaData = {
          originalName: file.originalname,
          filename: file.filename,
          path: relativePath,
          url: `/uploads/products/${this.getSubfolder(file.mimetype)}/${
            file.filename
          }`,
          type: mediaType,
          mimetype: file.mimetype,
          size: file.size,
          mainProductId,
          variantId,
          userId,
          status: "processing",
          metadata: {},
        };

        // Process images to generate thumbnails and metadata
        if (mediaType === "image" && file.mimetype !== "image/gif") {
          await this.processImage(file.path, mediaData);
        }

        // Process videos to extract metadata
        if (mediaType === "video") {
          await this.processVideo(file.path, mediaData);
        }

        // Mark as ready after processing
        mediaData.status = "ready";
        mediaData.processedAt = new Date();

        // Save to database
        const mediaRecord = await EnhancedProductMedia.create(mediaData);
        processedFiles.push(mediaRecord);

        logger.info("File processed and saved successfully:", {
          id: mediaRecord.id,
          filename: file.filename,
          type: mediaType,
          size: file.size,
          mainProductId,
          variantId,
        });
      } catch (error) {
        logger.error("Error processing file:", {
          filename: file?.filename,
          error: error.message,
        });

        // Clean up failed file
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          logger.error("Failed to clean up file:", unlinkError);
        }
      }
    }

    return processedFiles;
  }

  /**
   * Process image files - generate thumbnails and extract metadata
   */
  async processImage(imagePath, metadata) {
    try {
      const image = sharp(imagePath);
      const imageMetadata = await image.metadata();

      // Update metadata with image information
      metadata.metadata = {
        width: imageMetadata.width,
        height: imageMetadata.height,
        format: imageMetadata.format,
        space: imageMetadata.space,
        channels: imageMetadata.channels,
        density: imageMetadata.density,
      };

      // Generate thumbnail
      const thumbnailPath = imagePath.replace(/(\.[^.]+)$/, "_thumb$1");
      await image
        .resize(300, 300, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      const thumbnailRelativePath = path.relative(
        path.join(__dirname, "..", "public"),
        thumbnailPath
      );

      metadata.thumbnail = {
        path: thumbnailRelativePath,
        url: thumbnailRelativePath.replace(/\\/g, "/"),
        size: (await fs.stat(thumbnailPath)).size,
      };
    } catch (error) {
      logger.error("Error processing image:", error);
      throw error;
    }
  }

  /**
   * Process video files - extract basic metadata
   */
  async processVideo(videoPath, metadata) {
    try {
      const stats = await fs.stat(videoPath);

      metadata.metadata = {
        size: stats.size,
        // Note: For full video metadata extraction, you might want to use ffprobe
        // This is a basic implementation
        duration: null,
        codec: null,
        resolution: null,
      };
    } catch (error) {
      logger.error("Error processing video:", error);
      throw error;
    }
  }

  /**
   * Delete media files
   */
  async deleteMediaFiles(mediaAssets) {
    const deletedFiles = [];
    const errors = [];

    for (const asset of mediaAssets) {
      try {
        const fullPath = path.join(__dirname, "..", "public", asset.path);
        await fs.unlink(fullPath);

        // Delete thumbnail if exists
        if (asset.thumbnail) {
          const thumbnailPath = path.join(
            __dirname,
            "..",
            "public",
            asset.thumbnail.path
          );
          try {
            await fs.unlink(thumbnailPath);
          } catch (thumbError) {
            logger.warn("Failed to delete thumbnail:", thumbError);
          }
        }

        deletedFiles.push(asset.id);
      } catch (error) {
        logger.error("Failed to delete media file:", {
          assetId: asset.id,
          path: asset.path,
          error: error.message,
        });
        errors.push({
          assetId: asset.id,
          error: error.message,
        });
      }
    }

    return { deletedFiles, errors };
  }

  /**
   * Get multer middleware for file uploads
   */
  getUploadMiddleware() {
    return this.upload.array("files", 10);
  }

  /**
   * Validate uploaded files
   */
  validateFiles(files) {
    const errors = [];

    if (!files || files.length === 0) {
      errors.push("No files provided");
      return errors;
    }

    for (const file of files) {
      // Check file size
      if (file.size > this.maxFileSize) {
        errors.push(`File ${file.originalname} exceeds maximum size limit`);
      }

      // Check file type
      const allowedTypes = [
        ...this.allowedImageTypes,
        ...this.allowedVideoTypes,
        ...this.allowedDocumentTypes,
      ];

      if (!allowedTypes.includes(file.mimetype)) {
        errors.push(
          `File type ${file.mimetype} not allowed for ${file.originalname}`
        );
      }
    }

    return errors;
  }
}

module.exports = MediaUploadService;
