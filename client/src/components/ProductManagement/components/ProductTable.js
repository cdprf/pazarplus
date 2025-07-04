import React, { useState } from "react";
import { SafeImage } from "../../../utils/imageUtils";
import {
  SortAsc,
  SortDesc,
  Image,
  Copy,
  Info,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Eye,
  Edit,
  MoreVertical,
  ExternalLink,
  Trash2,
  ChevronDown,
  ChevronRight,
  Search,
  ChevronLeft,
  ChevronUp,
} from "lucide-react";
import { Button, Badge, Tooltip } from "../../ui";
import CompletionScore from "./CompletionScore";
import InlineEditor from "./InlineEditor";

// Import the table fixes CSS

// Helper functions
const getStockStatus = (product) => {
  const stock = product.stockQuantity || 0;
  if (stock === 0) {
    return {
      variant: "danger",
      icon: <div className="w-2 h-2 bg-danger-500 rounded-full" />,
      label: "Stok Yok",
    };
  } else if (stock <= 10) {
    return {
      variant: "warning",
      icon: <div className="w-2 h-2 bg-warning-500 rounded-full" />,
      label: "Az Stok",
    };
  } else {
    return {
      variant: "success",
      icon: <div className="w-2 h-2 bg-success-500 rounded-full" />,
      label: "Stokta",
    };
  }
};

const getStatusVariant = (status) => {
  switch (status) {
    case "active":
      return "success";
    case "inactive":
      return "danger";
    case "draft":
      return "warning";
    default:
      return "secondary";
  }
};

