import React from "react";
import {
  Search,
  Plus,
  Filter,
  Grid3X3,
  List,
  RefreshCw,
  Download,
  Upload,
  TrendingUp,
  X,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, Button, Badge } from "../../../components/ui";

/**
 * ModernProductHeader Component
 * A modern, clean header for the product management page
 */
const ModernProductHeader = ({
  title,
  totalItems,
  searchValue,
  onSearchChange,
  onAddProduct,
  onSync,
  onExport,
  onImport,
  onToggleAnalytics,
  onToggleFilters,
  onViewModeChange,
  viewMode,
  filtersActive,
  syncLoading,
  importLoading,
  exportLoading,
  className = "",
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {title}
          </h1>
          <Badge variant="secondary" className="text-sm font-normal">
            {totalItems} ürün
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={onAddProduct}
            className="shadow-sm"
          >
            <span className="hidden sm:inline">Yeni Ürün</span>
            <span className="sm:hidden">Yeni</span>
          </Button>
        </div>
      </div>

      {/* Search and Actions Bar */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row items-stretch">
            {/* Search */}
            <div className="relative flex-grow border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-700">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Ürün adı, SKU, barkod, marka ile ara..."
                className="block w-full pl-10 pr-3 py-3 border-0 text-sm focus:ring-0 focus:outline-none bg-transparent"
              />
              {searchValue && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center divide-x divide-gray-200 dark:divide-gray-700">
              {/* View Mode Toggle */}
              <div className="hidden sm:flex items-center px-3">
                <button
                  onClick={() => onViewModeChange?.("table")}
                  className={`p-1.5 rounded-md ${
                    viewMode === "table"
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                  aria-label="Table View"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onViewModeChange?.("grid")}
                  className={`p-1.5 rounded-md ${
                    viewMode === "grid"
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                  aria-label="Grid View"
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
              </div>

              {/* Filter Button */}
              <div className="px-3">
                <button
                  onClick={onToggleFilters}
                  className={`flex items-center gap-1.5 p-1.5 rounded-md ${
                    filtersActive
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm font-medium">
                    Filtreler
                  </span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Sync Button */}
              <div className="px-3">
                <button
                  onClick={onSync}
                  disabled={syncLoading}
                  className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${syncLoading ? "animate-spin" : ""}`}
                  />
                </button>
              </div>

              {/* Analytics Button */}
              <div className="px-3">
                <button
                  onClick={onToggleAnalytics}
                  className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <TrendingUp className="h-4 w-4" />
                </button>
              </div>

              {/* Export Button */}
              <div className="px-3">
                <button
                  onClick={onExport}
                  disabled={exportLoading}
                  className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>

              {/* Import Button */}
              <div className="px-3">
                <button
                  onClick={onImport}
                  disabled={importLoading}
                  className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <Upload className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModernProductHeader;
