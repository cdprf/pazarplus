// Mock data for preview purposes based on real order data
export const MOCK_PREVIEW_DATA = {
  order: {
    orderNumber: "10282743456",
    orderDate: "2025-06-15",
    totalAmount: 1883.29,
    currency: "TRY",
    platform: "Trendyol",
    cargoTrackingNumber: "7260024184375463",
    cargoCompany: "Aras Kargo Marketplace",
    cargoTrackingUrl: "https://kargotakip.aras.com.tr/shipmenttracking",
  },
  customer: {
    name: "Saylan Sahin",
    email: "pf+opa4q8vr@trendyolmail.com",
    phone: "7124253422",
    address: "Koza 1 Caddesi, 120/11\nÇankaya, Ankara\nTürkiye",
  },
  sender: {
    name: "Pazar+ E-Ticaret",
    address: "Teknokent ARI-1 Binası\nÇankaya, Ankara\nTürkiye",
    phone: "+90 312 XXX XX XX",
    email: "info@pazarplus.com",
  },
  items: [
    {
      title: "Apple MacBook Air A1465 Uyumlu MagSafe 2 45W Orijinal Adaptör",
      quantity: 1,
      price: 1883.29,
      barcode: "1234567890123", // 13 digits - valid for EAN-13
      sku: "MBA-A1465-45W-001",
    },
  ],
  shipping: {
    method: "Hızlı Kargo",
    cost: 0,
    estimatedDelivery: "1-2 iş günü",
  },
};

// Generate dynamic content based on element type
export const generatePreviewContent = (
  elementType,
  content = "",
  dataField = null
) => {
  // If user has defined content and it's not placeholder, return it
  if (content && content !== "Sample Text" && !content.includes("{{")) {
    return content;
  }

  // If there's a data field mapping, use it
  if (dataField && dataField !== "custom") {
    return getPreviewDataFromField(dataField);
  }

  // If content contains dynamic field placeholders, replace them
  if (content && content.includes("{{")) {
    return replaceDynamicFields(content);
  }

  switch (elementType) {
    case "text":
      return "Örnek Metin";

    case "header":
      return "KARGO ETİKETİ";

    case "recipient":
      return `Alıcı: ${MOCK_PREVIEW_DATA.customer.name}
${MOCK_PREVIEW_DATA.customer.address}
Tel: ${MOCK_PREVIEW_DATA.customer.phone}`;

    case "sender":
      return `Gönderen: ${MOCK_PREVIEW_DATA.sender.name}
${MOCK_PREVIEW_DATA.sender.address}
Tel: ${MOCK_PREVIEW_DATA.sender.phone}`;

    case "order_summary":
      return `Sipariş No: ${MOCK_PREVIEW_DATA.order.orderNumber}
Tarih: ${MOCK_PREVIEW_DATA.order.orderDate}
Tutar: ${MOCK_PREVIEW_DATA.order.totalAmount} ${MOCK_PREVIEW_DATA.order.currency}
Platform: ${MOCK_PREVIEW_DATA.order.platform}`;

    case "tracking_number":
      return MOCK_PREVIEW_DATA.order.cargoTrackingNumber;

    case "tracking_info":
      return `Takip No: ${MOCK_PREVIEW_DATA.order.cargoTrackingNumber}
Kargo: ${MOCK_PREVIEW_DATA.order.cargoCompany}
Durum: Yolda`;

    case "order_items":
      return MOCK_PREVIEW_DATA.items
        .map(
          (item) =>
            `${item.title} - Adet: ${item.quantity} - ${item.price} ${MOCK_PREVIEW_DATA.order.currency}`
        )
        .join("\n");

    case "barcode":
      return "1234567890123"; // 13 digits - valid for EAN-13

    case "qr_code":
      return `https://kargotakip.com/track/${MOCK_PREVIEW_DATA.order.cargoTrackingNumber}`;

    case "date":
      return new Date().toLocaleDateString("tr-TR");

    case "company_info":
      return `${MOCK_PREVIEW_DATA.sender.name}
${MOCK_PREVIEW_DATA.sender.email}
${MOCK_PREVIEW_DATA.sender.phone}
İletişim: Güvenilir hızlı kargo`;

    case "payment_info":
      return `Ödeme Şekli: Kredi Kartı
Tutar: ${MOCK_PREVIEW_DATA.order.totalAmount} ${MOCK_PREVIEW_DATA.order.currency}
Durum: Başarıyla ödendi
İşlem: Tamamlandı`;

    case "shipping_info":
      return `Kargo Şirketi: ${MOCK_PREVIEW_DATA.order.cargoCompany}
Teslimat: ${MOCK_PREVIEW_DATA.shipping.estimatedDelivery}
Ücret: Ücretsiz kargo
Bölge: Türkiye geneli`;

    case "platform_info":
      return `Platform: ${MOCK_PREVIEW_DATA.order.platform}
Sipariş ID: ${MOCK_PREVIEW_DATA.order.orderNumber}`;

    case "customer_service":
      return `Müşteri Hizmetleri
Tel: +90 850 xxx xx xx
Email: destek@pazarplus.com`;

    case "terms_conditions":
      return `Bu kargo yasal koşullar altında teslim edilir.
Hasar durumunda 48 saat içinde bildiriniz.`;

    case "footer":
      return `Bu etiket ${new Date().toLocaleDateString(
        "tr-TR"
      )} tarihinde oluşturulmuştur.
Pazar+ - E-Ticaret Çözümleri`;

    default:
      return content || "Örnek İçerik";
  }
};

