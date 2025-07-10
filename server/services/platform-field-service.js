const logger = require('../utils/logger');

/**
 * Platform Field Service
 * Provides platform-specific field definitions and validation
 */
class PlatformFieldService {
  /**
   * Get platform-specific field definitions
   */
  static getPlatformFields(platform, categoryId = null) {
    const baseFields = this.getBaseFields();
    const platformSpecificFields = this.getPlatformSpecificFields(
      platform,
      categoryId
    );

    return {
      base: baseFields,
      platform: platformSpecificFields,
      all: [...baseFields, ...platformSpecificFields]
    };
  }

  /**
   * Get base fields common to all platforms
   */
  static getBaseFields() {
    return [
      {
        key: 'platformTitle',
        label: 'Platform Ürün Başlığı',
        type: 'text',
        required: true,
        maxLength: 100,
        placeholder: 'Platform\'a özgü ürün başlığı',
        description: 'Platform\'da görünecek ürün başlığı'
      },
      {
        key: 'platformDescription',
        label: 'Platform Açıklaması',
        type: 'textarea',
        required: false,
        maxLength: 3000,
        placeholder: 'Platform\'a özgü ürün açıklaması',
        description: 'Platform\'da görünecek detaylı açıklama'
      },
      {
        key: 'platformPrice',
        label: 'Platform Fiyatı (₺)',
        type: 'number',
        required: true,
        min: 0,
        step: 0.01,
        placeholder: '0.00',
        description: 'Bu platform\'daki satış fiyatı'
      },
      {
        key: 'priceMarkup',
        label: 'Fiyat Artış Oranı (%)',
        type: 'number',
        required: false,
        min: 0,
        max: 1000,
        step: 0.1,
        placeholder: '15.5',
        description: 'Ana fiyata eklenecek artış oranı'
      }
    ];
  }

  /**
   * Get platform-specific field definitions
   */
  static getPlatformSpecificFields(platform, categoryId = null) {
    switch (platform) {
    case 'trendyol':
      return this.getTrendyolFields(categoryId);
    case 'hepsiburada':
      return this.getHepsiburadaFields(categoryId);
    case 'n11':
      return this.getN11Fields(categoryId);
    default:
      return [];
    }
  }

  /**
   * Trendyol specific fields
   */
  static getTrendyolFields(categoryId) {
    const commonFields = [
      {
        key: 'brand',
        label: 'Marka',
        type: 'text',
        required: true,
        placeholder: 'Ürün markası',
        description: 'Trendyol\'da onaylı marka adı'
      },
      {
        key: 'barcode',
        label: 'Barkod',
        type: 'text',
        required: true,
        pattern: '^[0-9]{8,13}$',
        placeholder: '1234567890123',
        description: '13 haneli ürün barkodu'
      },
      {
        key: 'stockCode',
        label: 'Stok Kodu',
        type: 'text',
        required: true,
        maxLength: 50,
        placeholder: 'TY-SKU-001',
        description: 'Trendyol\'a özgü stok kodu'
      },
      {
        key: 'categoryId',
        label: 'Kategori ID',
        type: 'select',
        required: true,
        placeholder: 'Kategori seçin',
        description: 'Trendyol kategori ID\'si',
        options: [] // Will be populated dynamically
      },
      {
        key: 'listPrice',
        label: 'Liste Fiyatı (₺)',
        type: 'number',
        required: true,
        min: 0,
        step: 0.01,
        placeholder: '100.00',
        description: 'Üstü çizili fiyat'
      },
      {
        key: 'salePrice',
        label: 'Satış Fiyatı (₺)',
        type: 'number',
        required: true,
        min: 0,
        step: 0.01,
        placeholder: '80.00',
        description: 'İndirimli satış fiyatı'
      },
      {
        key: 'cargoCompany',
        label: 'Kargo Firması',
        type: 'select',
        required: false,
        options: [
          { value: 'YURTICI', label: 'Yurtiçi Kargo' },
          { value: 'ARAS', label: 'Aras Kargo' },
          { value: 'MNG', label: 'MNG Kargo' },
          { value: 'PTT', label: 'PTT Kargo' }
        ],
        description: 'Tercih edilen kargo firması'
      },
      {
        key: 'shipmentTime',
        label: 'Kargoya Verme Süresi',
        type: 'number',
        required: false,
        min: 1,
        max: 30,
        placeholder: '2',
        description: 'Gün cinsinden kargoya verme süresi'
      }
    ];

    // Add category-specific fields based on categoryId
    if (categoryId) {
      return [...commonFields, ...this.getTrendyolCategoryFields(categoryId)];
    }

    return commonFields;
  }

