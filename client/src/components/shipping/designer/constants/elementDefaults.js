import { ELEMENT_TYPES } from "./elementTypes.js";

// Enhanced element defaults with design system compliance
export const elementDefaults = {
  [ELEMENT_TYPES.TEXT]: {
    content: "Sample Text",
    style: {
      fontSize: 14,
      fontFamily: "Inter, Arial, sans-serif",
      color: "var(--text-primary)",
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
      border: "2px dashed var(--border-secondary)",
      backgroundColor: "transparent",
      borderRadius: "var(--radius-md)",
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
      color: "var(--text-primary)",
      backgroundColor: "var(--surface-secondary)",
      padding: "var(--space-lg)",
      border: "1px solid var(--border-primary)",
      borderRadius: "var(--radius-md)",
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
      color: "var(--text-primary)",
      backgroundColor: "var(--surface-secondary)",
      padding: "var(--space-lg)",
      border: "1px solid var(--border-primary)",
      borderRadius: "var(--radius-md)",
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
      color: "var(--text-primary)",
      backgroundColor: "var(--surface-primary)",
      padding: "var(--space-md)",
      border: "1px solid var(--border-primary)",
      borderRadius: "var(--radius-sm)",
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
      color: "var(--text-primary)",
      backgroundColor: "var(--surface-tertiary)",
      padding: "var(--space-md)",
      border: "1px solid var(--border-secondary)",
      borderRadius: "var(--radius-sm)",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 50, height: 25 },
  },

  [ELEMENT_TYPES.BILLING_ADDRESS]: {
    content: "",
    style: {
      fontSize: 10,
      textAlign: "left",
      color: "var(--text-primary)",
      backgroundColor: "var(--surface-tertiary)",
      padding: "var(--space-md)",
      border: "1px solid var(--border-secondary)",
      borderRadius: "var(--radius-sm)",
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
      color: "var(--text-primary)",
      backgroundColor: "var(--surface-primary)",
      padding: "var(--space-md)",
      border: "1px solid var(--border-primary)",
      borderRadius: "var(--radius-md)",
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
      color: "var(--text-primary)",
      backgroundColor: "var(--surface-secondary)",
      padding: "var(--space-sm)",
      border: "1px solid var(--border-primary)",
      borderRadius: "var(--radius-sm)",
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
      color: "var(--text-primary)",
      backgroundColor: "var(--surface-primary)",
      padding: "var(--space-sm)",
      border: "1px solid var(--border-primary)",
      borderRadius: "var(--radius-sm)",
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
      color: "var(--text-primary)",
      backgroundColor: "var(--surface-secondary)",
      padding: "var(--space-md)",
      border: "1px solid var(--border-primary)",
      borderRadius: "var(--radius-sm)",
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
      color: "var(--text-primary)",
      backgroundColor: "var(--color-success-50, #f0fdf4)",
      padding: "var(--space-sm)",
      border: "1px solid var(--color-success, #22c55e)",
      borderRadius: "var(--radius-sm)",
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
      color: "var(--text-primary)",
      backgroundColor: "var(--surface-primary)",
      padding: "var(--space-sm)",
      border: "1px solid var(--border-primary)",
      borderRadius: "var(--radius-sm)",
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
      color: "var(--text-primary)",
      backgroundColor: "var(--surface-secondary)",
      padding: "var(--space-sm)",
      border: "1px solid var(--border-primary)",
      borderRadius: "var(--radius-sm)",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 45, height: 25 },
  },

  [ELEMENT_TYPES.INVENTORY_INFO]: {
    content: "",
    style: {
      fontSize: 10,
      textAlign: "left",
      color: "var(--text-primary)",
      backgroundColor: "var(--surface-primary)",
      padding: "var(--space-sm)",
      border: "1px solid var(--border-primary)",
      borderRadius: "var(--radius-sm)",
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
      color: "var(--text-primary)",
      backgroundColor: "var(--color-info-50, #dbeafe)",
      padding: "var(--space-md)",
      border: "2px solid var(--color-info, #3b82f6)",
      borderRadius: "var(--radius-md)",
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
      color: "var(--text-primary)",
      backgroundColor: "var(--color-info-50, #f0f9ff)",
      padding: "var(--space-sm)",
      border: "1px solid var(--color-info, #0ea5e9)",
      borderRadius: "var(--radius-sm)",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 35, height: 12 },
  },

  [ELEMENT_TYPES.SHIPPING_METHOD]: {
    content: "",
    style: {
      fontSize: 10,
      textAlign: "left",
      color: "var(--text-primary)",
      backgroundColor: "var(--surface-primary)",
      padding: "var(--space-sm)",
      border: "1px solid var(--border-primary)",
      borderRadius: "var(--radius-sm)",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 25, height: 8 },
  },

  [ELEMENT_TYPES.DELIVERY_INFO]: {
    content: "",
    style: {
      fontSize: 10,
      textAlign: "left",
      color: "var(--text-primary)",
      backgroundColor: "var(--color-success-50, #ecfdf5)",
      padding: "var(--space-sm)",
      border: "1px solid var(--color-success, #10b981)",
      borderRadius: "var(--radius-sm)",
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
      color: "var(--text-primary)",
      backgroundColor: "var(--surface-tertiary)",
      padding: "var(--space-sm)",
      border: "1px solid var(--border-secondary)",
      borderRadius: "var(--radius-sm)",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 30, height: 12 },
  },

  [ELEMENT_TYPES.TRENDYOL_DATA]: {
    content: "",
    style: {
      fontSize: 9,
      textAlign: "left",
      color: "var(--text-primary)",
      backgroundColor: "var(--color-warning-50, #fff7ed)",
      padding: "var(--space-sm)",
      border: "1px solid var(--color-warning, #fb923c)",
      borderRadius: "var(--radius-sm)",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 45, height: 20 },
  },

  [ELEMENT_TYPES.HEPSIBURADA_DATA]: {
    content: "",
    style: {
      fontSize: 9,
      textAlign: "left",
      color: "var(--text-primary)",
      backgroundColor: "var(--color-danger-50, #fef2f2)",
      padding: "var(--space-sm)",
      border: "1px solid var(--color-danger, #f87171)",
      borderRadius: "var(--radius-sm)",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 45, height: 20 },
  },

  [ELEMENT_TYPES.N11_DATA]: {
    content: "",
    style: {
      fontSize: 9,
      textAlign: "left",
      color: "var(--text-primary)",
      backgroundColor: "var(--color-info-50, #f0f9ff)",
      padding: "var(--space-sm)",
      border: "1px solid var(--color-info, #0ea5e9)",
      borderRadius: "var(--radius-sm)",
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
      color: "var(--text-primary)",
      backgroundColor: "var(--color-warning-50, #fefce8)",
      padding: "var(--space-sm)",
      border: "1px solid var(--color-warning, #eab308)",
      borderRadius: "var(--radius-sm)",
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
      color: "var(--text-primary)",
      backgroundColor: "var(--color-success-50, #f0fdf4)",
      padding: "var(--space-sm)",
      border: "1px solid var(--color-success, #22c55e)",
      borderRadius: "var(--radius-sm)",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 35, height: 12 },
  },

  [ELEMENT_TYPES.COMPLIANCE_DATA]: {
    content: "",
    style: {
      fontSize: 9,
      textAlign: "left",
      color: "var(--text-primary)",
      backgroundColor: "var(--color-danger-50, #faf5ff)",
      padding: "var(--space-sm)",
      border: "1px solid var(--color-danger, #a855f7)",
      borderRadius: "var(--radius-sm)",
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
      color: "var(--brand-primary)",
      backgroundColor: "transparent",
      padding: "var(--space-md)",
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
      color: "var(--text-tertiary)",
      fontFamily: "Inter, Arial, sans-serif",
      backgroundColor: "transparent",
    },
    size: { width: 100, height: 5 },
  },

  [ELEMENT_TYPES.DIVIDER]: {
    content: "",
    style: {
      backgroundColor: "var(--border-primary)",
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

  // Custom Elements
  [ELEMENT_TYPES.CUSTOM_FIELD]: {
    content: "Özel Alan",
    style: {
      fontSize: 12,
      textAlign: "left",
      color: "var(--text-primary)",
      backgroundColor: "var(--surface-secondary)",
      padding: "var(--space-sm)",
      border: "1px dashed var(--text-tertiary)",
      borderRadius: "var(--radius-sm)",
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
      color: "var(--text-primary)",
      backgroundColor: "var(--surface-primary)",
      padding: "var(--space-sm)",
      border: "1px solid var(--border-primary)",
      borderRadius: "var(--radius-sm)",
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
        backgroundColor: "var(--surface-tertiary)",
        fontWeight: "bold",
        borderBottom: "2px solid var(--border-primary)",
      },
      alternateRows: true,
      maxRows: 5,
      rowHeight: "auto",
      borderStyle: "grid",
    },
  },

  [ELEMENT_TYPES.CUSTOM_LIST]: {
    content: "",
    style: {
      fontSize: 11,
      textAlign: "left",
      color: "var(--text-primary)",
      backgroundColor: "var(--surface-primary)",
      padding: "var(--space-sm)",
      border: "1px solid var(--border-primary)",
      borderRadius: "var(--radius-sm)",
      fontFamily: "Inter, Arial, sans-serif",
    },
    size: { width: 50, height: 20 },
    customList: {
      items: ["Öğe 1", "Öğe 2", "Öğe 3"],
      listType: "bullet",
      showTitle: true,
      title: "Özel Liste",
    },
  },
};
