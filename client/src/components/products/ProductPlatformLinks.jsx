import React from "react";
import { Globe, ExternalLink } from "lucide-react";

const ProductPlatformLinks = ({ product }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
        <Globe className="h-5 w-5 mr-2" />
        Platform Bağlantıları
      </h3>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        <p>Ürünün platform bağlantıları ve durumu burada görüntülenecek.</p>
        {product && (
          <div className="mt-4 space-y-2">
            {product.platform_links && product.platform_links.length > 0 ? (
              product.platform_links.map((link, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                >
                  <span>{link.platform}</span>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              ))
            ) : (
              <p>Platform bağlantısı bulunamadı.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductPlatformLinks;
