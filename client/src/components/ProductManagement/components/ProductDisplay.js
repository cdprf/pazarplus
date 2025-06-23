import React, { useState, useCallback } from "react";
import { List, Grid3X3, Filter, Settings, Package } from "lucide-react";

// Import modular components
import {
  ProductStatusTabs,
  AdvancedFilterPanel,
  BulkOperations,
  EmptyState,
  LoadingState,
  EnhancedPagination,
} from "./";
import SimpleProductGrid from "./SimpleProductGrid";
import SimpleProductTable from "./SimpleProductTable";

// Import design system components
import { Button, Card, CardContent, CardHeader } from "../../ui";
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
  className = "",
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
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

  const handleToggleMoreMenu = useCallback((productId) => {
    setShowMoreMenu((prev) => (prev === productId ? null : productId));
  }, []);

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

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setShowMoreMenu(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
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
              <Button
                variant={isFilterExpanded ? "primary" : "ghost"}
                size="sm"
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              >
                <Filter className="h-4 w-4" />
              </Button>
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

        {/* Filter Panel */}
        {isFilterExpanded && (
          <div className="table-filters border-t border-gray-200 dark:border-gray-700 px-6 py-4">
            <AdvancedFilterPanel
              filters={filters}
              onFilterChange={onFilterChange}
              onClearFilters={onClearFilters}
              isExpanded={isFilterExpanded}
              onToggleExpanded={setIsFilterExpanded}
              categories={categories}
              brands={brands}
              compact={true}
            />
          </div>
        )}

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
                Add Product
              </Button>
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

            {/* Pagination */}
            {products.length > 0 && (
              <div className="table-pagination">
                <div className="pagination-info">
                  Showing {(currentPage - 1) * itemsPerPage + 1}-
                  {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
                  {totalItems} results
                </div>
                <div className="pagination-controls">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "primary" : "ghost"}
                        size="sm"
                        onClick={() => onPageChange(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                  >
                    Next
                  </Button>
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
