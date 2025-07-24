import logger from "../../utils/logger";
/**
 * OrderFilters - Enhanced with Pazar+ Design System
 * Implements consistent form patterns, accessibility, and enhanced UX
 */

import React, { useState, useCallback } from "react";

import { FormField } from "../FormControls";
import { ValidationMessage } from "../ValidationMessage";
import { OrderRegistry } from "../../core/OrderRegistry";
import {
  Filter,
  X,
  Calendar,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";

const DATE_PRESETS = [
  { label: "Bugün", value: "today" },
  { label: "Dün", value: "yesterday" },
  { label: "Son 7 Gün", value: "7days" },
  { label: "Bu Hafta", value: "this_week" },
  { label: "Geçen Hafta", value: "last_week" },
  { label: "Bu Ay", value: "this_month" },
  { label: "Son 30 Gün", value: "30days" },
  { label: "Geçen Ay", value: "last_month" },
  { label: "Son 90 Gün", value: "last_90_days" },
];

// Helper function to get date range for presets
const getDateRange = (preset) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "today":
      return {
        dateFrom: today.toISOString().split("T")[0],
        dateTo: today.toISOString().split("T")[0],
      };

    case "yesterday":
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      return {
        dateFrom: yesterday.toISOString().split("T")[0],
        dateTo: yesterday.toISOString().split("T")[0],
      };

    case "this_week":
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return {
        dateFrom: startOfWeek.toISOString().split("T")[0],
        dateTo: today.toISOString().split("T")[0],
      };

    case "last_week":
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
      return {
        dateFrom: lastWeekStart.toISOString().split("T")[0],
        dateTo: lastWeekEnd.toISOString().split("T")[0],
      };

    case "this_month":
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        dateFrom: startOfMonth.toISOString().split("T")[0],
        dateTo: today.toISOString().split("T")[0],
      };

    case "7days":
    case "last_30_days":
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      return {
        dateFrom: sevenDaysAgo.toISOString().split("T")[0],
        dateTo: today.toISOString().split("T")[0],
      };

    case "30days":
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return {
        dateFrom: thirtyDaysAgo.toISOString().split("T")[0],
        dateTo: today.toISOString().split("T")[0],
      };

    case "last_month":
      const lastMonthStart = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1
      );
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        dateFrom: lastMonthStart.toISOString().split("T")[0],
        dateTo: lastMonthEnd.toISOString().split("T")[0],
      };

    case "last_90_days":
      const ninetyDaysAgo = new Date(today);
      ninetyDaysAgo.setDate(today.getDate() - 90);
      return {
        dateFrom: ninetyDaysAgo.toISOString().split("T")[0],
        dateTo: today.toISOString().split("T")[0],
      };

    default:
      return { dateFrom: "", dateTo: "" };
  }
};

