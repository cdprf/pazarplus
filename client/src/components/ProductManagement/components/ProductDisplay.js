import React, { useState, useCallback } from "react";
import { List, Grid3X3, Package } from "lucide-react";

// Import modular components
import SimpleProductGrid from "./SimpleProductGrid";
import SimpleProductTable from "./SimpleProductTable";

// Import design system components
import { Button } from "../../ui";
import TableSettingsModal from "./TableSettingsModal";

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
  showPublishedPlatforms = false,
  onCreateVariants,
  onBulkMarkAsMain,
  onFieldMapping,
  className = "",
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
    // You can save to localStorage or send to backend here
    localStorage.setItem("productTableSettings", JSON.stringify(newSettings));
  }, []);

  // Load saved table settings on component mount
  React.useEffect(() => {
    const savedSettings = localStorage.getItem("productTableSettings");
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setTableSettings(parsedSettings);
      } catch (error) {
        console.error("Error loading table settings:", error);
      }
    }
  }, []);

  if (loading) {
    return (
      <div className="skeleton-table">
        <div className="skeleton-table-header">
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-text"></div>
        </div>
        <div className="skeleton-table-body">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-table-row">
              <div className="skeleton skeleton-text"></div>
              <div className="skeleton skeleton-text"></div>
              <div className="skeleton skeleton-text"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`page-content ${className}`}>
      <div className="data-table">
        {/* Toolbar */}
        <div className="table-toolbar">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="section-title">Ürünler</h2>

              {/* Enhanced Mode Actions */}
              {enhancedMode && (
                <div className="flex items-center space-x-2">
                  <Button onClick={onAddProduct} variant="primary" size="sm">
                    Add Product
                  </Button>
                  <Button
                    onClick={onImportProducts}
                    variant="outline"
                    size="sm"
                  >
                    Import Products
                  </Button>
                  {selectedProducts.length > 0 && (
                    <>
                      <Button
                        onClick={onCreateVariants}
                        variant="outline"
                        size="sm"
                      >
                        Create Variants
                      </Button>
                      <Button
                        onClick={onBulkMarkAsMain}
                        variant="outline"
                        size="sm"
                      >
                        Mark as Main
                      </Button>
                      <Button
                        onClick={() =>
                          onFieldMapping("generic", "trendyol", {})
                        }
                        variant="outline"
                        size="sm"
                      >
                        Field Mapping
                      </Button>
                    </>
                  )}
                </div>
              )}

              {selectedProducts.length > 0 && (
                <div className="table-actions">
                  <div className="bulk-actions">
                    <span className="bulk-count">
                      {selectedProducts.length} selected
                    </span>
                    <Button onClick={onBulkEdit} variant="primary" size="sm">
                      Edit
                    </Button>
                    <Button onClick={onBulkDelete} variant="danger" size="sm">
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <div className="tabs">
                <button
                  className={`tab ${viewMode === "table" ? "tab-active" : ""}`}
                  onClick={() => onViewModeChange?.("table")}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  className={`tab ${viewMode === "grid" ? "tab-active" : ""}`}
                  onClick={() => onViewModeChange?.("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
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
                onClick={() => onTabChange(key)}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)} ({count})
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
            <h3 className="empty-state-title">No products found</h3>
            <p className="empty-state-description">
              Get started by adding your first product
            </p>
            <div className="empty-state-actions">
              <Button onClick={onAddProduct} variant="primary">
                {enhancedMode ? "Add New Product" : "Add Product"}
              </Button>
              {enhancedMode && (
                <Button onClick={onImportProducts} variant="outline">
                  Import Products
                </Button>
              )}
            </div>
          </div>
        ) : products.length === 0 && Object.keys(filters).length > 0 ? (
          <div className="empty-state empty-state-search">
            <div className="empty-state-icon">
              <Package className="h-16 w-16" />
            </div>
            <h3 className="empty-state-title">No results found</h3>
            <p className="empty-state-description">
              Try adjusting your search or filter criteria
            </p>
            <div className="empty-state-actions">
              <Button onClick={onClearFilters} variant="ghost">
                Clear filters
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
                  onDuplicate={(product) =>
                    console.log("Duplicate product:", product)
                  }
                  onExportProduct={(product) =>
                    console.log("Export product:", product)
                  }
                  onViewAnalytics={(product) =>
                    console.log("View analytics:", product)
                  }
                  onCopyLink={(product) => console.log("Copy link:", product)}
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
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-700">
                    <span>
                      Sayfa {currentPage} / {totalPages}
                    </span>
                    <span className="ml-4 text-gray-500 dark:text-gray-400">
                      Toplam {totalItems} kayıt
                    </span>
                    <span className="ml-4 text-gray-400">
                      (Sayfa başına {itemsPerPage} kayıt)
                    </span>
                  </div>
                  {products.length > 0 && (
                    <div className="flex items-center space-x-1">
                      {/* First page button */}
                      <Button
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                        size="sm"
                        variant="outline"
                        className="hidden sm:inline-flex"
                      >
                        İlk
                      </Button>

                      {/* Previous page button */}
                      <Button
                        onClick={() =>
                          onPageChange(Math.max(currentPage - 1, 1))
                        }
                        disabled={currentPage === 1}
                        size="sm"
                        variant="outline"
                      >
                        Önceki
                      </Button>

                      {/* Page numbers - always show at least current page */}
                      <div className="hidden sm:flex items-center space-x-1">
                        {Array.from(
                          { length: Math.max(1, Math.min(5, totalPages)) },
                          (_, i) => {
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

                            return (
                              <Button
                                key={pageNumber}
                                onClick={() => onPageChange(pageNumber)}
                                size="sm"
                                variant={
                                  currentPage === pageNumber
                                    ? "primary"
                                    : "outline"
                                }
                                className="min-w-[40px]"
                              >
                                {pageNumber}
                              </Button>
                            );
                          }
                        )}

                        {/* Show ellipsis and last page if needed */}
                        {totalPages > 5 && currentPage < totalPages - 2 && (
                          <>
                            {currentPage < totalPages - 3 && (
                              <span className="px-2 text-gray-500 dark:text-gray-400">
                                ...
                              </span>
                            )}
                            <Button
                              onClick={() => onPageChange(totalPages)}
                              size="sm"
                              variant="outline"
                              className="min-w-[40px]"
                            >
                              {totalPages}
                            </Button>
                          </>
                        )}
                      </div>

                      {/* Next page button */}
                      <Button
                        onClick={() =>
                          onPageChange(Math.min(currentPage + 1, totalPages))
                        }
                        disabled={currentPage === totalPages}
                        size="sm"
                        variant="outline"
                      >
                        Sonraki
                      </Button>

                      {/* Last page button */}
                      <Button
                        onClick={() => onPageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        size="sm"
                        variant="outline"
                        className="hidden sm:inline-flex"
                      >
                        Son
                      </Button>
                    </div>
                  )}
                </div>

                {/* Mobile pagination controls */}
                <div className="sm:hidden mt-3 flex justify-between items-center">
                  <select
                    value={currentPage}
                    onChange={(e) => onPageChange(parseInt(e.target.value))}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  >
                    {Array.from({ length: totalPages }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Sayfa {i + 1}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {totalPages} sayfadan {currentPage}
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
