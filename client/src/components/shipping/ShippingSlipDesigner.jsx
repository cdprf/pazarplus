import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import DataMapper from "../../utils/DataMapper";
import TemplateManager from "../../services/TemplateManager";
import {
  Loader2,
  Type,
  Image,
  QrCode,
  Smartphone,
  User,
  MapPin,
  Phone,
  CreditCard,
  Package,
  FileText,
  Archive,
  Tag,
  Database,
  DollarSign,
  Truck,
  Calendar,
  Globe,
  TrendingUp,
  BarChart3,
  Layout,
  Settings,
  Layers,
  AlignCenter,
  Copy,
  Trash2,
  Save,
  Download,
  Upload,
  Eye,
  Printer,
  X,
  Search,
  Grid,
  Ruler,
  Undo2 as Undo,
  Redo2 as Redo,
  Shield,
  Zap,
  Star,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  Monitor,
  Move,
  RotateCcw,
  RotateCw,
  Plus,
  Filter,
} from "lucide-react";

// UI Components following design system
import { Button } from "../ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Input, Label } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/Select";
import { Badge } from "../ui/Badge";
import { Modal } from "../ui/Modal";
import { Switch } from "../ui/Switch";
import { ScrollArea } from "../ui/ScrollArea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/Tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/Dialog";
import { useAlert } from "../../contexts/AlertContext";
import api from "../../services/api";

// Try to import react-barcode, fallback to custom implementation
let Barcode;
try {
  Barcode = require("react-barcode").default || require("react-barcode");
} catch (e) {
  console.warn("react-barcode not available, using fallback barcode component");
}

// Try to import react-qr-code, fallback to custom implementation
let QRCode;
try {
  QRCode = require("react-qr-code").default || require("react-qr-code");
} catch (e) {
  console.warn("react-qr-code not available, using fallback QR component");
}

// Fallback Barcode component
const FallbackBarcode = ({
  value = "1234567890",
  format = "CODE128",
  displayValue = true,
}) => (
  <div className="flex flex-col items-center justify-center h-full bg-gray-50 border border-gray-300 rounded">
    <div className="flex space-x-1 mb-1">
      {Array.from({ length: 30 }, (_, i) => (
        <div
          key={i}
          className="bg-black"
          style={{
            width: Math.random() > 0.5 ? "2px" : "1px",
            height: "20px",
          }}
        />
      ))}
    </div>
    {displayValue && (
      <div className="text-xs font-mono text-gray-700">{value}</div>
    )}
  </div>
);

// Fallback QR Code component
const FallbackQRCode = ({ value = "https://example.com", size = 64 }) => (
  <div className="flex items-center justify-center h-full bg-gray-50 border border-gray-300 rounded">
    <div
      className="grid grid-cols-8 gap-px"
      style={{ width: size, height: size }}
    >
      {Array.from({ length: 64 }, (_, i) => (
        <div
          key={i}
          className={Math.random() > 0.5 ? "bg-black" : "bg-white"}
          style={{ width: "100%", height: "100%" }}
        />
      ))}
    </div>
  </div>
);