// Enhanced basic filters component with design system patterns
const BasicFilters = ({
  filters,
  onFiltersChange,
  recordCount,
  onRecordCountChange,
  searchInputRef,
  className = "",
}) => {
  return (
    <div
      className={`grid grid-cols-1 lg:grid-cols-12 gap-4 items-end ${className}`}
    >
      {/* Enhanced Search Input */}
      <div className="lg:col-span-6">
        <div className="pazar-form-group">
          <label className="pazar-form-label sr-only" htmlFor="order-search">
            Sipariş Ara
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 icon-contrast-secondary" />
            </div>
            <input
              id="order-search"
              ref={searchInputRef}
              type="text"
              className="pazar-form-input pl-10"
              placeholder="Sipariş numarası, müşteri adı veya ürün ara..."
              value={filters.search || ""}
              onChange={(e) => {
                logger.info(
                  "🔍 [OrderFilters] Search input changed:",
                  e.target.value
                );
                onFiltersChange({ search: e.target.value });
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onFiltersChange({ search: e.target.value }, true);
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Enhanced Filter Dropdowns */}
      <div className="lg:col-span-2">
        <div className="pazar-form-group">
          <label className="pazar-form-label sr-only" htmlFor="status-filter">
            Durum Filtresi
          </label>
          <select
            id="status-filter"
            className="pazar-form-select"
            value={filters.status || "all"}
            onChange={(e) => onFiltersChange({ status: e.target.value })}
          >
            <option value="all">Tüm Durumlar</option>
            {OrderRegistry.getStatusOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="pazar-form-group">
          <label className="pazar-form-label sr-only" htmlFor="platform-filter">
            Platform Filtresi
          </label>
          <select
            id="platform-filter"
            className="pazar-form-select"
            value={filters.platform || "all"}
            onChange={(e) => onFiltersChange({ platform: e.target.value })}
          >
            <option value="all">Tüm Platformlar</option>
            {OrderRegistry.getPlatformOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="pazar-form-group">
          <label className="pazar-form-label sr-only" htmlFor="record-count">
            Kayıt Sayısı
          </label>
          <select
            id="record-count"
            className="pazar-form-select"
            value={recordCount}
            onChange={(e) => onRecordCountChange(parseInt(e.target.value))}
          >
            <option value={10}>10 kayıt</option>
            <option value={20}>20 kayıt</option>
            <option value={50}>50 kayıt</option>
            <option value={100}>100 kayıt</option>
          </select>
        </div>
      </div>
    </div>
  );
};

// Enhanced advanced filters component with design system patterns
const AdvancedFilters = ({
  filters,
  onFiltersChange,
  errors = {},
  className = "",
}) => {
  const handleDatePreset = useCallback(
    (preset) => {
      const dateRange = getDateRange(preset);
      onFiltersChange(dateRange);
    },
    [onFiltersChange]
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Enhanced Date Filters */}
      <div className="pazar-form-group">
        <label className="pazar-form-label flex items-center">
          <Calendar className="h-4 w-4 mr-2 icon-contrast-info" />
          Tarih Aralığı
        </label>

        {/* Enhanced Date Presets */}
        <div className="flex flex-wrap gap-2 mb-4">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handleDatePreset(preset.value)}
              className="pazar-btn pazar-btn-outline pazar-btn-sm"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Enhanced Date Range Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="pazar-form-group">
            <label className="pazar-form-label" htmlFor="date-from">
              Başlangıç Tarihi
            </label>
            <input
              id="date-from"
              type="date"
              className={`pazar-form-input ${
                errors.dateFrom ? "pazar-form-input-error" : ""
              }`}
              value={filters.dateFrom || ""}
              onChange={(e) => onFiltersChange({ dateFrom: e.target.value })}
            />
            {errors.dateFrom && (
              <div className="pazar-form-error">{errors.dateFrom}</div>
            )}
          </div>

          <div className="pazar-form-group">
            <label className="pazar-form-label" htmlFor="date-to">
              Bitiş Tarihi
            </label>
            <input
              id="date-to"
              type="date"
              className={`pazar-form-input ${
                errors.dateTo ? "pazar-form-input-error" : ""
              }`}
              value={filters.dateTo || ""}
              onChange={(e) => onFiltersChange({ dateTo: e.target.value })}
            />
            {errors.dateTo && (
              <div className="pazar-form-error">{errors.dateTo}</div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Price Range */}
      <div className="pazar-form-group">
        <label className="pazar-form-label flex items-center">
          <DollarSign className="h-4 w-4 mr-2 icon-contrast-success" />
          Fiyat Aralığı
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="pazar-form-group">
            <label className="pazar-form-label" htmlFor="price-min">
              Minimum Fiyat
            </label>
            <input
              id="price-min"
              type="number"
              className={`pazar-form-input ${
                errors.priceMin ? "pazar-form-input-error" : ""
              }`}
              placeholder="Min fiyat"
              value={filters.priceMin || ""}
              onChange={(e) => onFiltersChange({ priceMin: e.target.value })}
            />
            {errors.priceMin && (
              <div className="pazar-form-error">{errors.priceMin}</div>
            )}
          </div>

          <div className="pazar-form-group">
            <label className="pazar-form-label" htmlFor="price-max">
              Maksimum Fiyat
            </label>
            <input
              id="price-max"
              type="number"
              className={`pazar-form-input ${
                errors.priceMax ? "pazar-form-input-error" : ""
              }`}
              placeholder="Max fiyat"
              value={filters.priceMax || ""}
              onChange={(e) => onFiltersChange({ priceMax: e.target.value })}
            />
            {errors.priceMax && (
              <div className="pazar-form-error">{errors.priceMax}</div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Additional Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="pazar-form-group">
          <label className="pazar-form-label" htmlFor="cargo-company">
            Kargo Şirketi
          </label>
          <select
            id="cargo-company"
            className="pazar-form-select"
            value={filters.cargoCompany || "all"}
            onChange={(e) => onFiltersChange({ cargoCompany: e.target.value })}
          >
            <option value="all">Tüm Kargo Şirketleri</option>
            <option value="yurtici">Yurtiçi Kargo</option>
            <option value="mng">MNG Kargo</option>
            <option value="aras">Aras Kargo</option>
            <option value="ups">UPS</option>
            <option value="dhl">DHL</option>
          </select>
        </div>

        <div className="pazar-form-group">
          <label className="pazar-form-label" htmlFor="city-filter">
            Şehir
          </label>
          <input
            id="city-filter"
            type="text"
            className="pazar-form-input"
            placeholder="Şehir ara..."
            value={filters.city || ""}
            onChange={(e) => onFiltersChange({ city: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
};

// Enhanced main filters component with design system
const OrderFilters = ({
  filters = {},
  onFiltersChange,
  recordCount = 20,
  onRecordCountChange,
  errors = {},
  onClearFilters,
  searchInputRef,
  className = "",
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFiltersChange = useCallback(
    (newFilters) => {
      onFiltersChange({ ...filters, ...newFilters });
    },
    [filters, onFiltersChange]
  );

  const handleClearFilters = useCallback(() => {
    onClearFilters?.();
    setShowAdvanced(false);
  }, [onClearFilters]);

  const hasActiveFilters = React.useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      if (key === "status" || key === "platform") {
        return value && value !== "all";
      }
      return value && value !== "";
    });
  }, [filters]);

  const activeFilterCount = React.useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      if (key === "status" || key === "platform") {
        return value && value !== "all";
      }
      return value && value !== "";
    }).length;
  }, [filters]);

  return (
    <div className={`pazar-card ${className}`}>
      <div className="pazar-card-content">
        {/* Basic Filters */}
        <BasicFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          recordCount={recordCount}
          onRecordCountChange={onRecordCountChange}
          searchInputRef={searchInputRef}
        />

        {/* Enhanced Filter Actions */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-surface-300">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="pazar-btn pazar-btn-outline"
            >
              <Filter className="h-4 w-4 mr-2 icon-contrast-info" />
              <span>Gelişmiş Filtreler</span>
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4 ml-2 icon-contrast-secondary" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-2 icon-contrast-secondary" />
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="pazar-btn pazar-btn-danger"
              >
                <X className="h-4 w-4 mr-2 icon-contrast-danger" />
                <span>Filtreleri Temizle</span>
                {activeFilterCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-1 pazar-text-xs font-medium bg-danger-100 text-danger-800 rounded-full min-w-[20px] h-5">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-3 py-1 bg-primary-100 text-primary-800 pazar-text-sm font-medium rounded-full">
                {activeFilterCount} filtre aktif
              </span>
            </div>
          )}
        </div>

        {/* Enhanced Filter Summary */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t border-surface-300">
            <FilterSummary
              filters={filters}
              onRemoveFilter={(key) => {
                const newFilters = { ...filters };
                if (key === "status" || key === "platform") {
                  newFilters[key] = "all";
                } else {
                  delete newFilters[key];
                }
                onFiltersChange(newFilters);
              }}
            />
          </div>
        )}

        {/* Enhanced Advanced Filters */}
        {showAdvanced && (
          <div className="mt-6 pt-6 border-t border-surface-300 animate-slide-up">
            <div className="section-header mb-4">
              <h3 className="section-title">Gelişmiş Filtreler</h3>
              <p className="section-subtitle">
                Daha detaylı arama kriterleri ile siparişlerinizi filtreleyin
              </p>
            </div>
            <AdvancedFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              errors={errors}
            />
          </div>
        )}

        {/* Enhanced Filter Errors */}
        {Object.keys(errors).length > 0 && (
          <div className="mt-4 p-4 bg-danger-50 border border-danger-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-danger-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="pazar-text-sm font-medium text-danger-800">
                  Filtre Hataları
                </h3>
                <div className="mt-2 pazar-text-sm text-danger-700">
                  <ul className="list-disc list-inside space-y-1">
                    {Object.values(errors)
                      .flat()
                      .map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced filter summary component with design system patterns
const FilterSummary = ({ filters = {}, onRemoveFilter, className = "" }) => {
  const activeFilters = React.useMemo(() => {
    const active = [];

    if (filters.status && filters.status !== "all") {
      const statusConfig = OrderRegistry.getStatusConfig(filters.status);
      active.push({
        key: "status",
        label: `Durum: ${statusConfig.label}`,
        value: filters.status,
      });
    }

    if (filters.platform && filters.platform !== "all") {
      const platformConfig = OrderRegistry.getPlatformConfig(filters.platform);
      active.push({
        key: "platform",
        label: `Platform: ${platformConfig.label}`,
        value: filters.platform,
      });
    }

    if (filters.search) {
      active.push({
        key: "search",
        label: `Arama: "${filters.search}"`,
        value: filters.search,
      });
    }

    if (filters.dateFrom || filters.dateTo) {
      const dateLabel =
        filters.dateFrom && filters.dateTo
          ? `${filters.dateFrom} - ${filters.dateTo}`
          : filters.dateFrom
          ? `${filters.dateFrom} sonrası`
          : `${filters.dateTo} öncesi`;

      active.push({
        key: "date",
        label: `Tarih: ${dateLabel}`,
        value: "date",
      });
    }

    if (filters.priceMin || filters.priceMax) {
      const priceLabel =
        filters.priceMin && filters.priceMax
          ? `${filters.priceMin}₺ - ${filters.priceMax}₺`
          : filters.priceMin
          ? `${filters.priceMin}₺ üzeri`
          : `${filters.priceMax}₺ altı`;

      active.push({
        key: "price",
        label: `Fiyat: ${priceLabel}`,
        value: "price",
      });
    }

    return active;
  }, [filters]);

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className="pazar-text-sm font-medium">Aktif Filtreler:</h4>
      <div className="flex flex-wrap gap-2">
        {activeFilters.map((filter) => (
          <div
            key={filter.key}
            className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-800 rounded-full pazar-text-sm font-medium border border-primary-200 hover:bg-primary-100 transition-colors"
          >
            <span>{filter.label}</span>
            {onRemoveFilter && (
              <button
                onClick={() => onRemoveFilter(filter.key)}
                className="flex-shrink-0 ml-1 p-0.5 hover:bg-primary-200 rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-primary-500"
                aria-label={`${filter.label} filtresini kaldır`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderFilters;
export { OrderFilters, FilterSummary, BasicFilters, AdvancedFilters };
