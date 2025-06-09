import React, { useState } from "react";
import {
  Edit,
  CheckCircle,
  AlertCircle,
  Download,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { Button } from "../../ui";

const BulkOperations = ({
  selectedCount = 0,
  onBulkEdit,
  onBulkDelete,
  onBulkStatusChange,
  onBulkExport,
  compact = false, // New prop for compact layout
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Close menu on Escape key
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  if (selectedCount === 0) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className={`${compact ? "text-xs px-2 py-1" : "text-xs"}`}
        aria-label="Toplu işlemler (seçim yok)"
      >
        <span className="hidden sm:inline">Toplu İşlemler </span>
        (0)
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="primary"
        size="sm"
        icon={ChevronDown}
        className={`${compact ? "text-xs px-2 py-1" : "text-xs"}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Toplu işlemler menüsü (${selectedCount} ürün seçili)`}
      >
        <span className="hidden sm:inline">Toplu İşlemler </span>(
        {selectedCount})
      </Button>

      {isOpen && (
        <>
          {/* Backdrop to close menu */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            className={`absolute top-full left-0 mt-1 ${
              compact ? "w-40" : "w-48"
            } bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20`}
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="bulk-operations-menu"
          >
            <div className="py-1">
              <button
                onClick={() => {
                  onBulkEdit?.();
                  setIsOpen(false);
                }}
                role="menuitem"
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800 focus:bg-gray-50 dark:bg-gray-800 focus:outline-none flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Toplu Düzenle
              </button>
              <button
                onClick={() => {
                  onBulkStatusChange?.("active");
                  setIsOpen(false);
                }}
                role="menuitem"
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800 focus:bg-gray-50 dark:bg-gray-800 focus:outline-none flex items-center"
              >
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                Aktif Yap
              </button>
              <button
                onClick={() => {
                  onBulkStatusChange?.("inactive");
                  setIsOpen(false);
                }}
                role="menuitem"
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800 focus:bg-gray-50 dark:bg-gray-800 focus:outline-none flex items-center"
              >
                <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                Pasif Yap
              </button>
              <button
                onClick={() => {
                  onBulkExport?.();
                  setIsOpen(false);
                }}
                role="menuitem"
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800 focus:bg-gray-50 dark:bg-gray-800 focus:outline-none flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Excel'e Aktar
              </button>
              <div className="border-t border-gray-100 dark:border-gray-700" />
              <button
                onClick={() => {
                  onBulkDelete?.();
                  setIsOpen(false);
                }}
                role="menuitem"
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none flex items-center"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Sil
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BulkOperations;
