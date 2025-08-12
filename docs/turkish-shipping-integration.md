# Turkish Shipping Carriers Integration

![Shipping](https://img.shields.io/badge/shipping-Turkish%20carriers-blue.svg)
![Carriers](https://img.shields.io/badge/carriers-3%2B-success.svg)
![Tracking](https://img.shields.io/badge/tracking-real--time-orange.svg)

This document provides comprehensive information about the Turkish shipping carriers integration for the Pazar+ e-commerce platform.

## Overview

The shipping module provides seamless integration with major Turkish shipping carriers:
- **Aras Kargo** - Leading Turkish cargo company with nationwide coverage
- **Yurtiçi Kargo** - Major logistics company with comprehensive services  
- **PTT Kargo** - Turkish Postal Service with extensive rural coverage

## Features

![Rate Comparison](https://img.shields.io/badge/-Rate%20Comparison-success) **Rate Comparison** - Compare shipping rates across multiple carriers simultaneously
![Label Generation](https://img.shields.io/badge/-Label%20Generation-success) **Label Generation** - Create shipping labels with tracking numbers
![Package Tracking](https://img.shields.io/badge/-Package%20Tracking-success) **Package Tracking** - Real-time tracking across all carriers
![Delivery Availability](https://img.shields.io/badge/-Delivery%20Availability-success) **Delivery Availability** - Check service availability by address
![COD Support](https://img.shields.io/badge/-COD%20Support-success) **COD Support** - Cash on Delivery for all carriers
![Address Validation](https://img.shields.io/badge/-Address%20Validation-success) **Turkish Address Validation** - Postal code and phone number validation
![Multi-Service](https://img.shields.io/badge/-Multi--Service%20Support-success) **Multi-Service Support** - Standard, Express, Economy delivery options

## API Endpoints

### Public Endpoints (No Authentication Required)

#### Get Supported Carriers
```http
GET /api/shipping/carriers
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "code": "aras",
      "name": "Aras Kargo",
      "description": "Leading Turkish cargo company with nationwide coverage",
      "features": ["Tracking", "COD", "Express Delivery", "Same Day"],
      "coverage": "Turkey (all provinces)",
      "estimatedDeliveryDays": "1-3",
      "credentialsRequired": ["username", "password"]
    }
  ]
}
```

#### Get Carrier Services
```http
GET /api/shipping/carriers/{carrier}/services
```

### Protected Endpoints (Authentication Required)

#### Compare Shipping Rates
```http
POST /api/shipping/rates
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "packageInfo": {
    "weight": 1500,
    "dimensions": {
      "length": 30,
      "width": 20,
      "height": 15
    },
    "declaredValue": 250,
    "serviceType": "STANDARD"
  },
  "fromAddress": {
    "name": "Satıcı A.Ş.",
    "address1": "Maslak Mahallesi Eski Büyükdere Cad. No:1",
    "city": "İstanbul",
    "district": "Sarıyer", 
    "postalCode": "34485",
    "phone": "+905551234567",
    "email": "info@seller.com"
  },
  "toAddress": {
    "name": "Ahmet Yılmaz",
    "address1": "Kızılay Mahallesi Atatürk Bulvarı No:123",
    "city": "Ankara",
    "district": "Çankaya",
    "postalCode": "06420",
    "phone": "+905559876543",
    "email": "ahmet@example.com"
  },
  "carriers": ["aras", "yurtici", "ptt"],
  "credentials": {
    "aras": {
      "username": "your_aras_username",
      "password": "your_aras_password"
    },
    "yurtici": {
      "wsUserName": "your_yurtici_username",
      "wsPassword": "your_yurtici_password",
      "customerCode": "your_customer_code"
    },
    "ptt": {
      "apiKey": "your_ptt_api_key",
      "customerCode": "your_ptt_customer_code"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-05-25T10:30:00.000Z",
    "carriers": [
      {
        "carrier": "aras",
        "carrierName": "Aras Kargo",
        "success": true,
        "rates": [
          {
            "serviceCode": "STD",
            "serviceName": "Standart",
            "price": 45.50,
            "currency": "TRY",
            "estimatedDeliveryDays": "1-2",
            "features": ["Tracking", "Insurance"]
          }
        ]
      }
    ],
    "summary": {
      "totalCarriers": 3,
      "lowestPrice": 42.75,
      "highestPrice": 58.90,
      "averagePrice": 49.05,
      "currency": "TRY"
    }
  }
}
```

#### Create Shipping Label
```http
POST /api/shipping/labels
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "shipmentData": {
    "packageInfo": {
      "weight": 1500,
      "dimensions": {
        "length": 30,
        "width": 20,
        "height": 15
      },
      "description": "Elektronik Ürün",
      "declaredValue": 250,
      "serviceType": "STANDARD",
      "paymentType": "COD",
      "codAmount": 250
    },
    "fromAddress": {
      "name": "Satıcı A.Ş.",
      "address1": "Maslak Mahallesi Eski Büyükdere Cad. No:1",
      "city": "İstanbul",
      "district": "Sarıyer",
      "postalCode": "34485",
      "phone": "+905551234567",
      "email": "info@seller.com"
    },
    "toAddress": {
      "name": "Ahmet Yılmaz",
      "address1": "Kızılay Mahallesi Atatürk Bulvarı No:123",
      "city": "Ankara",
      "district": "Çankaya",
      "postalCode": "06420",
      "phone": "+905559876543",
      "email": "ahmet@example.com"
    },
    "orderInfo": {
      "orderNumber": "ORD-2025-001234"
    }
  },
  "carrier": "aras",
  "credentials": {
    "aras": {
      "username": "your_aras_username",
      "password": "your_aras_password"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trackingNumber": "123456789012",
    "labelUrl": "https://api.araskargo.com.tr/labels/123456789012.pdf",
    "shipmentId": "SHP_789123456",
    "estimatedDeliveryDate": "2025-05-27",
    "totalCost": 45.50,
    "currency": "TRY",
    "serviceType": "STD",
    "labelFormat": "PDF",
    "carrier": "aras",
    "carrierName": "Aras Kargo"
  }
}
```

#### Track Package
```http
GET /api/shipping/track/{carrier}/{trackingNumber}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trackingNumber": "123456789012",
    "status": "in_transit",
    "statusDescription": "Kargo transfer merkezinde",
    "estimatedDeliveryDate": "2025-05-27",
    "currentLocation": {
      "city": "Ankara",
      "facility": "Ankara Transfer Merkezi"
    },
    "events": [
      {
        "date": "2025-05-25",
        "time": "14:30",
        "status": "picked_up",
        "description": "Kargo alındı",
        "location": "İstanbul Maslak Şubesi"
      },
      {
        "date": "2025-05-25",
        "time": "18:45",
        "status": "in_transit",
        "description": "Transfer merkezine gönderildi",
        "location": "İstanbul Transfer Merkezi"
      }
    ],
    "carrier": "aras",
    "carrierName": "Aras Kargo"
  }
}
```

#### Cancel Shipment
```http
DELETE /api/shipping/shipments/{carrier}/{trackingNumber}
Authorization: Bearer {token}
```

#### Check Delivery Availability
```http
POST /api/shipping/availability
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "address": {
    "city": "İstanbul",
    "district": "Kadıköy",
    "postalCode": "34710"
  },
  "carriers": ["aras", "yurtici", "ptt"]
}
```

## Carrier-Specific Configuration

### Aras Kargo
```javascript
const arasCredentials = {
  username: "your_aras_username",
  password: "your_aras_password",
  testMode: false // Set to true for testing
};
```

### Yurtiçi Kargo
```javascript
const yurticiCredentials = {
  wsUserName: "your_webservice_username",
  wsPassword: "your_webservice_password", 
  customerCode: "your_customer_code",
  testMode: false
};
```

### PTT Kargo
```javascript
const pttCredentials = {
  apiKey: "your_ptt_api_key",
  customerCode: "your_customer_code",
  taxNumber: "your_tax_number", // Optional
  testMode: false
};
```

## Service Types

### Aras Kargo
- **STD** - Standart (1-2 days)
- **ECO** - Ekonomik (2-3 days)
- **EXP** - Express (Same/Next day)
- **COD** - Kapıda Ödeme

### Yurtiçi Kargo
- **1** - Standart (1-3 days)
- **2** - Ekonomik (2-4 days)
- **3** - Express (1-2 days)
- **4** - Kapıda Ödeme (1-3 days)

### PTT Kargo
- **STANDARD** - Standart Posta (2-5 days)
- **EXPRESS** - Hızlı Posta (1-3 days)
- **PRIORITY** - Öncelikli Posta (1-2 days)
- **COD** - Kapıda Ödeme (2-5 days)
- **INSURED** - Güvenceli Posta (2-4 days)

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

Common error codes:
- `MISSING_REQUIRED_FIELDS` - Required fields are missing
- `INVALID_POSTAL_CODE` - Invalid Turkish postal code
- `INVALID_PHONE` - Invalid Turkish phone number
- `MISSING_CARRIER_CREDENTIALS` - Carrier credentials not provided
- `RATE_CALCULATION_ERROR` - Failed to calculate rates
- `LABEL_CREATION_ERROR` - Failed to create shipping label
- `TRACKING_ERROR` - Failed to track package
- `AVAILABILITY_CHECK_ERROR` - Failed to check delivery availability

## Usage Examples

### Frontend Integration (React)

```javascript
import { shippingService } from '../services/api';

// Compare shipping rates
const compareRates = async (packageInfo, fromAddress, toAddress) => {
  try {
    const response = await shippingService.compareRates({
      packageInfo,
      fromAddress,
      toAddress,
      carriers: ['aras', 'yurtici', 'ptt']
    });
    
    if (response.success) {
      console.log('Cheapest rate:', response.data.summary.lowestPrice);
      return response.data.carriers;
    }
  } catch (error) {
    console.error('Rate comparison failed:', error);
  }
};

// Create shipping label
const createLabel = async (shipmentData, preferredCarrier) => {
  try {
    const response = await shippingService.createLabel({
      shipmentData,
      carrier: preferredCarrier
    });
    
    if (response.success) {
      console.log('Tracking number:', response.data.trackingNumber);
      console.log('Label URL:', response.data.labelUrl);
      return response.data;
    }
  } catch (error) {
    console.error('Label creation failed:', error);
  }
};

// Track package
const trackPackage = async (trackingNumber, carrier) => {
  try {
    const response = await shippingService.trackPackage(carrier, trackingNumber);
    
    if (response.success) {
      console.log('Current status:', response.data.status);
      console.log('Location:', response.data.currentLocation);
      return response.data;
    }
  } catch (error) {
    console.error('Tracking failed:', error);
  }
};
```

### Backend Integration (Node.js)

```javascript
const shippingFactory = require('./modules/public/shipping/ShippingServiceFactory');

// Get shipping service for specific carrier
const arasService = shippingFactory.getService('aras', {
  username: 'your_username',
  password: 'your_password'
});

// Calculate rates
const rates = await arasService.getShippingRates(packageInfo, fromAddress, toAddress);

// Create label
const label = await arasService.createShippingLabel(shipmentData);

// Track package
const tracking = await arasService.trackPackage(trackingNumber);
```

## Best Practices

1. **Credential Management**: Store carrier credentials securely, preferably encrypted
2. **Rate Caching**: Cache shipping rates for similar requests to reduce API calls
3. **Error Handling**: Always handle carrier API failures gracefully
4. **Address Validation**: Validate Turkish addresses before submitting
5. **Testing**: Use test credentials during development
6. **Monitoring**: Monitor API usage and response times
7. **Fallback**: Have backup carriers in case primary carrier fails

## Testing

Use test credentials provided by each carrier:

```javascript
const testCredentials = {
  aras: {
    username: 'test_user',
    password: 'test_pass',
    testMode: true
  },
  yurtici: {
    wsUserName: 'test_user',
    wsPassword: 'test_pass',
    customerCode: 'TEST123',
    testMode: true
  },
  ptt: {
    apiKey: 'test_api_key',
    customerCode: 'TEST456',
    testMode: true
  }
};
```

## Performance Considerations

- **Parallel Requests**: Rate comparison runs carrier requests in parallel
- **Connection Pooling**: HTTP connections are reused across requests  
- **Request Timeouts**: 30-second timeout for all carrier APIs
- **Retry Logic**: Automatic retry with exponential backoff
- **Caching**: Service instances are cached to avoid re-initialization

## Security

- All carrier credentials are validated before use
- Turkish postal codes and phone numbers are validated
- API requests include proper authentication headers
- Sensitive data is not logged in production

## Support

For technical support or carrier API issues, contact:
- **Aras Kargo**: [developer portal](https://developer.araskargo.com.tr)
- **Yurtiçi Kargo**: [API documentation](https://developer.yurticikargo.com)
- **PTT Kargo**: [PTT API support](https://developer.ptt.gov.tr)

## Changelog

### v1.0.0 (2025-05-25)
- Initial implementation of Turkish shipping carriers
- Support for Aras Kargo, Yurtiçi Kargo, and PTT Kargo
- Rate comparison, label creation, and tracking functionality
- Complete API documentation and examples