// Get preview data for a specific data field
export const getPreviewDataFromField = (dataField) => {
  const fieldMappings = {
    "{{ORDER_NUMBER}}": MOCK_PREVIEW_DATA.order.orderNumber,
    "{{ORDER_DATE}}": MOCK_PREVIEW_DATA.order.orderDate,
    "{{ORDER_TOTAL}}": MOCK_PREVIEW_DATA.order.totalAmount,
    "{{PLATFORM}}": MOCK_PREVIEW_DATA.order.platform,
    "{{CARGO_TRACKING_NUMBER}}": MOCK_PREVIEW_DATA.order.cargoTrackingNumber,
    "{{CARGO_COMPANY}}": MOCK_PREVIEW_DATA.order.cargoCompany,
    "{{CARGO_URL}}": MOCK_PREVIEW_DATA.order.cargoTrackingUrl,
    "{{CUSTOMER_NAME}}": MOCK_PREVIEW_DATA.customer.name,
    "{{CUSTOMER_EMAIL}}": MOCK_PREVIEW_DATA.customer.email,
    "{{CUSTOMER_PHONE}}": MOCK_PREVIEW_DATA.customer.phone,
    "{{CUSTOMER_ADDRESS}}": MOCK_PREVIEW_DATA.customer.address,
    "{{PRODUCT_BARCODE}}": MOCK_PREVIEW_DATA.items[0]?.barcode,
    "{{PRODUCT_SKU}}": MOCK_PREVIEW_DATA.items[0]?.sku,
    "{{PRODUCT_TITLE}}": MOCK_PREVIEW_DATA.items[0]?.title,
    "{{COMPANY_NAME}}": MOCK_PREVIEW_DATA.sender.name,
    "{{COMPANY_ADDRESS}}": MOCK_PREVIEW_DATA.sender.address,
    "{{COMPANY_PHONE}}": MOCK_PREVIEW_DATA.sender.phone,
    "{{CURRENT_DATE}}": new Date().toLocaleDateString("tr-TR"),
    "{{CURRENT_TIME}}": new Date().toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  return fieldMappings[dataField] || dataField;
};

// Replace dynamic field placeholders in content
export const replaceDynamicFields = (content) => {
  let result = content;

  const fieldMappings = {
    "{{ORDER_NUMBER}}": MOCK_PREVIEW_DATA.order.orderNumber,
    "{{ORDER_DATE}}": MOCK_PREVIEW_DATA.order.orderDate,
    "{{ORDER_TOTAL}}": MOCK_PREVIEW_DATA.order.totalAmount,
    "{{PLATFORM}}": MOCK_PREVIEW_DATA.order.platform,
    "{{CARGO_TRACKING_NUMBER}}": MOCK_PREVIEW_DATA.order.cargoTrackingNumber,
    "{{CARGO_COMPANY}}": MOCK_PREVIEW_DATA.order.cargoCompany,
    "{{CARGO_URL}}": MOCK_PREVIEW_DATA.order.cargoTrackingUrl,
    "{{CUSTOMER_NAME}}": MOCK_PREVIEW_DATA.customer.name,
    "{{CUSTOMER_EMAIL}}": MOCK_PREVIEW_DATA.customer.email,
    "{{CUSTOMER_PHONE}}": MOCK_PREVIEW_DATA.customer.phone,
    "{{CUSTOMER_ADDRESS}}": MOCK_PREVIEW_DATA.customer.address,
    "{{PRODUCT_BARCODE}}": MOCK_PREVIEW_DATA.items[0]?.barcode,
    "{{PRODUCT_SKU}}": MOCK_PREVIEW_DATA.items[0]?.sku,
    "{{PRODUCT_TITLE}}": MOCK_PREVIEW_DATA.items[0]?.title,
    "{{COMPANY_NAME}}": MOCK_PREVIEW_DATA.sender.name,
    "{{COMPANY_ADDRESS}}": MOCK_PREVIEW_DATA.sender.address,
    "{{COMPANY_PHONE}}": MOCK_PREVIEW_DATA.sender.phone,
    "{{CURRENT_DATE}}": new Date().toLocaleDateString("tr-TR"),
    "{{CURRENT_TIME}}": new Date().toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  Object.entries(fieldMappings).forEach(([field, value]) => {
    result = result.replace(
      new RegExp(field.replace(/[{}]/g, "\\$&"), "g"),
      value || ""
    );
  });

  return result;
};
