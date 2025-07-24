import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  // Calculate dropdown position
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();

    setDropdownPosition({
      top: triggerRect.bottom + 4, // 4px gap, using viewport coordinates
      left: triggerRect.left,
      width: compact ? 160 : 192, // w-40 = 160px, w-48 = 192px
    });
  }, [compact]);

  // Update position when opening dropdown and recalculate on every open
  useEffect(() => {
    if (isOpen) {
      // Force recalculation on every open
      calculatePosition();

      // Also recalculate if viewport changes while open
      const handleRecalculate = () => {
        if (isOpen) {
          calculatePosition();
        }
      };

      window.addEventListener("scroll", handleRecalculate, true);
      window.addEventListener("resize", handleRecalculate);

      return () => {
        window.removeEventListener("scroll", handleRecalculate, true);
        window.removeEventListener("resize", handleRecalculate);
      };
    }
  }, [isOpen, calculatePosition]);

  // Close menu on Escape key
  useEffect(() => {
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

  // Handle scroll events to close dropdown when scrolling (but allow position updates)
  useEffect(() => {
    const handleScroll = (event) => {
      if (isOpen) {
        // Only close if it's a major scroll (user scrolling page, not small adjustments)
        // This prevents closing during position recalculation
        const scrollDelta = Math.abs(event.target.scrollTop || window.scrollY);
        if (scrollDelta > 10) {
          setIsOpen(false);
        }
      }
    };

    const handleResize = () => {
      if (isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Use passive listener for better performance
      window.addEventListener("scroll", handleScroll, { passive: true });
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("scroll", handleScroll);
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [isOpen]);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        triggerRef.current &&
        dropdownRef.current &&
        !triggerRef.current.contains(event.target) &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
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
    <div className="relative" ref={triggerRef}>
      <Button
        onClick={() => {
          if (!isOpen) {
            // Recalculate position immediately when opening
            setTimeout(() => calculatePosition(), 0);
          }
          setIsOpen(!isOpen);
        }}
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

      {isOpen &&
        ReactDOM.createPortal(
          <>
            {/* Backdrop to close menu */}
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            <div
              ref={dropdownRef}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-[9999]"
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="bulk-operations-menu"
              style={{
                position: "fixed",
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
                maxHeight: "300px",
                overflowY: "auto",
              }}
            >
              <div className="py-1">
                <button
                  onClick={() => {
                    onBulkEdit?.();
                    setIsOpen(false);
                  }}
                  role="menuitem"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 focus:outline-none flex items-center"
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
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 focus:outline-none flex items-center"
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
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 focus:outline-none flex items-center"
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
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 focus:outline-none flex items-center"
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
          </>,
          document.body
        )}
    </div>
  );
};

export default BulkOperations;
