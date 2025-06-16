// Available data fields for dynamic content in templates
export const DATA_FIELDS = {
  // Order Information
  ORDER_NUMBER: {
    key: "{{ORDER_NUMBER}}",
    label: "Sipariş Numarası",
    category: "order",
    description: "Sipariş numarası",
    example: "10282743456",
  },
  ORDER_DATE: {
    key: "{{ORDER_DATE}}",
    label: "Sipariş Tarihi",
    category: "order",
    description: "Sipariş oluşturma tarihi",
    example: "2025-06-15",
  },
  ORDER_TOTAL: {
    key: "{{ORDER_TOTAL}}",
    label: "Sipariş Tutarı",
    category: "order",
    description: "Toplam sipariş tutarı",
    example: "1883.29",
  },
  PLATFORM: {
    key: "{{PLATFORM}}",
    label: "Platform",
    category: "order",
    description: "Sipariş platformu",
    example: "Trendyol",
  },

  // Shipping Information
  CARGO_TRACKING_NUMBER: {
    key: "{{CARGO_TRACKING_NUMBER}}",
    label: "Kargo Takip Numarası",
    category: "shipping",
    description: "Kargo takip numarası",
    example: "7260024184375463",
  },
  CARGO_COMPANY: {
    key: "{{CARGO_COMPANY}}",
    label: "Kargo Şirketi",
    category: "shipping",
    description: "Kargo şirketi adı",
    example: "Aras Kargo",
  },
  CARGO_URL: {
    key: "{{CARGO_URL}}",
    label: "Kargo Takip URL",
    category: "shipping",
    description: "Kargo takip bağlantısı",
    example: "https://kargotakip.aras.com.tr",
  },

  // Customer Information
  CUSTOMER_NAME: {
    key: "{{CUSTOMER_NAME}}",
    label: "Müşteri Adı",
    category: "customer",
    description: "Alıcı müşteri adı",
    example: "Saylan Sahin",
  },
  CUSTOMER_EMAIL: {
    key: "{{CUSTOMER_EMAIL}}",
    label: "Müşteri E-postası",
    category: "customer",
    description: "Müşteri e-posta adresi",
    example: "customer@example.com",
  },
  CUSTOMER_PHONE: {
    key: "{{CUSTOMER_PHONE}}",
    label: "Müşteri Telefonu",
    category: "customer",
    description: "Müşteri telefon numarası",
    example: "7124253422",
  },
  CUSTOMER_ADDRESS: {
    key: "{{CUSTOMER_ADDRESS}}",
    label: "Müşteri Adresi",
    category: "customer",
    description: "Teslimat adresi",
    example: "Koza 1 Caddesi, 120/11 Çankaya, Ankara",
  },

  // Product Information
  PRODUCT_BARCODE: {
    key: "{{PRODUCT_BARCODE}}",
    label: "Ürün Barkodu",
    category: "product",
    description: "Ürün barkod numarası",
    example: "TYB52RU2HILQOQX342",
  },
  PRODUCT_SKU: {
    key: "{{PRODUCT_SKU}}",
    label: "Ürün SKU",
    category: "product",
    description: "Ürün stok kodu",
    example: "MBA-A1465-45W-001",
  },
  PRODUCT_TITLE: {
    key: "{{PRODUCT_TITLE}}",
    label: "Ürün Adı",
    category: "product",
    description: "Ürün başlığı",
    example: "Apple MacBook Air A1465 Uyumlu...",
  },

  // Company Information
  COMPANY_NAME: {
    key: "{{COMPANY_NAME}}",
    label: "Şirket Adı",
    category: "company",
    description: "Gönderen şirket adı",
    example: "Pazar+ E-Ticaret",
  },
  COMPANY_ADDRESS: {
    key: "{{COMPANY_ADDRESS}}",
    label: "Şirket Adresi",
    category: "company",
    description: "Gönderen şirket adresi",
    example: "Teknokent ARI-1 Binası",
  },
  COMPANY_PHONE: {
    key: "{{COMPANY_PHONE}}",
    label: "Şirket Telefonu",
    category: "company",
    description: "Şirket telefon numarası",
    example: "+90 312 XXX XX XX",
  },

  // Date/Time Fields
  CURRENT_DATE: {
    key: "{{CURRENT_DATE}}",
    label: "Bugünün Tarihi",
    category: "system",
    description: "Etiket oluşturma tarihi",
    example: "16/06/2025",
  },
  CURRENT_TIME: {
    key: "{{CURRENT_TIME}}",
    label: "Şu Anki Saat",
    category: "system",
    description: "Etiket oluşturma saati",
    example: "14:30",
  },
};

// Categories for organizing data fields
export const DATA_FIELD_CATEGORIES = {
  order: "Sipariş Bilgileri",
  shipping: "Kargo Bilgileri",
  customer: "Müşteri Bilgileri",
  product: "Ürün Bilgileri",
  company: "Şirket Bilgileri",
  system: "Sistem Bilgileri",
};

// Get fields by category
export const getFieldsByCategory = (category) => {
  return Object.values(DATA_FIELDS).filter(
    (field) => field.category === category
  );
};

// Get all field options for select dropdown
export const getAllFieldOptions = () => {
  return Object.values(DATA_FIELDS);
};

// Common barcode data fields (most commonly used for barcodes)
export const COMMON_BARCODE_FIELDS = [
  DATA_FIELDS.CARGO_TRACKING_NUMBER,
  DATA_FIELDS.ORDER_NUMBER,
  DATA_FIELDS.PRODUCT_BARCODE,
  DATA_FIELDS.PRODUCT_SKU,
];

// Common QR code data fields (more complex data for QR codes)
export const COMMON_QR_FIELDS = [
  DATA_FIELDS.CARGO_URL,
  DATA_FIELDS.CARGO_TRACKING_NUMBER,
  DATA_FIELDS.ORDER_NUMBER,
  DATA_FIELDS.CUSTOMER_EMAIL,
];
