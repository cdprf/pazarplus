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
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (selectedCount === 0) {
    return (
      <Button variant="outline" size="sm" disabled>
        Toplu İşlemler (0)
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
      >
        Toplu İşlemler ({selectedCount})
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          <div className="py-1">
            <button
              onClick={() => {
                onBulkEdit?.();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
            >
              <Edit className="h-4 w-4 mr-2" />
              Toplu Düzenle
            </button>
            <button
              onClick={() => {
                onBulkStatusChange?.("active");
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
            >
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Aktif Yap
            </button>
            <button
              onClick={() => {
                onBulkStatusChange?.("inactive");
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
            >
              <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
              Pasif Yap
            </button>
            <button
              onClick={() => {
                onBulkExport?.();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Excel'e Aktar
            </button>
            <div className="border-t border-gray-100" />
            <button
              onClick={() => {
                onBulkDelete?.();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Sil
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkOperations;
