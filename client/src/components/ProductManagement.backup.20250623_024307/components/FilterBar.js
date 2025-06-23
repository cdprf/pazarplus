import React, { useState, useCallback, useMemo } from "react";
import {
  Search,
  Filter,
  X,
  ChevronDown,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
  Download,
  Upload,
  RefreshCw,
  TrendingUp,
  Loader,
} from "lucide-react";
import { Button, Badge, Card, CardContent } from "../../ui";
import {
  CATEGORIES,
  PLATFORMS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  STOCK_STATUS_OPTIONS,
} from "../utils/constants";

// Search Input Component
const SearchInput = ({
  value,
  onChange,
  onClear,
  placeholder = "Ürün ara...",
  className = "",
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <div
        className={`relative flex items-center border rounded-lg transition-all duration-200 ${
          isFocused ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-300 dark:border-gray-600"
        }`}
      >
        <Search className="absolute left-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 text-sm bg-transparent border-0 focus:outline-none placeholder-gray-500"
        />
        {value && (
          <button
            onClick={onClear}
            className="absolute right-3 p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 transition-colors"
            title="Aramayı temizle"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search suggestions could go here */}
      {value && isFocused && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
          <div className="p-2 text-xs text-gray-500  dark:text-gray-500 border-b">Öneriler:</div>
          <div className="p-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800 cursor-pointer">
            "{value}" için tüm ürünlerde ara
          </div>
        </div>
      )}
    </div>
  );
};

