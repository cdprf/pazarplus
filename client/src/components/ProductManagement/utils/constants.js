import React from "react";
import { Globe, FileText, ShoppingBag } from "lucide-react";

// Shared Constants
export const CATEGORIES = [
  "Elektronik",
  "Giyim & Aksesuar",
  "Ev & Yaşam",
  "Kozmetik & Kişisel Bakım",
  "Spor & Outdoor",
  "Kitap & Müzik",
  "Anne & Bebek",
  "Otomotiv",
  "Süpermarket",
  "Petshop",
  "Oyuncak & Hobi",
  "Yapı Market",
];

export const PLATFORMS = [
  { value: "all", label: "Tüm Platformlar" },
  { value: "trendyol", label: "Trendyol" },
  { value: "hepsiburada", label: "Hepsiburada" },
  { value: "n11", label: "N11" },
  { value: "amazon", label: "Amazon" },
  { value: "csv", label: "CSV" },
  { value: "local", label: "Yerel" },
];

export const SORT_OPTIONS = [
  { value: "updatedAt-desc", label: "Son Güncelleme" },
  { value: "name-asc", label: "İsim (A-Z)" },
  { value: "name-desc", label: "İsim (Z-A)" },
  { value: "price-asc", label: "Fiyat (Düşük-Yüksek)" },
  { value: "price-desc", label: "Fiyat (Yüksek-Düşük)" },
  { value: "stockQuantity-asc", label: "Stok (Az-Çok)" },
  { value: "stockQuantity-desc", label: "Stok (Çok-Az)" },
];

// Platform Icons
export const PlatformIcons = {
  trendyol: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="#ff6000"
      className="flex-shrink-0"
    >
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  hepsiburada: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="#FF6000"
      className="flex-shrink-0"
    >
      <rect x="4" y="6" width="16" height="12" />
    </svg>
  ),
  n11: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="#CC0000"
      className="flex-shrink-0"
    >
      <polygon points="12,2 2,12 12,22 22,12" />
    </svg>
  ),
  amazon: <Globe className="h-4 w-4 flex-shrink-0 text-orange-500" />,
  csv: <FileText className="h-4 w-4 flex-shrink-0 text-gray-500" />,
  local: <ShoppingBag className="h-4 w-4 flex-shrink-0 text-gray-500" />,
};

// API Base Configuration
export const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5001/api";

// Status Options
export const STATUS_OPTIONS = [
  { value: "active", label: "Aktif", variant: "success" },
  { value: "inactive", label: "Pasif", variant: "secondary" },
  { value: "draft", label: "Taslak", variant: "warning" },
];

// Stock Status Options
export const STOCK_STATUS_OPTIONS = [
  { value: "in_stock", label: "Stokta", variant: "success" },
  { value: "low_stock", label: "Az Stok", variant: "warning" },
  { value: "out_of_stock", label: "Stok Yok", variant: "danger" },
];

// Pagination Options
export const PAGINATION_OPTIONS = [10, 25, 50, 100];

// Default Form Values
export const DEFAULT_PRODUCT_FORM = {
  name: "",
  sku: "",
  barcode: "",
  description: "",
  category: "",
  price: 0,
  costPrice: 0,
  stockQuantity: 0,
  minStockLevel: 0,
  weight: 0,
  dimensions: { length: "", width: "", height: "" },
  images: [],
  status: "active",
  platforms: {
    trendyol: { enabled: false, platformSku: "", price: "" },
    hepsiburada: { enabled: false, platformSku: "", price: "" },
    n11: { enabled: false, platformSku: "", price: "" },
    amazon: { enabled: false, platformSku: "", price: "" },
  },
  tags: [],
};
