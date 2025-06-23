import React from "react";
import { Package, RefreshCw } from "lucide-react";
import { Button } from "../../ui";

const EmptyState = ({ onAddProduct, onSync }) => (
  <div className="text-center py-12">
    <Package className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
      Henüz ürün bulunmuyor
    </h3>
    <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-6 max-w-md mx-auto">
      İlk ürününüzü ekleyerek başlayın veya mevcut platformlarınızdan ürünleri
      senkronize edin
    </p>
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <Button onClick={onAddProduct} variant="primary" icon={Package}>
        İlk Ürünü Ekle
      </Button>
      <Button onClick={onSync} variant="outline" icon={RefreshCw}>
        Platformlardan Senkronize Et
      </Button>
    </div>
  </div>
);

export default EmptyState;
