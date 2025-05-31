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
import def from "ajv/dist/vocabularies/discriminator";

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
      newHistory.push([...newElements]);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
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
          ...elementDefaults[ELEMENT_TYPES.HEADER],
          position: { x: 0, y: 5 },
        },
        {
          id: generateId(),
          type: ELEMENT_TYPES.RECIPIENT,
          ...elementDefaults[ELEMENT_TYPES.RECIPIENT],
          position: { x: 5, y: 20 },
        },
        {
          id: generateId(),
          type: ELEMENT_TYPES.SENDER,
          ...elementDefaults[ELEMENT_TYPES.SENDER],
          position: { x: 55, y: 20 },
        },
        {
          id: generateId(),
          type: ELEMENT_TYPES.ORDER_SUMMARY,
          ...elementDefaults[ELEMENT_TYPES.ORDER_SUMMARY],
          position: { x: 5, y: 55 },
        },
        {
          id: generateId(),
          type: ELEMENT_TYPES.FOOTER,
          ...elementDefaults[ELEMENT_TYPES.FOOTER],
          position: { x: 0, y: 90 },
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
          ...elementDefaults[type],
          position,
          zIndex: elements.length + 1,
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
        const newElement = {
          ...element,
          id: generateId(),
          position: {
            x: element.position.x + 5,
            y: element.position.y + 5,
          },
          zIndex: elements.length + 1,
        };

        const newElements = [...elements, newElement];
        setElements(newElements);
        setSelectedElement(newElement);
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
        const oldIndex = elements.findIndex((el) => el.id === activeId);
        const newIndex = elements.findIndex((el) => el.id === overId);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newElements = [...elements];
          const [reorderedItem] = newElements.splice(oldIndex, 1);
          newElements.splice(newIndex, 0, reorderedItem);

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
      setElements([...history[newIndex]]);
      setHistoryIndex(newIndex);
      setSelectedElement(null);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setElements([...history[newIndex]]);
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
  setSavedTemplates,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("updated"); // updated, created, name
  const [viewMode, setViewMode] = useState("grid"); // grid, list
  const { showAlert } = useAlert();

  const filteredTemplates = useMemo(() => {
    let filtered = savedTemplates.filter(
      (template) =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort templates
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "created":
          return new Date(b.createdAt) - new Date(a.createdAt);
        case "updated":
        default:
          return (
            new Date(b.updatedAt || b.createdAt) -
            new Date(a.updatedAt || a.createdAt)
          );
      }
    });

    return filtered;
  }, [savedTemplates, searchTerm, sortBy]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDuplicate = async (template) => {
    try {
      const duplicatedTemplate = {
        ...template,
        id: generateId(), // Generate new unique ID
        name: `${template.name} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save the duplicated template using TemplateManager
      const savedDuplicate = await TemplateManager.save(duplicatedTemplate);

      // Update the templates list
      setSavedTemplates((prev) => [...prev, savedDuplicate]);

      // Optional: Show success message
      showAlert(
        `Template "${duplicatedTemplate.name}" duplicated successfully`,
        "success"
      );

      // Optional: Auto-load the duplicated template
      // onLoad(savedDuplicate);
    } catch (error) {
      console.error("Failed to duplicate template:", error);
      showAlert("Failed to duplicate template", "error");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Template Library</DialogTitle>
          <DialogDescription>
            Manage your shipping slip templates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Enhanced Search and Controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">Latest Updated</SelectItem>
                  <SelectItem value="created">Latest Created</SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant={viewMode === "grid" ? "default" : "outline"}
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === "list" ? "default" : "outline"}
                onClick={() => setViewMode("list")}
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Templates Display */}
          <ScrollArea className="h-96">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  {searchTerm ? "No templates found" : "No templates yet"}
                </h3>
                <p className="text-xs text-gray-500">
                  {searchTerm
                    ? "Try different search terms"
                    : "Create your first template"}
                </p>
              </div>
            ) : (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                    : "space-y-2"
                }
              >
                {filteredTemplates.map((template) => (
                  // USE TemplateCard component properly
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onLoad={onLoad}
                    onDelete={onDelete}
                    onDuplicate={handleDuplicate}
                    formatDate={formatDate}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Template Statistics */}
          <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-4">
            <span>
              {filteredTemplates.length} of {savedTemplates.length} templates
            </span>
            <span>
              Total elements:{" "}
              {savedTemplates.reduce(
                (acc, t) => acc + (t.elements?.length || 0),
                0
              )}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
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
  onElementsChange,
}) => {
  const printRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [previewElements, setPreviewElements] = useState([]);
  const [dragInfo, setDragInfo] = useState(null);
  const [resizeInfo, setResizeInfo] = useState(null);

  // Initialize preview elements when modal opens or elements change
  // Fixed: Properly sync with elements changes including font size updates
  useEffect(() => {
    if (isOpen && elements.length > 0) {
      // Deep copy elements to avoid mutation and ensure fresh state
      const elementsWithIds = elements.map((element, index) => ({
        ...element,
        id: element.id || `preview_element_${index}`,
        // Ensure style object is properly copied
        style: {
          ...element.style,
          // Force re-render by creating new style object reference
          fontSize: element.style?.fontSize || 14,
        },
        position: element.position || { x: 10, y: 10 },
        size: element.size || { width: 20, height: 10 },
      }));
      setPreviewElements(elementsWithIds);
    }
  }, [elements, isOpen, elements.length]);

  // Additional effect to handle real-time style updates
  useEffect(() => {
    if (isOpen && elements.length > 0) {
      setPreviewElements((prevElements) => {
        return elements.map((element, index) => {
          const existingElement = prevElements.find(
            (pe) => pe.id === element.id
          );
          return {
            ...element,
            id: element.id || `preview_element_${index}`,
            // Preserve position and size from existing element if it exists (for drag/resize)
            position: existingElement?.position ||
              element.position || {
                x: 10,
                y: 10,
              },
            size: existingElement?.size ||
              element.size || { width: 20, height: 10 },
            // Always use the latest style from main elements
            style: {
              ...element.style,
              // Ensure fontSize is properly applied
              fontSize: element.style?.fontSize || 14,
            },
          };
        });
      });
    }
  }, [
    elements.map((e) => e.style?.fontSize).join(","),
    elements.map((e) => e.content).join(","),
    isOpen,
  ]);

  // Handle element selection
  const handleElementSelect = (element, event) => {
    event.stopPropagation();
    setSelectedElement(element);
  };

  // Handle background click to deselect
  const handleBackgroundClick = () => {
    setSelectedElement(null);
  };

  // Handle drag start
  const handleDragStart = (element, event) => {
    if (event.button !== 0 || element.locked) return; // Only left mouse button

    event.preventDefault();
    event.stopPropagation();

    setDragInfo({
      elementId: element.id,
      startX: event.clientX,
      startY: event.clientY,
      startPosition: { ...element.position },
    });
  };

  // Handle drag move
  const handleDragMove = useCallback(
    (event) => {
      if (!dragInfo) return;

      const deltaX = event.clientX - dragInfo.startX;
      const deltaY = event.clientY - dragInfo.startY;

      // Convert pixel movement to percentage
      const containerRect = event.target
        .closest("[data-preview-container]")
        ?.getBoundingClientRect();
      if (!containerRect) return;

      const percentX = (deltaX / containerRect.width) * 100;
      const percentY = (deltaY / containerRect.height) * 100;

      setPreviewElements((prev) =>
        prev.map((el) =>
          el.id === dragInfo.elementId
            ? {
                ...el,
                position: {
                  x: Math.max(
                    0,
                    Math.min(95, dragInfo.startPosition.x + percentX)
                  ),
                  y: Math.max(
                    0,
                    Math.min(95, dragInfo.startPosition.y + percentY)
                  ),
                },
              }
            : el
        )
      );
    },
    [dragInfo]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDragInfo(null);
  }, []);

  // Handle resize start
  const handleResizeStart = (element, corner, event) => {
    if (element.locked) return;

    event.preventDefault();
    event.stopPropagation();

    setResizeInfo({
      elementId: element.id,
      corner,
      startX: event.clientX,
      startY: event.clientY,
      startSize: { ...element.size },
      startPosition: { ...element.position },
    });
  };

  // Handle resize move
  const handleResizeMove = useCallback(
    (event) => {
      if (!resizeInfo) return;

      const deltaX = event.clientX - resizeInfo.startX;
      const deltaY = event.clientY - resizeInfo.startY;

      // Convert pixel movement to percentage
      const containerRect = event.target
        .closest("[data-preview-container]")
        ?.getBoundingClientRect();
      if (!containerRect) return;

      const percentDeltaX = (deltaX / containerRect.width) * 100;
      const percentDeltaY = (deltaY / containerRect.height) * 100;

      let newSize = { ...resizeInfo.startSize };
      let newPosition = { ...resizeInfo.startPosition };

      switch (resizeInfo.corner) {
        case "se": // Bottom-right
          newSize.width = Math.max(
            5,
            resizeInfo.startSize.width + percentDeltaX
          );
          newSize.height = Math.max(
            3,
            resizeInfo.startSize.height + percentDeltaY
          );
          break;
        case "sw": // Bottom-left
          newSize.width = Math.max(
            5,
            resizeInfo.startSize.width - percentDeltaX
          );
          newSize.height = Math.max(
            3,
            resizeInfo.startSize.height + percentDeltaY
          );
          newPosition.x = resizeInfo.startPosition.x + percentDeltaX;
          break;
        case "ne": // Top-right
          newSize.width = Math.max(
            5,
            resizeInfo.startSize.width + percentDeltaX
          );
          newSize.height = Math.max(
            3,
            resizeInfo.startSize.height - percentDeltaY
          );
          newPosition.y = resizeInfo.startPosition.y + percentDeltaY;
          break;
        case "nw": // Top-left
          newSize.width = Math.max(
            5,
            resizeInfo.startSize.width - percentDeltaX
          );
          newSize.height = Math.max(
            3,
            resizeInfo.startSize.height - percentDeltaY
          );
          newPosition.x = resizeInfo.startPosition.x + percentDeltaX;
          newPosition.y = resizeInfo.startPosition.y + percentDeltaY;
          break;
          default:
            break
      }

      setPreviewElements((prev) =>
        prev.map((el) =>
          el.id === resizeInfo.elementId
            ? { ...el, size: newSize, position: newPosition }
            : el
        )
      );
    },
    [resizeInfo]
  );

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    setResizeInfo(null);
  }, []);

  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); // Reload to restore React functionality
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Event handlers for mouse move and mouse up
  useEffect(() => {
    const handleMouseMove = (event) => {
      if (dragInfo) {
        handleDragMove(event);
      }
      if (resizeInfo) {
        handleResizeMove(event);
      }
    };

    const handleMouseUp = () => {
      if (dragInfo) {
        handleDragEnd();
      }
      if (resizeInfo) {
        handleResizeEnd();
      }
    };

    if (dragInfo || resizeInfo) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    dragInfo,
    resizeInfo,
    handleDragMove,
    handleResizeMove,
    handleDragEnd,
    handleResizeEnd,
  ]);

  // Save changes when modal is closed
  const handleClose = () => {
    if (onElementsChange && previewElements.length > 0) {
      // Update main elements with preview changes
      onElementsChange(previewElements);
    }
    setSelectedElement(null);
    setDragInfo(null);
    setResizeInfo(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <div className="bg-white rounded-lg shadow-lg max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            Önizleme: {templateConfig.name}
          </h2>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Küçült" : "Tam Ekran"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePrint}
              title="Yazdır"
            >
              <Printer className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClose}
              title="Kapat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div
          className={`flex-1 overflow-auto p-4 ${
            isFullscreen ? "fixed inset-0 z-50 bg-white" : ""
          }`}
          onClick={handleBackgroundClick}
          style={{
            backgroundColor: "#f4f4f4",
          }}
          data-preview-container
        >
          <div
            ref={printRef}
            className="mx-auto shadow-lg relative"
            style={{
              width: `${paperDimensions.width * 2}px`,
              height: `${paperDimensions.height * 2}px`,
              backgroundColor: "white",
              overflow: "hidden",
            }}
          >
            {previewElements
              .filter((element) => element.visible !== false)
              .sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1))
              .map((element) => (
                <div
                  key={`preview-${element.id}`}
                  className={`absolute ${
                    selectedElement?.id === element.id
                      ? "ring-2 ring-blue-500"
                      : ""
                  }`}
                  style={{
                    left: `${element.position?.x || 0}%`,
                    top: `${element.position?.y || 0}%`,
                    width: `${element.size?.width || 20}%`,
                    height: `${element.size?.height || 10}%`,
                    zIndex: element.zIndex || 1,
                    opacity: element.opacity || 1,
                    cursor:
                      selectedElement?.id === element.id ? "move" : "pointer",
                    overflow: "hidden",
                    backgroundColor:
                      element.style?.backgroundColor || "transparent",
                    border: element.style?.border || "none",
                    borderRadius: element.style?.borderRadius || "0",
                  }}
                  onClick={(e) => handleElementSelect(element, e)}
                  onMouseDown={(e) => handleDragStart(element, e)}
                >
                  {/* Element Content */}
                  {(() => {
                    switch (element.type) {
                      case ELEMENT_TYPES.TEXT:
                      case ELEMENT_TYPES.HEADER:
                      case ELEMENT_TYPES.FOOTER:
                      case ELEMENT_TYPES.CUSTOM_FIELD:
                        return (
                          <div
                            style={{
                              padding: element.style?.padding || "0.5rem",
                              textAlign: element.style?.textAlign || "left",
                              fontSize: `${element.style?.fontSize || 14}px`,
                              fontWeight: element.style?.fontWeight || "normal",
                              color: element.style?.color || "#374151",
                              lineHeight: element.style?.lineHeight || 1.5,
                              fontFamily:
                                element.style?.fontFamily ||
                                "Inter, Arial, sans-serif",
                              width: "100%",
                              height: "100%",
                              overflow: "hidden",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            {element.content || "Text Content"}
                          </div>
                        );

                      case ELEMENT_TYPES.IMAGE:
                        return (
                          <div className="w-full h-full flex items-center justify-center">
                            {element.content ? (
                              <img
                                src={element.content}
                                alt="Logo/Image"
                                style={{
                                  maxWidth: "100%",
                                  maxHeight: "100%",
                                  objectFit:
                                    element.style?.objectFit || "contain",
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-300 text-gray-400 text-xs">
                                <Image className="h-4 w-4 mr-2" />
                                <span>Image</span>
                              </div>
                            )}
                          </div>
                        );

                      case ELEMENT_TYPES.BARCODE:
                        return (
                          <div className="w-full h-full flex flex-col items-center justify-center">
                            {Barcode ? (
                              <Barcode
                                value={element.content || "1234567890"}
                                format={element.options?.format || "CODE128"}
                                width={1}
                                height={30}
                                displayValue={
                                  element.options?.displayValue !== false
                                }
                              />
                            ) : (
                              <FallbackBarcode
                                value={element.content || "1234567890"}
                                format={element.options?.format || "CODE128"}
                                displayValue={
                                  element.options?.displayValue !== false
                                }
                              />
                            )}
                          </div>
                        );

                      case ELEMENT_TYPES.QR_CODE:
                        return (
                          <div className="w-full h-full flex items-center justify-center">
                            {QRCode ? (
                              <QRCode
                                value={element.content || "https://example.com"}
                                size={Math.min(
                                  (paperDimensions.width * element.size.width) /
                                    50,
                                  (paperDimensions.height *
                                    element.size.height) /
                                    50
                                )}
                              />
                            ) : (
                              <FallbackQRCode
                                value={element.content || "https://example.com"}
                                size={Math.min(
                                  (paperDimensions.width * element.size.width) /
                                    50,
                                  (paperDimensions.height *
                                    element.size.height) /
                                    50
                                )}
                              />
                            )}
                          </div>
                        );

                      case ELEMENT_TYPES.DIVIDER:
                        return (
                          <div
                            className="w-full"
                            style={{
                              height: element.style?.height || "2px",
                              backgroundColor:
                                element.style?.backgroundColor || "#e5e7eb",
                              marginTop: "50%",
                            }}
                          />
                        );

                      case ELEMENT_TYPES.SPACER:
                        return <div className="w-full h-full" />;

                      default:
                        return (
                          <div
                            style={{
                              padding: element.style?.padding || "0.5rem",
                              textAlign: element.style?.textAlign || "left",
                              fontSize: `${element.style?.fontSize || 12}px`,
                              fontWeight: element.style?.fontWeight || "normal",
                              color: element.style?.color || "#374151",
                              lineHeight: element.style?.lineHeight || 1.5,
                              fontFamily:
                                element.style?.fontFamily ||
                                "Inter, Arial, sans-serif",
                              width: "100%",
                              height: "100%",
                              overflow: "hidden",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            {element.content || `${element.type} content`}
                          </div>
                        );
                    }
                  })()}

                  {/* Selection handles */}
                  {selectedElement?.id === element.id && (
                    <>
                      <div
                        className="absolute top-0 left-0 w-3 h-3 bg-blue-500 rounded-full cursor-nw-resize"
                        onMouseDown={(e) => handleResizeStart(element, "nw", e)}
                      />
                      <div
                        className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-full cursor-ne-resize"
                        onMouseDown={(e) => handleResizeStart(element, "ne", e)}
                      />
                      <div
                        className="absolute bottom-0 left-0 w-3 h-3 bg-blue-500 rounded-full cursor-sw-resize"
                        onMouseDown={(e) => handleResizeStart(element, "sw", e)}
                      />
                      <div
                        className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize"
                        onMouseDown={(e) => handleResizeStart(element, "se", e)}
                      />
                    </>
                  )}
                </div>
              ))}
          </div>
        </div>

        <div className="border-t p-3 flex justify-end space-x-3">
          <Button size="sm" variant="outline" onClick={handleClose}>
            Kapat
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Yazdır
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const TemplateCard = ({
  template,
  onLoad,
  onDelete,
  onDuplicate,
  formatDate,
  viewMode = "grid",
}) => {
  const [showActions, setShowActions] = useState(false);

  if (viewMode === "list") {
    return (
      <div
        className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="flex items-center space-x-3">
          <div className="w-12 h-8 bg-gray-100 rounded border flex items-center justify-center">
            <FileText className="h-4 w-4 text-gray-400" />
          </div>
          <div>
            <div className="font-medium text-sm">{template.name}</div>
            <div className="text-xs text-gray-500">
              {template.elements?.length || 0} elements • {template.paperSize}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="text-xs text-gray-400">
            {formatDate(template.updatedAt || template.createdAt)}
          </div>

          {showActions && (
            <div className="flex space-x-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onLoad(template)}
                className="h-6 w-6 p-0"
                title="Load Template"
              >
                <FolderOpen className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDuplicate(template)}
                className="h-6 w-6 p-0"
                title="Duplicate Template"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(template.id)}
                className="h-6 w-6 p-0"
                title="Delete Template"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium truncate flex-1">
            {template.name}
          </CardTitle>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(template);
              }}
              className="h-6 w-6 p-0"
              title="Duplicate"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            {template.elements?.length || 0} elements
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {template.paperSize}
          </Badge>
          {template.orientation === "landscape" && (
            <Badge variant="outline" className="text-xs">
              Landscape
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* USE formatDate function properly */}
        <div className="space-y-1 mb-3">
          <div className="text-xs text-gray-500">
            Created: {formatDate(template.createdAt)}
          </div>
          {template.updatedAt && template.updatedAt !== template.createdAt && (
            <div className="text-xs text-gray-500">
              Updated: {formatDate(template.updatedAt)}
            </div>
          )}
        </div>

        {/* Template preview thumbnail */}
        <div className="w-full h-16 bg-gray-50 rounded border mb-3 flex items-center justify-center">
          <div className="text-xs text-gray-400">
            {template.paperSize} • {template.orientation}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex space-x-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onLoad(template);
              }}
              className="h-8 px-2"
              title="Load Template"
            >
              <FolderOpen className="h-3 w-3 mr-1" />
              Load
            </Button>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(template.id);
            }}
            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
            title="Delete Template"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const useElementMove = (elements, onElementsChange) => {
  const moveElement = useCallback(
    (elementId, direction, amount = 1) => {
      const updatedElements = elements.map((el) => {
        if (el.id === elementId) {
          const newPosition = { ...el.position };

          switch (direction) {
            case "up":
              newPosition.y = Math.max(0, newPosition.y - amount);
              break;
            case "down":
              newPosition.y = Math.min(95, newPosition.y + amount);
              break;
            case "left":
              newPosition.x = Math.max(0, newPosition.x - amount);
              break;
            case "right":
              newPosition.x = Math.min(95, newPosition.x + amount);
              break;
            default:
              break;
          }

          return { ...el, position: newPosition };
        }
        return el;
      });

      onElementsChange(updatedElements);
    },
    [elements, onElementsChange]
  );

  return { moveElement };
};

const useElementRotation = (elements, onElementsChange) => {
  const rotateElement = useCallback(
    (elementId, direction) => {
      const updatedElements = elements.map((el) => {
        if (el.id === elementId) {
          const currentRotation = el.rotation || 0;
          const rotationStep = 90; // degrees

          let newRotation;
          if (direction === "clockwise") {
            newRotation = (currentRotation + rotationStep) % 360;
          } else {
            newRotation = (currentRotation - rotationStep + 360) % 360;
          }

          return {
            ...el,
            rotation: newRotation,
            style: {
              ...el.style,
              transform: `rotate(${newRotation}deg)`,
            },
          };
        }
        return el;
      });

      onElementsChange(updatedElements);
    },
    [elements, onElementsChange]
  );

  return { rotateElement };
};

// 5. Add Element Addition functionality using Plus
const QuickAddElementPanel = ({ onAddElement, elements }) => {
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const quickAddElements = [
    { type: ELEMENT_TYPES.TEXT, name: "Text", icon: Type },
    { type: ELEMENT_TYPES.IMAGE, name: "Image", icon: Image },
    { type: ELEMENT_TYPES.BARCODE, name: "Barcode", icon: QrCode },
    { type: ELEMENT_TYPES.QR_CODE, name: "QR Code", icon: Smartphone },
  ];

  return (
    <div className="relative">
      <Button
        size="sm"
        onClick={() => setShowQuickAdd(!showQuickAdd)}
        className="flex items-center space-x-1"
      >
        <Plus className="h-4 w-4" />
        <span>Quick Add</span>
      </Button>

      {showQuickAdd && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 p-2">
          <div className="grid grid-cols-2 gap-1">
            {quickAddElements.map((element) => {
              const IconComponent = element.icon;
              return (
                <Button
                  key={element.type}
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onAddElement(element.type);
                    setShowQuickAdd(false);
                  }}
                  className="flex flex-col items-center space-y-1 h-auto p-2"
                >
                  <IconComponent className="h-4 w-4" />
                  <span className="text-xs">{element.name}</span>
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// 6. Add Filtering functionality using Filter
const ElementFilterPanel = React.memo(({ elements, onFilterChange }) => {
  const [filterCriteria, setFilterCriteria] = useState({
    type: "",
    visible: "all",
    locked: "all",
    layer: "all",
  });

  const applyFilters = useCallback(() => {
    let filtered = [...elements];

    if (filterCriteria.type) {
      filtered = filtered.filter((el) =>
        el.type.toLowerCase().includes(filterCriteria.type.toLowerCase())
      );
    }

    if (filterCriteria.visible !== "all") {
      const isVisible = filterCriteria.visible === "visible";
      filtered = filtered.filter((el) => el.visible === isVisible);
    }

    if (filterCriteria.locked !== "all") {
      const isLocked = filterCriteria.locked === "locked";
      filtered = filtered.filter((el) => el.locked === isLocked);
    }

    onFilterChange(filtered);
  }, [elements, filterCriteria, onFilterChange]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  return (
    <div className="space-y-2 p-2 border-b">
      <div className="flex items-center space-x-2">
        <Filter className="h-4 w-4" />
        <Label className="text-xs font-medium">Filter Elements</Label>
      </div>

      <div className="space-y-2">
        <div>
          <Label className="text-xs">Type</Label>
          <Input
            placeholder="Search by type..."
            value={filterCriteria.type}
            onChange={(e) =>
              setFilterCriteria((prev) => ({
                ...prev,
                type: e.target.value,
              }))
            }
            className="h-6 text-xs"
          />
        </div>

        <div>
          <Label className="text-xs">Visibility</Label>
          <Select
            value={filterCriteria.visible}
            onValueChange={(value) =>
              setFilterCriteria((prev) => ({
                ...prev,
                visible: value,
              }))
            }
          >
            <SelectTrigger className="h-6 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="visible">Visible</SelectItem>
              <SelectItem value="hidden">Hidden</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Lock Status</Label>
          <Select
            value={filterCriteria.locked}
            onValueChange={(value) =>
              setFilterCriteria((prev) => ({
                ...prev,
                locked: value,
              }))
            }
          >
            <SelectTrigger className="h-6 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="locked">Locked</SelectItem>
              <SelectItem value="unlocked">Unlocked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
});

// Element Hierarchy Panel Component
const ElementHierarchyPanel = React.memo(
  ({ elements, selectedElement, onElementSelect, onElementToggle }) => {
    const [expandedElements, setExpandedElements] = useState(new Set());

    const toggleExpanded = (elementId) => {
      setExpandedElements((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(elementId)) {
          newSet.delete(elementId);
        } else {
          newSet.add(elementId);
        }
        return newSet;
      });
    };

    const hasChildren = (element) => {
      return elements.some((el) => el.parentId === element.id);
    };

    const getChildren = (parentId) => {
      return elements.filter((el) => el.parentId === parentId);
    };

    const renderElement = (element, level = 0) => {
      const isExpanded = expandedElements.has(element.id);
      const children = getChildren(element.id);

      return (
        <div key={element.id}>
          <div
            className={`flex items-center space-x-1 p-1 hover:bg-gray-100 cursor-pointer ${
              selectedElement?.id === element.id ? "bg-blue-100" : ""
            }`}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={() => onElementSelect(element)}
          >
            {hasChildren(element) ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(element.id);
                }}
                className="p-0 h-4 w-4"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            ) : (
              <div className="w-4" />
            )}

            <div className="flex items-center space-x-1 flex-1">
              <span className="text-xs">{element.type}</span>
              {element.locked && <span className="text-xs">🔒</span>}
              {!element.visible && <span className="text-xs">👁️</span>}
            </div>
          </div>

          {isExpanded &&
            children.map((child) => renderElement(child, level + 1))}
        </div>
      );
    };

    return (
      <div className="h-full flex flex-col">
        <div className="p-2 border-b">
          <h4 className="font-medium text-xs">Element Hierarchy</h4>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            {elements
              .filter((el) => !el.parentId)
              .map((element) => renderElement(element))}
          </div>
        </ScrollArea>
      </div>
    );
  }
);

// Template Size Selector Component
const TemplateSizeSelector = ({ onSelectTemplate, onConfigChange }) => {
  const [selectedPreset, setSelectedPreset] = useState(null);

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset);

    const config = {
      name: preset.name,
      paperSize: preset.paperSize,
      orientation: preset.orientation,
      margins: { top: 10, bottom: 10, left: 10, right: 10 },
    };

    onConfigChange(config);

    // Create template with default elements based on preset
    const elements = createDefaultElementsForPreset(preset);
    onSelectTemplate({
      config,
      elements,
      ...preset,
    });
  };

  const createDefaultElementsForPreset = (preset) => {
    const baseElements = [];

    // Add appropriate elements based on preset type
    if (preset.id.includes("shipping")) {
      baseElements.push(
        {
          id: generateId(),
          type: ELEMENT_TYPES.HEADER,
          ...elementDefaults[ELEMENT_TYPES.HEADER],
          position: { x: 0, y: 5 },
          content: preset.name.toUpperCase(),
        },
        {
          id: generateId(),
          type: ELEMENT_TYPES.RECIPIENT,
          ...elementDefaults[ELEMENT_TYPES.RECIPIENT],
          position: { x: 5, y: 15 },
        },
        {
          id: generateId(),
          type: ELEMENT_TYPES.SENDER,
          ...elementDefaults[ELEMENT_TYPES.SENDER],
          position: { x: 55, y: 15 },
        }
      );
    }

    if (preset.id.includes("thermal")) {
      baseElements.push(
        {
          id: generateId(),
          type: ELEMENT_TYPES.BARCODE,
          ...elementDefaults[ELEMENT_TYPES.BARCODE],
          position: { x: 10, y: 10 },
        },
        {
          id: generateId(),
          type: ELEMENT_TYPES.TRACKING_INFO,
          ...elementDefaults[ELEMENT_TYPES.TRACKING_INFO],
          position: { x: 5, y: 40 },
        }
      );
    }

    return baseElements;
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Template Presets</div>
      <div className="grid grid-cols-1 gap-2">
        {TEMPLATE_SIZE_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            variant={selectedPreset?.id === preset.id ? "default" : "outline"}
            onClick={() => handlePresetSelect(preset)}
            className="h-auto p-3 flex flex-col items-start space-y-1 text-left"
          >
            <div className="flex items-center space-x-2">
              <span className="text-lg">{preset.icon}</span>
              <span className="text-xs font-medium">{preset.name}</span>
            </div>
            <div className="text-xs text-gray-500">{preset.description}</div>
          </Button>
        ))}
      </div>
    </div>
  );
};
// Complete Element Renderer with all cases
const ElementRenderer = React.memo(
  ({
    element,
    isSelected,
    onPointerDown,
    onDragStart,
    onResizeStart,
    paperDimensions,
    scale,
    orderData = null,
    isPreviewMode = false,
    isDraggable = false,
    isResizable = false,
  }) => {
    // Use DataMapper to resolve dynamic content
    const resolvedContent = useMemo(() => {
      try {
        // Check if DataMapper exists and has the method
        if (
          typeof DataMapper !== "undefined" &&
          DataMapper &&
          typeof DataMapper.mapElementData === "function"
        ) {
          const mappedData = DataMapper.mapElementData(element, orderData);
          return mappedData || element.content;
        } else {
          console.warn("DataMapper.mapElementData method not available");
          return element.content;
        }
      } catch (error) {
        console.warn("Data mapping failed:", error);
        return element.content;
      }
    }, [element, orderData]);

    // Update element content with resolved data
    const updatedElement = useMemo(
      () => ({
        ...element,
        content: resolvedContent,
      }),
      [element, resolvedContent]
    );

    // Calculate element style based on paper dimensions and scale
    const elementStyle = {
      position: "absolute",
      left: `${updatedElement.position.x}%`,
      top: `${updatedElement.position.y}%`,
      width: `${updatedElement.size?.width || 20}%`,
      height: `${updatedElement.size?.height || 10}%`,
      cursor: isDraggable
        ? "move"
        : updatedElement.locked
        ? "default"
        : "pointer",
      userSelect: "none",
      zIndex: updatedElement.zIndex || 1,
      opacity: updatedElement.opacity || 1,
      transform: `scale(${scale})`,
      transformOrigin: "top left",
      ...updatedElement.style,
    };

    const handleResizePointerDown = (corner, e) => {
      e.stopPropagation();
      e.preventDefault();
      if (onResizeStart && isResizable) {
        onResizeStart(updatedElement, corner, e);
      }
    };

    const handleMovePointerDown = (e) => {
      e.stopPropagation();
      e.preventDefault();

      // Always handle selection first
      if (onPointerDown) {
        onPointerDown(e);
      }

      // Then handle drag if draggable
      if (onDragStart && isDraggable && !updatedElement.locked) {
        onDragStart(updatedElement, e);
      }
    };

    const renderElementContent = () => {
      switch (updatedElement.type) {
        case ELEMENT_TYPES.TEXT:
        case ELEMENT_TYPES.HEADER:
        case ELEMENT_TYPES.FOOTER:
        case ELEMENT_TYPES.CUSTOM_FIELD:
          return (
            <div
              className="w-full h-full flex items-center justify-start"
              style={{
                fontSize: updatedElement.style?.fontSize || 14,
                fontFamily:
                  updatedElement.style?.fontFamily ||
                  "Inter, Arial, sans-serif",
                color: updatedElement.style?.color || "#374151",
                textAlign: updatedElement.style?.textAlign || "left",
                fontWeight: updatedElement.style?.fontWeight || "normal",
                padding: updatedElement.style?.padding || "8px",
                overflow: "hidden",
                wordBreak: "break-word",
              }}
            >
              {updatedElement.content || "Sample Text"}
            </div>
          );

        case ELEMENT_TYPES.IMAGE:
          return (
            <div className="w-full h-full flex items-center justify-center">
              {updatedElement.content ? (
                <img
                  src={updatedElement.content}
                  alt="Element"
                  className="max-w-full max-h-full object-contain"
                  style={{
                    objectFit: updatedElement.style?.objectFit || "contain",
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded">
                  <div className="text-center text-gray-500">
                    <Image className="h-8 w-8 mx-auto mb-2" />
                    <div className="text-xs">Resim URL'si girin</div>
                  </div>
                </div>
              )}
            </div>
          );

        case ELEMENT_TYPES.BARCODE:
          return (
            <div className="w-full h-full flex items-center justify-center">
              {Barcode ? (
                <Barcode
                  value={updatedElement.content || "1234567890123"}
                  format={updatedElement.options?.format || "CODE128"}
                  displayValue={updatedElement.options?.displayValue !== false}
                  width={1}
                  height={40}
                />
              ) : (
                <FallbackBarcode
                  value={updatedElement.content || "1234567890123"}
                  format={updatedElement.options?.format || "CODE128"}
                  displayValue={updatedElement.options?.displayValue !== false}
                />
              )}
            </div>
          );

        case ELEMENT_TYPES.QR_CODE:
          return (
            <div className="w-full h-full flex items-center justify-center">
              {QRCode ? (
                <QRCode
                  value={
                    updatedElement.content || "https://example.com/order/123"
                  }
                  size={Math.min(64, (updatedElement.size?.width || 15) * 2)}
                  level={updatedElement.options?.errorCorrectionLevel || "M"}
                />
              ) : (
                <FallbackQRCode
                  value={
                    updatedElement.content || "https://example.com/order/123"
                  }
                  size={Math.min(64, (updatedElement.size?.width || 15) * 2)}
                />
              )}
            </div>
          );

        case ELEMENT_TYPES.DIVIDER:
          return (
            <div
              className="w-full"
              style={{
                height: "2px",
                backgroundColor:
                  updatedElement.style?.backgroundColor || "#e5e7eb",
                border: "none",
              }}
            />
          );

        case ELEMENT_TYPES.SPACER:
          return (
            <div
              className="w-full h-full"
              style={{
                backgroundColor: "transparent",
              }}
            />
          );

        // Contact & Address Elements
        case ELEMENT_TYPES.RECIPIENT:
        case ELEMENT_TYPES.SENDER:
        case ELEMENT_TYPES.CUSTOMER_INFO:
        case ELEMENT_TYPES.SHIPPING_ADDRESS:
        case ELEMENT_TYPES.BILLING_ADDRESS:
          return (
            <div className="w-full h-full p-2 text-xs">
              <div className="font-medium mb-1">
                {updatedElement.type.replace(/_/g, " ").toUpperCase()}
              </div>
              <div className="space-y-1 text-gray-600">
                <div>John Doe</div>
                <div>123 Example Street</div>
                <div>City, State 12345</div>
                <div>+1 (555) 123-4567</div>
              </div>
            </div>
          );

        // Order Elements
        case ELEMENT_TYPES.ORDER_SUMMARY:
        case ELEMENT_TYPES.ORDER_DETAILS:
        case ELEMENT_TYPES.ORDER_ITEMS:
        case ELEMENT_TYPES.ORDER_TOTALS:
        case ELEMENT_TYPES.PAYMENT_INFO:
          return (
            <div className="w-full h-full p-2 text-xs">
              <div className="font-medium mb-1">
                {updatedElement.type.replace(/_/g, " ").toUpperCase()}
              </div>
              <div className="space-y-1 text-gray-600">
                <div>Order #12345</div>
                <div>Date: 2024-01-15</div>
                <div>Total: $99.99</div>
              </div>
            </div>
          );

        // Tracking Elements
        case ELEMENT_TYPES.TRACKING_INFO:
        case ELEMENT_TYPES.CARRIER_INFO:
        case ELEMENT_TYPES.SHIPPING_METHOD:
        case ELEMENT_TYPES.DELIVERY_INFO:
          return (
            <div className="w-full h-full p-2 text-xs">
              <div className="font-medium mb-1">
                {updatedElement.type.replace(/_/g, " ").toUpperCase()}
              </div>
              <div className="space-y-1 text-gray-600">
                <div>Tracking: 1Z999AA1234567890</div>
                <div>Carrier: UPS</div>
                <div>Service: Ground</div>
              </div>
            </div>
          );

        // Platform Elements
        case ELEMENT_TYPES.PLATFORM_INFO:
        case ELEMENT_TYPES.TRENDYOL_DATA:
        case ELEMENT_TYPES.HEPSIBURADA_DATA:
        case ELEMENT_TYPES.N11_DATA:
          return (
            <div className="w-full h-full p-2 text-xs">
              <div className="font-medium mb-1">
                {updatedElement.type.replace(/_/g, " ").toUpperCase()}
              </div>
              <div className="space-y-1 text-gray-600">
                <div>Platform: {updatedElement.type.split("_")[0]}</div>
                <div>Order ID: 123456789</div>
                <div>Status: Active</div>
              </div>
            </div>
          );

        // Custom Elements
        case ELEMENT_TYPES.CUSTOM_TABLE:
          return (
            <div className="w-full h-full p-2 text-xs">
              <div className="font-medium mb-1">CUSTOM TABLE</div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-1">Column 1</th>
                    <th className="border border-gray-300 p-1">Column 2</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-1">Data 1</td>
                    <td className="border border-gray-300 p-1">Data 2</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );

        case ELEMENT_TYPES.CUSTOM_LIST:
          return (
            <div className="w-full h-full p-2 text-xs">
              <div className="font-medium mb-1">CUSTOM LIST</div>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Item 1</li>
                <li>Item 2</li>
                <li>Item 3</li>
              </ul>
            </div>
          );

        default:
          return (
            <div className="w-full h-full flex items-center justify-center border border-dashed border-gray-300 text-gray-400 text-xs p-2">
              {updatedElement.type.replace(/_/g, " ").toUpperCase()}
            </div>
          );
      }
    };

    return (
      <div
        style={elementStyle}
        onMouseDown={handleMovePointerDown}
        className={`
        ${isSelected ? "ring-2 ring-blue-500 ring-opacity-75" : ""}
        ${
          updatedElement.locked
            ? "opacity-50"
            : "hover:ring-1 hover:ring-gray-300"
        }
        ${updatedElement.required ? "ring-1 ring-yellow-400" : ""}
        transition-all duration-150
      `}
        title={isPreviewMode ? "Sürükle & Boyutlandır" : "Seçmek için tıkla"}
      >
        {renderElementContent()}

        {/* Selection handles */}
        {isSelected && !updatedElement.locked && (
          <>
            {/* Resize handles for corners */}
            {isResizable && (
              <>
                <div
                  className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-nw-resize"
                  onMouseDown={(e) => handleResizePointerDown("nw", e)}
                />
                <div
                  className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-ne-resize"
                  onMouseDown={(e) => handleResizePointerDown("ne", e)}
                />
                <div
                  className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-sw-resize"
                  onMouseDown={(e) => handleResizePointerDown("sw", e)}
                />
                <div
                  className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize"
                  onMouseDown={(e) => handleResizePointerDown("se", e)}
                />
              </>
            )}

            {/* Element label */}
            <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-1 rounded whitespace-nowrap">
              {ELEMENT_CATEGORIES[
                Object.keys(ELEMENT_CATEGORIES).find((cat) =>
                  ELEMENT_CATEGORIES[cat].elements.some(
                    (el) => el.type === updatedElement.type
                  )
                )
              ]?.elements.find((el) => el.type === updatedElement.type)?.name ||
                updatedElement.type}
              {updatedElement.locked && " 🔒"}
            </div>
          </>
        )}

        {/* Required indicator */}
        {updatedElement.required && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full" />
        )}
      </div>
    );
  }
);

// Complete ElementLibrary Component
const ElementLibrary = React.memo(({ onAddElement }) => {
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
    event.dataTransfer.setData("application/element", elementType);
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

      {/* Enhanced Category tabs */}
      <div className="p-4 border-b">
        <ScrollArea className="w-full">
          <div className="grid w-full grid-cols-4 gap-2 pb-1">
            {Object.entries(filteredCategories).map(([key, category]) => {
              // Create the proper icon component
              const IconComponent = category.icon;

              return (
                <Button
                  key={key}
                  variant={selectedCategory === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(key)}
                  className={`flex flex-col items-center justify-center p-2 h-auto w-full gap-1 ${
                    selectedCategory === key
                      ? `bg-${key}-100 border-${key}-300`
                      : ""
                  }`}
                >
                  {IconComponent && <IconComponent className="h-5 w-5" />}
                  <span
                    className="text-[0.65rem] leading-tight text-center break-words hyphens-auto"
                    style={{ maxWidth: "100%" }}
                  >
                    {category.name}
                  </span>
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
                const IconComponent = element.icon;

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
                          {IconComponent && (
                            <IconComponent className="h-4 w-4" />
                          )}
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
});

// Complete ElementPropertiesPanel Component
const ElementPropertiesPanel = React.memo(
  ({ element, onUpdate, onRemove, onDuplicate }) => {
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
            {["content", "style", "position", "transform", "data"].map(
              (tab) => (
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
                  {tab === "transform" && "Dönüşüm"}
                  {tab === "data" && "Veri"}
                </Button>
              )
            )}
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
                    <div className="space-y-2 overflow-y-auto">
                      {Object.entries(element.fields).map(
                        ([field, enabled]) => (
                          <div
                            key={field}
                            className="flex items-center space-x-2"
                          >
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
                        )
                      )}
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
                    {/* Enhanced Font Size Section */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">
                        Yazı Tipi Boyutu
                      </Label>

                      {/* Font Size Presets */}
                      <div className="grid grid-cols-4 gap-1 mb-2">
                        {[
                          { label: "XS", value: 8, desc: "Çok Küçük" },
                          { label: "S", value: 10, desc: "Küçük" },
                          { label: "M", value: 12, desc: "Orta" },
                          { label: "L", value: 14, desc: "Büyük" },
                          { label: "XL", value: 18, desc: "Çok Büyük" },
                          { label: "XXL", value: 24, desc: "İri" },
                          { label: "H1", value: 32, desc: "Başlık 1" },
                          { label: "H2", value: 28, desc: "Başlık 2" },
                        ].map((preset) => (
                          <Button
                            key={preset.value}
                            size="sm"
                            variant={
                              (element.style?.fontSize || 12) === preset.value
                                ? "default"
                                : "outline"
                            }
                            onClick={() =>
                              handleStyleChange("fontSize", preset.value)
                            }
                            className="h-8 p-1 text-xs"
                            title={`${preset.desc} (${preset.value}px)`}
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </div>

                      {/* Custom Font Size Controls */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={element.style?.fontSize || 12}
                            onChange={(e) => {
                              const newFontSize = Math.max(
                                6,
                                Math.min(100, parseInt(e.target.value) || 12)
                              );
                              handleStyleChange("fontSize", newFontSize);
                            }}
                            min="6"
                            max="100"
                            step="1"
                            className="w-16 text-center"
                          />
                          <span className="text-xs text-gray-500 min-w-[20px]">
                            px
                          </span>

                          {/* Font Size Slider */}
                          <Input
                            type="range"
                            min="6"
                            max="72"
                            step="1"
                            value={element.style?.fontSize || 12}
                            onChange={(e) =>
                              handleStyleChange(
                                "fontSize",
                                parseInt(e.target.value)
                              )
                            }
                            className="flex-1 h-2"
                          />
                        </div>

                        {/* Quick adjustment buttons */}
                        <div className="flex items-center justify-between">
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const currentSize =
                                  element.style?.fontSize || 12;
                                const newSize = Math.max(6, currentSize - 1);
                                handleStyleChange("fontSize", newSize);
                              }}
                              className="h-6 px-2 text-xs"
                              title="1px küçült"
                            >
                              -1
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const currentSize =
                                  element.style?.fontSize || 12;
                                const newSize = Math.min(100, currentSize + 1);
                                handleStyleChange("fontSize", newSize);
                              }}
                              className="h-6 px-2 text-xs"
                              title="1px büyült"
                            >
                              +1
                            </Button>
                          </div>

                          {/* Font Size Unit Selector */}
                          <Select
                            value={element.style?.fontSizeUnit || "px"}
                            onValueChange={(value) =>
                              handleStyleChange("fontSizeUnit", value)
                            }
                          >
                            <SelectTrigger className="w-16 h-6 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="px">px</SelectItem>
                              <SelectItem value="pt">pt</SelectItem>
                              <SelectItem value="em">em</SelectItem>
                              <SelectItem value="rem">rem</SelectItem>
                              <SelectItem value="%">%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Font Size Preview */}
                        <div className="p-3 bg-gray-50 rounded border">
                          <div className="text-xs text-gray-500 mb-1">
                            Önizleme:
                          </div>
                          <div
                            style={{
                              fontSize: `${element.style?.fontSize || 12}${
                                element.style?.fontSizeUnit || "px"
                              }`,
                              fontFamily:
                                element.style?.fontFamily ||
                                "Inter, Arial, sans-serif",
                              fontWeight: element.style?.fontWeight || "normal",
                              color: element.style?.color || "#374151",
                              lineHeight: element.style?.lineHeight || "1.5",
                            }}
                          >
                            Örnek metin Aa 123
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Yazı Tipi</Label>
                      <Select
                        value={
                          element.style?.fontFamily ||
                          "Inter, Arial, sans-serif"
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
                          <SelectItem value="Georgia, serif">
                            Georgia
                          </SelectItem>
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
                          <SelectItem value="justify">
                            İki Yana Yaslı
                          </SelectItem>
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
                    onChange={(e) =>
                      handleStyleChange("border", e.target.value)
                    }
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
                    onChange={(e) =>
                      handleStyleChange("padding", e.target.value)
                    }
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
                      onChange={(e) =>
                        handlePositionChange("x", e.target.value)
                      }
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
                      onChange={(e) =>
                        handlePositionChange("y", e.target.value)
                      }
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
                      onChange={(e) =>
                        handleSizeChange("width", e.target.value)
                      }
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
                      onChange={(e) =>
                        handleSizeChange("height", e.target.value)
                      }
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
                    onCheckedChange={(checked) =>
                      onUpdate({ visible: checked })
                    }
                  />
                  <Label>Görünür</Label>
                </div>

                <div className="space-y-2">
                  <Label>Hızlı Hareket</Label>
                  <div className="grid grid-cols-3 gap-1">
                    <div></div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newY = Math.max(0, element.position.y - 1);
                        onUpdate({
                          position: { ...element.position, y: newY },
                        });
                      }}
                      className="p-1"
                    >
                      ↑
                    </Button>
                    <div></div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newX = Math.max(0, element.position.x - 1);
                        onUpdate({
                          position: { ...element.position, x: newX },
                        });
                      }}
                      className="p-1"
                    >
                      ←
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onUpdate({
                          position: { x: 50, y: 50 },
                        });
                      }}
                      className="p-1"
                    >
                      <Move className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newX = Math.min(95, element.position.x + 1);
                        onUpdate({
                          position: { ...element.position, x: newX },
                        });
                      }}
                      className="p-1"
                    >
                      →
                    </Button>

                    <div></div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newY = Math.min(95, element.position.y + 1);
                        onUpdate({
                          position: { ...element.position, y: newY },
                        });
                      }}
                      className="p-1"
                    >
                      ↓
                    </Button>
                    <div></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "transform" && (
              <>
                {/* Add Rotation Controls */}
                <div className="space-y-2">
                  <Label>Döndürme</Label>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const currentRotation = element.rotation || 0;
                        const newRotation = (currentRotation - 90 + 360) % 360;
                        onUpdate({
                          rotation: newRotation,
                          style: {
                            ...element.style,
                            transform: `rotate(${newRotation}deg)`,
                          },
                        });
                      }}
                      title="Saat Yönünün Tersine"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const currentRotation = element.rotation || 0;
                        const newRotation = (currentRotation + 90) % 360;
                        onUpdate({
                          rotation: newRotation,
                          style: {
                            ...element.style,
                            transform: `rotate(${newRotation}deg)`,
                          },
                        });
                      }}
                      title="Saat Yönünde"
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-gray-500">
                      {element.rotation || 0}°
                    </span>
                  </div>
                  <Input
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    value={element.rotation || 0}
                    onChange={(e) => {
                      const rotation = parseInt(e.target.value);
                      onUpdate({
                        rotation,
                        style: {
                          ...element.style,
                          transform: `rotate(${rotation}deg)`,
                        },
                      });
                    }}
                    className="w-full"
                  />
                </div>

                {/* Scale Controls */}
                <div className="space-y-2">
                  <Label>Ölçeklendirme</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Ölçek X</Label>
                      <Input
                        type="range"
                        min="0.1"
                        max="3"
                        step="0.1"
                        value={element.scaleX || 1}
                        onChange={(e) =>
                          onUpdate({
                            scaleX: parseFloat(e.target.value),
                            style: {
                              ...element.style,
                              transform: `scale(${e.target.value}, ${
                                element.scaleY || 1
                              }) rotate(${element.rotation || 0}deg)`,
                            },
                          })
                        }
                      />
                      <div className="text-xs text-center text-gray-500">
                        {element.scaleX || 1}x
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Ölçek Y</Label>
                      <Input
                        type="range"
                        min="0.1"
                        max="3"
                        step="0.1"
                        value={element.scaleY || 1}
                        onChange={(e) =>
                          onUpdate({
                            scaleY: parseFloat(e.target.value),
                            style: {
                              ...element.style,
                              transform: `scale(${element.scaleX || 1}, ${
                                e.target.value
                              }) rotate(${element.rotation || 0}deg)`,
                            },
                          })
                        }
                      />
                      <div className="text-xs text-center text-gray-500">
                        {element.scaleY || 1}x
                      </div>
                    </div>
                  </div>
                </div>

                {/* Flip Controls */}
                <div className="space-y-2">
                  <Label>Çevirme</Label>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant={element.flipX ? "default" : "outline"}
                      onClick={() =>
                        onUpdate({
                          flipX: !element.flipX,
                          style: {
                            ...element.style,
                            transform: `scaleX(${
                              element.flipX ? 1 : -1
                            }) scaleY(${element.flipY ? -1 : 1}) rotate(${
                              element.rotation || 0
                            }deg)`,
                          },
                        })
                      }
                    >
                      Flip X {element.flipX && "✓"}
                    </Button>
                    <Button
                      size="sm"
                      variant={element.flipY ? "default" : "outline"}
                      onClick={() =>
                        onUpdate({
                          flipY: !element.flipY,
                          style: {
                            ...element.style,
                            transform: `scaleX(${
                              element.flipX ? -1 : 1
                            }) scaleY(${element.flipY ? 1 : -1}) rotate(${
                              element.rotation || 0
                            }deg)`,
                          },
                        })
                      }
                    >
                      Flip Y {element.flipY && "✓"}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {activeTab === "data" && (
              <div className="space-y-4">
                {element.dataMapping && (
                  <>
                    <div className="text-xs text-gray-600 mb-2">
                      Bu öğe sipariş verilerinden otomatik olarak dolduruluyor.
                    </div>
                    {Object.entries(element.dataMapping).map(
                      ([field, path]) => (
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
                      )
                    )}
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
                    onCheckedChange={(checked) =>
                      onUpdate({ required: checked })
                    }
                  />
                  <Label>Zorunlu alan</Label>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }
);

const LeftSidebar = ({
  elements,
  filteredElements,
  selectedElement,
  addElement,
  updateElement,
  setSelectedElement,
  templateConfig,
  setTemplateConfig,
  setElements,
  handleFilterChange,
}) => {
  const [activeTab, setActiveTab] = useState("elements");

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Gönderi Belgesi Tasarımcısı</h2>
        <p className="text-sm text-gray-600 mt-1">
          Öğeleri sürükleyerek özel gönderi belgesi oluşturun
        </p>
      </div>

      {/* Tab selector */}
      <div className="border-b">
        <div className="flex">
          <Button
            variant={activeTab === "elements" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("elements")}
            className="flex-1 rounded-none"
          >
            Elements
          </Button>
          <Button
            variant={activeTab === "hierarchy" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("hierarchy")}
            className="flex-1 rounded-none"
          >
            Hierarchy
          </Button>
          <Button
            variant={activeTab === "presets" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("presets")}
            className="flex-1 rounded-none"
          >
            Presets
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === "elements" && (
          <div className="h-full flex flex-col">
            <ElementFilterPanel
              elements={elements}
              onFilterChange={handleFilterChange}
            />
            <div className="flex-1 overflow-hidden">
              <ElementLibrary onAddElement={addElement} />
            </div>
          </div>
        )}

        {activeTab === "hierarchy" && (
          <ElementHierarchyPanel
            elements={filteredElements.length > 0 ? filteredElements : elements}
            selectedElement={selectedElement}
            onElementSelect={setSelectedElement}
            onElementToggle={(elementId, visible) =>
              updateElement(elementId, { visible })
            }
          />
        )}

        {activeTab === "presets" && (
          <div className="p-4">
            <TemplateSizeSelector
              onSelectTemplate={(template) => {
                setElements(template.elements);
                setTemplateConfig(template.config);
              }}
              onConfigChange={setTemplateConfig}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const Toolbar = ({
  undo,
  redo,
  canUndo,
  canRedo,
  addElement,
  elements,
  scale,
  setScale,
  selectedElement,
  moveElement,
  rotateElement,
  showElementHierarchy,
  setShowElementHierarchy,
  setShowPreviewModal,
  handleSaveTemplate,
  loading,
  onCancel,
}) => {
  const [previewMode, setPreviewMode] = useState("desktop");

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex items-center justify-between">
        {/* Undo/Redo and Preview Mode Controls */}
        <div className="flex items-center space-x-2">
          {/* Undo/Redo */}
          <Button
            size="sm"
            variant="outline"
            onClick={undo}
            disabled={!canUndo}
            title="Geri Al (Ctrl+Z)"
          >
            <Undo className="h-4 w-4" />
          </Button>

          {/* Redo Button */}
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

          {/* Preview Mode Buttons */}
          <div className="flex items-center space-x-1">
            {/* Desktop Preview Button */}
            <span className="text-xs text-gray-600">Preview:</span>
            <Button
              size="sm"
              variant={previewMode === "desktop" ? "default" : "outline"}
              onClick={() => {
                setPreviewMode("desktop");
                setShowPreviewModal(true);
              }}
              title="Desktop Preview"
            >
              <Monitor className="h-4 w-4" />
            </Button>

            {/* Mobile Preview Button */}
            <Button
              size="sm"
              variant={previewMode === "mobile" ? "default" : "outline"}
              onClick={() => {
                setPreviewMode("mobile");
                setShowPreviewModal(true);
              }}
              title="Mobile Preview"
            >
              <Smartphone className="h-4 w-4" />
            </Button>

            {/* Print Preview Button */}
            <Button
              size="sm"
              variant={previewMode === "print" ? "default" : "outline"}
              onClick={() => {
                setPreviewMode("print");
                setShowPreviewModal(true);
              }}
              title="Print Preview"
            >
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Element Movement and Rotation Controls */}
        <div className="flex items-center space-x-2">
          {/* Element Movement Controls */}
          {selectedElement && !selectedElement.locked && (
            <>
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-600">Move:</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => moveElement(selectedElement.id, "up")}
                  title="Move Up (↑)"
                >
                  ↑
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => moveElement(selectedElement.id, "down")}
                  title="Move Down (↓)"
                >
                  ↓
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => moveElement(selectedElement.id, "left")}
                  title="Move Left (←)"
                >
                  ←
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => moveElement(selectedElement.id, "right")}
                  title="Move Right (→)"
                >
                  →
                </Button>
              </div>

              <div className="h-4 w-px bg-gray-300 mx-2" />

              {/* Element Rotation Controls */}
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-600">Rotate:</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    rotateElement(selectedElement.id, "counterclockwise")
                  }
                  title="Rotate Counter-clockwise (Ctrl+Shift+R)"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => rotateElement(selectedElement.id, "clockwise")}
                  title="Rotate Clockwise (Ctrl+R)"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>

              <div className="h-4 w-px bg-gray-300 mx-2" />
            </>
          )}

          {/* Quick Add Element */}
          <QuickAddElementPanel onAddElement={addElement} elements={elements} />

          <div className="h-4 w-px bg-gray-300 mx-2" />

          {/* Zoom Control */}
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

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Hierarchy Toggle */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowElementHierarchy(!showElementHierarchy)}
            title="Toggle Hierarchy"
          >
            <Layers className="h-4 w-4 mr-2" />
            Hierarchy
          </Button>

          {/* Preview and Save Buttons */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPreviewModal(true)}
            title="Önizleme (Ctrl+P)"
          >
            <Eye className="h-4 w-4 mr-2" />
            Önizleme
          </Button>

          {/* Save Template Button */}
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

          {/* Cancel Button */}
          {onCancel && (
            <Button size="sm" variant="outline" onClick={onCancel}>
              İptal
            </Button>
          )}
        </div>
      </div>

      {/* Element Info Bar */}
      {selectedElement && (
        <div className="mt-2 p-2 bg-blue-50 rounded-md">
          <div className="text-xs text-blue-800">
            Selected: {selectedElement.type} | Position: (
            {Math.round(selectedElement.position.x)},{" "}
            {Math.round(selectedElement.position.y)}) | Size:{" "}
            {Math.round(selectedElement.size.width)}% ×{" "}
            {Math.round(selectedElement.size.height)}% | Rotation:{" "}
            {selectedElement.rotation || 0}°
            {selectedElement.locked && " | 🔒 Locked"}
          </div>
        </div>
      )}
    </div>
  );
};

ElementRenderer.displayName = "ElementRenderer";
ElementLibrary.displayName = "ElementLibrary";
ElementPropertiesPanel.displayName = "ElementPropertiesPanel";
ElementFilterPanel.displayName = "ElementFilterPanel";
ElementHierarchyPanel.displayName = "ElementHierarchyPanel";

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
  const [filteredElements, setFilteredElements] = useState([]);
  const [showElementHierarchy, setShowElementHierarchy] = useState(false);

  const { moveElement } = useElementMove(elements, setElements);
  const { rotateElement } = useElementRotation(elements, setElements);

  const { showAlert } = useAlert();

  const paperDimensions = useMemo(
    () => getPaperDimensions(templateConfig),
    [templateConfig]
  );

  // Handle filtered elements
  const handleFilterChange = useCallback((filtered) => {
    setFilteredElements(filtered);
  }, []);

  const enhancedUpdateElement = useCallback(
    (id, updates) => {
      updateElement(id, updates);
    },
    [updateElement]
  );

  const handleSaveTemplate = useCallback(async () => {
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
  }, [
    templateConfig,
    elements,
    setSavedTemplates,
    showAlert,
    onSave,
    setLoading,
  ]);

  // Element move handler
  const handleElementMove = useCallback(
    (direction, amount = 1) => {
      if (selectedElement) {
        const newPosition = { ...selectedElement.position };

        switch (direction) {
          case "up":
            newPosition.y = Math.max(0, newPosition.y - amount);
            break;
          case "down":
            newPosition.y = Math.min(95, newPosition.y + amount);
            break;
          case "left":
            newPosition.x = Math.max(0, newPosition.x - amount);
            break;
          case "right":
            newPosition.x = Math.min(95, newPosition.x + amount);
            break;
          case "center":
            newPosition.x = 50;
            newPosition.y = 50;
            break;
          default:
            break;
        }

        updateElement(selectedElement.id, { position: newPosition });
      }
    },
    [selectedElement, updateElement]
  );

  // Element rotation handler
  const handleElementRotate = useCallback(
    (direction) => {
      if (selectedElement) {
        const currentRotation = selectedElement.rotation || 0;
        let newRotation;

        if (direction === "clockwise") {
          newRotation = (currentRotation + 90) % 360;
        } else {
          newRotation = (currentRotation - 90 + 360) % 360;
        }

        updateElement(selectedElement.id, {
          rotation: newRotation,
          style: {
            ...selectedElement.style,
            transform: `rotate(${newRotation}deg)`,
          },
        });
      }
    },
    [selectedElement, updateElement]
  );

  // Keyboard shortcuts useEffect with proper dependencies
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

      // USE moveElement for arrow key navigation
      if (selectedElement && !selectedElement.locked) {
        const moveAmount = e.shiftKey ? 10 : 1; // Shift for larger movements

        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            moveElement(selectedElement.id, "up", moveAmount);
            break;
          case "ArrowDown":
            e.preventDefault();
            moveElement(selectedElement.id, "down", moveAmount);
            break;
          case "ArrowLeft":
            e.preventDefault();
            moveElement(selectedElement.id, "left", moveAmount);
            break;
          case "ArrowRight":
            e.preventDefault();
            moveElement(selectedElement.id, "right", moveAmount);
            break;
          default:
            break;
        }
      }

      // USE rotateElement for rotation shortcuts
      if (selectedElement && !selectedElement.locked) {
        switch (e.key) {
          case "r":
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              rotateElement(
                selectedElement.id,
                e.shiftKey ? "counterclockwise" : "clockwise"
              );
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
    handleSaveTemplate,
    setShowPreviewModal,
    moveElement,
    rotateElement,
  ]);

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
              phone: "+90 212 123  45 67",
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

  // Template modal handlers
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

  // Add handler for element changes from preview
  const handlePreviewElementsChange = (updatedElements) => {
    setElements(updatedElements);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Element Library */}
        <LeftSidebar
          elements={elements}
          filteredElements={filteredElements}
          selectedElement={selectedElement}
          addElement={addElement}
          updateElement={updateElement}
          setSelectedElement={setSelectedElement}
          templateConfig={templateConfig}
          setTemplateConfig={setTemplateConfig}
          setElements={setElements}
          handleFilterChange={handleFilterChange}
        />

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <Toolbar
            undo={undo}
            redo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            addElement={addElement}
            elements={elements}
            scale={scale}
            setScale={setScale}
            showElementHierarchy={showElementHierarchy}
            setShowElementHierarchy={setShowElementHierarchy}
            setShowPreviewModal={setShowPreviewModal}
            handleSaveTemplate={handleSaveTemplate}
            loading={loading}
            onCancel={onCancel}
          />

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
                onFilterChange={handleFilterChange}
                onShowElementHierarchy={() =>
                  setShowElementHierarchy((prev) => !prev)
                }
                showElementHierarchy={showElementHierarchy}
                elements={elements}
                filteredElements={filteredElements}
                onElementMove={handleElementMove}
                onElementRotate={handleElementRotate}
                onElementUpdate={enhancedUpdateElement}
                onElementPointerDown={handleElementPointerDown}
                onElementSelect={(element) => setSelectedElement(element)}
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
        onElementsChange={handlePreviewElementsChange}
      />
    </div>
  );
};

export default ShippingSlipDesigner;
