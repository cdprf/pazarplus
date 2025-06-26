import React from "react";
import { Package, TrendingUp, TrendingDown } from "lucide-react";

const ProductInventory = ({ product }) => {
  const getStockStatus = (stock) => {
    if (!stock || stock === 0)
      return { text: "Stokta Yok", color: "text-red-600", icon: TrendingDown };
    if (stock < 10)
      return {
        text: "Düşük Stok",
        color: "text-yellow-600",
        icon: TrendingDown,
      };
    return { text: "Stokta Var", color: "text-green-600", icon: TrendingUp };
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
        <Package className="h-5 w-5 mr-2" />
        Envanter Bilgileri
      </h3>
      <div className="space-y-4">
        {product && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Mevcut Stok
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {product.stock || 0}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Durum
                </p>
                <div className="flex items-center mt-1">
                  {(() => {
                    const status = getStockStatus(product.stock);
                    const Icon = status.icon;
                    return (
                      <>
                        <Icon className={`h-4 w-4 mr-1 ${status.color}`} />
                        <span className={`text-sm font-medium ${status.color}`}>
                          {status.text}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Minimum Stok
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {product.min_stock || "Belirlenmemiş"}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Maksimum Stok
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {product.max_stock || "Belirlenmemiş"}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductInventory;
