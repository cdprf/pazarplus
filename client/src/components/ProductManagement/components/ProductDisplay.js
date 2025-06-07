import React, { useState, useCallback } from "react";
import { List, Grid3X3, Filter, Settings, Package } from "lucide-react";

// Import modular components
import {
  ProductStatusTabs,
  AdvancedFilterPanel,
  BulkOperations,
  ProductTable,
  ProductGrid,
  EmptyState,
  LoadingState,
  EnhancedPagination,
} from "./";

// Import design system components
import { Button, Card, CardHeader, CardContent } from "../../ui";
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
  statusCounts = { all: 0, active: 0, pending: 0, inactive: 0 },
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
        label: "Ürün Bilgisi",
        visible: true,
        sortable: true,
        sticky: true,
      },
      { id: "variant", label: "Varyant", visible: true, sortable: false },
      { id: "status", label: "Durum", visible: true, sortable: true },
      {
        id: "completion",
        label: "Doluluk Oranı",
        visible: true,
        sortable: false,
      },
      { id: "sku", label: "Stok Kodu", visible: true, sortable: true },
      { id: "commission", label: "Komisyon", visible: true, sortable: false },
      { id: "price", label: "Satış Fiyatı", visible: true, sortable: true },
      { id: "stock", label: "Stok", visible: true, sortable: true },
      {
        id: "buyboxPrice",
        label: "Buybox Fiyatı",
        visible: true,
        sortable: false,
      },
      { id: "buybox", label: "Buybox", visible: true, sortable: false },
      {
        id: "deliveryTime",
        label: "Termin Süresi",
        visible: true,
        sortable: false,
      },
      { id: "category", label: "Kategori", visible: true, sortable: true },
      { id: "brand", label: "Marka", visible: true, sortable: false },
      {
        id: "actions",
        label: "İşlemler",
        visible: true,
        sortable: false,
        sticky: true,
      },
    ],
    rowHeight: "normal",
    showImages: true,
    showVariants: true,
    alternateRowColors: false,
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
    <div className={`space-y-4 ${className}`}>
      {/* Compact Filter Panel */}
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

      {/* Toolbar */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Ürün Yönetimi
              </h2>

              {/* Bulk Operations */}
              <BulkOperations
                selectedCount={selectedProducts.length}
                onBulkEdit={onBulkEdit}
                onBulkDelete={onBulkDelete}
                onBulkStatusChange={onBulkStatusChange}
                onBulkExport={onBulkExport}
              />
            </div>
            <div className="flex items-center space-x-4">
              {/* Status Tabs - Moved here between bulk operations and view buttons */}
              <div className="mx-4">
                <ProductStatusTabs
                  tabs={[
                    { key: "all", label: "Tümü", count: statusCounts.all },
                    {
                      key: "active",
                      label: "Aktif",
                      count: statusCounts.active,
                    },
                    {
                      key: "inactive",
                      label: "Pasif",
                      count: statusCounts.inactive,
                    },
                    {
                      key: "outOfStock",
                      label: "Stokta Yok",
                      count: statusCounts.outOfStock,
                    },
                  ]}
                  activeTab={activeTab}
                  onTabChange={onTabChange}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* View Mode Toggle */}
              <div className="flex items-center border border-gray-300 rounded-md">
                <Button
                  variant={viewMode === "table" ? "primary" : "ghost"}
                  size="sm"
                  icon={List}
                  onClick={() => onViewModeChange?.("table")}
                  className="rounded-r-none border-r"
                />
                <Button
                  variant={viewMode === "grid" ? "primary" : "ghost"}
                  size="sm"
                  icon={Grid3X3}
                  onClick={() => onViewModeChange?.("grid")}
                  className="rounded-l-none"
                />
              </div>

              {/* Filter Toggle */}
              <Button
                variant={isFilterExpanded ? "primary" : "outline"}
                size="sm"
                icon={Filter}
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              >
                Filtreler
              </Button>

              {/* Settings */}
              <Button
                variant="outline"
                size="sm"
                icon={Settings}
                onClick={() => setShowTableSettings(true)}
              >
                Ayarlar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Products Display */}
      {products.length === 0 && Object.keys(filters).length === 0 ? (
        <EmptyState onAddProduct={onAddProduct} onSync={onSync} />
      ) : (
        <Card>
          <CardContent className="p-0">
            {viewMode === "table" ? (
              <ProductTable
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
                showMoreMenu={showMoreMenu}
                onToggleMoreMenu={handleToggleMoreMenu}
                onInlineEdit={onInlineEdit}
                tableSettings={tableSettings}
              />
            ) : (
              <div className="p-6">
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
          </CardContent>

          {/* Enhanced Pagination */}
          {products.length > 0 && (
            <EnhancedPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          )}
        </Card>
      )}

      {/* Empty State for Filtered Results */}
      {products.length === 0 && Object.keys(filters).length > 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Filtreye uygun ürün bulunamadı
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Arama kriterlerinizi değiştirerek tekrar deneyin veya filtreleri
            temizleyin
          </p>
          <Button onClick={onClearFilters} variant="outline">
            Filtreleri Temizle
          </Button>
        </div>
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
