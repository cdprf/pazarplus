/**
 * Order Transformer - Data transformation utilities
 * Handles data formatting, parsing, and transformations
 */

export class OrderTransformer {
  /**
   * Transform raw order data from API to UI format
   */
  static transformFromAPI(apiOrder) {
    return {
      id: apiOrder.id,
      orderNumber: apiOrder.order_number || apiOrder.orderNumber,
      customerName: apiOrder.customer_name || apiOrder.customerName,
      customerEmail: apiOrder.customer_email || apiOrder.customerEmail,
      platform: apiOrder.platform,
      orderStatus: apiOrder.order_status || apiOrder.status || "pending",
      totalAmount: parseFloat(
        apiOrder.total_amount || apiOrder.totalAmount || 0
      ),
      currency: apiOrder.currency || "TRY",
      orderDate:
        apiOrder.order_date || apiOrder.orderDate || apiOrder.created_at,
      deliveryDate: apiOrder.delivery_date || apiOrder.deliveryDate,
      trackingNumber: apiOrder.tracking_number || apiOrder.trackingNumber,
      cargoCompany: apiOrder.cargo_company || apiOrder.cargoCompany,
      shippingAddress: this.transformAddress(
        apiOrder.shipping_address || apiOrder.shippingAddress
      ),
      billingAddress: this.transformAddress(
        apiOrder.billing_address || apiOrder.billingAddress
      ),
      items: this.transformItems(apiOrder.items || apiOrder.order_items || []),
      notes: apiOrder.notes || "",
      tags: apiOrder.tags || [],
      metadata: apiOrder.metadata || {},
    };
  }

  /**
   * Transform UI order data to API format
   */
  static transformToAPI(uiOrder) {
    return {
      id: uiOrder.id,
      order_number: uiOrder.orderNumber,
      customer_name: uiOrder.customerName,
      customer_email: uiOrder.customerEmail,
      platform: uiOrder.platform,
      order_status: uiOrder.orderStatus || uiOrder.status,
      total_amount: uiOrder.totalAmount,
      currency: uiOrder.currency,
      order_date: uiOrder.orderDate,
      delivery_date: uiOrder.deliveryDate,
      tracking_number: uiOrder.trackingNumber,
      cargo_company: uiOrder.cargoCompany,
      shipping_address: this.transformAddressToAPI(uiOrder.shippingAddress),
      billing_address: this.transformAddressToAPI(uiOrder.billingAddress),
      items: this.transformItemsToAPI(uiOrder.items || []),
      notes: uiOrder.notes,
      tags: uiOrder.tags,
      metadata: uiOrder.metadata,
    };
  }

  /**
   * Transform address from API format
   */
  static transformAddress(apiAddress) {
    if (!apiAddress) return null;

    return {
      firstName: apiAddress.first_name || apiAddress.firstName,
      lastName: apiAddress.last_name || apiAddress.lastName,
      street: apiAddress.street || apiAddress.address,
      neighborhood: apiAddress.neighborhood,
      district: apiAddress.district,
      city: apiAddress.city,
      postalCode: apiAddress.postal_code || apiAddress.postalCode,
      phone: apiAddress.phone,
      country: apiAddress.country || "TR",
    };
  }

  /**
   * Transform address to API format
   */
  static transformAddressToAPI(uiAddress) {
    if (!uiAddress) return null;

    return {
      first_name: uiAddress.firstName,
      last_name: uiAddress.lastName,
      street: uiAddress.street,
      neighborhood: uiAddress.neighborhood,
      district: uiAddress.district,
      city: uiAddress.city,
      postal_code: uiAddress.postalCode,
      phone: uiAddress.phone,
      country: uiAddress.country,
    };
  }

  /**
   * Transform order items from API format
   */
  static transformItems(apiItems) {
    if (!Array.isArray(apiItems)) return [];

    return apiItems.map((item) => ({
      id: item.id,
      productName: item.product_name || item.productName || item.name,
      sku: item.sku || item.product_code,
      quantity: parseInt(item.quantity || 1),
      unitPrice: parseFloat(
        item.unit_price || item.unitPrice || item.price || 0
      ),
      totalPrice: parseFloat(
        item.total_price || item.totalPrice || item.amount || 0
      ),
      productColor: item.product_color || item.color,
      productSize: item.product_size || item.size,
      productImage: item.product_image || item.image,
      barcode: item.barcode,
      categoryId: item.category_id || item.categoryId,
      categoryName: item.category_name || item.categoryName,
      brandName: item.brand_name || item.brandName,
      discount: parseFloat(item.discount || 0),
      tax: parseFloat(item.tax || 0),
    }));
  }

  /**
   * Transform order items to API format
   */
  static transformItemsToAPI(uiItems) {
    if (!Array.isArray(uiItems)) return [];

    return uiItems.map((item) => ({
      id: item.id,
      product_name: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice || item.quantity * item.unitPrice,
      product_color: item.productColor,
      product_size: item.productSize,
      product_image: item.productImage,
      barcode: item.barcode,
      category_id: item.categoryId,
      category_name: item.categoryName,
      brand_name: item.brandName,
      discount: item.discount,
      tax: item.tax,
    }));
  }

