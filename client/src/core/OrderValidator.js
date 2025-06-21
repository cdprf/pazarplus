/**
 * Order Validator - Centralized validation logic
 * Implements validation rules for orders
 */

export class OrderValidator {
  static validationRules = {
    orderNumber: {
      required: true,
      minLength: 3,
      maxLength: 50,
      pattern: /^[A-Za-z0-9\-_]+$/,
      message: "Sipariş numarası gereklidir (3-50 karakter, alfanumerik)",
    },
    customerName: {
      required: true,
      minLength: 2,
      maxLength: 100,
      message: "Müşteri adı gereklidir (2-100 karakter)",
    },
    customerEmail: {
      required: false,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "Geçerli bir e-posta adresi giriniz",
    },
    platform: {
      required: true,
      enum: ["trendyol", "hepsiburada", "n11", "pazarama"],
      message: "Platform seçimi gereklidir",
    },
    totalAmount: {
      required: true,
      type: "number",
      min: 0.01,
      max: 999999.99,
      message: "Geçerli bir tutar giriniz (0.01 - 999999.99)",
    },
    currency: {
      required: true,
      enum: ["TRY", "USD", "EUR"],
      message: "Para birimi seçimi gereklidir",
    },
    shippingAddress: {
      required: false,
      type: "object",
      properties: {
        firstName: {
          required: true,
          minLength: 2,
          maxLength: 50,
          message: "Ad gereklidir (2-50 karakter)",
        },
        lastName: {
          required: true,
          minLength: 2,
          maxLength: 50,
          message: "Soyad gereklidir (2-50 karakter)",
        },
        street: {
          required: true,
          minLength: 5,
          maxLength: 200,
          message: "Adres gereklidir (5-200 karakter)",
        },
        city: {
          required: true,
          minLength: 2,
          maxLength: 50,
          message: "Şehir gereklidir",
        },
        district: {
          required: true,
          minLength: 2,
          maxLength: 50,
          message: "İlçe gereklidir",
        },
        postalCode: {
          required: false,
          pattern: /^\d{5}$/,
          message: "Posta kodu 5 haneli olmalıdır",
        },
        phone: {
          required: false,
          pattern: /^(\+90|0)?[5][0-9]{9}$/,
          message: "Geçerli bir telefon numarası giriniz",
        },
      },
    },
  };

  /**
   * Validate a single field
   */
  static validateField(fieldName, value, allData = {}) {
    const rule = this.validationRules[fieldName];
    if (!rule) return null;

    const errors = [];

    // Required validation
    if (
      rule.required &&
      (value === undefined || value === null || value === "")
    ) {
      errors.push(rule.message || `${fieldName} gereklidir`);
      return errors;
    }

    // Skip other validations if value is empty and not required
    if (
      !rule.required &&
      (value === undefined || value === null || value === "")
    ) {
      return null;
    }

    // Type validation
    if (rule.type === "number") {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        errors.push(rule.message || `${fieldName} sayı olmalıdır`);
        return errors;
      }
      value = numValue;
    }

    // Min/Max validation for numbers
    if (rule.type === "number") {
      if (rule.min !== undefined && value < rule.min) {
        errors.push(rule.message || `${fieldName} en az ${rule.min} olmalıdır`);
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push(
          rule.message || `${fieldName} en fazla ${rule.max} olmalıdır`
        );
      }
    }

