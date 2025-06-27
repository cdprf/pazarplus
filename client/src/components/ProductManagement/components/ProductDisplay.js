import React, { useState, useCallback } from "react";
import { List, Grid3X3, Package, Edit, Settings } from "lucide-react";

// Import modular components
import SimpleProductGrid from "./SimpleProductGrid";
import SimpleProductTable from "./SimpleProductTable";
import LoadingState from "./LoadingState";

// Import design system components
import { Button } from "../../ui";
import TableSettingsModal from "./TableSettingsModal";

// Localization object for consistent Turkish translations
const TRANSLATIONS = {
  products: "Ürünler",
  addProduct: "Ürün Ekle",
  importProducts: "Ürün İçe Aktar",
  createVariants: "Varyant Oluştur",
  markAsMain: "Ana Olarak İşaretle",
  fieldMapping: "Alan Eşleştirme",
  bulkEdit: "Toplu Düzenle",
  noProducts: "Ürün bulunamadı",
  getStarted: "İlk ürününüzü ekleyerek başlayın",
  addNewProduct: "Yeni Ürün Ekle",
  noResults: "Sonuç bulunamadı",
  adjustFilters: "Arama veya filtre kriterlerinizi ayarlamayı deneyin",
  clearFilters: "Filtreleri Temizle",
  page: "Sayfa",
  totalRecords: "Toplam {count} kayıt",
  recordsPerPage: "Sayfa başına {count} kayıt",
  first: "İlk",
  previous: "Önceki",
  next: "Sonraki",
  last: "Son",
  ofPages: "{total} sayfadan {current}",
  // Status translations
  all: "Tümü",
  active: "Aktif",
  pending: "Beklemede",
  inactive: "Pasif",
  outOfStock: "Stokta Yok",
};

// Helper function for text interpolation
const interpolate = (text, params) => {
  return text.replace(/{(\w+)}/g, (match, key) => params[key] || match);
};

