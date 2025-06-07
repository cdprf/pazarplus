import React from "react";
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
} from "lucide-react";
import { Button, Badge, Tooltip } from "../../ui";
import CompletionScore from "./CompletionScore";
import InlineEditor from "./InlineEditor";

// Helper functions
const getStockStatus = (product) => {
  const stock = product.stockQuantity || 0;
  if (stock === 0) {
    return {
      color: "text-red-600",
      icon: <div className="w-2 h-2 bg-red-500 rounded-full" />,
      label: "Stok Yok",
    };
  } else if (stock <= 10) {
    return {
      color: "text-yellow-600",
      icon: <div className="w-2 h-2 bg-yellow-500 rounded-full" />,
      label: "Az Stok",
    };
  } else {
    return {
      color: "text-green-600",
      icon: <div className="w-2 h-2 bg-green-500 rounded-full" />,
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
  const handleSort = (field) => {
    onSort?.(field);
  };

  // Get visible columns from settings
  const visibleColumns =
    tableSettings?.columns?.filter((col) => col.visible) || [];
  const rowHeightClass = {
    compact: "py-2",
    normal: "py-3",
    comfortable: "py-4",
  }[tableSettings?.rowHeight || "normal"];

  // Helper function to check if column is visible
  const isColumnVisible = (columnId) => {
    if (!tableSettings?.columns?.length) return true; // Show all columns if no settings
    const column = visibleColumns.find(col => col.id === columnId);
    return column?.visible !== false;
  };

  const SortHeader = ({ field, children, isVisible = true }) => {
    if (!isVisible) return null;

    return (
      <th
        className={`px-6 ${rowHeightClass} text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 ${
          tableSettings?.stickyHeaders ? "sticky top-0 bg-gray-50 z-10" : ""
        }`}
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center space-x-1">
          <span>{children}</span>
          {sortField === field &&
            (sortOrder === "asc" ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            ))}
        </div>
      </th>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {/* Checkbox Column */}
            <SortHeader field="checkbox" isVisible={visibleColumns.find(col => col.id === 'checkbox')?.visible !== false}>
              <input
                type="checkbox"
                checked={
                  selectedProducts.length === products.length &&
                  products.length > 0
                }
                onChange={onSelectAll}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </SortHeader>
            
            {/* Product Info Column */}
            <SortHeader field="product" isVisible={visibleColumns.find(col => col.id === 'product')?.visible !== false}>
              Ürün Bilgisi
            </SortHeader>
            
            {/* Variant Column */}
            <SortHeader field="variant" isVisible={visibleColumns.find(col => col.id === 'variant')?.visible !== false}>
              Varyant
            </SortHeader>
            
            {/* Status Column */}
            <SortHeader field="status" isVisible={visibleColumns.find(col => col.id === 'status')?.visible !== false}>
              Durum
            </SortHeader>
            
            {/* Completion Column */}
            <SortHeader field="completion" isVisible={visibleColumns.find(col => col.id === 'completion')?.visible !== false}>
              Doluluk Oranı
            </SortHeader>
            
            {/* SKU Column */}
            <SortHeader field="sku" isVisible={visibleColumns.find(col => col.id === 'sku')?.visible !== false}>
              Stok Kodu
            </SortHeader>
            
            {/* Commission Column */}
            <SortHeader field="commission" isVisible={visibleColumns.find(col => col.id === 'commission')?.visible !== false}>
              <Tooltip content="Komisyonlara KDV dahildir.">
                <div className="flex items-center space-x-1 cursor-help">
                  <Info className="h-4 w-4" />
                  <span>Komisyon</span>
                </div>
              </Tooltip>
            </SortHeader>
            
            {/* Price Column */}
            <SortHeader field="price" isVisible={visibleColumns.find(col => col.id === 'price')?.visible !== false}>
              Satış Fiyatı
            </SortHeader>
            
            {/* Stock Column */}
            <SortHeader field="stock" isVisible={visibleColumns.find(col => col.id === 'stock')?.visible !== false}>
              Stok
            </SortHeader>
            
            {/* Buybox Price Column */}
            <SortHeader field="buyboxPrice" isVisible={visibleColumns.find(col => col.id === 'buyboxPrice')?.visible !== false}>
              Buybox Fiyatı
            </SortHeader>
            
            {/* Buybox Column */}
            <SortHeader field="buybox" isVisible={visibleColumns.find(col => col.id === 'buybox')?.visible !== false}>
              Buybox
            </SortHeader>
            
            {/* Delivery Time Column */}
            <SortHeader field="deliveryTime" isVisible={visibleColumns.find(col => col.id === 'deliveryTime')?.visible !== false}>
              Termin Süresi
            </SortHeader>
            
            {/* Category Column */}
            <SortHeader field="category" isVisible={visibleColumns.find(col => col.id === 'category')?.visible !== false}>
              Kategori
            </SortHeader>
            
            {/* Brand Column */}
            <SortHeader field="brand" isVisible={visibleColumns.find(col => col.id === 'brand')?.visible !== false}>
              Marka
            </SortHeader>
            
            {/* Actions Column */}
            <SortHeader field="actions" isVisible={visibleColumns.find(col => col.id === 'actions')?.visible !== false}>
              İşlemler
            </SortHeader>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {products.map((product) => {
            const stockStatus = getStockStatus(product);

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
              <tr key={product.id} className={`hover:bg-gray-50 ${tableSettings?.alternateRowColors ? 'even:bg-gray-25' : ''}`}>
                {/* Checkbox Column */}
                {isColumnVisible('checkbox') && (
                  <td className={`px-6 ${rowHeightClass} whitespace-nowrap sticky left-0 bg-white`}>
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => onSelectProduct?.(product.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </td>
                )}

                {/* Enhanced Product Info */}
                {isColumnVisible('product') && (
                  <td className={`px-6 ${rowHeightClass} whitespace-nowrap sticky left-12 bg-white`}>
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-16 w-16">
                      {product.images && product.images.length > 0 ? (
                        <div className="relative">
                          <img
                            className="h-16 w-16 rounded-lg object-cover cursor-pointer hover:opacity-80"
                            src={product.images[0]}
                            alt={product.name}
                            onClick={() =>
                              onImageClick?.(product.images[0], product.name)
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
                      <div className="text-sm font-medium text-gray-900 max-w-xs truncate mb-1">
                        <Tooltip content={product.name}>
                          <span>{product.name}</span>
                        </Tooltip>
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
                                navigator.clipboard.writeText(product.modelCode)
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
                                navigator.clipboard.writeText(product.barcode)
                              }
                              variant="ghost"
                              size="sm"
                              icon={Copy}
                              className="h-4 w-4 p-0"
                            />
                          </div>
                        )}
                        {product.variants && product.variants.length > 0 && (
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
                {isColumnVisible('variant') && (
                  <td className={`px-6 ${rowHeightClass} whitespace-nowrap text-sm text-gray-900`}>
                  {product.variants && product.variants.length > 0 ? (
                    <Badge variant="outline" className="text-xs">
                      {product.variants.length} varyant
                    </Badge>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                )}

                {/* Status */}
                {isColumnVisible('status') && (
                  <td className={`px-6 ${rowHeightClass} whitespace-nowrap`}>
                    <div className="flex items-center">
                      {product.status === "active" && (
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      )}
                      {product.status === "inactive" && (
                        <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                      )}
                      {product.status === "draft" && (
                        <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                      )}
                      <Badge
                        variant={getStatusVariant(product.status)}
                        className="text-xs"
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
                <td className="px-6 py-4 whitespace-nowrap">
                  <CompletionScore score={completionScore} />
                </td>

                {/* Stock Code */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {product.sku}
                  </code>
                </td>

                {/* Commission */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="font-medium">
                    %{((product.commission || 15) * 100).toFixed(1)}
                  </span>
                </td>

                {/* Price with Inline Edit */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <InlineEditor
                    value={product.price || 0}
                    onSave={(newPrice) =>
                      onInlineEdit?.("price", product.id, newPrice)
                    }
                    type="number"
                    suffix=" ₺"
                    className="min-w-24"
                  />
                </td>

                {/* Stock with Inline Edit */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {stockStatus.icon}
                    <InlineEditor
                      value={product.stockQuantity || 0}
                      onSave={(newStock) =>
                        onInlineEdit?.("stockQuantity", product.id, newStock)
                      }
                      type="number"
                      min="0"
                      className="min-w-16"
                    />
                  </div>
                </td>

                {/* Buybox Price */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="text-gray-400">-</span>
                </td>

                {/* Buybox Status */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="text-gray-400">-</span>
                </td>

                {/* Delivery Duration */}
                <td className="px-6 py-4 whitespace-nowrap">
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

                {/* Category */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant="secondary" className="text-xs">
                    {product.category}
                  </Badge>
                </td>

                {/* Brand */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.brand || "-"}
                </td>

                {/* Actions */}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium sticky right-0 bg-white">
                  <div className="flex items-center space-x-2">
                    <Tooltip content="Detayları Görüntüle">
                      <Button
                        onClick={() => onView?.(product)}
                        variant="ghost"
                        size="sm"
                        icon={Eye}
                      />
                    </Tooltip>
                    <Tooltip content="Düzenle">
                      <Button
                        onClick={() => onEdit?.(product)}
                        variant="ghost"
                        size="sm"
                        icon={Edit}
                      />
                    </Tooltip>
                    <div className="relative">
                      <Button
                        onClick={() => onToggleMoreMenu?.(product.id)}
                        variant="ghost"
                        size="sm"
                        icon={MoreVertical}
                      />
                      {showMoreMenu === product.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                          <button
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
                            onClick={() => {
                              navigator.clipboard.writeText(product.sku);
                              onToggleMoreMenu?.(null);
                            }}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            SKU'yu Kopyala
                          </button>
                          <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Platformda Görüntüle
                          </button>
                          <div className="border-t border-gray-100" />
                          <button
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                            onClick={() => {
                              onDelete?.(product.id);
                              onToggleMoreMenu?.(null);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Sil
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ProductTable;
