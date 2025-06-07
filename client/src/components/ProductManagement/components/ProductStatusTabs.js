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
    active: 0,
    pending: 0,
    inactive: 0,
    outOfStock: 0,
  },
}) => {
  // Use dynamic tabs if provided, otherwise fallback to default tabs
  const tabsToRender =
    tabs.length > 0
      ? tabs
      : [
          {
            key: "all",
            label: "Tüm Ürünler",
            count: counts.all,
            description:
              "Arşivlenmemiş ve onaylı tüm ürünlerinize ulaşabilirsiniz.",
            icon: <Package className="h-4 w-4" />,
          },
          {
            key: "active",
            label: "Aktif Ürünler",
            count: counts.active,
            description: "Satıştaki ürünlerinizi gösterir.",
            icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          },
          {
            key: "pending",
            label: "Onay Sürecindeki Ürünler",
            count: counts.pending,
            description:
              "Onay bekleyen ve revize gereken ürünlerinizi gösterir.",
            icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
          },
          {
            key: "inactive",
            label: "Pasif Ürünler",
            count: counts.inactive,
            description: "Tükenen, kilitli ve arşiv ürünlerinizi gösterir.",
            icon: <AlertCircle className="h-4 w-4 text-red-500" />,
          },
        ];

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex space-x-8">
        {tabsToRender.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange?.(tab.key)}
            className={`group relative py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === tab.key
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center space-x-2">
              {tab.icon}
              <span>{tab.label}</span>
              {tab.description && (
                <Tooltip content={tab.description}>
                  <Info className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Tooltip>
              )}
            </div>
            <div className="mt-1">
              <span
                className={`text-xs ${
                  activeTab === tab.key ? "text-blue-500" : "text-gray-400"
                }`}
              >
                {tab.count?.toLocaleString() || 0} Ürün
              </span>
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default ProductStatusTabs;