// Main Product Display Component
const ProductDisplay = ({
  products = [],
  loading = false,
  viewMode = "table",
  selectedProducts = [],
  onSelectProduct,
  onSelectAll,
  onView,
  onEdit,
  onDelete,
  onImageClick,
  onProductNameClick,
  onCreateVariant,
  onAddProduct,
  onImportProducts,
  onSync,
  // Sorting
  sortField,
  sortOrder,
  onSort,
  // Pagination
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 20,
  onPageChange,
  onPageSizeChange,
  // Trendyol-like features
  statusCounts = { all: 0, active: 0, pending: 0, inactive: 0, outOfStock: 0 },
  filters = {},
  onFilterChange,
  onClearFilters,
  activeTab = "all",
  onTabChange,
  categories = [],
  brands = [],
  onBulkEdit,
  onBulkDelete,
  onBulkStatusChange,
  onBulkExport,
  onInlineEdit,
  onViewModeChange,
  // Variant management props
  enableVariantManagement = true,
  onCreateVariantGroup,
  onUpdateVariantGroup,
  onDeleteVariantGroup,
  onAcceptVariantSuggestion,
  onRejectVariantSuggestion,
  // Enhanced product management props
  enhancedMode = false,
  showVariantCount = false,
  // Variant Detection props
  onRemoveVariantStatus,
  onClassifyVariantStatus,
  onBatchVariantDetection,
  showPublishedPlatforms = false,
  onCreateVariants,
  onBulkMarkAsMain,
  onFieldMapping,
  className = "",
  // Error handling props
  error = null,
  onRetry,
}) => {
  const [showTableSettings, setShowTableSettings] = useState(false);

  const [tableSettings, setTableSettings] = useState({
    columns: [
      {
        id: "checkbox",
        label: "Seçim",
        visible: true,
        sortable: false,
        sticky: true,
      },
      {
        id: "product",
        label: "Ürün",
        visible: true,
        sortable: true,
        sticky: true,
      },
      { id: "variant", label: "Varyant", visible: true, sortable: false },
      { id: "productType", label: "Tür", visible: true, sortable: false },
      { id: "platform", label: "Platform", visible: true, sortable: true },
      { id: "status", label: "Durum", visible: true, sortable: true },
      { id: "completion", label: "Doluluk", visible: true, sortable: false },
      { id: "sku", label: "SKU", visible: true, sortable: true },
      { id: "commission", label: "Komisyon", visible: false, sortable: false },
      { id: "price", label: "Fiyat", visible: true, sortable: true },
      { id: "stock", label: "Stok", visible: true, sortable: true },
      {
        id: "buyboxPrice",
        label: "Buybox Fiyat",
        visible: false,
        sortable: false,
      },
      { id: "buybox", label: "Buybox", visible: false, sortable: false },
      {
        id: "deliveryTime",
        label: "Teslimat",
        visible: false,
        sortable: false,
      },
      { id: "category", label: "Kategori", visible: true, sortable: true },
      { id: "brand", label: "Marka", visible: false, sortable: false },
      {
        id: "actions",
        label: "İşlemler",
        visible: true,
        sortable: false,
        sticky: true,
      },
    ],
    rowHeight: "compact",
    showImages: true,
    showVariants: true,
    alternateRowColors: true,
    stickyHeaders: true,
    defaultSort: { field: "name", order: "asc" },
  });

  const handleSaveTableSettings = useCallback((newSettings) => {
    setTableSettings(newSettings);
    // Save to localStorage with error handling
    try {
      localStorage.setItem("productTableSettings", JSON.stringify(newSettings));
    } catch (error) {
      console.error("Error saving table settings:", error);
      // Could show a toast notification here
    }
  }, []);

  // Load saved table settings on component mount
  React.useEffect(() => {
    try {
      const savedSettings = localStorage.getItem("productTableSettings");
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setTableSettings(parsedSettings);
      }
    } catch (error) {
      console.error("Error loading table settings:", error);
      // Fall back to default settings - already set in state
    }
  }, []);

  // Add loading states and memoize expensive calculations
  const [isPageChanging, setIsPageChanging] = useState(false);

  // Handle page change with loading state
  const handlePageChange = useCallback(
    async (newPage) => {
      if (newPage === currentPage || isPageChanging) return;

      setIsPageChanging(true);
      try {
        await onPageChange?.(newPage);
      } catch (error) {
        console.error("Error changing page:", error);
      } finally {
        // Add small delay to prevent flickering
        setTimeout(() => setIsPageChanging(false), 100);
      }
    },
    [currentPage, isPageChanging, onPageChange]
  );

  // Add keyboard navigation for pagination
  const handleKeyDown = useCallback(
    (event) => {
      if (event.target.closest(".pagination-container")) {
        switch (event.key) {
          case "ArrowLeft":
            if (currentPage > 1) {
              event.preventDefault();
              handlePageChange(currentPage - 1);
            }
            break;
          case "ArrowRight":
            if (currentPage < totalPages) {
              event.preventDefault();
              handlePageChange(currentPage + 1);
            }
            break;
          case "Home":
            if (currentPage !== 1) {
              event.preventDefault();
              handlePageChange(1);
            }
            break;
          case "End":
            if (currentPage !== totalPages) {
              event.preventDefault();
              handlePageChange(totalPages);
            }
            break;
          default:
            // No action needed for other keys
            break;
        }
      }
    },
    [currentPage, totalPages, handlePageChange]
  );

  // Add keyboard event listener
  React.useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Memoize pagination range calculation for performance
  const paginationRange = React.useMemo(() => {
    const range = [];
    const maxPages = Math.max(1, Math.min(5, totalPages));

    for (let i = 0; i < maxPages; i++) {
      let pageNumber;
      if (totalPages <= 5) {
        pageNumber = i + 1;
      } else if (currentPage <= 3) {
        pageNumber = i + 1;
      } else if (currentPage >= totalPages - 2) {
        pageNumber = totalPages - 4 + i;
      } else {
        pageNumber = currentPage - 2 + i;
      }
      range.push(pageNumber);
    }
    return range;
  }, [currentPage, totalPages]);

  if (loading) {
    return <LoadingState type="table" message="Ürünler yükleniyor" />;
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Package className="h-16 w-16 text-red-500" />
        </div>
        <h3 className="empty-state-title text-red-700">Bir hata oluştu</h3>
        <p className="empty-state-description">
          {error.message || "Ürünler yüklenirken bir hata oluştu"}
        </p>
        {onRetry && (
          <div className="empty-state-actions">
            <Button
              onClick={onRetry}
              variant="primary"
              aria-label="Tekrar dene"
            >
              Tekrar Dene
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`page-content ${className}`}>
      <div className="data-table">
        {/* Toolbar */}
        <div className="table-toolbar">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
              <h2 className="section-title">{TRANSLATIONS.products}</h2>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => onAddProduct?.()}
                  variant="primary"
                  size="sm"
                  aria-label={TRANSLATIONS.addProduct}
                >
                  {TRANSLATIONS.addProduct}
                </Button>
                <Button
                  onClick={() => onImportProducts?.()}
                  variant="outline"
                  size="sm"
                  aria-label={TRANSLATIONS.importProducts}
                >
                  {TRANSLATIONS.importProducts}
                </Button>
                {selectedProducts.length > 0 && (
                  <>
                    <Button
                      onClick={() => onCreateVariants?.()}
                      variant="outline"
                      size="sm"
                      aria-label={`${
                        selectedProducts.length
                      } ürün için ${TRANSLATIONS.createVariants.toLowerCase()}`}
                    >
                      {TRANSLATIONS.createVariants}
                    </Button>
                    <Button
                      onClick={() => onBulkMarkAsMain?.()}
                      variant="outline"
                      size="sm"
                      aria-label={`${
                        selectedProducts.length
                      } ürünü ${TRANSLATIONS.markAsMain.toLowerCase()}`}
                    >
                      {TRANSLATIONS.markAsMain}
                    </Button>
                    <Button
                      onClick={() =>
                        onFieldMapping?.("generic", "trendyol", {})
                      }
                      variant="outline"
                      size="sm"
                      aria-label={TRANSLATIONS.fieldMapping}
                    >
                      {TRANSLATIONS.fieldMapping}
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end space-x-2">
              {selectedProducts.length > 0 && (
                <Button
                  onClick={() => onBulkEdit?.(selectedProducts)}
                  variant="primary"
                  size="sm"
                  className="flex items-center space-x-2"
                  aria-label={`${
                    selectedProducts.length
                  } ürünü ${TRANSLATIONS.bulkEdit.toLowerCase()}`}
                >
                  <Edit className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {TRANSLATIONS.bulkEdit}
                  </span>
                  <span>({selectedProducts.length})</span>
                </Button>
              )}
              <div className="tabs">
                <button
                  className={`tab ${viewMode === "table" ? "tab-active" : ""}`}
                  onClick={() => onViewModeChange?.("table")}
                  aria-label="Tablo görünümü"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  className={`tab ${viewMode === "grid" ? "tab-active" : ""}`}
                  onClick={() => onViewModeChange?.("grid")}
                  aria-label="Izgara görünümü"
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                {viewMode === "table" && (
                  <button
                    className="tab"
                    onClick={() => setShowTableSettings(true)}
                    aria-label="Tablo ayarları"
                    title="Tablo ayarları"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-3">
          <div className="tabs">
            {Object.entries(statusCounts).map(([key, count]) => (
              <button
                key={key}
                className={`tab ${activeTab === key ? "tab-active" : ""}`}
                onClick={() => onTabChange?.(key)}
                aria-label={`${
                  TRANSLATIONS[key] || key
                } durumundaki ürünler (${count})`}
              >
                {TRANSLATIONS[key] ||
                  key.charAt(0).toUpperCase() + key.slice(1)}{" "}
                ({count})
              </button>
            ))}
          </div>
        </div>

        {/* Products Display */}
        {products.length === 0 && Object.keys(filters).length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Package className="h-16 w-16" />
            </div>
            <h3 className="empty-state-title">{TRANSLATIONS.noProducts}</h3>
            <p className="empty-state-description">{TRANSLATIONS.getStarted}</p>
            <div className="empty-state-actions">
              <Button
                onClick={() => onAddProduct?.()}
                variant="primary"
                aria-label={TRANSLATIONS.addProduct}
              >
                {enhancedMode
                  ? TRANSLATIONS.addNewProduct
                  : TRANSLATIONS.addProduct}
              </Button>
              {enhancedMode && (
                <Button
                  onClick={() => onImportProducts?.()}
                  variant="outline"
                  aria-label={TRANSLATIONS.importProducts}
                >
                  {TRANSLATIONS.importProducts}
                </Button>
              )}
            </div>
          </div>
        ) : products.length === 0 && Object.keys(filters).length > 0 ? (
          <div className="empty-state empty-state-search">
            <div className="empty-state-icon">
              <Package className="h-16 w-16" />
            </div>
            <h3 className="empty-state-title">{TRANSLATIONS.noResults}</h3>
            <p className="empty-state-description">
              {TRANSLATIONS.adjustFilters}
            </p>
            <div className="empty-state-actions">
              <Button
                onClick={() => onClearFilters?.()}
                variant="ghost"
                aria-label={TRANSLATIONS.clearFilters}
              >
                {TRANSLATIONS.clearFilters}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="table-container">
              {viewMode === "table" ? (
                <SimpleProductTable
                  products={products}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onImageClick={onImageClick}
                  selectedProducts={selectedProducts}
                  onSelectProduct={onSelectProduct}
                  onSelectAll={onSelectAll}
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={onSort}
                  onDuplicate={(product) => {
                    // TODO: Implement product duplication
                    console.warn(
                      "Product duplication not implemented yet",
                      product
                    );
                  }}
                  onExportProduct={(product) => {
                    // TODO: Implement product export
                    console.warn("Product export not implemented yet", product);
                  }}
                  onViewAnalytics={(product) => {
                    // TODO: Implement analytics view
                    console.warn("Analytics view not implemented yet", product);
                  }}
                  onCopyLink={(product) => {
                    // TODO: Implement link copying
                    console.warn("Link copying not implemented yet", product);
                  }}
                  // Variant Detection props
                  onRemoveVariantStatus={onRemoveVariantStatus}
                  onClassifyVariantStatus={onClassifyVariantStatus}
                  onBatchVariantDetection={onBatchVariantDetection}
                />
              ) : (
                <div className="p-6">
                  <SimpleProductGrid
                    products={products}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onImageClick={onImageClick}
                    selectedProducts={selectedProducts}
                    onSelectProduct={onSelectProduct}
                  />
                </div>
              )}
            </div>

            {/* Enhanced Pagination - Orders Page Style */}
            {products.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 pagination-container">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-700">
                    <span>
                      {TRANSLATIONS.page} {currentPage} / {totalPages}
                    </span>
                    <span className="ml-4 text-gray-500 dark:text-gray-400">
                      {interpolate(TRANSLATIONS.totalRecords, {
                        count: totalItems,
                      })}
                    </span>
                    <span className="ml-4 text-gray-400">
                      (
                      {interpolate(TRANSLATIONS.recordsPerPage, {
                        count: itemsPerPage,
                      })}
                      )
                    </span>
                  </div>
                  {products.length > 0 && (
                    <div className="flex items-center space-x-1">
                      {/* First page button */}
                      <Button
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                        size="sm"
                        variant="outline"
                        className="hidden sm:inline-flex"
                        aria-label="İlk sayfaya git"
                      >
                        {TRANSLATIONS.first}
                      </Button>

                      {/* Previous page button */}
                      <Button
                        onClick={() =>
                          handlePageChange(Math.max(currentPage - 1, 1))
                        }
                        disabled={currentPage === 1}
                        size="sm"
                        variant="outline"
                        aria-label="Önceki sayfaya git"
                      >
                        {TRANSLATIONS.previous}
                      </Button>

                      {/* Page numbers - always show at least current page */}
                      <div className="hidden sm:flex items-center space-x-1">
                        {paginationRange.map((pageNumber) => (
                          <Button
                            key={pageNumber}
                            onClick={() => handlePageChange(pageNumber)}
                            size="sm"
                            variant={
                              currentPage === pageNumber ? "primary" : "outline"
                            }
                            className="min-w-[40px]"
                            aria-label={`${pageNumber}. sayfaya git`}
                            aria-current={
                              currentPage === pageNumber ? "page" : undefined
                            }
                          >
                            {pageNumber}
                          </Button>
                        ))}

                        {/* Show ellipsis and last page if needed */}
                        {totalPages > 5 && currentPage < totalPages - 2 && (
                          <>
                            {currentPage < totalPages - 3 && (
                              <span className="px-2 text-gray-500 dark:text-gray-400">
                                ...
                              </span>
                            )}
                            <Button
                              onClick={() => handlePageChange(totalPages)}
                              size="sm"
                              variant="outline"
                              className="min-w-[40px]"
                              aria-label={`Son sayfaya git (${totalPages})`}
                            >
                              {totalPages}
                            </Button>
                          </>
                        )}
                      </div>

                      {/* Next page button */}
                      <Button
                        onClick={() =>
                          handlePageChange(
                            Math.min(currentPage + 1, totalPages)
                          )
                        }
                        disabled={currentPage === totalPages}
                        size="sm"
                        variant="outline"
                        aria-label="Sonraki sayfaya git"
                      >
                        {TRANSLATIONS.next}
                      </Button>

                      {/* Last page button */}
                      <Button
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        size="sm"
                        variant="outline"
                        className="hidden sm:inline-flex"
                        aria-label="Son sayfaya git"
                      >
                        {TRANSLATIONS.last}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Mobile pagination controls */}
                <div className="sm:hidden mt-3 flex justify-between items-center">
                  <select
                    value={currentPage}
                    onChange={(e) => handlePageChange(parseInt(e.target.value))}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                    aria-label="Sayfa seçin"
                  >
                    {Array.from({ length: totalPages }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {TRANSLATIONS.page} {i + 1}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {interpolate(TRANSLATIONS.ofPages, {
                      total: totalPages,
                      current: currentPage,
                    })}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Table Settings Modal */}
      <TableSettingsModal
        isOpen={showTableSettings}
        onClose={() => setShowTableSettings(false)}
        settings={tableSettings}
        onSave={handleSaveTableSettings}
      />
    </div>
  );
};

export default ProductDisplay;