// Filter Panel Component
const FilterPanel = ({
  filters,
  onFiltersChange,
  onClearFilters,
  isOpen,
  onToggle,
  className = "",
}) => {
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter((value) => value && value !== "")
      .length;
  }, [filters]);

  const handleFilterChange = useCallback(
    (key, value) => {
      onFiltersChange((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [onFiltersChange]
  );

  return (
    <div className={className}>
      {/* Filter Toggle Button */}
      <Button
        onClick={onToggle}
        variant={isOpen ? "default" : "outline"}
        icon={Filter}
        className="relative"
      >
        <span className="hidden sm:inline">Filtreler</span>
        <span className="sm:hidden">Filtre</span>
        {activeFilterCount > 0 && (
          <Badge
            variant="primary"
            className="ml-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
          >
            {activeFilterCount}
          </Badge>
        )}
        <ChevronDown
          className={`ml-2 h-4 w-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </Button>

      {/* Filter Panel */}
      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-20 min-w-96">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Filtreler</h3>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={onClearFilters}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                >
                  Temizle
                </Button>
                <Button onClick={onToggle} variant="ghost" size="sm" icon={X} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kategori
                </label>
                <select
                  value={filters.category || ""}
                  onChange={(e) =>
                    handleFilterChange("category", e.target.value)
                  }
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
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Durum
                </label>
                <select
                  value={filters.status || ""}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Tüm Durumlar</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stock Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stok Durumu
                </label>
                <select
                  value={filters.stockStatus || ""}
                  onChange={(e) =>
                    handleFilterChange("stockStatus", e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Tüm Stok Durumları</option>
                  {STOCK_STATUS_OPTIONS.map((stockStatus) => (
                    <option key={stockStatus.value} value={stockStatus.value}>
                      {stockStatus.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fiyat Aralığı (₺)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice || ""}
                  onChange={(e) =>
                    handleFilterChange("minPrice", e.target.value)
                  }
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice || ""}
                  onChange={(e) =>
                    handleFilterChange("maxPrice", e.target.value)
                  }
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Stock Range Filter */}
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stok Aralığı
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min Stok"
                  value={filters.minStock || ""}
                  onChange={(e) =>
                    handleFilterChange("minStock", e.target.value)
                  }
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  placeholder="Max Stok"
                  value={filters.maxStock || ""}
                  onChange={(e) =>
                    handleFilterChange("maxStock", e.target.value)
                  }
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Platform Filter Component
const PlatformFilter = ({ value, onChange, className = "" }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 ${className}`}
    >
      {PLATFORMS.map((platform) => (
        <option key={platform.value} value={platform.value}>
          {platform.label}
        </option>
      ))}
    </select>
  );
};

// Sort Selector Component
const SortSelector = ({ value, onChange, className = "" }) => {
  const [field, order] = value.split("-");
  const currentOption = SORT_OPTIONS.find((opt) => opt.value === value);

  return (
    <div className={`flex items-center ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800"
        title={`Sıralama: ${currentOption?.label || `${field} (${order})`}`}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Visual sort direction indicator using field and order */}
      <div
        className="ml-2 p-1 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800"
        title={`${field} sıralaması`}
      >
        {order === "asc" ? (
          <SortAsc className="h-4 w-4 text-gray-600 dark:text-gray-500" title="Artan sıralama" />
        ) : (
          <SortDesc className="h-4 w-4 text-gray-600 dark:text-gray-500" title="Azalan sıralama" />
        )}
      </div>
    </div>
  );
};

// View Mode Toggle Component
const ViewModeToggle = ({ mode, onChange, className = "" }) => {
  return (
    <div
      className={`flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden ${className}`}
    >
      <Button
        onClick={() => onChange("table")}
        variant={mode === "table" ? "default" : "ghost"}
        size="sm"
        icon={List}
        className="rounded-none border-0"
        title="Tablo Görünümü"
      />
      <Button
        onClick={() => onChange("grid")}
        variant={mode === "grid" ? "default" : "ghost"}
        size="sm"
        icon={Grid3X3}
        className="rounded-none border-0 border-l border-gray-300 dark:border-gray-600"
        title="Kart Görünümü"
      />
    </div>
  );
};

// Action Buttons Component
const ActionButtons = ({
  onSync,
  onImport,
  onDownloadTemplate,
  onToggleAnalytics,
  syncLoading = false,
  importLoading = false,
  className = "",
}) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Button
        onClick={onToggleAnalytics}
        variant="outline"
        icon={TrendingUp}
        size="sm"
        title="Analytics"
      >
        <span className="hidden lg:inline">Analytics</span>
      </Button>

      <Button
        onClick={onSync}
        variant="outline"
        icon={syncLoading ? Loader : RefreshCw}
        size="sm"
        disabled={syncLoading}
        className={syncLoading ? "animate-pulse" : ""}
        title="Platformlardan senkronize et"
      >
        <span className="hidden lg:inline">
          {syncLoading ? "Senkronize Ediliyor..." : "Senkronize Et"}
        </span>
        <span className="lg:hidden">Sync</span>
      </Button>

      <Button
        onClick={onImport}
        variant="outline"
        icon={importLoading ? Loader : Upload}
        size="sm"
        disabled={importLoading}
        title="CSV dosyasından ürün ekle"
      >
        <span className="hidden md:inline">
          {importLoading ? "İçe Aktarılıyor..." : "CSV İçe Aktar"}
        </span>
        <span className="md:hidden">İçe Aktar</span>
      </Button>

      <Button
        onClick={onDownloadTemplate}
        variant="outline"
        icon={Download}
        size="sm"
        title="CSV şablonunu indir"
      >
        <span className="hidden md:inline">Şablon</span>
        <Download className="md:hidden h-4 w-4" />
      </Button>
    </div>
  );
};

// Quick Filter Tags Component
const QuickFilterTags = ({
  filters,
  onRemoveFilter,
  onClearAll,
  platformFilter,
  onRemovePlatformFilter,
  className = "",
}) => {
  const activeFilters = [];

  // Add filter tags
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== "") {
      let label = "";
      switch (key) {
        case "category":
          label = `Kategori: ${value}`;
          break;
        case "status":
          label = `Durum: ${
            value === "active"
              ? "Aktif"
              : value === "inactive"
              ? "Pasif"
              : "Taslak"
          }`;
          break;
        case "stockStatus":
          label = `Stok: ${
            value === "in_stock"
              ? "Stokta"
              : value === "low_stock"
              ? "Az Stok"
              : "Stok Yok"
          }`;
          break;
        case "minPrice":
          label = `Min Fiyat: ₺${value}`;
          break;
        case "maxPrice":
          label = `Max Fiyat: ₺${value}`;
          break;
        case "minStock":
          label = `Min Stok: ${value}`;
          break;
        case "maxStock":
          label = `Max Stok: ${value}`;
          break;
        default:
          label = `${key}: ${value}`;
      }
      activeFilters.push({ key, label, value });
    }
  });

  // Add platform filter
  if (platformFilter && platformFilter !== "all") {
    const platform = PLATFORMS.find((p) => p.value === platformFilter);
    if (platform) {
      activeFilters.push({
        key: "platform",
        label: `Platform: ${platform.label}`,
        value: platformFilter,
      });
    }
  }

  if (activeFilters.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-sm text-gray-600 dark:text-gray-500">Aktif filtreler:</span>
      {activeFilters.map((filter) => (
        <Badge
          key={`${filter.key}-${filter.value}`}
          variant="outline"
          className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800"
        >
          {filter.label}
          <button
            onClick={() => {
              if (filter.key === "platform") {
                onRemovePlatformFilter();
              } else {
                onRemoveFilter(filter.key);
              }
            }}
            className="ml-1 text-gray-500  dark:text-gray-500 hover:text-gray-700"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Button
        onClick={onClearAll}
        variant="ghost"
        size="sm"
        className="text-xs text-gray-500  dark:text-gray-500 hover:text-gray-700 "
      >
        Tümünü Temizle
      </Button>
    </div>
  );
};

// Main Filters Bar Component
const FiltersBar = ({
  searchValue,
  onSearchChange,
  filters,
  onFiltersChange,
  platformFilter,
  onPlatformFilterChange,
  sortValue,
  onSortChange,
  viewMode,
  onViewModeChange,
  showAdvancedFilters,
  onToggleAdvancedFilters,
  onClearAllFilters,
  // Action handlers
  onSync,
  onImport,
  onDownloadTemplate,
  onToggleAnalytics,
  // Loading states
  syncLoading,
  importLoading,
  className = "",
}) => {
  const handleClearSearch = useCallback(() => {
    onSearchChange("");
  }, [onSearchChange]);

  const handleClearFilters = useCallback(() => {
    onFiltersChange({
      search: "",
      category: "",
      status: "",
      stockStatus: "",
      minPrice: "",
      maxPrice: "",
      minStock: "",
      maxStock: "",
    });
  }, [onFiltersChange]);

  const handleClearAll = useCallback(() => {
    handleClearSearch();
    handleClearFilters();
    onPlatformFilterChange("all");
  }, [handleClearSearch, handleClearFilters, onPlatformFilterChange]);

  const handleRemoveFilter = useCallback(
    (filterKey) => {
      onFiltersChange((prev) => ({
        ...prev,
        [filterKey]: "",
      }));
    },
    [onFiltersChange]
  );

  const handleRemovePlatformFilter = useCallback(() => {
    onPlatformFilterChange("all");
  }, [onPlatformFilterChange]);

  const handleSortChange = useCallback(
    (value) => {
      const [field, order] = value.split("-");
      const currentOption = SORT_OPTIONS.find((opt) => opt.value === value);

      // Use the field and currentOption variables to implement sort functionality
      onFiltersChange({
        ...filters,
        sortBy: field,
        sortOrder: order,
        sortLabel: currentOption?.label || `${field} (${order})`,
      });
    },
    [filters, onFiltersChange]
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Primary Filter Row */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search */}
          <SearchInput
            value={searchValue}
            onChange={onSearchChange}
            onClear={handleClearSearch}
            className="flex-1 min-w-0"
          />

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <ViewModeToggle mode={viewMode} onChange={onViewModeChange} />

            <div className="relative">
              <FilterPanel
                filters={filters}
                onFiltersChange={onFiltersChange}
                onClearFilters={handleClearFilters}
                isOpen={showAdvancedFilters}
                onToggle={onToggleAdvancedFilters}
              />
            </div>

            <PlatformFilter
              value={platformFilter}
              onChange={onPlatformFilterChange}
              className="min-w-0"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-4">
          <SortSelector
            value={sortValue}
            onChange={handleSortChange}
            className="min-w-0"
          />

          <ActionButtons
            onSync={onSync}
            onImport={onImport}
            onDownloadTemplate={onDownloadTemplate}
            onToggleAnalytics={onToggleAnalytics}
            syncLoading={syncLoading}
            importLoading={importLoading}
          />
        </div>
      </div>

      {/* Quick Filter Tags */}
      <QuickFilterTags
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClearAll}
        platformFilter={platformFilter}
        onRemovePlatformFilter={handleRemovePlatformFilter}
      />
    </div>
  );
};

export default FiltersBar;