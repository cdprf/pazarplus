import React from "react";
import {
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Copy,
  Package,
  Image,
  Star,
  ExternalLink,
  SortAsc,
  SortDesc,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Tooltip,
} from "./UIComponents";
import {
  getStockStatus,
  getPlatformBadges,
  getStatusVariant,
  PlatformIcons,
  formatCurrency,
} from "./utilities";

// Product Card Component
export const ProductCard = ({
  product,
  onEdit,
  onDelete,
  onView,
  onDuplicate,
}) => {
  const stockStatus = getStockStatus(product);
  const platformBadges = getPlatformBadges(product);
  const profitMargin = (
    ((product.price - product.costPrice) / product.price) *
    100
  ).toFixed(1);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg text-gray-900 truncate">
                {product.name}
              </h3>
              <Badge variant={getStatusVariant(product.status)}>
                {product.status === "active" ? "Aktif" : "Pasif"}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-2">SKU: {product.sku}</p>
            <p className="text-sm text-gray-500 line-clamp-2">
              {product.description}
            </p>
          </div>

          <div className="flex-shrink-0 ml-4">
            <div className="relative group">
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
              <div className="absolute right-0 top-8 bg-white shadow-lg rounded-md border py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <button
                  onClick={() => onView(product)}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full text-left"
                >
                  <Eye className="h-4 w-4" />
                  Görüntüle
                </button>
                <button
                  onClick={() => onEdit(product)}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full text-left"
                >
                  <Edit className="h-4 w-4" />
                  Düzenle
                </button>
                <button
                  onClick={() => onDuplicate(product)}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full text-left"
                >
                  <Copy className="h-4 w-4" />
                  Kopyala
                </button>
                <button
                  onClick={() => onDelete(product)}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full text-left text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  Sil
                </button>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Fiyat</p>
            <p className="font-semibold text-lg text-green-600">
              {formatCurrency(product.price)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Stok Durumu</p>
            <div className="flex items-center mt-1">
              {stockStatus.icon}
              <span
                className={`text-sm font-medium ${
                  stockStatus.variant === "danger"
                    ? "text-red-600"
                    : stockStatus.variant === "warning"
                    ? "text-amber-600"
                    : "text-green-600"
                }`}
              >
                {stockStatus.label} ({product.stockQuantity})
              </span>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-2">Platformlar</p>
          <div className="flex flex-wrap gap-1">
            {platformBadges.length > 0 ? (
              platformBadges.map((platform, index) => (
                <Tooltip
                  key={index}
                  content={platform.connectionName || platform.label}
                >
                  <Badge
                    variant={platform.variant}
                    className="flex items-center gap-1"
                  >
                    {platform.icon}
                    {platform.label}
                  </Badge>
                </Tooltip>
              ))
            ) : (
              <Badge variant="secondary">Platform Bağlantısı Yok</Badge>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Kar Marjı: {profitMargin}%</span>
          <span>Kategori: {product.category}</span>
        </div>
      </CardContent>
    </Card>
  );
};

// Product Table Component
export const ProductTable = ({
  products,
  onEdit,
  onDelete,
  onView,
  onDuplicate,
  sortField,
  sortDirection,
  onSort,
}) => {
  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <SortAsc className="h-4 w-4 ml-1" />
    ) : (
      <SortDesc className="h-4 w-4 ml-1" />
    );
  };

  const handleSort = (field) => {
    if (sortField === field) {
      onSort(field, sortDirection === "asc" ? "desc" : "asc");
    } else {
      onSort(field, "asc");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort("name")}
                  className="flex items-center hover:text-gray-700"
                >
                  Ürün
                  {getSortIcon("name")}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort("sku")}
                  className="flex items-center hover:text-gray-700"
                >
                  SKU
                  {getSortIcon("sku")}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort("price")}
                  className="flex items-center hover:text-gray-700"
                >
                  Fiyat
                  {getSortIcon("price")}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort("stockQuantity")}
                  className="flex items-center hover:text-gray-700"
                >
                  Stok
                  {getSortIcon("stockQuantity")}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Platformlar
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort("status")}
                  className="flex items-center hover:text-gray-700"
                >
                  Durum
                  {getSortIcon("status")}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => {
              const stockStatus = getStockStatus(product);
              const platformBadges = getPlatformBadges(product);

              return (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {product.images && product.images[0] ? (
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={product.images[0]}
                            alt={product.name}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Package className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {product.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {product.category}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.sku}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {stockStatus.icon}
                      <span
                        className={`text-sm font-medium ${
                          stockStatus.variant === "danger"
                            ? "text-red-600"
                            : stockStatus.variant === "warning"
                            ? "text-amber-600"
                            : "text-green-600"
                        }`}
                      >
                        {product.stockQuantity}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {platformBadges.slice(0, 2).map((platform, index) => (
                        <Tooltip
                          key={index}
                          content={platform.connectionName || platform.label}
                        >
                          <Badge
                            variant={platform.variant}
                            className="flex items-center gap-1"
                          >
                            {platform.icon}
                            {platform.label}
                          </Badge>
                        </Tooltip>
                      ))}
                      {platformBadges.length > 2 && (
                        <Badge variant="secondary">
                          +{platformBadges.length - 2}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getStatusVariant(product.status)}>
                      {product.status === "active" ? "Aktif" : "Pasif"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Tooltip content="Görüntüle">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(product)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Düzenle">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Kopyala">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDuplicate(product)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Sil">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(product)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
