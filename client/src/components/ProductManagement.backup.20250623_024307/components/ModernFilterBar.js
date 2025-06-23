import React, { useState } from "react";
import { X, ChevronDown, Check } from "lucide-react";
import { Card, CardContent } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { CATEGORIES, PLATFORMS, STATUS_OPTIONS, STOCK_STATUS_OPTIONS, SORT_OPTIONS } from "../utils/constants";

/**
 * ModernFilterBar Component
 * A clean, modern filter interface for product management
 */
const ModernFilterBar = ({
  filters,
  onFiltersChange,
  platformFilter,
  onPlatformFilterChange,
  sortValue,
  onSortChange,
  onClearFilters,
  isExpanded = false,
  className = "",
}) => {
  const [activeTab, setActiveTab] = useState("basic"); // basic, price, stock

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(
    (value) => value && value !== ""
  ).length + (platformFilter !== "all" ? 1 : 0);

  // Handle filter change
  const handleFilterChange = (key, value) => {
    onFiltersChange((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (!isExpanded) return null;

  return (
    <Card className={`border-0 shadow-sm ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Filtreler</h3>
            {activeFilterCount > 0 && (
              <Badge variant="primary" className="text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-xs h-7 px-2"
              disabled={activeFilterCount === 0}
            >
              Temizle
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFiltersChange({})}
              className="text-xs h-7 px-2"
              icon={X}
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === "basic"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
            onClick={() => setActiveTab("basic")}
          >
            Temel Filtreler
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === "price"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
            onClick={() => setActiveTab("price")}
          >
            Fiyat
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === "stock"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
            onClick={() => setActiveTab("stock")}
          >
            Stok
          </button>
        </div>

        {/* Basic Filters */}
        {activeTab === "basic" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Platform Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Platform
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map((platform) => (
                  <button
                    key={platform.value}
                    className={`flex items-center justify-between px-3 py-1.5 text-sm border rounded-md ${
                      platformFilter === platform.value
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                    onClick={() => onPlatformFilterChange(platform.value)}
                  >
                    <span>{platform.label}</span>
                    {platformFilter === platform.value && (
                      <Check className="h-3.5 w-3.5 text-blue-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Kategori
              </label>
              <select
                value={filters.category || ""}
                onChange={(e) => handleFilterChange("category", e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tüm Kategoriler</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Durum
              </label>
              <div className="grid grid-cols-3 gap-2">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status.value}
                    className={`px-2 py-1.5 text-xs border rounded-md ${
                      filters.status === status.value
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                    onClick={() =>
                      handleFilterChange(
                        "status",
                        filters.status === status.value ? "" : status.value
                      )
                    }
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Sıralama
              </label>
              <select
                value={sortValue}
                onChange={(e) => onSortChange(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Stock Status Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Stok Durumu
              </label>
              <div className="grid grid-cols-3 gap-2">
                {STOCK_STATUS_OPTIONS.map((stockStatus) => (
                  <button
                    key={stockStatus.value}
                    className={`px-2 py-1.5 text-xs border rounded-md ${
                      filters.stockStatus === stockStatus.value
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                    onClick={() =>
                      handleFilterChange(
                        "stockStatus",
                        filters.stockStatus === stockStatus.value ? "" : stockStatus.value
                      )
                    }
                  >
                    {stockStatus.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Price Filters */}
        {activeTab === "price" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Minimum Fiyat (₺)
              </label>
              <input
                type="number"
                placeholder="Min"
                value={filters.minPrice || ""}
                onChange={(e) => handleFilterChange("minPrice", e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Maximum Fiyat (₺)
              </label>
              <input
                type="number"
                placeholder="Max"
                value={filters.maxPrice || ""}
                onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Stock Filters */}
        {activeTab === "stock" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Minimum Stok
              </label>
              <input
                type="number"
                placeholder="Min Stok"
                value={filters.minStock || ""}
                onChange={(e) => handleFilterChange("minStock", e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Maximum Stok
              </label>
              <input
                type="number"
                placeholder="Max Stok"
                value={filters.maxStock || ""}
                onChange={(e) => handleFilterChange("maxStock", e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Active Filter Tags */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {filters.category && (
              <FilterTag
                label={`Kategori: ${filters.category}`}
                onRemove={() => handleFilterChange("category", "")}
              />
            )}
            {filters.status && (
              <FilterTag
                label={`Durum: ${
                  STATUS_OPTIONS.find((s) => s.value === filters.status)?.label || filters.status
                }`}
                onRemove={() => handleFilterChange("status", "")}
              />
            )}
            {filters.stockStatus && (
              <FilterTag
                label={`Stok: ${
                  STOCK_STATUS_OPTIONS.find((s) => s.value === filters.stockStatus)?.label || filters.stockStatus
                }`}
                onRemove={() => handleFilterChange("stockStatus", "")}
              />
            )}
            {filters.minPrice && (
              <FilterTag
                label={`Min Fiyat: ₺${filters.minPrice}`}
                onRemove={() => handleFilterChange("minPrice", "")}
              />
            )}
            {filters.maxPrice && (
              <FilterTag
                label={`Max Fiyat: ₺${filters.maxPrice}`}
                onRemove={() => handleFilterChange("maxPrice", "")}
              />
            )}
            {filters.minStock && (
              <FilterTag
                label={`Min Stok: ${filters.minStock}`}
                onRemove={() => handleFilterChange("minStock", "")}
              />
            )}
            {filters.maxStock && (
              <FilterTag
                label={`Max Stok: ${filters.maxStock}`}
                onRemove={() => handleFilterChange("maxStock", "")}
              />
            )}
            {platformFilter !== "all" && (
              <FilterTag
                label={`Platform: ${
                  PLATFORMS.find((p) => p.value === platformFilter)?.label || platformFilter
                }`}
                onRemove={() => onPlatformFilterChange("all")}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Filter Tag Component
const FilterTag = ({ label, onRemove }) => {
  return (
    <Badge
      variant="outline"
      className="flex items-center gap-1 py-1 px-2 bg-gray-50 dark:bg-gray-800"
    >
      {label}
      <button
        onClick={onRemove}
        className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
};

export default ModernFilterBar;