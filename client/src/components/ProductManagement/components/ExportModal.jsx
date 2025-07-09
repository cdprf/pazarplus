import React, { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Checkbox,
  Label,
} from "../../ui";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

const ExportModal = ({ isOpen, onClose, onExport, isExporting = false }) => {
  const [selectedColumns, setSelectedColumns] = useState([
    "name",
    "sku",
    "category",
    "price",
    "stockQuantity",
    "status",
  ]);
  const [exportFormat, setExportFormat] = useState("csv");
  const [exportType, setExportType] = useState("all");

  // Available columns for export
  const availableColumns = useMemo(
    () => [
      { key: "id", label: "ID", description: "Product unique identifier" },
      {
        key: "name",
        label: "Product Name",
        description: "Product display name",
      },
      { key: "sku", label: "SKU", description: "Stock Keeping Unit" },
      { key: "barcode", label: "Barcode", description: "Product barcode" },
      {
        key: "description",
        label: "Description",
        description: "Product description",
      },
      { key: "category", label: "Category", description: "Product category" },
      { key: "price", label: "Price", description: "Product selling price" },
      {
        key: "costPrice",
        label: "Cost Price",
        description: "Product cost price",
      },
      { key: "currency", label: "Currency", description: "Price currency" },
      {
        key: "stockQuantity",
        label: "Stock Quantity",
        description: "Current stock level",
      },
      {
        key: "minStockLevel",
        label: "Min Stock Level",
        description: "Minimum stock threshold",
      },
      {
        key: "status",
        label: "Status",
        description: "Product status (active/inactive)",
      },
      {
        key: "platforms",
        label: "Platforms",
        description: "Platform configurations",
      },
      {
        key: "createdAt",
        label: "Created Date",
        description: "Product creation date",
      },
      {
        key: "updatedAt",
        label: "Updated Date",
        description: "Last update date",
      },
    ],
    []
  );

  const exportFormats = [
    {
      value: "csv",
      label: "CSV",
      icon: FileText,
      description: "Comma-separated values",
    },
    {
      value: "xlsx",
      label: "Excel",
      icon: FileSpreadsheet,
      description: "Microsoft Excel format",
    },
    {
      value: "json",
      label: "JSON",
      icon: FileText,
      description: "JavaScript Object Notation",
    },
  ];

  const exportTypes = [
    {
      value: "all",
      label: "All Products",
      description: "Export all products based on current filters",
    },
    {
      value: "selected",
      label: "Selected Products",
      description: "Export only selected products",
    },
    {
      value: "visible",
      label: "Visible Products",
      description: "Export products currently visible in the table",
    },
  ];

  const handleColumnToggle = useCallback((columnKey) => {
    setSelectedColumns((prev) =>
      prev.includes(columnKey)
        ? prev.filter((key) => key !== columnKey)
        : [...prev, columnKey]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedColumns(availableColumns.map((col) => col.key));
  }, [availableColumns]);

  const handleSelectNone = useCallback(() => {
    setSelectedColumns([]);
  }, []);

  const handleExport = useCallback(() => {
    if (selectedColumns.length === 0) {
      alert("Please select at least one column to export");
      return;
    }

    onExport({
      columns: selectedColumns,
      format: exportFormat,
      type: exportType,
    });
  }, [selectedColumns, exportFormat, exportType, onExport]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Products
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {exportFormats.map((format) => (
                <option key={format.value} value={format.value}>
                  {format.label} - {format.description}
                </option>
              ))}
            </select>
          </div>

          {/* Export Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Type</Label>
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {exportTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>
          </div>

          <hr className="my-4" />

          {/* Column Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Select Columns to Export
              </Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={handleSelectNone}>
                  Select None
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
              {availableColumns.map((column) => (
                <div key={column.key} className="flex items-start space-x-2">
                  <Checkbox
                    id={column.key}
                    checked={selectedColumns.includes(column.key)}
                    onCheckedChange={() => handleColumnToggle(column.key)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor={column.key}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {column.label}
                    </Label>
                    <p className="text-xs text-gray-500">
                      {column.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected columns summary */}
          {selectedColumns.length > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-sm font-medium mb-2">
                Selected Columns ({selectedColumns.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedColumns.map((columnKey) => {
                  const column = availableColumns.find(
                    (col) => col.key === columnKey
                  );
                  return (
                    <span
                      key={columnKey}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded"
                    >
                      {column?.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || selectedColumns.length === 0}
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportModal;
