import React from "react";
import { Package2 } from "lucide-react";

const ProductVariants = ({ product }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
        <Package2 className="h-5 w-5 mr-2" />
        Ürün Varyantları
      </h3>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        <p>Ürün varyantları ve seçenekleri burada görüntülenecek.</p>
        {product && (
          <div className="mt-4 space-y-2">
            {product.variants && product.variants.length > 0 ? (
              product.variants.map((variant, index) => (
                <div
                  key={index}
                  className="p-2 bg-gray-50 dark:bg-gray-700 rounded"
                >
                  <p>
                    <strong>Varyant:</strong> {variant.name || variant.sku}
                  </p>
                  <p>
                    <strong>Fiyat:</strong>{" "}
                    {variant.price ? `₺${variant.price}` : "Belirlenmemiş"}
                  </p>
                  <p>
                    <strong>Stok:</strong> {variant.stock || 0}
                  </p>
                </div>
              ))
            ) : (
              <p>Varyant bulunamadı.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductVariants;
