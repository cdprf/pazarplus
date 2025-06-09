import React, { useState, useCallback } from "react";
import { List, Grid3X3, Filter, Settings, Package } from "lucide-react";

// Import modular components
import {
  ProductStatusTabs,
  AdvancedFilterPanel,
  BulkOperations,
  ProductGrid,
  EmptyState,
  LoadingState,
  EnhancedPagination,
} from "./";
import ProductTableWithVariants from "./EnhancedProductTableWithVariants";

// Import design system components
import { Button } from "../../ui";
import { Card, CardContent, CardHeader } from "../../ui/Card";
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
    return <LoadingState />;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Optimized Compact Toolbar */}
      <Card>
        <CardHeader className="border-b py-3">
          {/* Main Toolbar Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Left Section: Title + Bulk Actions */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                Ürün Yönetimi
              </h2>
              <div className="hidden sm:block">
                <BulkOperations
                  selectedCount={selectedProducts.length}
                  onBulkEdit={onBulkEdit}
                  onBulkDelete={onBulkDelete}
                  onBulkStatusChange={onBulkStatusChange}
                  onBulkExport={onBulkExport}
                />
              </div>
            </div>

            {/* Right Section: Controls */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* View Mode Toggle */}
              <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md">
                <Button
                  variant={viewMode === "table" ? "primary" : "ghost"}
                  size="sm"
                  icon={List}
                  onClick={() => onViewModeChange?.("table")}
                  className="rounded-r-none border-r px-2 py-1"
                  title="Tablo Görünümü"
                />
                <Button
                  variant={viewMode === "grid" ? "primary" : "ghost"}
                  size="sm"
                  icon={Grid3X3}
                  onClick={() => onViewModeChange?.("grid")}
                  className="rounded-l-none px-2 py-1"
                  title="Kart Görünümü"
                />
              </div>

              {/* Filter Toggle */}
              <Button
                variant={isFilterExpanded ? "primary" : "outline"}
                size="sm"
                icon={Filter}
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className="px-2 py-1"
                title="Filtreler"
              >
                <span className="hidden sm:inline">Filtre</span>
              </Button>

              {/* Settings */}
              <Button
                variant="outline"
                size="sm"
                icon={Settings}
                onClick={() => setShowTableSettings(true)}
                className="px-2 py-1"
                title="Tablo Ayarları"
              >
                <span className="hidden sm:inline">Ayarlar</span>
              </Button>
            </div>
          </div>

          {/* Mobile Bulk Operations */}
          <div className="block sm:hidden mt-2">
            <BulkOperations
              selectedCount={selectedProducts.length}
              onBulkEdit={onBulkEdit}
              onBulkDelete={onBulkDelete}
              onBulkStatusChange={onBulkStatusChange}
              onBulkExport={onBulkExport}
            />
          </div>

          {/* Status Tabs - Single Row, No Wrap */}
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <ProductStatusTabs
              activeTab={activeTab}
              onTabChange={onTabChange}
              counts={statusCounts}
              noWrap={true}
            />
          </div>

          {/* Expandable Filter Panel */}
          {isFilterExpanded && (
            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
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
        </CardHeader>
      </Card>

      {/* Products Display */}
      {products.length === 0 && Object.keys(filters).length === 0 ? (
        <EmptyState onAddProduct={onAddProduct} onSync={onSync} />
      ) : products.length === 0 && Object.keys(filters).length > 0 ? (
        /* Empty State for Filtered Results */
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Package className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Filtreye uygun ürün bulunamadı
              </h3>
              <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-6 max-w-md mx-auto">
                Arama kriterlerinizi değiştirerek tekrar deneyin veya filtreleri
                temizleyin
              </p>
              <Button onClick={onClearFilters} variant="outline">
                Filtreleri Temizle
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {viewMode === "table" ? (
              <ProductTableWithVariants
                products={products}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
                onImageClick={onImageClick}
                onProductNameClick={onProductNameClick}
                selectedProducts={selectedProducts}
                onSelectProduct={onSelectProduct}
                onSelectAll={onSelectAll}
                sortField={sortField}
                sortOrder={sortOrder}
                onSort={onSort}
                showMoreMenu={showMoreMenu}
                onToggleMoreMenu={handleToggleMoreMenu}
                onInlineEdit={onInlineEdit}
                tableSettings={tableSettings}
                enableVariantManagement={enableVariantManagement}
                onCreateVariantGroup={onCreateVariantGroup}
                onUpdateVariantGroup={onUpdateVariantGroup}
                onDeleteVariantGroup={onDeleteVariantGroup}
                onAcceptVariantSuggestion={onAcceptVariantSuggestion}
                onRejectVariantSuggestion={onRejectVariantSuggestion}
              />
            ) : (
              <div className="p-4">
                <ProductGrid
                  products={products}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onImageClick={onImageClick}
                  selectedProducts={selectedProducts}
                  onSelectProduct={onSelectProduct}
                  showMoreMenu={showMoreMenu}
                  onToggleMoreMenu={handleToggleMoreMenu}
                  onInlineEdit={onInlineEdit}
                />
              </div>
            )}

            {/* Enhanced Pagination - Integrated */}
            {products.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700">
                <EnhancedPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={onPageChange}
                  onPageSizeChange={onPageSizeChange}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