// Utility functions
const generateId = () =>
  `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Paper size presets with common shipping label formats
const PAPER_SIZE_PRESETS = {
  A4: {
    width: 210,
    height: 297,
    name: "A4 (210 × 297 mm)",
    category: "Standard",
  },
  A5: {
    width: 148,
    height: 210,
    name: "A5 (148 × 210 mm)",
    category: "Standard",
  },
  A6: {
    width: 105,
    height: 148,
    name: "A6 (105 × 148 mm)",
    category: "Standard",
  },
  LETTER: {
    width: 216,
    height: 279,
    name: "Letter (8.5 × 11 in)",
    category: "Standard",
  },
  SHIPPING_LABEL_4X6: {
    width: 102,
    height: 152,
    name: "Shipping Label 4×6 (102 × 152 mm)",
    category: "Shipping",
  },
  SHIPPING_LABEL_4X4: {
    width: 102,
    height: 102,
    name: "Shipping Label 4×4 (102 × 102 mm)",
    category: "Shipping",
  },
  THERMAL_LABEL: {
    width: 100,
    height: 150,
    name: "Thermal Label (100 × 150 mm)",
    category: "Thermal",
  },
  ZEBRA_LABEL: {
    width: 102,
    height: 76,
    name: "Zebra Label (102 × 76 mm)",
    category: "Thermal",
  },
  CUSTOM: {
    width: 210,
    height: 297,
    name: "Özel Boyut",
    category: "Custom",
  },
};

// Template size presets for quick setup
const TEMPLATE_SIZE_PRESETS = [
  {
    id: "shipping-standard",
    name: "Standart Gönderi Belgesi",
    paperSize: "A4",
    orientation: "portrait",
    description: "Klasik A4 gönderi belgesi formatı",
    icon: "📄",
  },
  {
    id: "shipping-compact",
    name: "Kompakt Gönderi Belgesi",
    paperSize: "A5",
    orientation: "portrait",
    description: "Küçük paketler için A5 formatı",
    icon: "📋",
  },
  {
    id: "shipping-landscape",
    name: "Yatay Gönderi Belgesi",
    paperSize: "A4",
    orientation: "landscape",
    description: "Geniş etiketler için yatay A4 formatı",
    icon: "📊",
  },
  {
    id: "thermal-standard",
    name: "Standart Termal Etiket",
    paperSize: "THERMAL_LABEL",
    orientation: "portrait",
    description: "100×150mm termal yazıcı etiketi",
    icon: "🏷️",
  },
  {
    id: "thermal-compact",
    name: "Kompakt Termal Etiket",
    paperSize: "ZEBRA_LABEL",
    orientation: "portrait",
    description: "102×76mm Zebra/TSC uyumlu etiket",
    icon: "🎫",
  },
  {
    id: "shipping-label-4x6",
    name: "Kargo Etiketi 4×6",
    paperSize: "SHIPPING_LABEL_4X6",
    orientation: "portrait",
    description: "Standart kargo etiketi boyutu",
    icon: "📦",
  },
  {
    id: "shipping-label-4x4",
    name: "Kare Kargo Etiketi",
    paperSize: "SHIPPING_LABEL_4X4",
    orientation: "portrait",
    description: "Kare format kargo etiketi",
    icon: "⬜",
  },
  {
    id: "custom-size",
    name: "Özel Boyut",
    paperSize: "CUSTOM",
    orientation: "portrait",
    description: "Kendi boyutunuzu belirleyin",
    icon: "✏️",
  },
];

// Enhanced Element System with Comprehensive Types
const ELEMENT_TYPES = {
  // Basic elements
  TEXT: "text",
  IMAGE: "image",
  BARCODE: "barcode",
  QR_CODE: "qr_code",

  // Contact & Address
  RECIPIENT: "recipient",
  SENDER: "sender",
  CUSTOMER_INFO: "customer_info",
  SHIPPING_ADDRESS: "shipping_address",
  BILLING_ADDRESS: "billing_address",

  // Order Information
  ORDER_SUMMARY: "order_summary",
  ORDER_DETAILS: "order_details",
  ORDER_ITEMS: "order_items",
  ORDER_TOTALS: "order_totals",
  PAYMENT_INFO: "payment_info",

  // Product Information
  PRODUCT_LIST: "product_list",
  PRODUCT_DETAILS: "product_details",
  INVENTORY_INFO: "inventory_info",

  // Shipping & Tracking
  TRACKING_INFO: "tracking_info",
  CARRIER_INFO: "carrier_info",
  SHIPPING_METHOD: "shipping_method",
  DELIVERY_INFO: "delivery_info",

  // Platform Specific
  PLATFORM_INFO: "platform_info",
  TRENDYOL_DATA: "trendyol_data",
  HEPSIBURADA_DATA: "hepsiburada_data",
  N11_DATA: "n11_data",

  // Financial & Compliance
  INVOICE_INFO: "invoice_info",
  TAX_INFO: "tax_info",
  COMPLIANCE_DATA: "compliance_data",

  // Layout & Design
  HEADER: "header",
  FOOTER: "footer",
  DIVIDER: "divider",
  SPACER: "spacer",

  // Custom Fields
  CUSTOM_FIELD: "custom_field",
  CUSTOM_TABLE: "custom_table",
  CUSTOM_LIST: "custom_list",
};

// Enhanced Element Categories with Comprehensive Field Support
const ELEMENT_CATEGORIES = {
  basic: {
    name: "Temel Öğeler",
    icon: Type,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    elements: [
      {
        type: ELEMENT_TYPES.TEXT,
        name: "Metin",
        icon: Type,
        description: "Serbest metin alanı",
      },
      {
        type: ELEMENT_TYPES.IMAGE,
        name: "Resim",
        icon: Image,
        description: "Logo veya resim",
      },
      {
        type: ELEMENT_TYPES.BARCODE,
        name: "Barkod",
        icon: QrCode,
        description: "1D barkod (CODE128, EAN)",
      },
      {
        type: ELEMENT_TYPES.QR_CODE,
        name: "QR Kod",
        icon: Smartphone,
        description: "2D QR kod",
      },
      {
        type: ELEMENT_TYPES.DIVIDER,
        name: "Ayırıcı Çizgi",
        icon: Ruler,
        description: "Görsel ayırıcı",
      },
      {
        type: ELEMENT_TYPES.SPACER,
        name: "Boşluk",
        icon: Grid,
        description: "Boş alan",
      },
    ],
  },
  contact: {
    name: "İletişim & Adres",
    icon: User,
    color: "bg-green-50 text-green-700 border-green-200",
    elements: [
      {
        type: ELEMENT_TYPES.RECIPIENT,
        name: "Alıcı Bilgileri",
        icon: User,
        description: "Teslimat adresi ve alıcı bilgileri",
      },
      {
        type: ELEMENT_TYPES.SENDER,
        name: "Gönderici Bilgileri",
        icon: MapPin,
        description: "Firma bilgileri ve adres",
      },
      {
        type: ELEMENT_TYPES.CUSTOMER_INFO,
        name: "Müşteri Bilgileri",
        icon: Phone,
        description: "İletişim ve müşteri detayları",
      },
      {
        type: ELEMENT_TYPES.SHIPPING_ADDRESS,
        name: "Teslimat Adresi",
        icon: MapPin,
        description: "Detaylı teslimat adresi",
      },
      {
        type: ELEMENT_TYPES.BILLING_ADDRESS,
        name: "Fatura Adresi",
        icon: CreditCard,
        description: "Faturalandırma adresi",
      },
    ],
  },
  order: {
    name: "Sipariş Bilgileri",
    icon: Package,
    color: "bg-purple-50 text-purple-700 border-purple-200",
    elements: [
      {
        type: ELEMENT_TYPES.ORDER_SUMMARY,
        name: "Sipariş Özeti",
        icon: Package,
        description: "Temel sipariş bilgileri",
      },
      {
        type: ELEMENT_TYPES.ORDER_DETAILS,
        name: "Sipariş Detayları",
        icon: FileText,
        description: "Kapsamlı sipariş bilgileri",
      },
      {
        type: ELEMENT_TYPES.ORDER_ITEMS,
        name: "Sipariş Ürünleri",
        icon: Archive,
        description: "Ürün listesi ve miktarları",
      },
      {
        type: ELEMENT_TYPES.ORDER_TOTALS,
        name: "Sipariş Toplamları",
        icon: DollarSign,
        description: "Fiyat hesaplamaları",
      },
      {
        type: ELEMENT_TYPES.PAYMENT_INFO,
        name: "Ödeme Bilgileri",
        icon: CreditCard,
        description: "Ödeme yöntemi ve durumu",
      },
    ],
  },
  product: {
    name: "Ürün Bilgileri",
    icon: Archive,
    color: "bg-orange-50 text-orange-700 border-orange-200",
    elements: [
      {
        type: ELEMENT_TYPES.PRODUCT_LIST,
        name: "Ürün Listesi",
        icon: Archive,
        description: "Detaylı ürün listesi",
      },
      {
        type: ELEMENT_TYPES.PRODUCT_DETAILS,
        name: "Ürün Detayları",
        icon: Tag,
        description: "Ürün özellikleri ve açıklamaları",
      },
      {
        type: ELEMENT_TYPES.INVENTORY_INFO,
        name: "Stok Bilgileri",
        icon: Database,
        description: "Stok durumu ve SKU bilgileri",
      },
    ],
  },
  shipping: {
    name: "Kargo & Teslimat",
    icon: Truck,
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    elements: [
      {
        type: ELEMENT_TYPES.TRACKING_INFO,
        name: "Takip Bilgileri",
        icon: Truck,
        description: "Kargo takip numarası ve URL",
      },
      {
        type: ELEMENT_TYPES.CARRIER_INFO,
        name: "Kargo Şirketi",
        icon: Shield,
        description: "Taşıyıcı firma bilgileri",
      },
      {
        type: ELEMENT_TYPES.SHIPPING_METHOD,
        name: "Kargo Yöntemi",
        icon: Zap,
        description: "Teslimat hızı ve yöntem",
      },
      {
        type: ELEMENT_TYPES.DELIVERY_INFO,
        name: "Teslimat Bilgileri",
        icon: Calendar,
        description: "Teslimat tarihi ve saati",
      },
    ],
  },
  platform: {
    name: "Platform Verileri",
    icon: Globe,
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
    elements: [
      {
        type: ELEMENT_TYPES.PLATFORM_INFO,
        name: "Platform Bilgileri",
        icon: Globe,
        description: "Genel platform bilgileri",
      },
      {
        type: ELEMENT_TYPES.TRENDYOL_DATA,
        name: "Trendyol Verileri",
        icon: TrendingUp,
        description: "Trendyol özel alanları",
      },
      {
        type: ELEMENT_TYPES.HEPSIBURADA_DATA,
        name: "Hepsiburada Verileri",
        icon: BarChart3,
        description: "Hepsiburada özel alanları",
      },
      {
        type: ELEMENT_TYPES.N11_DATA,
        name: "N11 Verileri",
        icon: Star,
        description: "N11 özel alanları",
      },
    ],
  },
  financial: {
    name: "Mali & Uyumluluk",
    icon: CreditCard,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    elements: [
      {
        type: ELEMENT_TYPES.INVOICE_INFO,
        name: "Fatura Bilgileri",
        icon: FileText,
        description: "Fatura numarası ve tarihi",
      },
      {
        type: ELEMENT_TYPES.TAX_INFO,
        name: "Vergi Bilgileri",
        icon: DollarSign,
        description: "KDV ve vergi hesaplamaları",
      },
      {
        type: ELEMENT_TYPES.COMPLIANCE_DATA,
        name: "Uyumluluk Verileri",
        icon: Shield,
        description: "Yasal zorunluluk alanları",
      },
    ],
  },
  layout: {
    name: "Düzen & Tasarım",
    icon: Layout,
    color: "bg-gray-50 text-gray-700 border-gray-200",
    elements: [
      {
        type: ELEMENT_TYPES.HEADER,
        name: "Başlık",
        icon: AlignCenter,
        description: "Sayfa başlığı",
      },
      {
        type: ELEMENT_TYPES.FOOTER,
        name: "Alt Bilgi",
        icon: AlignCenter,
        description: "Sayfa altlığı",
      },
    ],
  },
  custom: {
    name: "Özel Alanlar",
    icon: Settings,
    color: "bg-rose-50 text-rose-700 border-rose-200",
    elements: [
      {
        type: ELEMENT_TYPES.CUSTOM_FIELD,
        name: "Özel Alan",
        icon: Settings,
        description: "Kişiselleştirilmiş alan",
      },
      {
        type: ELEMENT_TYPES.CUSTOM_TABLE,
        name: "Özel Tablo",
        icon: Grid,
        description: "Çok satırlı tablo verisi",
      },
      {
        type: ELEMENT_TYPES.CUSTOM_LIST,
        name: "Özel Liste",
        icon: Layers,
        description: "Madde işaretli liste",
      },
    ],
  },
};

// Enhanced element defaults with comprehensive field mappings
const elementDefaults = {
  [ELEMENT_TYPES.TEXT]: {
    content: "Sample Text",
    style: {
      fontSize: 14,
      fontFamily: "Inter, Arial, sans-serif",
      color: "#374151",
      textAlign: "left",
      backgroundColor: "transparent",
      fontWeight: "normal",
    },
    size: { width: 30, height: 8 },
  },

  [ELEMENT_TYPES.IMAGE]: {
    content: "",
    style: {
      objectFit: "contain",
      border: "2px dashed #d1d5db",
      backgroundColor: "transparent",
      borderRadius: "8px",
    },
    size: { width: 20, height: 15 },
  },

  [ELEMENT_TYPES.BARCODE]: {
    content: "1234567890123",
    style: {
      backgroundColor: "transparent",
    },
    size: { width: 35, height: 12 },
    options: {
      format: "CODE128",
      displayValue: true,
    },
  },

  [ELEMENT_TYPES.QR_CODE]: {
    content: "https://example.com/order/123",
    style: {
      backgroundColor: "transparent",
    },
    size: { width: 15, height: 15 },
    options: {
      errorCorrectionLevel: "M",
    },
  },

  // Contact & Address Elements
  [ELEMENT_TYPES.RECIPIENT]: {
    content: "",
    style: {
      fontSize: 11,
      textAlign: "left",
      color: "#374151",
      backgroundColor: "#f9fafb",
      padding: 16,
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      fontFamily: "Inter, Arial, sans-serif",
      lineHeight: "1.5",
    },
    size: { width: 48, height: 28 },
    fields: {
      showTitle: true,
      showName: true,
      showAddress: true,
      showCity: true,
      showPostalCode: true,
      showPhone: true,
      showEmail: false,
    },
  },

  [ELEMENT_TYPES.SENDER]: {
    content: "",
    style: {
      fontSize: 11,
      textAlign: "left",
      color: "#374151",
      backgroundColor: "#f9fafb",
      padding: 16,
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      fontFamily: "Inter, Arial, sans-serif",
      lineHeight: "1.5",
    },
    size: { width: 48, height: 28 },
    fields: {
      showTitle: true,
      showCompany: true,
      showAddress: true,
      showCity: true,
      showPostalCode: true,
      showPhone: true,
      showEmail: true,
      showWebsite: false,
    },
  },

  [ELEMENT_TYPES.CUSTOMER_INFO]: {
    content: "",
    style: {
      fontSize: 10,
      textAlign: "left",
      color: "#374151",
      backgroundColor: "#fefefe",
      padding: 12,
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 45, height: 22 },
    fields: {
      showName: true,
      showEmail: true,
      showPhone: true,
      showCustomerId: false,
      showRegistrationDate: false,
    },
  },

  [ELEMENT_TYPES.SHIPPING_ADDRESS]: {
    content: "",
    style: {
      fontSize: 10,
      textAlign: "left",
      color: "#374151",
      backgroundColor: "#f8fafc",
      padding: 12,
      border: "1px solid #cbd5e1",
      borderRadius: "6px",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 50, height: 25 },
  },

  [ELEMENT_TYPES.BILLING_ADDRESS]: {
    content: "",
    style: {
      fontSize: 10,
      textAlign: "left",
      color: "#374151",
      backgroundColor: "#f8fafc",
      padding: 12,
      border: "1px solid #cbd5e1",
      borderRadius: "6px",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 50, height: 25 },
  },

  // Order Information Elements
  [ELEMENT_TYPES.ORDER_SUMMARY]: {
    content: "",
    style: {
      fontSize: 11,
      textAlign: "left",
      color: "#1f2937",
      backgroundColor: "#ffffff",
      padding: 12,
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 96, height: 20 },
    fields: {
      showOrderNumber: true,
      showOrderDate: true,
      showStatus: true,
      showPlatform: true,
      showTotalAmount: true,
      showCurrency: true,
      showWeight: false,
      showDimensions: false,
      showNotes: false,
    },
    dataMapping: {
      orderNumber: "order.orderNumber",
      orderDate: "order.createdAt",
      status: "order.status",
      platform: "order.connection.platform",
      totalAmount: "order.totalAmount",
      currency: "order.currency",
      weight: "order.shipping.weight",
      dimensions: "order.shipping.dimensions",
      notes: "order.notes",
    },
  },

  [ELEMENT_TYPES.ORDER_DETAILS]: {
    content: "",
    style: {
      fontSize: 10,
      textAlign: "left",
      color: "#374151",
      backgroundColor: "#fafafa",
      padding: 10,
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 96, height: 25 },
    fields: {
      showExternalOrderId: true,
      showPlatformOrderId: true,
      showConnectionInfo: true,
      showOrderDate: true,
      showLastSync: false,
      showNotes: false,
    },
  },

  [ELEMENT_TYPES.ORDER_ITEMS]: {
    content: "",
    style: {
      fontSize: 9,
      textAlign: "left",
      color: "#374151",
      backgroundColor: "#ffffff",
      padding: 8,
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 96, height: 35 },
    fields: {
      showProductName: true,
      showSku: true,
      showQuantity: true,
      showPrice: true,
      showTotal: true,
      showBarcode: false,
      showVariantInfo: false,
    },
  },

  [ELEMENT_TYPES.ORDER_TOTALS]: {
    content: "",
    style: {
      fontSize: 11,
      textAlign: "right",
      color: "#1f2937",
      backgroundColor: "#f9fafb",
      padding: 12,
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      fontFamily: "Inter, Arial, sans-serif",
      fontWeight: "medium",
    },
    size: { width: 40, height: 18 },
    fields: {
      showSubtotal: true,
      showShipping: true,
      showTax: true,
      showDiscount: false,
      showTotal: true,
    },
  },

  [ELEMENT_TYPES.PAYMENT_INFO]: {
    content: "",
    style: {
      fontSize: 10,
      textAlign: "left",
      color: "#374151",
      backgroundColor: "#f0fdf4",
      padding: 10,
      border: "1px solid #bbf7d0",
      borderRadius: "6px",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 35, height: 15 },
    fields: {
      showPaymentMethod: true,
      showPaymentStatus: true,
      showTransactionId: false,
      showPaymentDate: false,
    },
  },

  // Product Information Elements
  [ELEMENT_TYPES.PRODUCT_LIST]: {
    content: "",
    style: {
      fontSize: 9,
      textAlign: "left",
      color: "#374151",
      backgroundColor: "#ffffff",
      padding: 8,
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 96, height: 40 },
    fields: {
      showProductName: true,
      showSku: true,
      showQuantity: true,
      showUnitPrice: true,
      showTotalPrice: true,
      showBarcode: false,
      showCategory: false,
      showBrand: false,
      showWeight: false,
      showDimensions: false,
      showVariantInfo: true,
      showDiscounts: false,
    },
    dataMapping: {
      productName: "items[].product.name",
      sku: "items[].product.sku",
      quantity: "items[].quantity",
      unitPrice: "items[].unitPrice",
      totalPrice: "items[].totalPrice",
      barcode: "items[].product.barcode",
      category: "items[].product.category",
      brand: "items[].product.brand",
      weight: "items[].product.weight",
      dimensions: "items[].product.dimensions",
      variantInfo: "items[].variant",
      discounts: "items[].discounts",
    },
    tableConfig: {
      showHeaders: true,
      alternateRowColors: true,
      maxRows: 10,
      columns: [
        { field: "productName", label: "Ürün Adı", width: 40 },
        { field: "sku", label: "SKU", width: 15 },
        { field: "quantity", label: "Adet", width: 10 },
        { field: "unitPrice", label: "Birim Fiyat", width: 15 },
        { field: "totalPrice", label: "Toplam", width: 20 },
      ],
    },
  },

  [ELEMENT_TYPES.PRODUCT_DETAILS]: {
    content: "",
    style: {
      fontSize: 10,
      textAlign: "left",
      color: "#374151",
      backgroundColor: "#fafafa",
      padding: 10,
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 45, height: 25 },
  },

  [ELEMENT_TYPES.INVENTORY_INFO]: {
    content: "",
    style: {
      fontSize: 10,
      textAlign: "left",
      color: "#374151",
      backgroundColor: "#fef3c7",
      padding: 10,
      border: "1px solid #fcd34d",
      borderRadius: "6px",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 30, height: 15 },
  },

  // Shipping & Tracking Elements
  [ELEMENT_TYPES.TRACKING_INFO]: {
    content: "",
    style: {
      fontSize: 11,
      textAlign: "center",
      color: "#1f2937",
      backgroundColor: "#dbeafe",
      padding: 12,
      border: "2px solid #3b82f6",
      borderRadius: "8px",
      fontFamily: "Inter, Arial, sans-serif",
      fontWeight: "medium",
    },
    size: { width: 50, height: 15 },
    fields: {
      showTrackingNumber: true,
      showCarrier: true,
      showService: true,
      showTrackingUrl: false,
      showShipDate: true,
      showEstimatedDelivery: true,
      showActualDelivery: false,
      showSignature: false,
      showInsurance: false,
    },
    dataMapping: {
      trackingNumber: "shipping.trackingNumber",
      carrier: "shipping.carrier.name",
      service: "shipping.service",
      trackingUrl: "shipping.trackingUrl",
      shipDate: "shipping.shipDate",
      estimatedDelivery: "shipping.estimatedDelivery",
      actualDelivery: "shipping.actualDelivery",
      signature: "shipping.requiresSignature",
      insurance: "shipping.insurance",
    },
  },

  [ELEMENT_TYPES.CARRIER_INFO]: {
    content: "",
    style: {
      fontSize: 10,
      textAlign: "left",
      color: "#374151",
      backgroundColor: "#f0f9ff",
      padding: 10,
      border: "1px solid #0ea5e9",
      borderRadius: "6px",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 35, height: 12 },
  },

  [ELEMENT_TYPES.SHIPPING_METHOD]: {
    content: "",
    style: {
      fontSize: 10,
      textAlign: "left",
      color: "#374151",
      backgroundColor: "#ffffff",
      padding: 8,
      border: "1px solid #e5e7eb",
      borderRadius: "4px",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 25, height: 8 },
  },

  [ELEMENT_TYPES.DELIVERY_INFO]: {
    content: "",
    style: {
      fontSize: 10,
      textAlign: "left",
      color: "#374151",
      backgroundColor: "#ecfdf5",
      padding: 10,
      border: "1px solid #10b981",
      borderRadius: "6px",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 40, height: 18 },
  },

  // Platform Specific Elements
  [ELEMENT_TYPES.PLATFORM_INFO]: {
    content: "",
    style: {
      fontSize: 10,
      textAlign: "left",
      color: "#374151",
      backgroundColor: "#f8fafc",
      padding: 10,
      border: "1px solid #cbd5e1",
      borderRadius: "6px",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 30, height: 12 },
  },

  [ELEMENT_TYPES.TRENDYOL_DATA]: {
    content: "",
    style: {
      fontSize: 9,
      textAlign: "left",
      color: "#374151",
      backgroundColor: "#fff7ed",
      padding: 8,
      border: "1px solid #fb923c",
      borderRadius: "6px",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 45, height: 20 },
  },

  [ELEMENT_TYPES.HEPSIBURADA_DATA]: {
    content: "",
    style: {
      fontSize: 9,
      textAlign: "left",
      color: "#374151",
      backgroundColor: "#fef2f2",
      padding: 8,
      border: "1px solid #f87171",
      borderRadius: "6px",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 45, height: 20 },
  },

  [ELEMENT_TYPES.N11_DATA]: {
    content: "",
    style: {
      fontSize: 9,
      textAlign: "left",
      color: "#374151",
      backgroundColor: "#f0f9ff",
      padding: 8,
      border: "1px solid #0ea5e9",
      borderRadius: "6px",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 45, height: 20 },
  },

  // Financial & Compliance Elements
  [ELEMENT_TYPES.INVOICE_INFO]: {
    content: "",
    style: {
      fontSize: 10,
      textAlign: "left",
      color: "#374151",
      backgroundColor: "#fefce8",
      padding: 10,
      border: "1px solid #eab308",
      borderRadius: "6px",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 40, height: 15 },
    fields: {
      showInvoiceNumber: true,
      showInvoiceDate: true,
      showInvoiceStatus: true,
      showTaxNumber: false,
      showTaxOffice: false,
    },
  },

  [ELEMENT_TYPES.TAX_INFO]: {
    content: "",
    style: {
      fontSize: 10,
      textAlign: "left",
      color: "#374151",
      backgroundColor: "#f0fdf4",
      padding: 10,
      border: "1px solid #22c55e",
      borderRadius: "6px",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 35, height: 12 },
  },

  [ELEMENT_TYPES.COMPLIANCE_DATA]: {
    content: "",
    style: {
      fontSize: 9,
      textAlign: "left",
      color: "#374151",
      backgroundColor: "#faf5ff",
      padding: 8,
      border: "1px solid #a855f7",
      borderRadius: "6px",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 50, height: 18 },
  },

  // Layout & Design Elements
  [ELEMENT_TYPES.HEADER]: {
    content: "GÖNDERİ BELGESİ",
    style: {
      fontSize: 24,
      fontWeight: "bold",
      textAlign: "center",
      color: "#1e40af",
      backgroundColor: "transparent",
      padding: 12,
      border: "none",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 100, height: 8 },
  },

  [ELEMENT_TYPES.FOOTER]: {
    content:
      "Bu belge Pazar+ Order Management System tarafından oluşturulmuştur.",
    style: {
      fontSize: 8,
      textAlign: "center",
      color: "#9ca3af",
      fontFamily: "Inter, Arial, sans-serif",
      backgroundColor: "transparent",
    },
    size: { width: 100, height: 5 },
  },

  [ELEMENT_TYPES.DIVIDER]: {
    content: "",
    style: {
      backgroundColor: "#e5e7eb",
      border: "none",
      height: "2px",
    },
    size: { width: 100, height: 1 },
  },

  [ELEMENT_TYPES.SPACER]: {
    content: "",
    style: {
      backgroundColor: "transparent",
      border: "none",
    },
    size: { width: 100, height: 3 },
  },

  // Custom Field Elements
  [ELEMENT_TYPES.CUSTOM_FIELD]: {
    content: "Özel Alan",
    style: {
      fontSize: 12,
      textAlign: "left",
      color: "#374151",
      backgroundColor: "#f9fafb",
      padding: 8,
      border: "1px dashed #9ca3af",
      borderRadius: "4px",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 30, height: 8 },
    customField: {
      label: "Özel Alan",
      dataType: "text",
      defaultValue: "",
      required: false,
    },
  },

  [ELEMENT_TYPES.CUSTOM_TABLE]: {
    content: "",
    style: {
      fontSize: 10,
      textAlign: "left",
      color: "#374151",
      backgroundColor: "#ffffff",
      padding: 8,
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 80, height: 25 },
    customTable: {
      columns: [
        { label: "Alan 1", width: 25, dataPath: "", align: "left" },
        { label: "Alan 2", width: 25, dataPath: "", align: "left" },
      ],
      showHeaders: true,
      headerStyle: {
        backgroundColor: "#f3f4f6",
        fontWeight: "bold",
        borderBottom: "2px solid #e5e7eb",
      },
      alternateRows: true,
      maxRows: 5,
      rowHeight: "auto",
      borderStyle: "grid", // grid, horizontal, none
    },
  },

  [ELEMENT_TYPES.CUSTOM_LIST]: {
    content: "",
    style: {
      fontSize: 11,
      textAlign: "left",
      color: "#374151",
      backgroundColor: "#ffffff",
      padding: 10,
      border: "1px solid #e5e7eb",
      borderRadius: "6px",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 50, height: 20 },
    customList: {
      items: ["Öğe 1", "Öğe 2", "Öğe 3"],
      listType: "bullet", // bullet, number, none
      showTitle: true,
      title: "Özel Liste",
    },
  },
};

// Complete implementation of missing utility functions and hooks
const getPaperDimensions = (config) => {
  let dimensions;

  if (config.paperSize === "CUSTOM" && config.customDimensions) {
    dimensions = {
      width: config.customDimensions.width,
      height: config.customDimensions.height,
    };
  } else {
    dimensions = PAPER_SIZE_PRESETS[config.paperSize] || PAPER_SIZE_PRESETS.A4;
  }

  return config.orientation === "landscape"
    ? { width: dimensions.height, height: dimensions.width }
    : { width: dimensions.width, height: dimensions.height };
};

// Custom Hooks for Better State Management
const useDesignerState = () => {
  const [elements, setElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [templateConfig, setTemplateConfig] = useState({
    name: "Özel Şablon",
    paperSize: "A4",
    orientation: "portrait",
    margins: { top: 10, bottom: 10, left: 10, right: 10 },
  });
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isInitialized, setIsInitialized] = useState(false);

  // Save to history for undo/redo
  const saveToHistory = useCallback(
    (newElements) => {
      if (!isInitialized) return;

      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newElements)));

      // Limit history size
      if (newHistory.length > 50) {
        newHistory.shift();
        setHistoryIndex(newHistory.length - 1);
      } else {
        setHistoryIndex(newHistory.length - 1);
      }

      setHistory(newHistory);
    },
    [history, historyIndex, isInitialized]
  );

  // Initialize with default elements
  useEffect(() => {
    if (elements.length === 0 && !isInitialized) {
      const defaultElements = [
        {
          id: generateId(),
          type: ELEMENT_TYPES.HEADER,
          position: { x: 5, y: 5 },
          ...elementDefaults[ELEMENT_TYPES.HEADER],
        },
        {
          id: generateId(),
          type: ELEMENT_TYPES.RECIPIENT,
          position: { x: 5, y: 15 },
          ...elementDefaults[ELEMENT_TYPES.RECIPIENT],
        },
        {
          id: generateId(),
          type: ELEMENT_TYPES.ORDER_SUMMARY,
          position: { x: 55, y: 15 },
          ...elementDefaults[ELEMENT_TYPES.ORDER_SUMMARY],
        },
        {
          id: generateId(),
          type: ELEMENT_TYPES.FOOTER,
          position: { x: 5, y: 90 },
          ...elementDefaults[ELEMENT_TYPES.FOOTER],
        },
      ];

      setElements(defaultElements);
      setHistory([defaultElements]);
      setHistoryIndex(0);
      setIsInitialized(true);
    }
  }, [
    elements.length,
    isInitialized,
    setElements,
    setHistory,
    setHistoryIndex,
    setIsInitialized,
  ]);

  // Centralized element operations
  const elementOperations = useMemo(
    () => ({
      add: (type, position = { x: 10, y: 10 }) => {
        const newElement = {
          id: generateId(),
          type,
          position,
          ...elementDefaults[type],
        };

        const newElements = [...elements, newElement];
        setElements(newElements);
        setSelectedElement(newElement);
        saveToHistory(newElements);
      },

      update: (id, updates) => {
        const newElements = elements.map((el) =>
          el.id === id ? { ...el, ...updates } : el
        );
        setElements(newElements);

        if (selectedElement?.id === id) {
          setSelectedElement({ ...selectedElement, ...updates });
        }

        saveToHistory(newElements);
      },

      remove: (id) => {
        const newElements = elements.filter((el) => el.id !== id);
        setElements(newElements);

        if (selectedElement?.id === id) {
          setSelectedElement(null);
        }

        saveToHistory(newElements);
      },

      duplicate: (element) => {
        const duplicatedElement = {
          ...element,
          id: generateId(),
          position: {
            x: element.position.x + 5,
            y: element.position.y + 5,
          },
        };

        const newElements = [...elements, duplicatedElement];
        setElements(newElements);
        setSelectedElement(duplicatedElement);
        saveToHistory(newElements);
      },

      toggleVisibility: (id, visible) => {
        const newElements = elements.map((el) =>
          el.id === id ? { ...el, visible } : el
        );
        setElements(newElements);
        saveToHistory(newElements);
      },

      reorder: (activeId, overId) => {
        const activeIndex = elements.findIndex((el) => el.id === activeId);
        const overIndex = elements.findIndex((el) => el.id === overId);

        if (activeIndex !== -1 && overIndex !== -1) {
          const newElements = [...elements];
          const [removed] = newElements.splice(activeIndex, 1);
          newElements.splice(overIndex, 0, removed);
          setElements(newElements);
          saveToHistory(newElements);
        }
      },
    }),
    [elements, selectedElement, saveToHistory]
  );

  // Undo/Redo operations
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setElements(history[newIndex]);
      setHistoryIndex(newIndex);
      setSelectedElement(null);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setElements(history[newIndex]);
      setHistoryIndex(newIndex);
      setSelectedElement(null);
    }
  }, [historyIndex, history]);

  return {
    elements,
    selectedElement,
    templateConfig,
    setSelectedElement,
    setTemplateConfig,
    setElements,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    ...elementOperations,
  };
};

// TemplateSettingsPanel Component
const TemplateSettingsPanel = ({
  config,
  onConfigChange,
  onSave,
  onLoad,
  onExport,
  onImport,
  savedTemplates,
  onShowTemplates,
}) => {
  const [showCustomSize, setShowCustomSize] = useState(
    config.paperSize === "CUSTOM"
  );
  const fileInputRef = useRef(null);

  const handlePaperSizeChange = (paperSize) => {
    onConfigChange({
      ...config,
      paperSize,
      customDimensions:
        paperSize === "CUSTOM"
          ? config.customDimensions || { width: 210, height: 297 }
          : undefined,
    });
    setShowCustomSize(paperSize === "CUSTOM");
  };

  const handleCustomDimensionChange = (dimension, value) => {
    const customDimensions = {
      ...config.customDimensions,
      [dimension]: parseFloat(value) || 0,
    };
    onConfigChange({ ...config, customDimensions });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const templateData = JSON.parse(text);

      if (templateData.config && templateData.elements) {
        onImport(templateData);
      } else {
        throw new Error("Invalid template format");
      }
    } catch (error) {
      console.error("Template import error:", error);
      alert("Şablon dosyası geçersiz veya bozuk.");
    }

    // Reset file input
    event.target.value = "";
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-medium text-sm mb-4">Şablon Ayarları</h3>

        {/* Template Name */}
        <div className="space-y-2 mb-4">
          <Label>Şablon Adı</Label>
          <Input
            value={config.name}
            onChange={(e) =>
              onConfigChange({ ...config, name: e.target.value })
            }
            placeholder="Şablon adını girin..."
          />
        </div>

        {/* Paper Size */}
        <div className="space-y-2 mb-4">
          <Label>Kağıt Boyutu</Label>
          <Select
            value={config.paperSize}
            onValueChange={handlePaperSizeChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PAPER_SIZE_PRESETS).map(([key, preset]) => (
                <SelectItem key={key} value={key}>
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Dimensions */}
        {showCustomSize && (
          <div className="space-y-2 mb-4">
            <Label>Özel Boyutlar (mm)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Genişlik</Label>
                <Input
                  type="number"
                  value={config.customDimensions?.width || 210}
                  onChange={(e) =>
                    handleCustomDimensionChange("width", e.target.value)
                  }
                  placeholder="210"
                />
              </div>
              <div>
                <Label className="text-xs">Yükseklik</Label>
                <Input
                  type="number"
                  value={config.customDimensions?.height || 297}
                  onChange={(e) =>
                    handleCustomDimensionChange("height", e.target.value)
                  }
                  placeholder="297"
                />
              </div>
            </div>
          </div>
        )}

        {/* Orientation */}
        <div className="space-y-2 mb-4">
          <Label>Yönelim</Label>
          <Select
            value={config.orientation}
            onValueChange={(value) =>
              onConfigChange({ ...config, orientation: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="portrait">Dikey (Portrait)</SelectItem>
              <SelectItem value="landscape">Yatay (Landscape)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Margins */}
        <div className="space-y-2 mb-4">
          <Label>Kenar Boşlukları (mm)</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Üst</Label>
              <Input
                type="number"
                value={config.margins?.top || 10}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    margins: {
                      ...config.margins,
                      top: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Alt</Label>
              <Input
                type="number"
                value={config.margins?.bottom || 10}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    margins: {
                      ...config.margins,
                      bottom: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Sol</Label>
              <Input
                type="number"
                value={config.margins?.left || 10}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    margins: {
                      ...config.margins,
                      left: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Sağ</Label>
              <Input
                type="number"
                value={config.margins?.right || 10}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    margins: {
                      ...config.margins,
                      right: parseFloat(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Template Actions */}
      <div className="p-4 space-y-2">
        <div className="space-y-2">
          <Button onClick={onSave} className="w-full" size="sm">
            <Save className="h-3 w-3 mr-2" />
            Şablonu Kaydet
          </Button>

          <Button
            onClick={onShowTemplates}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <FolderOpen className="h-3 w-3 mr-2" />
            Kaydedilen Şablonlar ({savedTemplates?.length || 0})
          </Button>

          <Button
            onClick={onExport}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <Download className="h-3 w-3 mr-2" />
            Şablonu Dışa Aktar
          </Button>

          <Button
            onClick={handleImportClick}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <Upload className="h-3 w-3 mr-2" />
            Şablon İçe Aktar
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};

// TemplateModal Component
const TemplateModal = ({
  isOpen,
  onClose,
  onLoad,
  onDelete,
  savedTemplates,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTemplates = useMemo(() => {
    return savedTemplates.filter(
      (template) =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [savedTemplates, searchTerm]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Kaydedilen Şablonlar</DialogTitle>
          <DialogDescription>
            Önceden kaydedilmiş şablonları yükleyin veya silin
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Şablon ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Templates Grid */}
          <ScrollArea className="h-96">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  {searchTerm
                    ? "Arama sonucu bulunamadı"
                    : "Henüz kaydedilmiş şablon yok"}
                </h3>
                <p className="text-xs text-gray-500">
                  {searchTerm
                    ? "Farklı bir terim deneyin"
                    : "İlk şablonunuzu kaydedin"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">
                            {template.name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {template.elements?.length || 0} öğe
                          </p>
                        </div>
                        <div className="flex space-x-1 ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onLoad(template)}
                            title="Yükle"
                          >
                            <FolderOpen className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDelete(template.id)}
                            title="Sil"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 space-y-1">
                        <div>
                          Boyut:{" "}
                          {PAPER_SIZE_PRESETS[template.paperSize]?.name ||
                            template.paperSize}
                        </div>
                        <div>Oluşturulma: {formatDate(template.createdAt)}</div>
                        {template.updatedAt !== template.createdAt && (
                          <div>
                            Güncelleme: {formatDate(template.updatedAt)}
                          </div>
                        )}
                      </div>

                      {/* Mini preview */}
                      <div className="mt-3 h-20 bg-gray-50 border border-gray-200 rounded-md relative overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                          <FileText className="h-6 w-6 mr-2" />
                          Resim yok
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// PreviewModal Component
const PreviewModal = ({
  isOpen,
  onClose,
  elements,
  paperDimensions,
  templateConfig,
  onPrint,
}) => {
  const printRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
        <html>
          <head>
            <title>Gönderi Belgesi - ${templateConfig.name}</title>
            <style>
              @media print {
                body { margin: 0; padding: 0; }
                .no-print { display: none !important; }
              }
              body { font-family: Arial, sans-serif; }
            </style>
          </head>
          <body>
            ${printRef.current.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
    onPrint?.();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`${
          isFullscreen
            ? "max-w-[95vw] max-h-[95vh] h-[95vh]"
            : "max-w-6xl max-h-[90vh]"
        }`}
      >
        <DialogHeader>
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle>Baskı Önizleme - {templateConfig.name}</DialogTitle>
              <DialogDescription>
                Gönderi belgesinin baskı önizlemesi
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <div
            ref={printRef}
            className="mx-auto bg-white shadow-lg border"
            style={{
              width: `${
                paperDimensions.width * (isFullscreen ? 0.7 : 0.5) * 2
              }px`,
              height: `${
                paperDimensions.height * (isFullscreen ? 0.7 : 0.5) * 2
              }px`,
              position: "relative",
              transform: `scale(${isFullscreen ? 0.7 : 0.5})`,
              transformOrigin: "top center",
            }}
          >
            {elements
              .filter((element) => element.visible !== false)
              .sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1))
              .map((element) => (
                <ElementRenderer
                  key={element.id}
                  element={element}
                  isSelected={false}
                  onPointerDown={() => {}}
                  paperDimensions={paperDimensions}
                  scale={1}
                  orderData={null}
                />
              ))}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            Boyut: {paperDimensions.width} × {paperDimensions.height} mm
          </div>
          <div className="space-x-2">
            <Button variant="outline" onClick={onClose}>
              Kapat
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Yazdır
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ResponsivePreviewModal Component
const ResponsivePreviewModal = ({
  isOpen,
  onClose,
  elements,
  paperDimensions,
  templateConfig,
  orderData,
}) => {
  const [viewMode, setViewMode] = useState("desktop");
  const printRef = useRef(null);

  const getScaleFactor = () => {
    switch (viewMode) {
      case "mobile":
        return 0.3;
      case "tablet":
        return 0.45;
      default: // desktop
        return 0.6;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Cihaz Önizleme - {templateConfig.name}</DialogTitle>
          <DialogDescription>
            Gönderi belgesinin farklı cihazlarda görünümünü önizleyin
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center mb-4 space-x-2">
          <Button
            variant={viewMode === "mobile" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("mobile")}
            className="flex items-center"
          >
            <Smartphone className="h-4 w-4 mr-2" />
            Mobil
          </Button>
          <Button
            variant={viewMode === "tablet" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("tablet")}
            className="flex items-center"
          >
            <TabletIcon className="h-4 w-4 mr-2" />
            Tablet
          </Button>
          <Button
            variant={viewMode === "desktop" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("desktop")}
            className="flex items-center"
          >
            <Monitor className="h-4 w-4 mr-2" />
            Masaüstü
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          <div
            className={`mx-auto bg-white shadow-lg border ${
              viewMode === "mobile"
                ? "w-[320px]"
                : viewMode === "tablet"
                ? "w-[768px]"
                : "w-full"
            }`}
          >
            <div
              ref={printRef}
              className="mx-auto bg-white shadow-lg border relative"
              style={{
                width: `${paperDimensions.width * getScaleFactor() * 2}px`,
                height: `${paperDimensions.height * getScaleFactor() * 2}px`,
                transform: `scale(${getScaleFactor()})`,
                transformOrigin: "top center",
              }}
            >
              {elements
                .filter((element) => element.visible !== false)
                .sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1))
                .map((element) => (
                  <ElementRenderer
                    key={element.id}
                    element={element}
                    isSelected={false}
                    onPointerDown={() => {}}
                    paperDimensions={paperDimensions}
                    scale={1}
                    orderData={orderData}
                  />
                ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Badge variant="outline" className="text-xs">
            {viewMode === "mobile"
              ? "Mobil Görünüm (320px)"
              : viewMode === "tablet"
              ? "Tablet Görünüm (768px)"
              : "Masaüstü Görünüm"}
          </Badge>
          <Button variant="outline" onClick={onClose}>
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Tablet icon (custom)
const TabletIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12" y2="18" />
  </svg>
);

// Complete Element Renderer with all cases
const ElementRenderer = ({
  element,
  isSelected,
  onPointerDown,
  paperDimensions,
  scale,
  orderData = null,
}) => {
  const elementStyle = {
    position: "absolute",
    left: `${element.position.x}%`,
    top: `${element.position.y}%`,
    width: `${element.size?.width || 20}%`,
    height: `${element.size?.height || 10}%`,
    cursor: element.locked ? "default" : "move",
    userSelect: "none",
    zIndex: element.zIndex || 1,
    opacity: element.opacity || 1,
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    ...element.style,
  };

  const renderElementContent = () => {
    switch (element.type) {
      case ELEMENT_TYPES.TEXT:
      case ELEMENT_TYPES.HEADER:
      case ELEMENT_TYPES.FOOTER:
      case ELEMENT_TYPES.CUSTOM_FIELD:
        return (
          <div className="w-full h-full flex items-center justify-center">
            {element.content || "Metin"}
          </div>
        );

      case ELEMENT_TYPES.IMAGE:
        return (
          <div className="w-full h-full flex items-center justify-center">
            {element.content ? (
              <img
                src={element.content}
                alt="Element"
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  e.target.style.display = "none";
                  if (e.target.nextSibling) {
                    e.target.nextSibling.style.display = "flex";
                  }
                }}
              />
            ) : null}
            <div className="flex items-center justify-center text-gray-400 text-xs">
              <Image className="h-6 w-6 mr-2" />
              Resim
            </div>
          </div>
        );

      case ELEMENT_TYPES.BARCODE:
        const BarcodeComponent = Barcode || FallbackBarcode;
        return (
          <div className="w-full h-full flex items-center justify-center">
            <BarcodeComponent
              value={element.content || "1234567890"}
              format={element.options?.format || "CODE128"}
              displayValue={element.options?.displayValue !== false}
              width={1}
              height={40}
            />
          </div>
        );

      case ELEMENT_TYPES.QR_CODE:
        const QRCodeComponent = QRCode || FallbackQRCode;
        return (
          <div className="w-full h-full flex items-center justify-center">
            <QRCodeComponent
              value={element.content || "https://example.com"}
              size={
                Math.min(
                  element.size?.width || 64,
                  element.size?.height || 64
                ) * 2
              }
              level={element.options?.errorCorrectionLevel || "M"}
            />
          </div>
        );

      case ELEMENT_TYPES.DIVIDER:
        return <div className="w-full h-full bg-gray-300" />;

      case ELEMENT_TYPES.SPACER:
        return <div className="w-full h-full" />;

      case ELEMENT_TYPES.RECIPIENT:
      case ELEMENT_TYPES.SENDER:
      case ELEMENT_TYPES.CUSTOMER_INFO:
      case ELEMENT_TYPES.SHIPPING_ADDRESS:
      case ELEMENT_TYPES.BILLING_ADDRESS:
        return (
          <div className="w-full h-full p-2 text-xs overflow-hidden">
            {orderData ? (
              <div>
                {element.fields?.showName && (
                  <div>Ad: {orderData.customer?.name || "N/A"}</div>
                )}
                {element.fields?.showAddress && (
                  <div>Adres: {orderData.address?.street || "N/A"}</div>
                )}
                {element.fields?.showCity && (
                  <div>Şehir: {orderData.address?.city || "N/A"}</div>
                )}
                {element.fields?.showPhone && (
                  <div>Tel: {orderData.customer?.phone || "N/A"}</div>
                )}
              </div>
            ) : (
              <div className="text-gray-400">
                <User className="h-4 w-4 mb-1" />
                <div>
                  {element.type === ELEMENT_TYPES.RECIPIENT
                    ? "Alıcı"
                    : "Gönderici"}{" "}
                  Bilgileri
                </div>
              </div>
            )}
          </div>
        );

      case ELEMENT_TYPES.ORDER_SUMMARY:
      case ELEMENT_TYPES.ORDER_DETAILS:
        return (
          <div className="w-full h-full p-2 text-xs overflow-hidden">
            {orderData ? (
              <div>
                {element.fields?.showOrderNumber && (
                  <div>Sipariş No: {orderData.orderNumber || "N/A"}</div>
                )}
                {element.fields?.showOrderDate && (
                  <div>Tarih: {orderData.createdAt || "N/A"}</div>
                )}
                {element.fields?.showStatus && (
                  <div>Durum: {orderData.status || "N/A"}</div>
                )}
                {element.fields?.showTotalAmount && (
                  <div>Toplam: {orderData.totalAmount || "N/A"}</div>
                )}
              </div>
            ) : (
              <div className="text-gray-400">
                <Package className="h-4 w-4 mb-1" />
                <div>Sipariş Bilgileri</div>
              </div>
            )}
          </div>
        );

      case ELEMENT_TYPES.TRACKING_INFO:
        return (
          <div className="w-full h-full p-2 text-xs overflow-hidden text-center">
            {orderData?.shipping?.trackingNumber ? (
              <div>
                <div className="font-medium">Takip No:</div>
                <div>{orderData.shipping.trackingNumber}</div>
                {orderData.shipping.carrier && (
                  <div className="mt-1">
                    Kargo: {orderData.shipping.carrier}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-400">
                <Truck className="h-4 w-4 mb-1 mx-auto" />
                <div>Takip Bilgileri</div>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
            <Settings className="h-4 w-4 mr-1" />
            {element.type}
          </div>
        );
    }
  };

  return (
    <div
      style={elementStyle}
      onPointerDown={onPointerDown}
      className={`
        ${isSelected ? "ring-2 ring-blue-500 ring-opacity-75" : ""}
        ${element.locked ? "opacity-50" : "hover:ring-1 hover:ring-gray-300"}
        ${element.required ? "ring-1 ring-yellow-400" : ""}
        transition-all duration-150
      `}
    >
      {renderElementContent()}

      {/* Selection handles */}
      {isSelected && !element.locked && (
        <>
          {/* Resize handles */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-full cursor-nw-resize" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full cursor-ne-resize" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 rounded-full cursor-sw-resize" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 rounded-full cursor-se-resize" />

          {/* Element label */}
          <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-1 rounded whitespace-nowrap">
            {ELEMENT_CATEGORIES[
              Object.keys(ELEMENT_CATEGORIES).find((cat) =>
                ELEMENT_CATEGORIES[cat].elements.some(
                  (el) => el.type === element.type
                )
              )
            ]?.elements.find((el) => el.type === element.type)?.name ||
              element.type}
            {element.locked && " 🔒"}
          </div>
        </>
      )}

      {/* Required indicator */}
      {element.required && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full" />
      )}
    </div>
  );
};

// Complete ElementLibrary Component
const ElementLibrary = ({ onAddElement }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("basic");

  const filteredCategories = useMemo(() => {
    if (!searchTerm) return ELEMENT_CATEGORIES;

    const filtered = {};
    Object.entries(ELEMENT_CATEGORIES).forEach(([key, category]) => {
      const filteredElements = category.elements.filter(
        (element) =>
          element.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          element.description.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (filteredElements.length > 0) {
        filtered[key] = { ...category, elements: filteredElements };
      }
    });

    return filtered;
  }, [searchTerm]);

  const handleDragStart = (event, elementType) => {
    event.dataTransfer.setData("element-type", elementType);
    event.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Öğe ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="px-4 py-3 border-b">
        <ScrollArea className="max-w-full">
          <div className="flex gap-2 pb-1">
            {Object.entries(filteredCategories).map(([key, category]) => {
              // Create a component specifically for the icon
              const IconComponent = category.icon || (() => null);

              return (
                <Button
                  key={key}
                  variant={selectedCategory === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(key)}
                  className="whitespace-nowrap flex items-center gap-1.5"
                >
                  <IconComponent icon={category.icon} className="h-4 w-4" />
                  
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Elements list */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {filteredCategories[selectedCategory] && (
            <div className="space-y-2">
              {filteredCategories[selectedCategory].elements.map((element) => {
                // Create a component for the element icon
                const IconComponent = element.icon || (() => null);

                return (
                  <div
                    key={element.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, element.type)}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <Button
                      variant="ghost"
                      onClick={() => onAddElement(element.type)}
                      className="w-full flex items-start h-auto p-3 text-left"
                    >
                      <div className="flex items-start gap-3 w-full">
                        <div
                          className={`${
                            filteredCategories[selectedCategory].color ||
                            "bg-gray-100"
                          } p-2 rounded flex items-center justify-center`}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="flex-grow">
                          <div className="font-medium text-sm">
                            {element.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {element.description}
                          </div>
                        </div>
                      </div>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {Object.keys(filteredCategories).length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <div className="text-sm">
                Arama kriterinize uygun öğe bulunamadı
              </div>
              <div className="text-xs mt-1">Farklı bir terim deneyin</div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// Complete ElementPropertiesPanel Component
const ElementPropertiesPanel = ({
  element,
  onUpdate,
  onRemove,
  onDuplicate,
}) => {
  const [activeTab, setActiveTab] = useState("content");

  if (!element) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <div className="text-sm">Bir öğe seçin</div>
          <div className="text-xs mt-1">Özelliklerini düzenlemek için</div>
        </div>
      </div>
    );
  }

  // Handler functions
  const handlePositionChange = (axis, value) => {
    onUpdate({
      position: {
        ...element.position,
        [axis]: parseFloat(value) || 0,
      },
    });
  };

  const handleSizeChange = (dimension, value) => {
    onUpdate({
      size: {
        ...element.size,
        [dimension]: parseFloat(value) || 1,
      },
    });
  };

  const handleContentChange = (content) => {
    onUpdate({ content });
  };

  const handleStyleChange = (property, value) => {
    onUpdate({
      style: {
        ...element.style,
        [property]: value,
      },
    });
  };

  const handleFieldToggle = (field, enabled) => {
    onUpdate({
      fields: {
        ...element.fields,
        [field]: enabled,
      },
    });
  };

  const handleDataMappingChange = (field, path) => {
    onUpdate({
      dataMapping: {
        ...element.dataMapping,
        [field]: path,
      },
    });
  };

  const elementInfo = Object.values(ELEMENT_CATEGORIES)
    .flatMap((cat) => cat.elements)
    .find((el) => el.type === element.type);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {elementInfo?.icon && <elementInfo.icon className="h-4 w-4" />}
            <span className="font-medium text-sm">
              {elementInfo?.name || element.type}
            </span>
          </div>
          <div className="flex space-x-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDuplicate(element)}
              title="Kopyala"
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRemove(element.id)}
              title="Sil"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Property tabs */}
        <div className="flex space-x-1">
          {["content", "style", "position", "data"].map((tab) => (
            <Button
              key={tab}
              size="sm"
              variant={activeTab === tab ? "default" : "ghost"}
              onClick={() => setActiveTab(tab)}
              className="text-xs"
            >
              {tab === "content" && "İçerik"}
              {tab === "style" && "Stil"}
              {tab === "position" && "Konum"}
              {tab === "data" && "Veri"}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {activeTab === "content" && (
            <>
              {/* Content editing based on element type */}
              {[
                ELEMENT_TYPES.TEXT,
                ELEMENT_TYPES.HEADER,
                ELEMENT_TYPES.FOOTER,
                ELEMENT_TYPES.CUSTOM_FIELD,
              ].includes(element.type) && (
                <div className="space-y-2">
                  <Label>Metin İçeriği</Label>
                  <Textarea
                    value={element.content || ""}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="Metin girin..."
                    rows={3}
                  />
                </div>
              )}

              {element.type === ELEMENT_TYPES.IMAGE && (
                <div className="space-y-2">
                  <Label>Resim URL</Label>
                  <Input
                    value={element.content || ""}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                  <div className="text-xs text-gray-500">
                    Geçerli bir resim URL'si girin
                  </div>
                </div>
              )}

              {element.type === ELEMENT_TYPES.BARCODE && (
                <div className="space-y-2">
                  <Label>Barkod Değeri</Label>
                  <Input
                    value={element.content || ""}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="1234567890123"
                  />
                  <div className="space-y-2">
                    <Label>Barkod Formatı</Label>
                    <Select
                      value={element.options?.format || "CODE128"}
                      onValueChange={(value) =>
                        onUpdate({
                          options: { ...element.options, format: value },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CODE128">CODE128</SelectItem>
                        <SelectItem value="EAN13">EAN13</SelectItem>
                        <SelectItem value="UPC">UPC</SelectItem>
                        <SelectItem value="CODE39">CODE39</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={element.options?.displayValue !== false}
                      onCheckedChange={(checked) =>
                        onUpdate({
                          options: {
                            ...element.options,
                            displayValue: checked,
                          },
                        })
                      }
                    />
                    <Label>Değeri göster</Label>
                  </div>
                </div>
              )}

              {element.type === ELEMENT_TYPES.QR_CODE && (
                <div className="space-y-2">
                  <Label>QR Kod Verisi</Label>
                  <Textarea
                    value={element.content || ""}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="https://example.com/order/123"
                    rows={2}
                  />
                  <div className="space-y-2">
                    <Label>Hata Düzeltme Seviyesi</Label>
                    <Select
                      value={element.options?.errorCorrectionLevel || "M"}
                      onValueChange={(value) =>
                        onUpdate({
                          options: {
                            ...element.options,
                            errorCorrectionLevel: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="L">Düşük (L)</SelectItem>
                        <SelectItem value="M">Orta (M)</SelectItem>
                        <SelectItem value="Q">Yüksek (Q)</SelectItem>
                        <SelectItem value="H">En Yüksek (H)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Field toggles for complex elements */}
              {element.fields && (
                <div className="space-y-2">
                  <Label>Gösterilecek Alanlar</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {Object.entries(element.fields).map(([field, enabled]) => (
                      <div key={field} className="flex items-center space-x-2">
                        <Switch
                          checked={enabled}
                          onCheckedChange={(checked) =>
                            handleFieldToggle(field, checked)
                          }
                        />
                        <Label className="text-xs">
                          {field
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^./, (str) => str.toUpperCase())}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "style" && (
            <div className="space-y-4">
              {/* Font settings */}
              {!["divider", "spacer", "image"].includes(element.type) && (
                <>
                  <div className="space-y-2">
                    <Label>Yazı Tipi Boyutu</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        value={element.style?.fontSize || 12}
                        onChange={(e) =>
                          handleStyleChange(
                            "fontSize",
                            parseInt(e.target.value)
                          )
                        }
                        min="8"
                        max="72"
                        className="w-20"
                      />
                      <span className="text-xs text-gray-500">px</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Yazı Tipi</Label>
                    <Select
                      value={
                        element.style?.fontFamily || "Inter, Arial, sans-serif"
                      }
                      onValueChange={(value) =>
                        handleStyleChange("fontFamily", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter, Arial, sans-serif">
                          Inter
                        </SelectItem>
                        <SelectItem value="Georgia, serif">Georgia</SelectItem>
                        <SelectItem value="Courier, monospace">
                          Courier
                        </SelectItem>
                        <SelectItem value="Helvetica, Arial, sans-serif">
                          Helvetica
                        </SelectItem>
                        <SelectItem value="Times, serif">Times</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Yazı Ağırlığı</Label>
                    <Select
                      value={element.style?.fontWeight || "normal"}
                      onValueChange={(value) =>
                        handleStyleChange("fontWeight", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="medium">Orta</SelectItem>
                        <SelectItem value="bold">Kalın</SelectItem>
                        <SelectItem value="bolder">Daha Kalın</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Metin Hizalama</Label>
                    <Select
                      value={element.style?.textAlign || "left"}
                      onValueChange={(value) =>
                        handleStyleChange("textAlign", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Sol</SelectItem>
                        <SelectItem value="center">Merkez</SelectItem>
                        <SelectItem value="right">Sağ</SelectItem>
                        <SelectItem value="justify">İki Yana Yaslı</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Metin Rengi</Label>
                    <Input
                      type="color"
                      value={element.style?.color || "#374151"}
                      onChange={(e) =>
                        handleStyleChange("color", e.target.value)
                      }
                      className="w-full h-10"
                    />
                  </div>
                </>
              )}

              {/* Background and borders */}
              <div className="space-y-2">
                <Label>Arka Plan Rengi</Label>
                <Input
                  type="color"
                  value={element.style?.backgroundColor || "#ffffff"}
                  onChange={(e) =>
                    handleStyleChange("backgroundColor", e.target.value)
                  }
                  className="w-full h-10"
                />
              </div>

              <div className="space-y-2">
                <Label>Kenar Çizgisi</Label>
                <Input
                  value={element.style?.border || ""}
                  onChange={(e) => handleStyleChange("border", e.target.value)}
                  placeholder="1px solid #e5e7eb"
                />
              </div>

              <div className="space-y-2">
                <Label>Köşe Yuvarlaklığı</Label>
                <Input
                  value={element.style?.borderRadius || ""}
                  onChange={(e) =>
                    handleStyleChange("borderRadius", e.target.value)
                  }
                  placeholder="4px"
                />
              </div>

              <div className="space-y-2">
                <Label>İç Boşluk</Label>
                <Input
                  value={element.style?.padding || ""}
                  onChange={(e) => handleStyleChange("padding", e.target.value)}
                  placeholder="8px"
                />
              </div>
            </div>
          )}

          {activeTab === "position" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>X Konumu (%)</Label>
                  <Input
                    type="number"
                    value={element.position?.x || 0}
                    onChange={(e) => handlePositionChange("x", e.target.value)}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Y Konumu (%)</Label>
                  <Input
                    type="number"
                    value={element.position?.y || 0}
                    onChange={(e) => handlePositionChange("y", e.target.value)}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Genişlik (%)</Label>
                  <Input
                    type="number"
                    value={element.size?.width || 20}
                    onChange={(e) => handleSizeChange("width", e.target.value)}
                    min="1"
                    max="100"
                    step="0.1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Yükseklik (%)</Label>
                  <Input
                    type="number"
                    value={element.size?.height || 10}
                    onChange={(e) => handleSizeChange("height", e.target.value)}
                    min="1"
                    max="100"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Z-Index (Katman)</Label>
                <Input
                  type="number"
                  value={element.zIndex || 1}
                  onChange={(e) =>
                    onUpdate({ zIndex: parseInt(e.target.value) || 1 })
                  }
                  min="1"
                  max="100"
                />
              </div>

              <div className="space-y-2">
                <Label>Opaklık</Label>
                <Input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={element.opacity || 1}
                  onChange={(e) =>
                    onUpdate({ opacity: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
                <div className="text-xs text-gray-500 text-center">
                  {Math.round((element.opacity || 1) * 100)}%
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={element.locked || false}
                  onCheckedChange={(checked) => onUpdate({ locked: checked })}
                />
                <Label>Konumu kilitle</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={element.visible !== false}
                  onCheckedChange={(checked) => onUpdate({ visible: checked })}
                />
                <Label>Görünür</Label>
              </div>
            </div>
          )}

          {activeTab === "data" && (
            <div className="space-y-4">
              {element.dataMapping && (
                <>
                  <div className="text-xs text-gray-600 mb-2">
                    Bu öğe sipariş verilerinden otomatik olarak dolduruluyor.
                  </div>
                  {Object.entries(element.dataMapping).map(([field, path]) => (
                    <div key={field} className="space-y-2">
                      <Label className="text-xs">
                        {field
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (str) => str.toUpperCase())}
                      </Label>
                      <Input
                        value={path}
                        onChange={(e) =>
                          handleDataMappingChange(field, e.target.value)
                        }
                        placeholder="order.property.path"
                        className="font-mono text-xs"
                      />
                    </div>
                  ))}
                </>
              )}

              {!element.dataMapping && (
                <div className="text-center text-gray-500 py-4">
                  <Database className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <div className="text-xs">
                    Bu öğe için veri bağlama mevcut değil
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  checked={element.required || false}
                  onCheckedChange={(checked) => onUpdate({ required: checked })}
                />
                <Label>Zorunlu alan</Label>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// Main ShippingSlipDesigner Component
const ShippingSlipDesigner = ({ initialTemplate, onSave, onCancel }) => {
  const {
    elements,
    selectedElement,
    templateConfig,
    setSelectedElement,
    setTemplateConfig,
    setElements,
    undo,
    redo,
    canUndo,
    canRedo,
    add: addElement,
    update: updateElement,
    remove: removeElement,
    duplicate: duplicateElement,
  } = useDesignerState();

  const [scale, setScale] = useState(0.8);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlert();

  const paperDimensions = useMemo(
    () => getPaperDimensions(templateConfig),
    [templateConfig]
  );

  // Load saved templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const templates = await TemplateManager.getAll();
        // Ensure templates is always an array
        setSavedTemplates(Array.isArray(templates) ? templates : []);
      } catch (error) {
        console.error("Failed to load templates:", error);
        setSavedTemplates([]);
      }
    };

    loadTemplates();

    // Load sample data for preview
    const fetchSampleData = async () => {
      try {
        const response = await api.get("/api/orders?limit=1&sample=true");
        if (
          response.data &&
          response.data.orders &&
          response.data.orders.length > 0
        ) {
          setOrderData({
            ...response.data.orders[0],
            sender: {
              company: "Pazar+",
              address: "Merkez Mahallesi, İş Merkezi No:45",
              city: "İstanbul",
              postalCode: "34000",
              phone: "+90 212 123 45 67",
              email: "info@pazarplus.com",
              website: "www.pazarplus.com",
            },
          });
        } else {
          // Set fallback data if API doesn't return anything
          setOrderData({
            orderNumber: "ORD-2024-001",
            createdAt: new Date().toISOString(),
            status: "Onaylandı",
            platform: "Trendyol",
            totalAmount: 299.99,
            currency: "TRY",
            customer: {
              name: "Ahmet Yılmaz",
              phone: "+90 555 123 45 67",
              email: "ahmet.yilmaz@example.com",
            },
            items: [
              {
                product: {
                  name: "Örnek Ürün 1",
                  sku: "SKU001",
                  barcode: "8680001234567",
                },
                quantity: 2,
                unitPrice: 99.99,
                totalPrice: 199.98,
              },
              {
                product: {
                  name: "Örnek Ürün 2",
                  sku: "SKU002",
                  barcode: "8680001234568",
                },
                quantity: 1,
                unitPrice: 100.01,
                totalPrice: 100.01,
              },
            ],
            shipping: {
              recipientName: "Ahmet Yılmaz",
              address: {
                street: "Atatürk Mahallesi, Cumhuriyet Caddesi No:123",
                city: "İstanbul",
                postalCode: "34000",
              },
              phone: "+90 555 123 45 67",
              trackingNumber: "TK123456789TR",
              carrier: {
                name: "MNG Kargo",
                code: "MNG",
              },
            },
            sender: {
              company: "Pazar+",
              address: "Merkez Mahallesi, İş Merkezi No:45",
              city: "İstanbul",
              postalCode: "34000",
              phone: "+90 212 123 45 67",
              email: "info@pazarplus.com",
              website: "www.pazarplus.com",
            },
          });
        }
      } catch (error) {
        console.warn("Failed to load sample order data:", error);
        // Set fallback data on error
        setOrderData({
          orderNumber: "ORD-2024-001",
          createdAt: new Date().toISOString(),
          status: "Onaylandı",
          totalAmount: 299.99,
          currency: "TRY",
          items: [
            {
              product: { name: "Örnek Ürün 1" },
              quantity: 2,
              unitPrice: 99.99,
              totalPrice: 199.98,
            },
            {
              product: { name: "Örnek Ürün 2" },
              quantity: 1,
              unitPrice: 100.01,
              totalPrice: 100.01,
            },
          ],
          shipping: {
            recipientName: "Ahmet Yılmaz",
            address: {
              street: "Atatürk Mahallesi, Cumhuriyet Caddesi No:123",
              city: "İstanbul",
              postalCode: "34000",
            },
            trackingNumber: "TK123456789TR",
            carrier: { name: "MNG Kargo" },
          },
          sender: {
            company: "Pazar+",
            address: "Merkez Mahallesi, İş Merkezi No:45",
            city: "İstanbul",
          },
        });
      }
    };

    fetchSampleData();
  }, []);

  // Load initial template if provided
  useEffect(() => {
    if (initialTemplate && initialTemplate.elements) {
      setElements(initialTemplate.elements);
      setTemplateConfig(initialTemplate.config || templateConfig);
    }
  }, [initialTemplate, setElements, setTemplateConfig, templateConfig]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "z":
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case "s":
            e.preventDefault();
            handleSaveTemplate();
            break;
          case "p":
            e.preventDefault();
            setShowPreviewModal(true);
            break;
          case "d":
            if (selectedElement) {
              e.preventDefault();
              duplicateElement(selectedElement);
            }
            break;
          default:
            break;
        }
      }

      if (e.key === "Delete" && selectedElement) {
        removeElement(selectedElement.id);
      }

      if (e.key === "Escape") {
        setSelectedElement(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedElement,
    undo,
    redo,
    removeElement,
    duplicateElement,
    setSelectedElement,
  ]);

  const handleSaveTemplate = async () => {
    try {
      setLoading(true);
      const template = {
        name: templateConfig.name || "Unnamed Template",
        elements,
        config: templateConfig,
        paperSize: templateConfig.paperSize,
        orientation: templateConfig.orientation,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const savedTemplate = await TemplateManager.save(template);
      setSavedTemplates((prev) => [
        ...prev.filter((t) => t.id !== savedTemplate.id),
        savedTemplate,
      ]);

      showAlert("Şablon başarıyla kaydedildi", "success");
      onSave?.(savedTemplate);
    } catch (error) {
      console.error("Template save failed:", error);
      showAlert("Şablon kaydedilirken bir hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTemplate = (template) => {
    try {
      setElements(template.elements || []);
      setTemplateConfig(template.config || templateConfig);
      setSelectedElement(null);
      setShowTemplateModal(false);
    } catch (error) {
      console.error("Template load failed:", error);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    try {
      await TemplateManager.delete(templateId);
      setSavedTemplates((prev) => prev.filter((t) => t.id !== templateId));
    } catch (error) {
      console.error("Template deletion failed:", error);
    }
  };

  const handleExportTemplate = async () => {
    try {
      const template = {
        name: templateConfig.name,
        elements,
        config: templateConfig,
        paperSize: templateConfig.paperSize,
        orientation: templateConfig.orientation,
      };

      await TemplateManager.export(template);
    } catch (error) {
      console.error("Template export failed:", error);
    }
  };

  const handleImportTemplate = async (file) => {
    try {
      const template = await TemplateManager.import(file);
      handleLoadTemplate(template);
    } catch (error) {
      console.error("Template import failed:", error);
      throw error;
    }
  };

  const handleElementPointerDown = (element, event) => {
    event.stopPropagation();
    setSelectedElement(element);
  };

  const handleCanvasClick = (event) => {
    if (event.target === event.currentTarget) {
      setSelectedElement(null);
    }
  };

  // Canvas drag and drop handlers
  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const elementType = event.dataTransfer.getData("application/element");

    if (elementType) {
      // Convert drop position to canvas coordinates
      const canvas = event.currentTarget.querySelector("div > div"); // Get the canvas element
      if (!canvas) return;

      const canvasRect = canvas.getBoundingClientRect();
      const canvasX =
        ((event.clientX - canvasRect.left) /
          (scale * 2) /
          paperDimensions.width) *
        100;
      const canvasY =
        ((event.clientY - canvasRect.top) /
          (scale * 2) /
          paperDimensions.height) *
        100;

      // Create new element at drop position
      addElement(elementType, {
        x: Math.max(0, canvasX - 5),
        y: Math.max(0, canvasY - 5),
      });
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen max-h-screen overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Element Library */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-lg">
              Gönderi Belgesi Tasarımcısı
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Öğeleri sürükleyerek özel gönderi belgesi oluşturun
            </p>
          </div>

          <div className="flex-1 overflow-hidden">
            <ElementLibrary onAddElement={addElement} />
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={undo}
                  disabled={!canUndo}
                  title="Geri Al (Ctrl+Z)"
                >
                  <Undo className="h-4 w-4" />
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={redo}
                  disabled={!canRedo}
                  title="İleri Al (Ctrl+Shift+Z)"
                >
                  <Redo className="h-4 w-4" />
                </Button>

                <div className="h-4 w-px bg-gray-300 mx-2" />

                <div className="flex items-center space-x-2">
                  <Label className="text-sm">Zoom:</Label>
                  <Input
                    type="range"
                    min="0.3"
                    max="2"
                    step="0.1"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm text-gray-600 w-12">
                    {Math.round(scale * 100)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPreviewModal(true)}
                  title="Önizleme (Ctrl+P)"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Önizleme
                </Button>

                <Button
                  size="sm"
                  onClick={handleSaveTemplate}
                  disabled={loading}
                  title="Kaydet (Ctrl+S)"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Kaydet
                </Button>

                {onCancel && (
                  <Button size="sm" variant="outline" onClick={onCancel}>
                    İptal
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div
            className="flex-1 overflow-auto bg-gray-100 p-8"
            onClick={handleCanvasClick}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="mx-auto" style={{ width: "fit-content" }}>
              <div
                className="bg-white shadow-lg border border-gray-300 relative"
                style={{
                  width: `${paperDimensions.width * scale * 2}px`,
                  height: `${paperDimensions.height * scale * 2}px`,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              >
                {/* Paper margins guide */}
                <div
                  className="absolute border border-dashed border-gray-300 pointer-events-none"
                  style={{
                    top: `${
                      (templateConfig.margins?.top / paperDimensions.height) *
                      100
                    }%`,
                    left: `${
                      (templateConfig.margins?.left / paperDimensions.width) *
                      100
                    }%`,
                    right: `${
                      (templateConfig.margins?.right / paperDimensions.width) *
                      100
                    }%`,
                    bottom: `${
                      (templateConfig.margins?.bottom /
                        paperDimensions.height) *
                      100
                    }%`,
                  }}
                />

                {/* Elements */}
                {elements
                  .filter((element) => element.visible !== false)
                  .sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1))
                  .map((element) => (
                    <ElementRenderer
                      key={element.id}
                      element={element}
                      isSelected={selectedElement?.id === element.id}
                      onPointerDown={(e) =>
                        handleElementPointerDown(element, e)
                      }
                      paperDimensions={paperDimensions}
                      scale={1}
                      orderData={orderData}
                    />
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Properties & Settings */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          <Tabs defaultValue="properties" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 m-4 mb-0">
              <TabsTrigger value="properties">Özellikler</TabsTrigger>
              <TabsTrigger value="settings">Ayarlar</TabsTrigger>
            </TabsList>

            <TabsContent
              value="properties"
              className="flex-1 overflow-hidden m-0 p-0"
            >
              <ElementPropertiesPanel
                element={selectedElement}
                onUpdate={(updates) =>
                  updateElement(selectedElement.id, updates)
                }
                onRemove={removeElement}
                onDuplicate={duplicateElement}
              />
            </TabsContent>

            <TabsContent
              value="settings"
              className="flex-1 overflow-hidden m-0 p-0"
            >
              <TemplateSettingsPanel
                config={templateConfig}
                onConfigChange={setTemplateConfig}
                onSave={handleSaveTemplate}
                onLoad={() => setShowTemplateModal(true)}
                onExport={handleExportTemplate}
                onImport={handleImportTemplate}
                savedTemplates={savedTemplates}
                onShowTemplates={() => setShowTemplateModal(true)}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <TemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onLoad={handleLoadTemplate}
        onDelete={handleDeleteTemplate}
        savedTemplates={savedTemplates}
      />

      <PreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        elements={elements}
        paperDimensions={paperDimensions}
        templateConfig={templateConfig}
        onPrint={() => setShowPreviewModal(false)}
      />

      <ResponsivePreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        elements={elements}
        paperDimensions={paperDimensions}
        templateConfig={templateConfig}
        orderData={orderData}
      />
    </div>
  );
};

export default ShippingSlipDesigner;
