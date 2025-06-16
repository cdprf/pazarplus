import {
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
  Ruler,
  Grid,
  Shield,
  Zap,
  Star,
} from "lucide-react";
import { ELEMENT_TYPES } from "./elementTypes.js";

// Simple category constants for ElementLibrary compatibility
export const ELEMENT_CATEGORIES = {
  BASIC: "basic",
  SHIPPING: "shipping", 
  CODES: "codes",
  BUSINESS: "business",
  LAYOUT: "layout",
};

// Enhanced Element Categories with Comprehensive Field Support
export const ELEMENT_CATEGORIES_DETAILED = {
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
