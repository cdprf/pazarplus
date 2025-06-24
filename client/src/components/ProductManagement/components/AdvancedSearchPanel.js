import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

/**
 * Advanced Search Panel Component
 * Provides comprehensive search and filter capabilities
 */
const AdvancedSearchPanel = ({
  searchValue: propSearchValue = "",
  filters = {},
  onFilterChange,
  onClearFilters,
  categories = [],
  onSearch,
  className = "",
}) => {
  const [searchValue, setSearchValue] = useState(propSearchValue);

  // Update local state when prop changes
  useEffect(() => {
    setSearchValue(propSearchValue);
  }, [propSearchValue]);

  // Handle search input change
  const handleSearchChange = (value) => {
    setSearchValue(value);
    // Trigger search on change for real-time search
    onSearch?.(value);
  };

  // Handle search submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearch?.(searchValue);
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    onFilterChange?.({
      ...filters,
      [key]: value,
    });
  };

  // Handle clear all filters and search
  const handleClearAll = () => {
    setSearchValue("");
    onSearch?.(""); // Clear search
    onClearFilters?.();
  };

  // Status options for dropdown
  const statusOptions = [
    { value: "", label: "Tüm Durumlar" },
    { value: "active", label: "Aktif" },
    { value: "inactive", label: "Pasif" },
    { value: "draft", label: "Taslak" },
    { value: "pending", label: "Beklemede" },
  ];

  // Platform options for dropdown
  const platformOptions = [
    { value: "all", label: "Tüm Platformlar" },
    { value: "trendyol", label: "Trendyol" },
    { value: "hepsiburada", label: "Hepsiburada" },
    { value: "n11", label: "N11" },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Input Row */}
      <div className="flex items-center space-x-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Ürün adı, SKU, barkod ile ara..."
            className="w-full pl-10 pr-20 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {searchValue && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="submit"
              className="px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg transition-colors"
            >
              Ara
            </button>
          </div>
        </form>

        <button
          onClick={handleClearAll}
          className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          Temizle
        </button>
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Kategori
          </label>
          <select
            value={filters.category || ""}
            onChange={(e) => handleFilterChange("category", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">Tüm Kategoriler</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Durum
          </label>
          <select
            value={filters.status || ""}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Platform Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Platform
          </label>
          <select
            value={filters.platform || "all"}
            onChange={(e) => handleFilterChange("platform", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            {platformOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Fiyat Aralığı
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.minPrice || ""}
              onChange={(e) => handleFilterChange("minPrice", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.maxPrice || ""}
              onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Additional Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Stock Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Stok Aralığı
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              placeholder="Min Stok"
              value={filters.minStock || ""}
              onChange={(e) => handleFilterChange("minStock", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
            <input
              type="number"
              placeholder="Max Stok"
              value={filters.maxStock || ""}
              onChange={(e) => handleFilterChange("maxStock", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
        </div>

        {/* Stock Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Stok Durumu
          </label>
          <select
            value={filters.stockStatus || ""}
            onChange={(e) => handleFilterChange("stockStatus", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">Tüm Stok Durumları</option>
            <option value="in_stock">Stokta Var</option>
            <option value="out_of_stock">Stokta Yok</option>
            <option value="low_stock">Düşük Stok</option>
          </select>
        </div>

        {/* Quick Actions - Removed redundant search button */}
        <div className="flex items-end">
          <div className="w-full text-sm text-gray-500 dark:text-gray-400 text-center py-2">
            Filtreleri değiştirdikten sonra arama otomatik olarak güncellenir
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearchPanel;
