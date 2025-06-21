import React from "react";
import "../../styles/design-system.css";

// Utility functions for pagination logic
const getPageNumbers = (currentPage, totalPages) => {
  const pages = [];

  if (totalPages <= 5) {
    // Show all pages if total is 5 or less
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else if (currentPage <= 3) {
    // Show first 5 pages
    for (let i = 1; i <= 5; i++) {
      pages.push(i);
    }
  } else if (currentPage >= totalPages - 2) {
    // Show last 5 pages
    for (let i = totalPages - 4; i <= totalPages; i++) {
      pages.push(Math.max(1, i));
    }
  } else {
    // Show pages around current page
    for (let i = currentPage - 2; i <= currentPage + 2; i++) {
      pages.push(Math.max(1, i));
    }
  }

  return pages.filter(
    (page, index, array) =>
      page >= 1 && page <= totalPages && array.indexOf(page) === index
  );
};

const EnhancedPagination = ({
  currentPage,
  totalPages,
  totalRecords,
  recordCount,
  onPageChange,
  className = "",
  isLoading = false, // Add loading state prop
  showInfo = true, // Add option to hide info section
  showMobile = true, // Add option to hide mobile version
}) => {
  // Validate and sanitize props
  const safeTotalPages = Math.max(0, parseInt(totalPages) || 0);
  const safeCurrentPage = Math.max(
    1,
    Math.min(parseInt(currentPage) || 1, safeTotalPages)
  );
  const safeTotalRecords = Math.max(0, parseInt(totalRecords) || 0);
  const safeRecordCount = Math.max(1, parseInt(recordCount) || 20);

  // Early return if pagination is not needed
  if (safeTotalPages <= 1) return null;

  // Validate onPageChange callback
  const handlePageChange = (page) => {
    if (typeof onPageChange !== "function") {
      console.warn("EnhancedPagination: onPageChange is not a function");
      return;
    }

    const validPage = Math.max(1, Math.min(page, safeTotalPages));
    if (validPage !== safeCurrentPage) {
      onPageChange(validPage);
    }
  };

  return (
    <div className={`px-6 py-4 border-t border-surface-300 ${className}`}>
      <div className="flex items-center justify-between">
        {/* Info Section */}
        {showInfo && (
          <div className="flex items-center pazar-text-sm">
            <span>
              Sayfa {safeCurrentPage} / {safeTotalPages}
            </span>
            <span className="ml-4 text-muted">
              Toplam {safeTotalRecords} kayıt
            </span>
            <span className="ml-4 text-muted opacity-75">
              (Sayfa başına {safeRecordCount} kayıt)
            </span>
          </div>
        )}

        {/* Desktop Pagination Controls */}
        <div className="hidden sm:flex items-center space-x-1">
          {/* First page button */}
          <button
            onClick={() => handlePageChange(1)}
            disabled={safeCurrentPage === 1 || isLoading}
            className="pazar-btn pazar-btn-outline pazar-btn-sm"
            aria-label="İlk sayfa"
          >
            İlk
          </button>

          {/* Previous page button */}
          <button
            onClick={() => handlePageChange(Math.max(safeCurrentPage - 1, 1))}
            disabled={safeCurrentPage === 1 || isLoading}
            className="pazar-btn pazar-btn-outline pazar-btn-sm"
            aria-label="Önceki sayfa"
          >
            Önceki
          </button>

          {/* Page numbers with ellipsis logic */}
          <div className="flex items-center space-x-1">
            {getPageNumbers(safeCurrentPage, safeTotalPages).map(
              (pageNumber, i) => (
                <button
                  key={`page-${pageNumber}-${i}`}
                  onClick={() => handlePageChange(pageNumber)}
                  disabled={isLoading}
                  className={`pazar-btn pazar-btn-sm min-w-[40px] ${
                    safeCurrentPage === pageNumber
                      ? "pazar-btn-primary"
                      : "pazar-btn-outline"
                  }`}
                  aria-label={`Sayfa ${pageNumber}`}
                  aria-current={
                    safeCurrentPage === pageNumber ? "page" : undefined
                  }
                >
                  {pageNumber}
                </button>
              )
            )}

            {/* Show ellipsis and last page if needed */}
            {safeTotalPages > 5 && safeCurrentPage < safeTotalPages - 2 && (
              <>
                {safeCurrentPage < safeTotalPages - 3 && (
                  <span className="px-2 text-muted">...</span>
                )}
                <button
                  onClick={() => handlePageChange(safeTotalPages)}
                  className="pazar-btn pazar-btn-outline pazar-btn-sm min-w-[40px]"
                  aria-label={`Sayfa ${safeTotalPages}`}
                >
                  {safeTotalPages}
                </button>
              </>
            )}
          </div>

          {/* Next page button */}
          <button
            onClick={() =>
              handlePageChange(Math.min(safeCurrentPage + 1, safeTotalPages))
            }
            disabled={safeCurrentPage === safeTotalPages || isLoading}
            className="pazar-btn pazar-btn-outline pazar-btn-sm"
            aria-label="Sonraki sayfa"
          >
            Sonraki
          </button>

          {/* Last page button */}
          <button
            onClick={() => handlePageChange(safeTotalPages)}
            disabled={safeCurrentPage === safeTotalPages || isLoading}
            className="pazar-btn pazar-btn-outline pazar-btn-sm"
            aria-label="Son sayfa"
          >
            Son
          </button>
        </div>
      </div>

      {/* Mobile pagination controls */}
      {showMobile && (
        <div className="sm:hidden mt-3 flex justify-between items-center">
          <select
            value={safeCurrentPage}
            onChange={(e) => handlePageChange(parseInt(e.target.value))}
            className="pazar-form-select pazar-text-sm"
          >
            {Array.from({ length: safeTotalPages }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Sayfa {i + 1}
              </option>
            ))}
          </select>
          <span className="pazar-text-sm text-muted">
            {safeTotalPages} sayfadan {safeCurrentPage}
          </span>
        </div>
      )}
    </div>
  );
};

export default EnhancedPagination;