    // String length validation
    if (typeof value === "string") {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(
          rule.message ||
            `${fieldName} en az ${rule.minLength} karakter olmalıdır`
        );
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(
          rule.message ||
            `${fieldName} en fazla ${rule.maxLength} karakter olmalıdır`
        );
      }
    }

    // Pattern validation
    if (
      rule.pattern &&
      typeof value === "string" &&
      !rule.pattern.test(value)
    ) {
      errors.push(rule.message || `${fieldName} geçerli formatta değil`);
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(rule.message || `${fieldName} geçerli bir değer değil`);
    }

    // Object validation (nested)
    if (
      rule.type === "object" &&
      rule.properties &&
      typeof value === "object"
    ) {
      for (const [propName] of Object.entries(rule.properties)) {
        const propErrors = this.validateField(propName, value[propName], value);
        if (propErrors && propErrors.length > 0) {
          errors.push(...propErrors);
        }
      }
    }

    return errors.length > 0 ? errors : null;
  }

  /**
   * Validate entire order object
   */
  static validateOrder(orderData) {
    const errors = {};

    for (const fieldName of Object.keys(this.validationRules)) {
      const fieldErrors = this.validateField(
        fieldName,
        orderData[fieldName],
        orderData
      );
      if (fieldErrors && fieldErrors.length > 0) {
        errors[fieldName] = fieldErrors;
      }
    }

    // Custom business logic validations
    const businessErrors = this.validateBusinessRules(orderData);
    Object.assign(errors, businessErrors);

    return Object.keys(errors).length > 0 ? errors : null;
  }

  /**
   * Business rules validation
   */
  static validateBusinessRules(orderData) {
    const errors = {};

    // Validate order items if present
    if (orderData.items && Array.isArray(orderData.items)) {
      const itemErrors = [];
      let calculatedTotal = 0;

      orderData.items.forEach((item, index) => {
        const itemError = {};

        if (!item.productName || item.productName.trim() === "") {
          itemError.productName = "Ürün adı gereklidir";
        }

        if (!item.quantity || item.quantity <= 0) {
          itemError.quantity = "Geçerli bir miktar giriniz";
        }

        if (!item.unitPrice || item.unitPrice <= 0) {
          itemError.unitPrice = "Geçerli bir birim fiyat giriniz";
        }

        if (item.quantity && item.unitPrice) {
          calculatedTotal += item.quantity * item.unitPrice;
        }

        if (Object.keys(itemError).length > 0) {
          itemErrors[index] = itemError;
        }
      });

      if (Object.keys(itemErrors).length > 0) {
        errors.items = itemErrors;
      }

      // Check if total amount matches calculated amount
      if (
        orderData.totalAmount &&
        Math.abs(orderData.totalAmount - calculatedTotal) > 0.01
      ) {
        errors.totalAmount = ["Toplam tutar, ürün toplamı ile eşleşmiyor"];
      }
    }

    // Validate date ranges
    if (orderData.orderDate && orderData.deliveryDate) {
      const orderDate = new Date(orderData.orderDate);
      const deliveryDate = new Date(orderData.deliveryDate);

      if (deliveryDate <= orderDate) {
        errors.deliveryDate = [
          "Teslimat tarihi sipariş tarihinden sonra olmalıdır",
        ];
      }
    }

    // Platform-specific validations
    if (orderData.platform) {
      const platformErrors = this.validatePlatformSpecific(orderData);
      Object.assign(errors, platformErrors);
    }

    return errors;
  }

  /**
   * Platform-specific validation rules
   */
  static validatePlatformSpecific(orderData) {
    const errors = {};
    const { platform } = orderData;

    switch (platform) {
      case "trendyol":
        // Trendyol specific validations
        if (orderData.orderNumber && !orderData.orderNumber.startsWith("TY")) {
          errors.orderNumber = [
            "Trendyol sipariş numarası TY ile başlamalıdır",
          ];
        }
        break;

      case "hepsiburada":
        // Hepsiburada specific validations
        if (orderData.orderNumber && !orderData.orderNumber.startsWith("HB")) {
          errors.orderNumber = [
            "Hepsiburada sipariş numarası HB ile başlamalıdır",
          ];
        }
        break;

      case "n11":
        // N11 specific validations
        if (orderData.orderNumber && !/^\d+$/.test(orderData.orderNumber)) {
          errors.orderNumber = [
            "N11 sipariş numarası sadece rakam içermelidir",
          ];
        }
        break;

      default:
        // No specific validation for other platforms
        break;
    }

    return errors;
  }

  /**
   * Validate filters for search/filter operations
   */
  static validateFilters(filters) {
    const errors = {};

    if (filters.dateFrom && filters.dateTo) {
      const fromDate = new Date(filters.dateFrom);
      const toDate = new Date(filters.dateTo);

      if (toDate <= fromDate) {
        errors.dateTo = ["Bitiş tarihi başlangıç tarihinden sonra olmalıdır"];
      }

      // Check if date range is too large (e.g., more than 1 year)
      const daysDiff = (toDate - fromDate) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        errors.dateRange = ["Tarih aralığı 1 yıldan fazla olamaz"];
      }
    }

    if (filters.priceMin && filters.priceMax) {
      const minPrice = parseFloat(filters.priceMin);
      const maxPrice = parseFloat(filters.priceMax);

      if (!isNaN(minPrice) && !isNaN(maxPrice) && maxPrice <= minPrice) {
        errors.priceMax = ["Maksimum fiyat minimum fiyattan büyük olmalıdır"];
      }
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  /**
   * Real-time validation for form fields
   */
  static validateRealTime(fieldName, value, allData = {}) {
    // Debounced validation for better UX
    return new Promise((resolve) => {
      setTimeout(() => {
        const errors = this.validateField(fieldName, value, allData);
        resolve(errors);
      }, 300);
    });
  }
}
