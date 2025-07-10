/**
 * QNB Finans Configuration Management
 * Manages WSDL URLs, error codes, and service configuration
 */

class QNBConfig {
  constructor() {
    // SOAP service endpoints - Request actual URLs from QNB Finans
    this.endpoints = {
      test: {
        earsivService:
          'https://test-earsiv.qnbesolutions.com.tr/EarsivWebService?wsdl',
        userService:
          'https://test-earsiv.qnbesolutions.com.tr/UserService?wsdl'
      },
      production: {
        earsivService:
          'https://earsiv.qnbesolutions.com.tr/EarsivWebService?wsdl',
        userService: 'https://earsiv.qnbesolutions.com.tr/UserService?wsdl'
      }
    };

    // QNB Finans error codes from official documentation
    this.errorCodes = {
      AE00000: 'İşlem başarılı.',
      AE00001: 'Sistem hatası!',
      AE00002: 'Belirsiz istisnai durum hatası!',
      AE00003: 'Fatura belgesi validasyon işlemi başarısız! Hata Detayı : {0}',
      AE00004: 'Fatura belgesi unmarshal işlemi başarısız!',
      AE00005: 'Fatura belgesi marshal işlemi başarısız!',
      AE00006:
        'Fatura belgesi unmarshal işlemi validasyonu başarısız! Hata detayı: {0}',
      AE00007: 'Fatura belgesi marshal işlemi validasyonu başarısız!',
      AE00008:
        'Belirtilen vkn, şube, kasa, kaynak kombinasyonu için tanımlı konfigürasyon bilgisi bulunamadı!',
      AE00009:
        'Belirtilen vkn için belirtilen fatura numarasına sahip kayıtlı fatura mevcut!',
      AE00011: 'Belirtilen belge tipi imzalama desteği mevcut değil!',
      AE00012: 'Belirtilen şablon adı mükellef şablonları arasında bulunamadı!',
      AE00013: '{0} belge tipi desteklenmiyor.',
      AE00014: 'Bu işlem ID ile daha önce fatura gönderildi!',
      AE00016: 'Fatura XML\'inde UUID içeren alan okunamadı.',
      AE00017: 'Fatura XML\'inde Fatura No içeren alan okunamadı.',
      AE00018:
        'Veritabanında belirtilen UUID ile kayıtlı Fatura Numarası ile gönderilen Fatura Numarası eşleşmiyor.',
      AE00019: 'Fatura versiyonu daha önce gönderilenle aynı ya da daha eski.',
      AE00020: 'Belirtilen UUID\'ye sahip kayıtlı fatura mevcut!',
      AE00042: '{0} fatura sistemde kayıtlı değildir!',
      AE00043: 'Fatura hatalı durumda!',
      AE00044: 'Fatura işlemde.',
      AE00050:
        'İptal edilmek istenen fatura imzalı duruma ulaşmamış. İptal işlemi yapılamaz!',
      AE00051: '{0} UUID\'li fatura sistemde mevcut ve imzalı durumda!',
      AE00052: 'Kullanıcının yetkili olduğu VKN bulunamadı!',
      AE00053: 'Fatura iptal işlemi başarısız!',
      AE00084:
        '{0} VKN\'si e-Fatura kayıtlı kullanıcısıdır. e-Arşiv faturası kesilemez!',
      AE00085:
        'Fatura oluşturma metodunda donenBelgeFormati parametresi 0 (UBL), 2 (HTML), 3 (PDF) ve 9 (YOK) değerlerini alabilir!',
      AE00087: 'e-Arşiv ürününüz yok!',
      AE00088: 'e-Arşiv aktivasyonunuz yapılmamış.',
      AE00089: 'Fatura zamanı e-Arşiv aktivasyon zamanınızdan öncedir!',
      AE00091:
        'İptal edilmek istenen fatura {0} tarihinde iptal edilmiş durumdadır.',
      AE00092: 'Başlangıç tarihi bitiş tarihinden büyük olamaz.',
      AE00093: 'Tarih aralığı en fazla 92 gün olabilir.'
    };

    // Document format constants
    this.documentFormats = {
      UBL: 0,
      HTML: 2,
      PDF: 3,
      NONE: 9
    };

    // Invoice profile constants
    this.invoiceProfiles = {
      E_ARCHIVE: 'EARSIVFATURA',
      COMMERCIAL: 'TICARIFATURA'
    };

    // Tax rates
    this.defaultTaxRates = {
      VAT_18: 0.18,
      VAT_8: 0.08,
      VAT_1: 0.01,
      VAT_0: 0.0
    };

    // Service namespaces
    this.namespaces = {
      soapEnv: 'http://schemas.xmlsoap.org/soap/envelope/',
      earsivService: 'http://service.earsiv.uut.cs.com.tr/',
      userService: 'http://service.user.cs.com.tr/',
      wsse: 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd',
      ubl: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
      cac: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
      cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'
    };

    // Default configuration values
    this.defaults = {
      language: 'tr',
      environment: 'test',
      timeout: 30000,
      currency: 'TRY',
      country: 'TR',
      countryName: 'Türkiye',
      ublVersion: '2.1',
      customizationId: 'TR1.2',
      copyIndicator: 'false',
      invoiceTypeCode: 'SATIS'
    };
  }

  /**
   * Get service endpoint URL
   * @param {string} environment - 'test' or 'production'
   * @param {string} service - 'earsivService' or 'userService'
   * @returns {string} Service URL
   */
  getEndpoint(environment = 'test', service = 'earsivService') {
    return (
      this.endpoints[environment]?.[service] || this.endpoints.test[service]
    );
  }

  /**
   * Get error message by code
   * @param {string} code - Error code
   * @returns {string} Error message
   */
  getErrorMessage(code) {
    return this.errorCodes[code] || `Unknown error code: ${code}`;
  }

  /**
   * Check if error code indicates success
   * @param {string} code - Error code
   * @returns {boolean} True if success
   */
  isSuccess(code) {
    return code === 'AE00000';
  }

  /**
   * Validate configuration object
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result
   */
  validateConfig(config) {
    const errors = [];

    if (!config.username) {
      errors.push('Username is required');
    }

    if (!config.password) {
      errors.push('Password is required');
    }

    if (!config.companyInfo?.taxNumber) {
      errors.push('Company tax number is required');
    }

    if (!config.companyInfo?.companyName) {
      errors.push('Company name is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Merge user config with defaults
   * @param {Object} userConfig - User configuration
   * @returns {Object} Merged configuration
   */
  mergeWithDefaults(userConfig) {
    return {
      ...this.defaults,
      ...userConfig,
      companyInfo: {
        ...userConfig.companyInfo
      }
    };
  }
}

module.exports = new QNBConfig();