  /**
   * Hepsiburada specific fields
   */
  static getHepsiburadaFields(categoryId) {
    const commonFields = [
      {
        key: 'brand',
        label: 'Marka',
        type: 'text',
        required: true,
        placeholder: 'Ürün markası',
        description: 'Hepsiburada\'da onaylı marka adı'
      },
      {
        key: 'barcode',
        label: 'Barkod',
        type: 'text',
        required: true,
        pattern: '^[0-9]{8,13}$',
        placeholder: '1234567890123',
        description: '13 haneli ürün barkodu'
      },
      {
        key: 'merchantSku',
        label: 'Satıcı SKU',
        type: 'text',
        required: true,
        maxLength: 50,
        placeholder: 'HB-SKU-001',
        description: 'Hepsiburada\'ya özgü SKU'
      },
      {
        key: 'categoryId',
        label: 'Kategori ID',
        type: 'select',
        required: true,
        placeholder: 'Kategori seçin',
        description: 'Hepsiburada kategori ID\'si',
        options: []
      },
      {
        key: 'price',
        label: 'Fiyat (₺)',
        type: 'number',
        required: true,
        min: 0,
        step: 0.01,
        placeholder: '100.00',
        description: 'Satış fiyatı'
      },
      {
        key: 'stockQuantity',
        label: 'Stok Miktarı',
        type: 'number',
        required: true,
        min: 0,
        placeholder: '10',
        description: 'Mevcut stok miktarı'
      },
      {
        key: 'warranty',
        label: 'Garanti Süresi (Ay)',
        type: 'number',
        required: false,
        min: 0,
        max: 120,
        placeholder: '24',
        description: 'Garanti süresi (ay cinsinden)'
      },
      {
        key: 'origin',
        label: 'Menşei',
        type: 'select',
        required: false,
        options: [
          { value: 'TR', label: 'Türkiye' },
          { value: 'CN', label: 'Çin' },
          { value: 'DE', label: 'Almanya' },
          { value: 'US', label: 'Amerika' },
          { value: 'OTHER', label: 'Diğer' }
        ],
        description: 'Ürünün menşei ülkesi'
      }
    ];

    if (categoryId) {
      return [
        ...commonFields,
        ...this.getHepsiburadaCategoryFields(categoryId)
      ];
    }

    return commonFields;
  }

  /**
   * N11 specific fields
   */
  static getN11Fields(categoryId) {
    const commonFields = [
      {
        key: 'brand',
        label: 'Marka',
        type: 'text',
        required: true,
        placeholder: 'Ürün markası',
        description: 'N11\'de onaylı marka adı'
      },
      {
        key: 'barcode',
        label: 'Barkod',
        type: 'text',
        required: false,
        pattern: '^[0-9]{8,13}$',
        placeholder: '1234567890123',
        description: 'Ürün barkodu (opsiyonel)'
      },
      {
        key: 'stockCode',
        label: 'Stok Kodu',
        type: 'text',
        required: true,
        maxLength: 50,
        placeholder: 'N11-SKU-001',
        description: 'N11\'e özgü stok kodu'
      },
      {
        key: 'categoryId',
        label: 'Kategori',
        type: 'select',
        required: true,
        placeholder: 'Kategori seçin',
        description: 'N11 kategori ID\'si',
        options: []
      },
      {
        key: 'salePrice',
        label: 'Satış Fiyatı (₺)',
        type: 'number',
        required: true,
        min: 0,
        step: 0.01,
        placeholder: '100.00',
        description: 'Satış fiyatı'
      },
      {
        key: 'stockQuantity',
        label: 'Stok Adedi',
        type: 'number',
        required: true,
        min: 0,
        placeholder: '10',
        description: 'Mevcut stok adedi'
      },
      {
        key: 'preparingDay',
        label: 'Hazırlanma Gün Sayısı',
        type: 'number',
        required: false,
        min: 1,
        max: 30,
        placeholder: '2',
        description: 'Ürünün hazırlanma süresi'
      },
      {
        key: 'shipmentTemplate',
        label: 'Kargo Şablonu',
        type: 'select',
        required: false,
        options: [
          { value: '1', label: 'Ücretsiz Kargo' },
          { value: '2', label: 'Satıcı Kargo' },
          { value: '3', label: 'Alıcı Kargo' }
        ],
        description: 'Kargo gönderim şablonu'
      }
    ];

    if (categoryId) {
      return [...commonFields, ...this.getN11CategoryFields(categoryId)];
    }

    return commonFields;
  }

