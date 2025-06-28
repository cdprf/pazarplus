import React from "react";
import {
  Package,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
} from "lucide-react";
import { Tooltip } from "../../ui";

const ProductStatusTabs = ({
  activeTab = "all",
  onTabChange,
  tabs = [],
  counts = {
    all: 0,
    out_of_stock: 0,
    low_stock: 0,
    in_stock: 0,
    pasif: 0,
    aktif: 0,
  },
  compact = false, // New prop for compact layout
  noWrap = false, // New prop for no-wrap horizontal scroll
}) => {
  // Enhanced tab configuration - showing only working tabs
  const tabsToRender =
    tabs.length > 0
      ? tabs
      : [
          // Core Status
          {
            key: "all",
            label: "Tüm Ürünler",
            count: counts.all,
            description: "Tüm ürünlerinizi görüntüleyebilirsiniz.",
            icon: <Package className="h-4 w-4" />,
          },
          {
            key: "aktif",
            label: "Aktif",
            count: counts.aktif,
            description: "Aktif durumundaki ürünlerinizi gösterir.",
            icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          },

          // Working Status tabs (from backend)
          {
            key: "pasif",
            label: "Pasif",
            count: counts.pasif,
            description: "Pasif durumundaki ürünlerinizi gösterir.",
            icon: <AlertCircle className="h-4 w-4 text-red-500" />,
          },
          {
            key: "low_stock",
            label: "Stoku Azalan",
            count: counts.low_stock,
            description: "Stok seviyesi kritik olan ürünlerinizi gösterir.",
            icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
          },

          // Working Stock Status tabs
          {
            key: "out_of_stock",
            label: "Stokta Olmayan",
            count: counts.out_of_stock,
            description: "Stoku tükenen ürünlerinizi gösterir.",
            icon: <Package className="h-4 w-4 text-red-500" />,
          },
          {
            key: "in_stock",
            label: "Stokta Bulunan",
            count: counts.in_stock,
            description: "Yeterli stoku olan ürünlerinizi gösterir.",
            icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          },
        ];

  return (
    <div
      className={`${compact ? "border-b-0" : "border-b border-gray-200"} ${
        compact ? "py-1" : ""
      }`}
    >
      <div className={noWrap ? "overflow-x-auto scrollbar-hide" : ""}>
        <nav
          className={`flex ${noWrap ? "gap-1 min-w-max" : "flex-wrap gap-1"} ${
            compact ? "sm:gap-2" : "sm:gap-4"
          }`}
          role="tablist"
          aria-label="Ürün durumu sekmeleri"
        >
          {tabsToRender.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange?.(tab.key)}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={`tabpanel-${tab.key}`}
              className={`group relative ${
                compact ? "py-1.5 px-2" : "py-2 px-3"
              } border-b-2 font-medium text-sm transition-colors ${
                noWrap ? "flex-shrink-0 whitespace-nowrap" : "flex-shrink-0"
              } ${
                activeTab === tab.key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div
                className={`flex items-center ${
                  compact ? "space-x-1" : "space-x-1.5"
                }`}
              >
                {!compact && !noWrap && (
                  <span className="hidden sm:inline">{tab.icon}</span>
                )}
                <span
                  className={`${
                    compact || noWrap ? "text-xs" : "text-xs sm:text-sm"
                  }`}
                >
                  {tab.label}
                </span>
                <span
                  className={`text-xs ${
                    compact ? "px-1 py-0.5" : "px-1.5 py-0.5"
                  } rounded-full bg-gray-100 ${
                    activeTab === tab.key
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-500"
                  }`}
                >
                  {tab.count?.toLocaleString() || 0}
                </span>
                {!compact && !noWrap && tab.description && (
                  <Tooltip content={tab.description}>
                    <Info className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline" />
                  </Tooltip>
                )}
              </div>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default ProductStatusTabs;
