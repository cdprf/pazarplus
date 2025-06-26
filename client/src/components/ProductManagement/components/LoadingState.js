import React from "react";

/**
 * Enhanced Loading State Component
 * Provides various loading styles for different contexts
 */
const LoadingState = ({
  type = "default",
  message = "Ürünler yükleniyor",
  subMessage = "Ürünleriniz hazırlanıyor, lütfen bekleyin...",
  className = "",
}) => {
  // Table skeleton loading
  if (type === "table") {
    return (
      <div className={`skeleton-table ${className}`}>
        {/* Enhanced Skeleton Toolbar */}
        <div className="skeleton-toolbar">
          <div className="skeleton-toolbar-left">
            <div className="skeleton skeleton-title"></div>
            <div className="skeleton skeleton-search"></div>
          </div>
          <div className="skeleton-toolbar-right">
            <div className="skeleton skeleton-button"></div>
            <div className="skeleton skeleton-button"></div>
          </div>
        </div>

        {/* Enhanced Skeleton Table Body */}
        <div className="skeleton-table-body">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton-table-row">
              <div className="skeleton skeleton-product-image"></div>
              <div className="skeleton-product-content">
                <div className="skeleton skeleton-product-name"></div>
                <div className="skeleton skeleton-product-details"></div>
              </div>
              <div className="skeleton skeleton-badge"></div>
              <div className="skeleton skeleton-badge"></div>
              <div className="skeleton skeleton-text w-20"></div>
              <div className="skeleton skeleton-text w-16"></div>
              <div className="skeleton skeleton-text w-12"></div>
            </div>
          ))}

          {/* Skeleton Pagination */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="skeleton skeleton-text w-32"></div>
            <div className="flex items-center gap-2">
              <div className="skeleton skeleton-button"></div>
              <div className="skeleton skeleton-button"></div>
              <div className="skeleton skeleton-button"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid skeleton loading
  if (type === "grid") {
    return (
      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6 ${className}`}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-card border border-gray-200 dark:border-gray-700 rounded-lg"
          >
            <div className="skeleton skeleton-product-image h-48 rounded-t-lg"></div>
            <div className="p-4 space-y-3">
              <div className="skeleton skeleton-product-name"></div>
              <div className="skeleton skeleton-product-details"></div>
              <div className="flex justify-between items-center">
                <div className="skeleton skeleton-badge"></div>
                <div className="skeleton skeleton-text w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Compact inline loading
  if (type === "inline") {
    return (
      <div className={`flex items-center justify-center py-4 ${className}`}>
        <div className="loading-spinner loading-spinner-sm"></div>
        <span className="loading-text">{message}</span>
      </div>
    );
  }

  // Full page loading
  if (type === "page") {
    return (
      <div
        className={`min-h-[60vh] flex items-center justify-center ${className}`}
      >
        <div className="text-center">
          <div className="loading-spinner loading-spinner-lg mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {message}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-sm">
            {subMessage}
          </p>
        </div>
      </div>
    );
  }

  // Default centered loading
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="loading-spinner loading-spinner-lg mx-auto mb-4"></div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        {message}
      </h3>
      <p className="text-gray-600 dark:text-gray-400">{subMessage}</p>
    </div>
  );
};

export default LoadingState;
