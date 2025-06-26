import React from "react";
import { ImageIcon, Eye } from "lucide-react";

const ProductMedia = ({ product }) => {
  const images = product?.images || [];
  const mainImage = product?.image || images[0];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
        <ImageIcon className="h-5 w-5 mr-2" />
        Medya Galerisi
      </h3>
      <div className="space-y-4">
        {mainImage && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Ana Görsel
            </p>
            <div className="relative">
              <img
                src={mainImage}
                alt={product?.name || "Ürün görseli"}
                className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                onError={(e) => {
                  e.target.src = "/api/placeholder/300/200";
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center opacity-0 hover:opacity-100">
                <Eye className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        )}

        {images.length > 1 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Diğer Görseller
            </p>
            <div className="grid grid-cols-3 gap-2">
              {images.slice(1).map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={image}
                    alt={`${product?.name || "Ürün"} görsel ${index + 2}`}
                    className="w-full h-24 object-cover rounded border border-gray-200 dark:border-gray-700"
                    onError={(e) => {
                      e.target.src = "/api/placeholder/150/100";
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity rounded flex items-center justify-center opacity-0 hover:opacity-100">
                    <Eye className="h-4 w-4 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!mainImage && images.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <ImageIcon className="h-12 w-12 mx-auto mb-2" />
            <p>Ürün görseli bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductMedia;
