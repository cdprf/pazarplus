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
export const API_BASE_URL = process.env.REACT_APP_API_URL || "/api";

// Core Status Options
export const STATUS_OPTIONS = [
  { value: "active", label: "Aktif", variant: "success" },
  { value: "inactive", label: "Pasif", variant: "secondary" },
  { value: "draft", label: "Taslak", variant: "warning" },
];

// Approval Status Options
export const APPROVAL_STATUS_OPTIONS = [
  { value: "pending", label: "Onay Bekliyor", variant: "warning" },
  { value: "approved", label: "Onaylandı", variant: "success" },
  { value: "rejected", label: "Reddedildi", variant: "danger" },
  { value: "unapproved", label: "Onaysız", variant: "secondary" },
];

// Stock Status Options
export const STOCK_STATUS_OPTIONS = [
  { value: "in_stock", label: "Stokta", variant: "success" },
  { value: "low_stock", label: "Az Stok", variant: "warning" },
  { value: "out_of_stock", label: "Stok Yok", variant: "danger" },
];

// Product Type Options
export const PRODUCT_TYPE_OPTIONS = [
  { value: "main", label: "Ana Ürün", variant: "primary" },
  { value: "variant", label: "Varyant", variant: "secondary" },
  { value: "unset", label: "Belirtilmemiş", variant: "outline" },
];

// Platform Filter Options
export const PLATFORM_FILTER_OPTIONS = [
  { value: "all", label: "Tüm Platformlar" },
  { value: "trendyol", label: "Trendyol" },
  { value: "hepsiburada", label: "Hepsiburada" },
  { value: "n11", label: "N11" },
  { value: "amazon", label: "Amazon" },
  { value: "local", label: "Yerel" },
  { value: "csv", label: "CSV" },
  { value: "multiple", label: "Çoklu Platform" },
];

// Sync Status Options
export const SYNC_STATUS_OPTIONS = [
  { value: "synced", label: "Senkronize Edildi", variant: "success" },
  { value: "syncing", label: "Senkronizasyon Devam Ediyor", variant: "info" },
  {
    value: "sync_pending",
    label: "Senkronizasyon Bekliyor",
    variant: "warning",
  },
  { value: "sync_error", label: "Senkronizasyon Hatası", variant: "danger" },
  {
    value: "sync_failed",
    label: "Senkronizasyon Başarısız",
    variant: "danger",
  },
  { value: "partial", label: "Kısmi Senkronize", variant: "warning" },
];

// Combined Status Options for Filtering
export const ALL_STATUS_OPTIONS = [
  ...STATUS_OPTIONS,
  ...APPROVAL_STATUS_OPTIONS,
  ...SYNC_STATUS_OPTIONS,
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

// Status Tab Configuration
export const STATUS_TAB_CONFIG = {
  all: { key: "all", label: "Tüm Ürünler", icon: "Package" },
  active: { key: "active", label: "Aktif", icon: "CheckCircle" },
  inactive: { key: "inactive", label: "Pasif", icon: "AlertCircle" },
  draft: { key: "draft", label: "Taslak", icon: "Edit" },
  pending: { key: "pending", label: "Onay Bekliyor", icon: "AlertTriangle" },
  rejected: { key: "rejected", label: "Reddedildi", icon: "XCircle" },
  out_of_stock: { key: "out_of_stock", label: "Stok Yok", icon: "Package" },
  low_stock: { key: "low_stock", label: "Az Stok", icon: "AlertTriangle" },
  main_products: { key: "main_products", label: "Ana Ürünler", icon: "Crown" },
  variants: { key: "variants", label: "Varyantlar", icon: "Layers" },
  unset: { key: "unset", label: "Tür Belirtilmemiş", icon: "AlertCircle" },
};
