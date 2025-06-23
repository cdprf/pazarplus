import React, { useState } from "react";
import { Card, CardContent } from "../../ui/Card";
import Button from "../../ui/Button";
import Badge from "../../ui/Badge";
import ModernProductHeader from "./ModernProductHeader";
import ModernFilterBar from "./ModernFilterBar";
import ModernProductTable from "./ModernProductTable";
import ModernProductGrid from "./ModernProductGrid";
import ProductAnalytics from "./ProductAnalytics";
import BulkEditModal from "./BulkEditModal";
import MobileFilterDrawer from "./MobileFilterDrawer";
import { STATUS_TAB_CONFIG } from "../utils/constants";
import "../styles/modern.css";
import "../styles/modern-tables.css";
import "../styles/modern-forms.css";
import "../styles/modern-responsive.css";

/**
 * ModernProductManagement Component
 * A complete redesign of the product management interface
 */
const ModernProductManagement = ({
  products = [],
  loading = false,
  selectedProducts = [],
  onSelectProduct,
  onSelectAll,
  onView,
  onEdit,
  onDelete,
  onImageClick,
  onProductNameClick,
  onAddProduct,
  onSync,
  onImport,
  onExport,
  onBulkEdit,
  onBulkDelete,
  onBulkStatusChange,
  onInlineEdit,
  // Search and filters
  searchValue = "",
  onSearchChange,
  filters = {},
  onFilterChange,
  onClearFilters,
  // Sorting and pagination
  sortField = "updatedAt",
  sortOrder = "desc",
  onSort,
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  onPageChange,
  // View mode
  viewMode = "table",
  onViewModeChange,
  // Status counts
  statusCounts = {},
  // Loading states
  syncLoading = false,
  importLoading = false,
  exportLoading = false,
}) => {
  // Local state
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Count active filters
  const activeFilterCount =
    Object.values(filters).filter((value) => value && value !== "").length +
    (filters.platform !== "all" ? 1 : 0);

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);

    // Apply filters based on tab
    let newFilters = { ...filters };

    // Clear previous status filters
    delete newFilters.status;
    delete newFilters.stockStatus;
    delete newFilters.maxStock;

    // Apply new filter based on tab
    switch (tab) {
      case "active":
        newFilters.status = "active";
        break;
      case "inactive":
        newFilters.status = "inactive";
        break;
      case "draft":
        newFilters.status = "draft";
        break;
      case "out_of_stock":
        newFilters.maxStock = "0";
        break;
      case "low_stock":
        newFilters.stockStatus = "low_stock";
        break;
      default:
        // "all" tab doesn't add any filters
        break;
    }

    onFilterChange(newFilters);
  };

  return (
    <div className="w-full">
      <div className="space-y-4">
        {/* Modern Header */}
        <div className="px-4 sm:px-6 lg:px-8">
          <ModernProductHeader
            title="Ürün Yönetimi"
            totalItems={totalItems}
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            onAddProduct={onAddProduct}
            onSync={onSync}
            onExport={onExport}
            onImport={onImport}
            onToggleAnalytics={() => setShowAnalytics(!showAnalytics)}
            onToggleFilters={() => setShowFilters(!showFilters)}
            onViewModeChange={onViewModeChange}
            viewMode={viewMode}
            filtersActive={activeFilterCount > 0}
            syncLoading={syncLoading}
            importLoading={importLoading}
            exportLoading={exportLoading}
          />
        </div>

        {/* Status Tabs */}
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex overflow-x-auto pb-1 hide-scrollbar">
              <div className="flex space-x-2 min-w-full sm:min-w-0">
                {Object.entries(STATUS_TAB_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    className={`px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-200 min-w-[100px] ${
                      activeTab === key
                        ? "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
                    }`}
                    onClick={() => handleTabChange(key)}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <span>{config.label}</span>
                      {statusCounts[key] > 0 && (
                        <Badge
                          variant={activeTab === key ? "primary" : "secondary"}
                          className="text-xs px-2 py-0.5"
                        >
                          {statusCounts[key]}
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-4 sm:px-6 lg:px-8">
          <ModernFilterBar
            filters={filters}
            onFiltersChange={onFilterChange}
            platformFilter={filters.platform || "all"}
            onPlatformFilterChange={(platform) => {
              onFilterChange({
                ...filters,
                platform,
              });
            }}
            sortValue={`${sortField}-${sortOrder}`}
            onSortChange={(value) => {
              const [field] = value.split("-");
              onSort(field);
            }}
            onClearFilters={onClearFilters}
            isExpanded={showFilters}
          />
        </div>

        {/* Bulk Actions */}
        <div className="px-4 sm:px-6 lg:px-8">
          {selectedProducts.length > 0 && (
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <Badge variant="primary" className="text-sm px-3 py-1">
                      {selectedProducts.length}
                    </Badge>
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      ürün seçildi
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBulkEditModal(true)}
                      className="min-w-[80px]"
                    >
                      Düzenle
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onBulkStatusChange("active")}
                      className="min-w-[80px]"
                    >
                      Aktif Yap
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onBulkStatusChange("inactive")}
                      className="min-w-[80px]"
                    >
                      Pasif Yap
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={onBulkDelete}
                      className="min-w-[60px]"
                    >
                      Sil
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Products Display */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="p-8 sm:p-12 text-center">
              <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Ürün bulunamadı
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
                {activeFilterCount > 0
                  ? "Arama kriterlerinize uygun ürün bulunamadı. Filtreleri değiştirerek tekrar deneyin."
                  : "Henüz hiç ürün eklenmemiş. Yeni ürün ekleyerek başlayabilirsiniz."}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {activeFilterCount > 0 ? (
                  <Button variant="outline" onClick={onClearFilters}>
                    Filtreleri Temizle
                  </Button>
                ) : (
                  <Button variant="primary" onClick={onAddProduct}>
                    Yeni Ürün Ekle
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : viewMode === "table" ? (
          <ModernProductTable
            products={products}
            selectedProducts={selectedProducts}
            onSelectProduct={onSelectProduct}
            onSelectAll={onSelectAll}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            onImageClick={onImageClick}
            onProductNameClick={onProductNameClick}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={onSort}
            onInlineEdit={onInlineEdit}
          />
        ) : (
          <ModernProductGrid
            products={products}
            selectedProducts={selectedProducts}
            onSelectProduct={onSelectProduct}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            onImageClick={onImageClick}
            onProductNameClick={onProductNameClick}
            onInlineEdit={onInlineEdit}
          />
        )}

        {/* Pagination */}
        <div className="px-4 sm:px-6 lg:px-8">
          {products.length > 0 && totalPages > 1 && (
            <Card className="border-gray-200 dark:border-gray-700">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400 order-2 sm:order-1">
                    <span className="font-medium">{totalItems}</span> ürün
                    toplam
                  </div>
                  <nav
                    className="flex items-center justify-center space-x-1 order-1 sm:order-2"
                    aria-label="Pagination"
                  >
                    {/* Previous button */}
                    <button
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        currentPage === 1
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                      onClick={() =>
                        currentPage > 1 && onPageChange(currentPage - 1)
                      }
                      disabled={currentPage === 1}
                    >
                      Önceki
                    </button>

                    {/* Page numbers */}
                    <div className="flex space-x-1">
                      {Array.from(
                        { length: Math.min(totalPages, 5) },
                        (_, i) => {
                          let page;
                          if (totalPages <= 5) {
                            page = i + 1;
                          } else if (currentPage <= 3) {
                            page = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            page = totalPages - 4 + i;
                          } else {
                            page = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={page}
                              className={`px-3 py-2 text-sm rounded-lg transition-colors min-w-[40px] ${
                                currentPage === page
                                  ? "bg-blue-600 text-white shadow-sm"
                                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600"
                              }`}
                              onClick={() => onPageChange(page)}
                            >
                              {page}
                            </button>
                          );
                        }
                      )}
                    </div>

                    {/* Next button */}
                    <button
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        currentPage === totalPages
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                      onClick={() =>
                        currentPage < totalPages &&
                        onPageChange(currentPage + 1)
                      }
                      disabled={currentPage === totalPages}
                    >
                      Sonraki
                    </button>
                  </nav>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Modals and Drawers */}
        <ProductAnalytics
          isOpen={showAnalytics}
          onClose={() => setShowAnalytics(false)}
          timeRange="week"
        />

        <BulkEditModal
          isOpen={showBulkEditModal}
          onClose={() => setShowBulkEditModal(false)}
          selectedProducts={selectedProducts}
          products={products}
          onSave={onBulkEdit}
        />

        <MobileFilterDrawer
          isOpen={showMobileFilters}
          onClose={() => setShowMobileFilters(false)}
          filters={filters}
          onFiltersChange={onFilterChange}
          onClearFilters={onClearFilters}
          platformFilter={filters.platform || "all"}
          onPlatformFilterChange={(platform) => {
            onFilterChange({
              ...filters,
              platform,
            });
          }}
        />
      </div>
    </div>
  );
};

export default ModernProductManagement;
