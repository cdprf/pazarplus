import React from "react";
import { Info } from "lucide-react";
import { Tooltip } from "../../ui";

const ProductQuotaDisplay = ({
  currentCount = 0,
  maxLimit = 75000,
  level = 2,
}) => {
  const percentage = (currentCount / maxLimit) * 100;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          {/* Level Info */}
          <div className="text-center">
            <p className="text-xs font-medium text-gray-600 mb-1">
              Ürün Limit Seviyesi
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-blue-600">
                Seviye {level}
              </span>
              <Tooltip content="Ürün limit seviyeniz satıcı seviyeniz baz alınarak hesaplanmaktadır. Haftalık olarak güncellenir.">
                <Info className="h-4 w-4 text-gray-400 cursor-help" />
              </Tooltip>
            </div>
          </div>

          {/* Divider */}
          <div className="h-12 w-px bg-gray-300"></div>

          {/* Count Info */}
          <div className="text-center">
            <p className="text-xs font-medium text-gray-600 mb-1">Ürün Adeti</p>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-gray-900">
                {currentCount.toLocaleString()}
              </span>
              <span className="text-gray-400">/</span>
              <span className="text-lg font-bold text-gray-600">
                {maxLimit.toLocaleString()}
              </span>
              <Tooltip content="Mevcut ürün listeleme üst sınırınızı ve ürün adedinizi gösterir.">
                <Info className="h-4 w-4 text-gray-400 cursor-help" />
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex-1 mx-6">
          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  percentage > 80
                    ? "bg-red-500"
                    : percentage > 60
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              ></div>
            </div>
            <div className="text-right mt-1">
              <span className="text-xs text-gray-500">
                {percentage.toFixed(1)}% kullanılıyor
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductQuotaDisplay;