const ProductTable = ({
  products,
  onView,
  onEdit,
  onDelete,
  onImageClick,
  onProductNameClick,
  selectedProducts,
  onSelectProduct,
  onSelectAll,
  sortField,
  sortOrder,
  onSort,
  showMoreMenu,
  onToggleMoreMenu,
  onInlineEdit,
  tableSettings = null, // Add table settings prop
}) => {
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [stockFilter, setStockFilter] = useState("all"); // Add stock filter state

  const toggleProductExpansion = (productId) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const handleSort = (field) => {
    onSort?.(field);
  };

  // Get row height class from settings
  const rowHeightClass = {
    compact: "py-2",
    normal: "py-3",
    comfortable: "py-4",
  }[tableSettings?.rowHeight || "normal"];

  // Helper function to check if column is visible
  const isColumnVisible = (columnId) => {
    if (!tableSettings?.columns?.length) return true; // Show all columns if no settings
    const column = tableSettings.columns.find((col) => col.id === columnId);
    return column?.visible !== false;
  };

  const SortHeader = ({ field, children, isVisible = true }) => {
    if (!isVisible) return null;

    return (
      <th
        className={`table-th table-th-sortable ${
          tableSettings?.stickyHeaders ? "sticky top-0 z-10" : ""
        }`}
        onClick={() => handleSort(field)}
        role="columnheader"
        aria-sort={
          sortField === field
            ? sortOrder === "asc"
              ? "ascending"
              : "descending"
            : "none"
        }
        data-sort={field}
      >
        <div className="flex items-center space-x-1">
          <span>{children}</span>
          {sortField === field ? (
            sortOrder === "asc" ? (
              <ChevronUp className="sort-icon h-4 w-4" />
            ) : (
              <ChevronDown className="sort-icon h-4 w-4" />
            )
          ) : (
            <SortAsc className="sort-icon h-4 w-4 opacity-30" />
          )}
        </div>
      </th>
    );
  };

  // Filter products based on stock filter
  const filteredProducts =
    products?.filter((product) => {
      if (stockFilter === "outOfStock") {
        return (product.stockQuantity || 0) === 0;
      }
      if (stockFilter === "inStock") {
        return (product.stockQuantity || 0) > 0;
      }
      if (stockFilter === "lowStock") {
        const stock = product.stockQuantity || 0;
        return stock > 0 && stock <= 10;
      }
      return true; // "all" filter
    }) || [];

  // Check if filtered products array is empty
  const isEmpty = filteredProducts.length === 0;

  return (
    <div className="data-table">
      {/* Table Toolbar */}
      <div className="table-toolbar">
        <div className="table-search">
          <Search className="search-icon h-4 w-4 text-gray-500" />
          <input
            className="search-input"
            placeholder="Ürün adı, SKU, barkod, marka ile ara..."
          />
        </div>
        <div className="table-filters">
          <select
            className="filter-select"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            aria-label="Stok durumuna göre filtrele"
          >
            <option value="all">Tüm Ürünler</option>
            <option value="inStock">Stokta Olanlar</option>
            <option value="outOfStock">Stokta Olmayanlar</option>
            <option value="lowStock">Az Stokta Olanlar</option>
          </select>
        </div>
        {selectedProducts && selectedProducts.length > 0 && (
          <div className="table-actions">
            <div className="bulk-actions">
              <span className="bulk-count">
                {selectedProducts.length} seçildi
              </span>
              <button className="btn btn-sm btn-danger">Sil</button>
            </div>
          </div>
        )}
      </div>

      <div className="table-container">
        <table
          className="table table-sortable table-selectable"
          role="table"
          aria-label="Ürünler tablosu"
        >
          <thead className="table-header">
            <tr role="row">
              {/* Checkbox Column */}
              {isColumnVisible("checkbox") && (
                <th
                  className="table-th table-th-checkbox sticky left-0 z-20 border-r border-gray-200"
                  role="columnheader"
                >
                  <input
                    type="checkbox"
                    checked={
                      selectedProducts.length === filteredProducts.length &&
                      filteredProducts.length > 0
                    }
                    onChange={onSelectAll}
                    className="table-checkbox"
                    aria-label="Tüm ürünleri seç"
                  />
                </th>
              )}

              {/* Product Info Column */}
              {isColumnVisible("product") && (
                <th
                  className="table-th sticky left-16 z-20 min-w-80 border-r border-gray-200"
                  style={{ left: isColumnVisible("checkbox") ? "64px" : "0px" }}
                  role="columnheader"
                >
                  Ürün Bilgisi
                </th>
              )}

              {/* Variant Column */}
              {isColumnVisible("variant") && (
                <th className="table-th min-w-20" role="columnheader">
                  Varyant
                </th>
              )}

              {/* Status Column */}
              <SortHeader field="status" isVisible={isColumnVisible("status")}>
                Durum
              </SortHeader>

              {/* Completion Column */}
              {isColumnVisible("completion") && (
                <th className="table-th" role="columnheader">
                  Doluluk Oranı
                </th>
              )}

              {/* SKU Column */}
              <SortHeader field="sku" isVisible={isColumnVisible("sku")}>
                Stok Kodu
              </SortHeader>

              {/* Commission Column */}
              {isColumnVisible("commission") && (
                <th className="table-th" role="columnheader">
                  <Tooltip content="Komisyonlara KDV dahildir.">
                    <div className="flex items-center space-x-1 cursor-help">
                      <Info className="h-4 w-4" />
                      <span>Komisyon</span>
                    </div>
                  </Tooltip>
                </th>
              )}

              {/* Price Column */}
              <SortHeader field="price" isVisible={isColumnVisible("price")}>
                Satış Fiyatı
              </SortHeader>

              {/* Stock Column */}
              <SortHeader field="stock" isVisible={isColumnVisible("stock")}>
                Stok
              </SortHeader>

              {/* Buybox Price Column */}
              {isColumnVisible("buyboxPrice") && (
                <th className="table-th" role="columnheader">
                  Buybox Fiyatı
                </th>
              )}

              {/* Buybox Column */}
              {isColumnVisible("buybox") && (
                <th className="table-th" role="columnheader">
                  Buybox
                </th>
              )}

              {/* Delivery Time Column */}
              {isColumnVisible("deliveryTime") && (
                <th className="table-th" role="columnheader">
                  Termin Süresi
                </th>
              )}

              {/* Category Column */}
              <SortHeader
                field="category"
                isVisible={isColumnVisible("category")}
              >
                Kategori
              </SortHeader>

              {/* Brand Column */}
              {isColumnVisible("brand") && (
                <th className="table-th" role="columnheader">
                  Marka
                </th>
              )}

              {/* Actions Column */}
              {isColumnVisible("actions") && (
                <th
                  className="table-th sticky right-0 z-20 border-l border-gray-200"
                  role="columnheader"
                >
                  İşlemler
                </th>
              )}
            </tr>
          </thead>
          <tbody className="table-body">
            {filteredProducts.map((product) => {
              const stockStatus = getStockStatus(product);
              const isExpanded = expandedProducts.has(product.id);
              const hasVariants =
                product.hasVariants &&
                product.variants &&
                product.variants.length > 0;

              // Calculate completion score
              const calculateCompletionScore = (product) => {
                const fields = [
                  product.name,
                  product.description,
                  product.price,
                  product.images?.length > 0,
                  product.category,
                  product.sku,
                  product.stockQuantity > 0,
                  product.modelCode,
                  product.barcode,
                ];
                const filledFields = fields.filter(Boolean).length;
                return Math.round((filledFields / fields.length) * 100);
              };
              const completionScore = calculateCompletionScore(product);

              return (
                <>
                  <tr
                    key={product.id}
                    className={`table-row hover:bg-gray-50 ${
                      tableSettings?.alternateRowColors ? "even:bg-gray-25" : ""
                    } ${hasVariants ? "border-l-4 border-l-primary-500" : ""}`}
                    role="row"
                  >
                    {/* Checkbox Column */}
                    {isColumnVisible("checkbox") && (
                      <td className="table-td sticky left-0 z-20 border-r border-gray-200">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => onSelectProduct?.(product.id)}
                          className="table-checkbox"
                          aria-label={`Ürünü seç: ${product.name}`}
                        />
                      </td>
                    )}

                    {/* Enhanced Product Info */}
                    {isColumnVisible("product") && (
                      <td
                        className="table-td sticky z-20 border-r border-gray-200"
                        style={{
                          left: isColumnVisible("checkbox") ? "64px" : "0px",
                        }}
                      >
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-16 w-16">
                            {product.images && product.images.length > 0 ? (
                              <div className="relative">
                                <SafeImage
                                  className="h-16 w-16 rounded-lg object-cover cursor-pointer hover:opacity-80"
                                  src={product.images[0]}
                                  alt={product.name}
                                  onClick={() =>
                                    onImageClick?.(
                                      product.images[0],
                                      product.name,
                                      product
                                    )
                                  }
                                />
                                {product.images.length > 1 && (
                                  <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-1 rounded-full">
                                    +{product.images.length - 1}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Image className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4 flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                                <Tooltip content={product.name}>
                                  <span
                                    className={`${
                                      onProductNameClick
                                        ? "cursor-pointer hover:text-blue-600 hover:underline"
                                        : ""
                                    }`}
                                    onClick={() =>
                                      onProductNameClick?.(product)
                                    }
                                  >
                                    {product.name}
                                  </span>
                                </Tooltip>
                              </div>
                              {hasVariants && (
                                <Button
                                  onClick={() =>
                                    toggleProductExpansion(product.id)
                                  }
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 ml-2"
                                  icon={isExpanded ? ChevronDown : ChevronRight}
                                  aria-expanded={isExpanded}
                                  aria-controls={`variant-${product.id}`}
                                  aria-label={
                                    isExpanded
                                      ? "Varyantları gizle"
                                      : "Varyantları göster"
                                  }
                                />
                              )}
                            </div>

                            {/* Product Metadata */}
                            <div className="space-y-1 text-xs text-gray-500">
                              {product.modelCode && (
                                <div className="flex items-center space-x-2">
                                  <span>Model Kodu:</span>
                                  <code className="bg-gray-100 px-1 rounded text-xs">
                                    {product.modelCode}
                                  </code>
                                  <Button
                                    onClick={() =>
                                      navigator.clipboard.writeText(
                                        product.modelCode
                                      )
                                    }
                                    variant="ghost"
                                    size="sm"
                                    icon={Copy}
                                    className="h-4 w-4 p-0"
                                  />
                                </div>
                              )}
                              <div className="flex items-center space-x-2">
                                <span>Stok Kodu:</span>
                                <code className="bg-gray-100 px-1 rounded text-xs">
                                  {product.sku}
                                </code>
                                <Button
                                  onClick={() =>
                                    navigator.clipboard.writeText(product.sku)
                                  }
                                  variant="ghost"
                                  size="sm"
                                  icon={Copy}
                                  className="h-4 w-4 p-0"
                                />
                              </div>
                              {product.barcode && (
                                <div className="flex items-center space-x-2">
                                  <span>Barkod:</span>
                                  <code className="bg-gray-100 px-1 rounded text-xs">
                                    {product.barcode}
                                  </code>
                                  <Button
                                    onClick={() =>
                                      navigator.clipboard.writeText(
                                        product.barcode
                                      )
                                    }
                                    variant="ghost"
                                    size="sm"
                                    icon={Copy}
                                    className="h-4 w-4 p-0"
                                  />
                                </div>
                              )}
                              {product.variants &&
                                product.variants.length > 0 && (
                                  <div className="flex items-center space-x-2">
                                    <span>Varyant:</span>
                                    <span>{product.variants[0].name}</span>
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Variant Info */}
                    {isColumnVisible("variant") && (
                      <td className="table-td">
                        {product.variants && product.variants.length > 0 ? (
                          <Badge variant="secondary" className="text-xs">
                            {product.variants.length} varyant
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    )}

                    {/* Status */}
                    {isColumnVisible("status") && (
                      <td className="table-td">
                        <div className="flex items-center">
                          {product.status === "active" && (
                            <CheckCircle className="h-4 w-4 mr-2 text-success-500" />
                          )}
                          {product.status === "inactive" && (
                            <AlertCircle className="h-4 w-4 mr-2 text-danger-500" />
                          )}
                          {product.status === "draft" && (
                            <AlertTriangle className="h-4 w-4 mr-2 text-warning-500" />
                          )}
                          <Badge
                            variant={getStatusVariant(product.status)}
                            className="badge-pill"
                          >
                            {product.status === "active"
                              ? "Satışta"
                              : product.status === "inactive"
                              ? "Satışa Kapalı"
                              : "Taslak"}
                          </Badge>
                        </div>
                      </td>
                    )}

                    {/* Completion Score */}
                    {isColumnVisible("completion") && (
                      <td className="table-td">
                        <CompletionScore score={completionScore} />
                      </td>
                    )}

                    {/* Stock Code */}
                    {isColumnVisible("sku") && (
                      <td className="table-td">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {product.sku}
                        </code>
                      </td>
                    )}

                    {/* Commission */}
                    {isColumnVisible("commission") && (
                      <td className="table-td">
                        <span className="font-medium">
                          %{((product.commission || 15) * 100).toFixed(1)}
                        </span>
                      </td>
                    )}

                    {/* Price with Inline Edit */}
                    {isColumnVisible("price") && (
                      <td className="table-td">
                        <div className="currency-display">
                          <InlineEditor
                            value={product.price || 0}
                            onSave={(newPrice) =>
                              onInlineEdit?.("price", product.id, newPrice)
                            }
                            type="number"
                            suffix=" ₺"
                            className="min-w-24 currency-amount"
                          />
                        </div>
                      </td>
                    )}

                    {/* Stock with Inline Edit */}
                    {isColumnVisible("stock") && (
                      <td className="table-td">
                        <div className="flex items-center space-x-2">
                          {stockStatus.icon}
                          <InlineEditor
                            value={product.stockQuantity || 0}
                            onSave={(newStock) =>
                              onInlineEdit?.(
                                "stockQuantity",
                                product.id,
                                newStock
                              )
                            }
                            type="number"
                            min="0"
                            className="min-w-16"
                          />
                          <Badge
                            variant={stockStatus.variant}
                            className="badge-sm"
                          >
                            {stockStatus.label}
                          </Badge>
                        </div>
                      </td>
                    )}

                    {/* Buybox Price */}
                    {isColumnVisible("buyboxPrice") && (
                      <td className="table-td">
                        <span className="text-gray-400">-</span>
                      </td>
                    )}

                    {/* Buybox Status */}
                    {isColumnVisible("buybox") && (
                      <td className="table-td">
                        <span className="text-gray-400">-</span>
                      </td>
                    )}

                    {/* Delivery Duration */}
                    {isColumnVisible("deliveryTime") && (
                      <td className="table-td">
                        <InlineEditor
                          value={product.deliveryDuration || 1}
                          onSave={(newDuration) =>
                            onInlineEdit?.(
                              "deliveryDuration",
                              product.id,
                              newDuration
                            )
                          }
                          type="number"
                          min="1"
                          suffix=" gün"
                          className="min-w-16"
                        />
                      </td>
                    )}

                    {/* Category */}
                    {isColumnVisible("category") && (
                      <td className="table-td">
                        <Badge variant="secondary" className="badge-pill">
                          {product.category}
                        </Badge>
                      </td>
                    )}

                    {/* Brand */}
                    {isColumnVisible("brand") && (
                      <td className="table-td">{product.brand || "-"}</td>
                    )}

                    {/* Actions */}
                    {isColumnVisible("actions") && (
                      <td className="table-td table-actions sticky right-0 z-20 border-l border-gray-200">
                        <div className="flex items-center space-x-2">
                          <Tooltip content="Detayları Görüntüle">
                            <Button
                              onClick={() => onView?.(product)}
                              variant="ghost"
                              size="sm"
                              icon={Eye}
                              aria-label="Ürünü görüntüle"
                            />
                          </Tooltip>
                          <Tooltip content="Düzenle">
                            <Button
                              onClick={() => onEdit?.(product)}
                              variant="ghost"
                              size="sm"
                              icon={Edit}
                              aria-label="Ürünü düzenle"
                            />
                          </Tooltip>
                          <div className="dropdown">
                            <Button
                              onClick={() => onToggleMoreMenu?.(product.id)}
                              variant="ghost"
                              size="sm"
                              icon={MoreVertical}
                              className="dropdown-trigger"
                              aria-label="Daha fazla seçenek"
                              aria-expanded={showMoreMenu === product.id}
                              aria-haspopup="true"
                            />
                            {showMoreMenu === product.id && (
                              <div className="dropdown-content">
                                <button
                                  className="dropdown-item"
                                  onClick={() => {
                                    navigator.clipboard.writeText(product.sku);
                                    onToggleMoreMenu?.(null);
                                  }}
                                >
                                  <Copy className="dropdown-icon" />
                                  SKU'yu Kopyala
                                </button>
                                <button className="dropdown-item">
                                  <ExternalLink className="dropdown-icon" />
                                  Platformda Görüntüle
                                </button>
                                <div className="dropdown-divider"></div>
                                <button
                                  className="dropdown-item dropdown-item-danger"
                                  onClick={() => {
                                    onDelete?.(product.id);
                                    onToggleMoreMenu?.(null);
                                  }}
                                >
                                  <Trash2 className="dropdown-icon" />
                                  Sil
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    )}
                  </tr>

                  {/* Expanded Variant Row */}
                  {isExpanded && hasVariants && (
                    <tr key={`${product.id}-expanded`} className="bg-gray-50">
                      <td
                        colSpan={
                          Object.keys({
                            checkbox: isColumnVisible("checkbox"),
                            product: isColumnVisible("product"),
                            variant: isColumnVisible("variant"),
                            status: isColumnVisible("status"),
                            completion: isColumnVisible("completion"),
                            sku: isColumnVisible("sku"),
                            commission: isColumnVisible("commission"),
                            price: isColumnVisible("price"),
                            stock: isColumnVisible("stock"),
                            buyboxPrice: isColumnVisible("buyboxPrice"),
                            buybox: isColumnVisible("buybox"),
                            deliveryTime: isColumnVisible("deliveryTime"),
                            category: isColumnVisible("category"),
                            brand: isColumnVisible("brand"),
                            actions: isColumnVisible("actions"),
                          }).filter(Boolean).length
                        }
                        className="table-td"
                        id={`variant-${product.id}`}
                      >
                        <div className="ml-20">
                          <h4 className="text-sm font-medium text-gray-900 mb-3">
                            Varyantlar
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {product.variants?.map((variant, index) => (
                              <div
                                key={index}
                                className="card card-interactive"
                              >
                                <div className="flex items-center space-x-3">
                                  {variant.image && (
                                    <SafeImage
                                      src={variant.image}
                                      alt={variant.name}
                                      className="h-12 w-12 rounded object-cover"
                                    />
                                  )}
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">
                                      {variant.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      SKU: {variant.sku}
                                    </p>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-sm font-medium text-blue-600">
                                        {variant.price?.toLocaleString()} ₺
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        Stok: {variant.stock || 0}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {isEmpty && (
        <div className="empty-state empty-state-search">
          <div className="empty-state-icon">
            {stockFilter !== "all" ? (
              <AlertCircle className="h-16 w-16 text-gray-400" />
            ) : (
              <Image className="h-16 w-16 text-gray-400" />
            )}
          </div>
          <h3 className="empty-state-title">
            {stockFilter !== "all"
              ? "Filtreye uygun ürün bulunamadı"
              : "Ürün bulunamadı"}
          </h3>
          <p className="empty-state-description">
            {stockFilter !== "all" ? (
              <>Seçtiğiniz stok durumuna uygun ürün bulunmamaktadır.</>
            ) : (
              <>
                Henüz hiç ürün eklenmemiş veya arama kriterlerinize uygun ürün
                bulunamadı.
              </>
            )}
          </p>
          <div className="empty-state-actions">
            {stockFilter !== "all" ? (
              <button
                className="btn btn-ghost"
                onClick={() => setStockFilter("all")}
              >
                Filtreyi Temizle
              </button>
            ) : (
              <button className="btn btn-primary">
                <ChevronRight className="h-4 w-4 mr-2" />
                Ürün Ekle
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pagination */}
      {!isEmpty && (
        <div className="table-pagination">
          <div className="pagination-info">
            {stockFilter !== "all" ? (
              <>
                <span className="font-medium">{filteredProducts.length}</span>{" "}
                ürün gösteriliyor
                <span className="text-gray-500">
                  (toplam {products?.length || 0})
                </span>
              </>
            ) : (
              <>Toplam {filteredProducts.length} ürün</>
            )}
          </div>
          <div className="pagination-controls">
            <button className="btn btn-sm btn-ghost" disabled>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="btn btn-sm btn-primary">1</button>
            <button className="btn btn-sm btn-ghost">2</button>
            <button className="btn btn-sm btn-ghost">3</button>
            <button className="btn btn-sm btn-ghost">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductTable;
