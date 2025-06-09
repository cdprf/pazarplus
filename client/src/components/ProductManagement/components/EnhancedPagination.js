import React, { useState } from "react";
import { Button } from "../../ui";

const EnhancedPagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onPageSizeChange,
  className = "",
}) => {
  const [pageInput, setPageInput] = useState("");

  const pageSizeOptions = [10, 20, 50, 100];
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePageJump = () => {
    const page = parseInt(pageInput);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
      setPageInput("");
    }
  };

  return (
    <div
      className={`flex items-center justify-between bg-gray-50 dark:bg-gray-800 px-6 py-3 border-t ${className}`}
    >
      <div className="flex items-center space-x-4">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <span className="font-medium">
            {startItem}-{endItem}
          </span>{" "}
          /<span className="font-medium"> {totalItems}</span> ürün
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">Her Sayfada:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onPageSizeChange?.(parseInt(e.target.value))}
            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">Sayfaya Git:</span>
          <input
            type="number"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePageJump()}
            placeholder={currentPage.toString()}
            min="1"
            max={totalPages}
            className="w-16 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <Button onClick={handlePageJump} variant="outline" size="sm">
            Git
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
          >
            Önceki
          </Button>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Sayfa {currentPage} / {totalPages}
          </span>
          <Button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            variant="outline"
            size="sm"
          >
            Sonraki
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedPagination;