  /**
   * Get Trendyol category-specific fields
   */
  static getTrendyolCategoryFields(categoryId) {
    // Add category-specific fields for different Trendyol categories
    const categoryFields = {
      // Elektronik kategorisi için örnek
      456: [
        {
          key: 'model',
          label: 'Model',
          type: 'text',
          required: true,
          placeholder: 'Ürün modeli'
        },
        {
          key: 'color',
          label: 'Renk',
          type: 'select',
          required: true,
          options: [
            { value: 'Siyah', label: 'Siyah' },
            { value: 'Beyaz', label: 'Beyaz' },
            { value: 'Gri', label: 'Gri' }
          ]
        }
      ],
      // Giyim kategorisi için örnek
      1: [
        {
          key: 'size',
          label: 'Beden',
          type: 'select',
          required: true,
          options: [
            { value: 'XS', label: 'XS' },
            { value: 'S', label: 'S' },
            { value: 'M', label: 'M' },
            { value: 'L', label: 'L' },
            { value: 'XL', label: 'XL' }
          ]
        },
        {
          key: 'color',
          label: 'Renk',
          type: 'text',
          required: true,
          placeholder: 'Ürün rengi'
        },
        {
          key: 'fabric',
          label: 'Kumaş',
          type: 'text',
          required: false,
          placeholder: 'Kumaş cinsi'
        }
      ]
    };

    return categoryFields[categoryId] || [];
  }

  /**
   * Get Hepsiburada category-specific fields
   */
  static getHepsiburadaCategoryFields(categoryId) {
    // Similar implementation for Hepsiburada
    return [];
  }

  /**
   * Get N11 category-specific fields
   */
  static getN11CategoryFields(categoryId) {
    // Similar implementation for N11
    return [];
  }

  /**
   * Validate platform field values
   */
  static validateFieldValues(platform, fieldValues, categoryId = null) {
    const fields = this.getPlatformFields(platform, categoryId);
    const errors = [];

    for (const field of fields.all) {
      const value = fieldValues[field.key];

      // Check required fields
      if (field.required && (!value || value.toString().trim() === '')) {
        errors.push({
          field: field.key,
          message: `${field.label} alanı zorunludur`
        });
        continue;
      }

      if (value !== undefined && value !== null && value !== '') {
        // Validate field type and constraints
        if (field.type === 'number') {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            errors.push({
              field: field.key,
              message: `${field.label} geçerli bir sayı olmalıdır`
            });
          } else {
            if (field.min !== undefined && numValue < field.min) {
              errors.push({
                field: field.key,
                message: `${field.label} en az ${field.min} olmalıdır`
              });
            }
            if (field.max !== undefined && numValue > field.max) {
              errors.push({
                field: field.key,
                message: `${field.label} en fazla ${field.max} olmalıdır`
              });
            }
          }
        }

        if (field.type === 'text' || field.type === 'textarea') {
          const strValue = value.toString();
          if (field.maxLength && strValue.length > field.maxLength) {
            errors.push({
              field: field.key,
              message: `${field.label} en fazla ${field.maxLength} karakter olmalıdır`
            });
          }
          if (field.pattern) {
            const regex = new RegExp(field.pattern);
            if (!regex.test(strValue)) {
              errors.push({
                field: field.key,
                message: `${field.label} geçerli formatta değil`
              });
            }
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = PlatformFieldService;
