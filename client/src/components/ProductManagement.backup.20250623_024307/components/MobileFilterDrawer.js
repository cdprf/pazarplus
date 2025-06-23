import React from "react";
import { X, Filter, Check, RefreshCw } from "lucide-react";
import { Button } from "../../../components/ui";
import { CATEGORIES, PLATFORMS, STATUS_OPTIONS, STOCK_STATUS_OPTIONS } from "../utils/constants";

/**
 * MobileFilterDrawer Component
 * A mobile-friendly drawer for filters that slides in from the bottom
 */
const MobileFilterDrawer = ({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onClearFilters,
  platformFilter,
  onPlatformFilterChange,
}) => {
  if (!isOpen) return null;

  const handleFilterChange = (key, value) => {
    onFiltersChange((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
      
      <div className="fixed inset-x-0 bottom-0 max-h-[85vh] bg-white dark:bg-gray-800 rounded-t-xl shadow-xl transform transition-all overflow-hidden">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between z-10">
          <div className="flex items-center">
            <Filter className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Filtreler</h3>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearFilters}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Temizle
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        <div className="overflow-y-auto p-4 space-y-6">
          {/* Platform Filter */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Platform</h4>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform.value}
                  className={`flex items-center justify-between px-3 py-2 border ${
                    platformFilter === platform.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      : "border-gray-300 dark:border-gray-600"
                  } rounded-md text-sm`}
                  onClick={() => onPlatformFilterChange(platform.value)}
                >
                  <span>{platform.label}</span>
                  {platformFilter === platform.value && (
                    <Check className="h-4 w-4 text-blue-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Category Filter */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kategori</h4>
            <select
              value={filters.category || ""}
              onChange={(e) => handleFilterChange("category", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Durum</h4>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status.value}
                  className={`px-3 py-2 border ${
                    filters.status === status.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      : "border-gray-300 dark:border-gray-600"
                  } rounded-md text-sm`}
                  onClick={() => handleFilterChange("status", filters.status === status.value ? "" : status.value)}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Stock Status Filter */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Stok Durumu</h4>
            <div className="grid grid-cols-3 gap-2">
              {STOCK_STATUS_OPTIONS.map((stockStatus) => (
                <button
                  key={stockStatus.value}
                  className={`px-3 py-2 border ${
                    filters.stockStatus === stockStatus.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      : "border-gray-300 dark:border-gray-600"
                  } rounded-md text-sm`}
                  onClick={() => handleFilterChange("stockStatus", filters.stockStatus === stockStatus.value ? "" : stockStatus.value)}
                >
                  {stockStatus.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Price Range Filter */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fiyat Aralığı (₺)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Min</label>
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice || ""}
                  onChange={(e) => handleFilterChange("minPrice", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Max</label>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice || ""}
                  onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          
          {/* Stock Range Filter */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Stok Aralığı</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Min</label>
                <input
                  type="number"
                  placeholder="Min Stok"
                  value={filters.minStock || ""}
                  onChange={(e) => handleFilterChange("minStock", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Max</label>
                <input
                  type="number"
                  placeholder="Max Stok"
                  value={filters.maxStock || ""}
                  onChange={(e) => handleFilterChange("maxStock", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={onClose} className="w-full">
              İptal
            </Button>
            <Button variant="primary" onClick={onClose} className="w-full">
              Filtreleri Uygula
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileFilterDrawer;