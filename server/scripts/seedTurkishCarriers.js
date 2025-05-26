const { ShippingCarrier } = require('../models');
const logger = require('../utils/logger');

/**
 * Seed Turkish shipping carriers data
 */
async function seedTurkishCarriers() {
  try {
    const carriers = [
      {
        name: 'Aras Kargo',
        code: 'ARAS',
        carrierType: 'TURKISH_DOMESTIC',
        isActive: true,
        apiEndpoint: 'https://api.araskargo.com.tr',
        trackingUrlTemplate: 'https://www.araskargo.com.tr/takip?k={trackingNumber}',
        supportedServices: ['STANDARD', 'EXPRESS'],
        configuration: {
          authType: 'bearer',
          rateCalculationEndpoint: '/api/rate-calculator',
          shipmentEndpoint: '/api/create-shipment',
          trackingEndpoint: '/api/tracking'
        },
        coverage: {
          domestic: true,
          international: false,
          cities: 'all',
          exclusions: []
        },
        deliveryTimeRange: '1-3 iş günü',
        maxWeight: 30.0,
        maxDimensions: {
          length: 120,
          width: 80,
          height: 80
        },
        cashOnDeliverySupported: true,
        insuranceSupported: true,
        returnSupported: true,
        businessDaysOnly: true,
        contactInfo: {
          phone: '444 2 525',
          email: 'info@araskargo.com.tr',
          website: 'https://www.araskargo.com.tr'
        }
      },
      {
        name: 'Yurtiçi Kargo',
        code: 'YURTICI',
        carrierType: 'TURKISH_DOMESTIC',
        isActive: true,
        apiEndpoint: 'https://api.yurticikargo.com',
        trackingUrlTemplate: 'https://www.yurticikargo.com/tr/takip?code={trackingNumber}',
        supportedServices: ['STANDARD', 'EXPRESS', 'NEXT_DAY'],
        configuration: {
          authType: 'api_key',
          rateCalculationEndpoint: '/api/price-calculation',
          shipmentEndpoint: '/api/create-shipment',
          trackingEndpoint: '/api/track'
        },
        coverage: {
          domestic: true,
          international: true,
          cities: 'all',
          exclusions: []
        },
        deliveryTimeRange: '1-2 iş günü',
        maxWeight: 50.0,
        maxDimensions: {
          length: 150,
          width: 100,
          height: 100
        },
        cashOnDeliverySupported: true,
        insuranceSupported: true,
        returnSupported: true,
        businessDaysOnly: true,
        contactInfo: {
          phone: '444 9 552',
          email: 'musteri@yurticikargo.com',
          website: 'https://www.yurticikargo.com'
        }
      },
      {
        name: 'PTT Kargo',
        code: 'PTT',
        carrierType: 'TURKISH_DOMESTIC',
        isActive: true,
        apiEndpoint: 'https://api.ptt.gov.tr/kargo',
        trackingUrlTemplate: 'https://gonderitakip.ptt.gov.tr/Track?q={trackingNumber}',
        supportedServices: ['STANDARD', 'EXPRESS'],
        configuration: {
          authType: 'api_key',
          rateCalculationEndpoint: '/calculate-shipping',
          shipmentEndpoint: '/create-shipment',
          trackingEndpoint: '/track'
        },
        coverage: {
          domestic: true,
          international: true,
          cities: 'all',
          exclusions: []
        },
        deliveryTimeRange: '2-4 iş günü',
        maxWeight: 25.0,
        maxDimensions: {
          length: 100,
          width: 80,
          height: 60
        },
        cashOnDeliverySupported: true,
        insuranceSupported: true,
        returnSupported: true,
        businessDaysOnly: true,
        contactInfo: {
          phone: '444 1 788',
          email: 'kargo@ptt.gov.tr',
          website: 'https://www.ptt.gov.tr'
        }
      },
      {
        name: 'UPS Turkey',
        code: 'UPS',
        carrierType: 'INTERNATIONAL',
        isActive: true,
        apiEndpoint: 'https://api.ups.com',
        trackingUrlTemplate: 'https://www.ups.com/track?loc=tr_TR&tracknum={trackingNumber}',
        supportedServices: ['STANDARD', 'EXPRESS', 'NEXT_DAY'],
        configuration: {
          authType: 'oauth',
          rateCalculationEndpoint: '/rating',
          shipmentEndpoint: '/shipments',
          trackingEndpoint: '/track'
        },
        coverage: {
          domestic: true,
          international: true,
          cities: 'major',
          exclusions: ['rural_areas']
        },
        deliveryTimeRange: '1-3 iş günü',
        maxWeight: 70.0,
        maxDimensions: {
          length: 270,
          width: 150,
          height: 150
        },
        cashOnDeliverySupported: false,
        insuranceSupported: true,
        returnSupported: true,
        businessDaysOnly: true,
        contactInfo: {
          phone: '444 8 877',
          email: 'customerservice@ups.com.tr',
          website: 'https://www.ups.com/tr'
        }
      },
      {
        name: 'MNG Kargo',
        code: 'MNG',
        carrierType: 'TURKISH_DOMESTIC',
        isActive: true,
        apiEndpoint: 'https://api.mngkargo.com.tr',
        trackingUrlTemplate: 'https://www.mngkargo.com.tr/track?trackingNumber={trackingNumber}',
        supportedServices: ['STANDARD', 'EXPRESS'],
        configuration: {
          authType: 'api_key',
          rateCalculationEndpoint: '/api/shipping-cost',
          shipmentEndpoint: '/api/create-shipment',
          trackingEndpoint: '/api/track'
        },
        coverage: {
          domestic: true,
          international: false,
          cities: 'all',
          exclusions: []
        },
        deliveryTimeRange: '1-3 iş günü',
        maxWeight: 40.0,
        maxDimensions: {
          length: 120,
          width: 80,
          height: 80
        },
        cashOnDeliverySupported: true,
        insuranceSupported: true,
        returnSupported: true,
        businessDaysOnly: true,
        contactInfo: {
          phone: '444 0 664',
          email: 'info@mngkargo.com.tr',
          website: 'https://www.mngkargo.com.tr'
        }
      },
      {
        name: 'Sürat Kargo',
        code: 'SURAT',
        carrierType: 'TURKISH_DOMESTIC',
        isActive: true,
        apiEndpoint: 'https://api.suratkargo.com.tr',
        trackingUrlTemplate: 'https://www.suratkargo.com.tr/kargo-takip?q={trackingNumber}',
        supportedServices: ['STANDARD', 'EXPRESS'],
        configuration: {
          authType: 'api_key',
          rateCalculationEndpoint: '/api/calculate-price',
          shipmentEndpoint: '/api/create-shipment',
          trackingEndpoint: '/api/track'
        },
        coverage: {
          domestic: true,
          international: false,
          cities: 'all',
          exclusions: []
        },
        deliveryTimeRange: '1-2 iş günü',
        maxWeight: 35.0,
        maxDimensions: {
          length: 100,
          width: 70,
          height: 70
        },
        cashOnDeliverySupported: true,
        insuranceSupported: true,
        returnSupported: true,
        businessDaysOnly: true,
        contactInfo: {
          phone: '444 0 778',
          email: 'info@suratkargo.com.tr',
          website: 'https://www.suratkargo.com.tr'
        }
      }
    ];

    for (const carrierData of carriers) {
      const [carrier, created] = await ShippingCarrier.findOrCreate({
        where: { code: carrierData.code },
        defaults: carrierData
      });

      if (created) {
        logger.info(`Created carrier: ${carrier.name}`, {
          carrierId: carrier.id,
          code: carrier.code
        });
      } else {
        // Update existing carrier with new data
        await carrier.update(carrierData);
        logger.info(`Updated carrier: ${carrier.name}`, {
          carrierId: carrier.id,
          code: carrier.code
        });
      }
    }

    const totalCarriers = await ShippingCarrier.count({
      where: { isActive: true }
    });

    logger.info(`Successfully seeded ${totalCarriers} Turkish shipping carriers`);
    
    return {
      success: true,
      message: `Successfully seeded ${totalCarriers} carriers`,
      carriersCreated: carriers.length
    };

  } catch (error) {
    logger.error('Failed to seed Turkish carriers:', error);
    throw error;
  }
}

module.exports = {
  seedTurkishCarriers
};