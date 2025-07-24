import logger from "../../../utils/logger";
import React, { useState, useRef } from "react";
import { Upload, X, Image, Video, FileText } from "lucide-react";
import { Button } from "../../ui";
import { useAlert } from "../../../contexts/AlertContext";
import { API_BASE_URL } from "../utils/constants";

const MediaUploadComponent = ({
  mainProductId,
  variantId = null,
  onMediaUploaded,
  existingMedia = [],
  maxFiles = 10,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewFiles, setPreviewFiles] = useState([]);
  const fileInputRef = useRef(null);
  const { showAlert } = useAlert();

  const allowedTypes = {
    "image/jpeg": "image",
    "image/png": "image",
    "image/webp": "image",
    "image/gif": "image",
    "video/mp4": "video",
    "video/webm": "video",
    "video/ogg": "video",
    "application/pdf": "document",
    "text/plain": "document",
  };

  const getMediaIcon = (type) => {
    switch (type) {
      case "image":
        return <Image className="w-6 h-6" />;
      case "video":
        return <Video className="w-6 h-6" />;
      case "document":
        return <FileText className="w-6 h-6" />;
      default:
        return <FileText className="w-6 h-6" />;
    }
  };

  const handleFileSelect = (files) => {
    const fileArray = Array.from(files);
    const validFiles = [];
    const errors = [];

    fileArray.forEach((file) => {
      if (!allowedTypes[file.type]) {
        errors.push(`${file.name}: Unsupported file type`);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        errors.push(`${file.name}: File too large (max 10MB)`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      showAlert(errors.join(", "), "error");
    }

    if (validFiles.length > 0) {
      // Create preview objects
      const previews = validFiles.map((file) => ({
        file,
        name: file.name,
        size: file.size,
        type: allowedTypes[file.type],
        preview: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : null,
      }));

      setPreviewFiles((prev) => [...prev, ...previews]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const removePreviewFile = (index) => {
    setPreviewFiles((prev) => {
      const file = prev[index];
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadFiles = async () => {
    if (previewFiles.length === 0) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      previewFiles.forEach(({ file }) => {
        formData.append("media", file);
      });

      const endpoint = variantId
        ? `${API_BASE_URL}/products/${mainProductId}/variants/${variantId}/media`
        : `${API_BASE_URL}/products/${mainProductId}/media`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        showAlert(
          `Successfully uploaded ${result.data.length} files`,
          "success"
        );

        // Clear previews
        previewFiles.forEach(({ preview }) => {
          if (preview) URL.revokeObjectURL(preview);
        });
        setPreviewFiles([]);

        // Notify parent component
        if (onMediaUploaded) {
          onMediaUploaded(result.data);
        }
      } else {
        throw new Error(result.error || "Upload failed");
      }
    } catch (error) {
      logger.error("Upload error:", error);
      showAlert(`Upload failed: ${error.message}`, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <div className="mb-2">
          <span className="text-sm text-gray-600">
            Drag & drop files here, or{" "}
          </span>
          <button
            type="button"
            className="text-blue-500 underline"
            onClick={() => fileInputRef.current?.click()}
          >
            browse files
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Supports images, videos (MP4, WebM), and documents (PDF, TXT)
          <br />
          Maximum file size: 10MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.txt"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </div>

      {/* Preview Files */}
      {previewFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Files to Upload</h4>
          <div className="space-y-2">
            {previewFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {file.preview ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200">
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                      {getMediaIcon(file.type)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)} • {file.type}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removePreviewFile(index)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                previewFiles.forEach(({ preview }) => {
                  if (preview) URL.revokeObjectURL(preview);
                });
                setPreviewFiles([]);
              }}
            >
              Clear All
            </Button>
            <Button
              onClick={uploadFiles}
              disabled={isUploading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isUploading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              )}
              {isUploading
                ? "Uploading..."
                : `Upload ${previewFiles.length} Files`}
            </Button>
          </div>
        </div>
      )}

      {/* Existing Media */}
      {existingMedia.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Existing Media</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {existingMedia.map((media) => (
              <div
                key={media.id}
                className="relative group aspect-square rounded-lg overflow-hidden bg-gray-200"
              >
                {media.type === "image" ? (
                  <img
                    src={media.url}
                    alt={media.altText || media.filename}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {getMediaIcon(media.type)}
                  </div>
                )}
                {media.isPrimary && (
                  <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-2 py-1 rounded">
                    Primary
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity">
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-white bg-red-500 rounded-full p-1 hover:bg-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaUploadComponent;