  /**
   * Format currency value for display
   */
  static formatCurrency(amount, currency = "TRY") {
    if (amount === null || amount === undefined) return "0,00";

    const formatOptions = {
      TRY: { locale: "tr-TR", symbol: "₺" },
      USD: { locale: "en-US", symbol: "$" },
      EUR: { locale: "de-DE", symbol: "€" },
    };

    const config = formatOptions[currency] || formatOptions.TRY;

    try {
      return new Intl.NumberFormat(config.locale, {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      return `${config.symbol}${parseFloat(amount).toFixed(2)}`;
    }
  }

  /**
   * Parse currency string to number
   */
  static parseCurrency(currencyString) {
    if (!currencyString) return 0;

    // Remove currency symbols and spaces
    const cleaned = currencyString
      .toString()
      .replace(/[₺$€]/g, "")
      .replace(/\s/g, "")
      .replace(/,/g, ".");

    return parseFloat(cleaned) || 0;
  }

  /**
   * Format date for display
   */
  static formatDate(dateInput, options = {}) {
    if (!dateInput) return "";

    let date;
    if (typeof dateInput === "object" && dateInput.orderDate) {
      date = new Date(dateInput.orderDate);
    } else {
      date = new Date(dateInput);
    }

    if (isNaN(date.getTime())) return "";

    const defaultOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Istanbul",
    };

    const formatOptions = { ...defaultOptions, ...options };

    try {
      return new Intl.DateTimeFormat("tr-TR", formatOptions).format(date);
    } catch (error) {
      // Fallback formatting
      return date.toLocaleDateString("tr-TR");
    }
  }

  /**
   * Format date for input fields (YYYY-MM-DD)
   */
  static formatDateForInput(dateInput) {
    if (!dateInput) return "";

    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "";

    return date.toISOString().split("T")[0];
  }

  /**
   * Calculate order statistics
   */
  static calculateOrderStats(orders) {
    if (!Array.isArray(orders)) return this.getEmptyStats();

    const stats = {
      total: orders.length,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      platformBreakdown: {},
      statusBreakdown: {},
    };

    orders.forEach((order) => {
      // Status counts
      const status = order.orderStatus || order.status;
      stats.statusBreakdown[status] = (stats.statusBreakdown[status] || 0) + 1;

      switch (status) {
        case "pending":
          stats.pending++;
          break;
        case "processing":
          stats.processing++;
          break;
        case "shipped":
        case "in_transit":
          stats.shipped++;
          break;
        case "delivered":
          stats.delivered++;
          break;
        case "cancelled":
          stats.cancelled++;
          break;
        default:
          break;
      }

      // Platform breakdown
      const platform = order.platform;
      stats.platformBreakdown[platform] =
        (stats.platformBreakdown[platform] || 0) + 1;

      // Revenue calculation (exclude cancelled orders)
      if (status !== "cancelled") {
        const amount = parseFloat(order.totalAmount || 0);
        stats.totalRevenue += amount;
      }
    });

    // Calculate average order value
    const revenueGeneratingOrders = orders.filter(
      (o) => (o.orderStatus || o.status) !== "cancelled"
    ).length;

    stats.averageOrderValue =
      revenueGeneratingOrders > 0
        ? stats.totalRevenue / revenueGeneratingOrders
        : 0;

    return stats;
  }

  /**
   * Get empty stats structure
   */
  static getEmptyStats() {
    return {
      total: 0,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      platformBreakdown: {},
      statusBreakdown: {},
    };
  }

  /**
   * Transform filter values for API requests
   */
  static transformFiltersForAPI(filters) {
    const apiFilters = {};

    if (filters.status && filters.status !== "all") {
      apiFilters.status = filters.status;
    }

    if (filters.platform && filters.platform !== "all") {
      apiFilters.platform = filters.platform;
    }

    if (filters.dateFrom) {
      apiFilters.date_from = filters.dateFrom;
    }

    if (filters.dateTo) {
      apiFilters.date_to = filters.dateTo;
    }

    if (filters.priceMin) {
      apiFilters.price_min = parseFloat(filters.priceMin);
    }

    if (filters.priceMax) {
      apiFilters.price_max = parseFloat(filters.priceMax);
    }

    if (filters.search) {
      apiFilters.search = filters.search.trim();
    }

    return apiFilters;
  }

  /**
   * Generate export data format
   */
  static transformForExport(orders, format = "csv") {
    if (!Array.isArray(orders)) return "";

    if (format === "csv") {
      return this.transformToCSV(orders);
    } else if (format === "json") {
      return JSON.stringify(
        orders.map((order) => this.transformToAPI(order)),
        null,
        2
      );
    }

    return "";
  }

  /**
   * Transform orders to CSV format
   */
  static transformToCSV(orders) {
    if (!orders.length) return "";

    const headers = [
      "Sipariş No",
      "Müşteri",
      "E-posta",
      "Platform",
      "Durum",
      "Toplam Tutar",
      "Para Birimi",
      "Sipariş Tarihi",
      "Teslimat Tarihi",
      "Kargo Şirketi",
      "Takip No",
    ];

    const rows = orders.map((order) => [
      order.orderNumber,
      order.customerName,
      order.customerEmail || "",
      order.platform,
      order.orderStatus,
      order.totalAmount,
      order.currency,
      this.formatDate(order.orderDate),
      this.formatDate(order.deliveryDate),
      order.cargoCompany || "",
      order.trackingNumber || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    return csvContent;
  }
}
