import React, { useState, useEffect } from "react";
import { Button } from "../../ui";
import { Card, CardContent } from "../../ui/Card";

const AdvancedFilterPanel = ({
  filters = {},
  onFilterChange,
  onClearFilters,
  isExpanded = false,
  onToggleExpanded,
  categories = [],
  brands = [],
}) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [filterTimeout, setFilterTimeout] = useState(null);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);

    if (
      typeof value === "string" &&
      ["barcode", "productName", "modelCode", "stockCode"].includes(key)
    ) {
      if (filterTimeout) {
        clearTimeout(filterTimeout);
      }

      const isWordComplete = value.endsWith(" ") || value.length >= 3;

      if (isWordComplete && value.trim().length > 0) {
        onFilterChange?.(newFilters);
      } else {
        const timeout = setTimeout(() => {
          onFilterChange?.(newFilters);
        }, 3000);
        setFilterTimeout(timeout);
      }
    } else {
      onFilterChange?.(newFilters);
    }
  };

  const handleApplyFilters = () => {
    onFilterChange?.(localFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {};
    setLocalFilters(clearedFilters);
    onClearFilters?.();
  };

  useEffect(() => {
    return () => {
      if (filterTimeout) {
        clearTimeout(filterTimeout);
      }
    };
  }, [filterTimeout]);

  const activeFilterCount = Object.values(localFilters).filter(
    (v) => v && v !== ""
  ).length;

  return (
    isExpanded ? (
    <Card className="mb-6">
      <CardContent className="p-4">
          <div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Barkod
                </label>
                <input
                  type="text"
                  placeholder="Barkod"
                  value={localFilters.barcode || ""}
                  onChange={(e) =>
                    handleFilterChange("barcode", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Ürün Adı
                </label>
                <input
                  type="text"
                  placeholder="Ürün Adı"
                  value={localFilters.productName || ""}
                  onChange={(e) =>
                    handleFilterChange("productName", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Model Kodu
                </label>
                <input
                  type="text"
                  placeholder="Model Kodu"
                  value={localFilters.modelCode || ""}
                  onChange={(e) =>
                    handleFilterChange("modelCode", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Stok Kodu
                </label>
                <input
                  type="text"
                  placeholder="Stok Kodu"
                  value={localFilters.stockCode || ""}
                  onChange={(e) =>
                    handleFilterChange("stockCode", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Kategori
                </label>
                <select
                  value={localFilters.category || ""}
                  onChange={(e) =>
                    handleFilterChange("category", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Tüm Kategoriler</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Marka
                </label>
                <select
                  value={localFilters.brand || ""}
                  onChange={(e) => handleFilterChange("brand", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Tüm Markalar</option>
                  {brands.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Durum
                  </label>
                  <select
                    value={localFilters.status || ""}
                    onChange={(e) =>
                      handleFilterChange("status", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Tüm Durumlar</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                    <option value="draft">Taslak</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Stok Durumu
                  </label>
                  <select
                    value={localFilters.stockStatus || ""}
                    onChange={(e) =>
                      handleFilterChange("stockStatus", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Tüm Stok Durumları</option>
                    <option value="in_stock">Stokta</option>
                    <option value="low_stock">Az Stok</option>
                    <option value="out_of_stock">Stok Yok</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Min Fiyat
                  </label>
                  <input
                    type="number"
                    placeholder="Min Fiyat"
                    value={localFilters.minPrice || ""}
                    onChange={(e) =>
                      handleFilterChange("minPrice", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Max Fiyat
                  </label>
                  <input
                    type="number"
                    placeholder="Max Fiyat"
                    value={localFilters.maxPrice || ""}
                    onChange={(e) =>
                      handleFilterChange("maxPrice", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t">
              <Button onClick={handleApplyFilters} variant="primary" size="sm">
                Filtrele {activeFilterCount > 0 && `(${activeFilterCount})`}
              </Button>
              <Button onClick={handleClearFilters} variant="outline" size="sm">
              Temizle
            </Button>
            </div>
          </div>
        
      </CardContent>
    </Card>
    ) : null
  );
};

export default AdvancedFilterPanel;
