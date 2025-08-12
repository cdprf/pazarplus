# Platform Integration Guide

![Integration](https://img.shields.io/badge/integration-multi--platform-blue.svg)
![Sync](https://img.shields.io/badge/sync-bidirectional-success.svg)
![Platforms](https://img.shields.io/badge/platforms-3%2B-brightgreen.svg)

This guide provides detailed instructions for integrating various e-commerce platforms with Pazar+, including setup, configuration, and troubleshooting.

## Overview

Pazar+ supports integration with multiple e-commerce platforms through a unified API layer. The platform provides:

- **Bidirectional synchronization** of orders, products, and inventory
- **Intelligent product classification** for SKU vs barcode detection
- **Variant detection** for product relationship mapping
- **Real-time order processing** with WebSocket notifications

## Supported Platforms

### Currently Supported
- **Trendyol** - Major marketplace platform
- **Hepsiburada** - E-commerce marketplace
- **N11** - Online marketplace platform
- **CSV Import/Export** - Manual data management

### Platform Capabilities Matrix

| Feature | Trendyol | Hepsiburada | N11 | CSV |
|---------|:--------:|:-----------:|:---:|:---:|
| Order Import | ![Yes](https://img.shields.io/badge/-Yes-success) | ![Yes](https://img.shields.io/badge/-Yes-success) | ![Yes](https://img.shields.io/badge/-Yes-success) | ![Yes](https://img.shields.io/badge/-Yes-success) |
| Product Sync | ![Yes](https://img.shields.io/badge/-Yes-success) | ![Yes](https://img.shields.io/badge/-Yes-success) | ![Yes](https://img.shields.io/badge/-Yes-success) | ![Yes](https://img.shields.io/badge/-Yes-success) |
| Inventory Update | ![Yes](https://img.shields.io/badge/-Yes-success) | ![Yes](https://img.shields.io/badge/-Yes-success) | ![Yes](https://img.shields.io/badge/-Yes-success) | ![No](https://img.shields.io/badge/-No-red) |
| Real-time Sync | ![Yes](https://img.shields.io/badge/-Yes-success) | ![Yes](https://img.shields.io/badge/-Yes-success) | ![Yes](https://img.shields.io/badge/-Yes-success) | ![No](https://img.shields.io/badge/-No-red) |
| Webhook Support | ![Yes](https://img.shields.io/badge/-Yes-success) | ![Yes](https://img.shields.io/badge/-Yes-success) | ![Yes](https://img.shields.io/badge/-Yes-success) | ![No](https://img.shields.io/badge/-No-red) |
| Rate Limiting | ![Yes](https://img.shields.io/badge/-Yes-success) | ![Yes](https://img.shields.io/badge/-Yes-success) | ![Yes](https://img.shields.io/badge/-Yes-success) | ![No](https://img.shields.io/badge/-No-red) |

## General Setup Process

### 1. Platform Connection Configuration

Navigate to **Settings > Platform Connections** in the Pazar+ interface.

```javascript
// Example configuration object
const platformConfig = {
  name: "My Store Name",
  platform: "trendyol", // or "hepsiburada", "n11"
  credentials: {
    apiKey: "your_api_key",
    apiSecret: "your_api_secret",
    sellerId: "your_seller_id"
  },
  settings: {
    syncFrequency: "hourly", // hourly, daily, manual
    autoAcceptOrders: false,
    syncProducts: true,
    syncInventory: true
  }
}
```

### 2. API Credentials Setup

Each platform requires specific credentials:

#### Environment Variables
```env
# Trendyol
TRENDYOL_API_KEY=your_trendyol_api_key
TRENDYOL_API_SECRET=your_trendyol_secret
TRENDYOL_SELLER_ID=your_seller_id

# Hepsiburada  
HEPSIBURADA_USERNAME=your_username
HEPSIBURADA_PASSWORD=your_password
HEPSIBURADA_MERCHANT_ID=your_merchant_id

# N11
N11_API_KEY=your_n11_api_key
N11_API_SECRET=your_n11_secret
```

### 3. Testing Connection

```javascript
// Test platform connection
const testConnection = async (connectionId) => {
  try {
    const response = await fetch(`/api/platform-connections/${connectionId}/test`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('Connection successful:', result.connection_status);
      console.log('Response time:', result.response_time, 'ms');
    }
  } catch (error) {
    console.error('Connection test failed:', error);
  }
};
```

## Platform-Specific Integration

### Trendyol Integration

#### Setup Steps

1. **Get API Credentials**
   - Log into Trendyol Partner Panel
   - Navigate to Integration > API Settings
   - Generate API Key and Secret
   - Note your Seller ID

2. **Configure Connection**
   ```javascript
   const trendyolConfig = {
     name: "Trendyol Store",
     platform: "trendyol",
     credentials: {
       apiKey: process.env.TRENDYOL_API_KEY,
       apiSecret: process.env.TRENDYOL_API_SECRET,
       sellerId: process.env.TRENDYOL_SELLER_ID
     },
     endpoints: {
       orders: "https://api.trendyol.com/sapigw/suppliers/{supplierId}/orders",
       products: "https://api.trendyol.com/sapigw/suppliers/{supplierId}/products"
     }
   };
   ```

3. **Order Fetching**
   ```javascript
   // Fetch orders from Trendyol
   const fetchTrendyolOrders = async (dateRange) => {
     const response = await fetch('/api/platforms/trendyol/orders/fetch', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${token}`
       },
       body: JSON.stringify({
         startDate: dateRange.start,
         endDate: dateRange.end,
         status: 'all' // or specific status
       })
     });
     
     return await response.json();
   };
   ```

#### Data Mapping
```javascript
// Trendyol order mapping
const mapTrendyolOrder = (trendyolOrder) => ({
  platformOrderId: trendyolOrder.orderNumber,
  orderDate: trendyolOrder.orderDate,
  customerName: trendyolOrder.customerFirstName + ' ' + trendyolOrder.customerLastName,
  customerEmail: trendyolOrder.customerEmail,
  shippingAddress: {
    street: trendyolOrder.shipmentAddress.address1,
    city: trendyolOrder.shipmentAddress.city,
    district: trendyolOrder.shipmentAddress.district,
    postalCode: trendyolOrder.shipmentAddress.postalCode
  },
  items: trendyolOrder.lines.map(line => ({
    sku: line.merchantSku,
    productTitle: line.productName,
    quantity: line.quantity,
    unitPrice: line.price
  }))
});
```

### Hepsiburada Integration

#### Setup Steps

1. **API Access**
   - Contact Hepsiburada support for API access
   - Provide business registration documents
   - Receive API credentials and merchant ID

2. **Configuration**
   ```javascript
   const hepsiburadaConfig = {
     name: "Hepsiburada Store",
     platform: "hepsiburada",
     credentials: {
       username: process.env.HEPSIBURADA_USERNAME,
       password: process.env.HEPSIBURADA_PASSWORD,
       merchantId: process.env.HEPSIBURADA_MERCHANT_ID
     },
     endpoints: {
       auth: "https://mpop.hepsiburada.com/login",
       orders: "https://mpop.hepsiburada.com/orders"
     }
   };
   ```

3. **Order Processing**
   ```javascript
   // Process Hepsiburada orders
   const processHepsiburadaOrder = async (order) => {
     // Apply intelligent SKU classification
     const classification = await classifyProducts([{
       id: order.items[0].id,
       sku: order.items[0].merchantSku,
       barcode: order.items[0].barcode
     }]);
     
     return {
       ...order,
       items: order.items.map(item => ({
         ...item,
         _classification: classification[item.id]
       }))
     };
   };
   ```

### N11 Integration

#### Setup Process

1. **Developer Registration**
   - Register as N11 developer
   - Create application in N11 Developer Panel
   - Get API key and secret

2. **OAuth Flow**
   ```javascript
   // N11 OAuth authentication
   const authenticateN11 = async () => {
     const authUrl = `https://www.n11.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}`;
     
     // After user authorization, exchange code for token
     const tokenResponse = await fetch('https://www.n11.com/oauth/token', {
       method: 'POST',
       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
       body: new URLSearchParams({
         grant_type: 'authorization_code',
         client_id: process.env.N11_CLIENT_ID,
         client_secret: process.env.N11_CLIENT_SECRET,
         code: authorizationCode,
         redirect_uri: redirectUri
       })
     });
     
     return await tokenResponse.json();
   };
   ```

### CSV Import/Export

#### CSV Format Standards

**Orders CSV Format:**
```csv
OrderId,OrderDate,CustomerName,CustomerEmail,CustomerPhone,ShippingAddress,City,PostalCode,ProductSKU,ProductName,Quantity,UnitPrice,TotalPrice
ORD001,2025-08-12,John Doe,john@example.com,+1234567890,"123 Main St",New York,10001,ABC123,Product Name,2,29.99,59.98
```

**Products CSV Format:**
```csv
SKU,Name,Description,Price,Stock,Category,Barcode,Weight,Dimensions
ABC123,Product Name,Product description,29.99,100,Electronics,1234567890123,0.5kg,20x15x5cm
```

#### Import Process
```javascript
// CSV import handler
const importCSV = async (file, type) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type); // 'orders' or 'products'
  
  const response = await fetch('/api/import/csv', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return await response.json();
};
```

## Advanced Features

### Intelligent Product Classification

The platform automatically classifies product identifiers:

```javascript
// Example of classification results
const classificationExample = {
  "ABC123": {
    type: "sku",
    confidence: 0.92,
    reasoning: "Alphanumeric pattern with moderate length",
    primary_identifier: "ABC123"
  },
  "1234567890123": {
    type: "barcode",
    confidence: 0.98,
    reasoning: "13-digit numeric pattern matching EAN-13",
    primary_identifier: "1234567890123"
  }
};

// Use classification for data processing
const processProduct = (product, classification) => {
  if (classification.type === 'sku') {
    // Handle as SKU - use for inventory tracking
    return trackBySKU(product);
  } else if (classification.type === 'barcode') {
    // Handle as barcode - use for scanning operations
    return trackByBarcode(product);
  }
};
```

### Variant Detection

Automatically group related products:

```javascript
// Variant detection example
const variantDetectionResult = {
  base_sku: "TSHIRT001",
  variants: [
    {
      sku: "TSHIRT001-RED-S",
      attributes: { color: "Red", size: "S" },
      confidence: 0.95
    },
    {
      sku: "TSHIRT001-RED-M", 
      attributes: { color: "Red", size: "M" },
      confidence: 0.95
    },
    {
      sku: "TSHIRT001-BLU-S",
      attributes: { color: "Blue", size: "S" },
      confidence: 0.95
    }
  ]
};

// Use variant data for inventory management
const manageVariantInventory = (variantGroup) => {
  const totalStock = variantGroup.variants.reduce((sum, variant) => 
    sum + variant.stock, 0
  );
  
  return {
    base_sku: variantGroup.base_sku,
    total_stock: totalStock,
    variant_count: variantGroup.variants.length
  };
};
```

### Real-time Synchronization

Set up real-time sync with WebSocket notifications:

```javascript
// WebSocket setup for real-time updates
class PlatformSync {
  constructor(token) {
    this.socket = new WebSocket('ws://localhost:3000');
    this.token = token;
    this.setupEventHandlers();
  }
  
  setupEventHandlers() {
    this.socket.onopen = () => {
      this.authenticate();
    };
    
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleSyncEvent(data);
    };
  }
  
  authenticate() {
    this.socket.send(JSON.stringify({
      type: 'auth',
      token: this.token
    }));
  }
  
  handleSyncEvent(data) {
    switch(data.type) {
      case 'order_sync':
        this.updateOrderDisplay(data.orders);
        break;
      case 'product_sync':
        this.updateProductCatalog(data.products);
        break;
      case 'sync_error':
        this.handleSyncError(data.error);
        break;
    }
  }
}

// Usage
const sync = new PlatformSync(localStorage.getItem('token'));
```

## Error Handling and Troubleshooting

### Common Issues

#### 1. API Rate Limiting
```javascript
// Handle rate limiting
const handleRateLimit = (error) => {
  if (error.status === 429) {
    const retryAfter = error.headers['retry-after'];
    console.log(`Rate limited. Retry after ${retryAfter} seconds`);
    
    setTimeout(() => {
      // Retry the request
      retryRequest();
    }, retryAfter * 1000);
  }
};
```

#### 2. Authentication Failures
```javascript
// Handle authentication errors
const handleAuthError = async (error) => {
  if (error.status === 401) {
    // Token expired, refresh or re-authenticate
    const newToken = await refreshToken();
    if (newToken) {
      // Retry with new token
      return retryWithNewToken(newToken);
    } else {
      // Redirect to login
      window.location.href = '/login';
    }
  }
};
```

#### 3. Platform-Specific Errors
```javascript
// Platform error mapping
const mapPlatformError = (platform, error) => {
  const errorMappings = {
    trendyol: {
      'INVALID_SUPPLIER': 'Invalid seller credentials',
      'ORDER_NOT_FOUND': 'Order does not exist',
      'RATE_LIMIT': 'Too many requests'
    },
    hepsiburada: {
      'UNAUTHORIZED': 'Authentication failed',
      'FORBIDDEN': 'Access denied',
      'VALIDATION_ERROR': 'Invalid data format'
    }
  };
  
  return errorMappings[platform][error.code] || error.message;
};
```

### Debugging Tools

#### 1. Connection Testing
```bash
# Test platform connectivity
curl -X POST http://localhost:3000/api/platform-connections/1/test \
  -H "Authorization: Bearer your_token"
```

#### 2. Sync Monitoring
```javascript
// Monitor sync progress
const monitorSync = (connectionId) => {
  const eventSource = new EventSource(`/api/platform-connections/${connectionId}/sync-status`);
  
  eventSource.onmessage = (event) => {
    const progress = JSON.parse(event.data);
    console.log(`Sync progress: ${progress.percentage}%`);
    console.log(`Current operation: ${progress.operation}`);
  };
};
```

#### 3. Log Analysis
```javascript
// Fetch platform logs
const getPlatformLogs = async (platform, timeRange) => {
  const response = await fetch(`/api/platforms/${platform}/logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      start_time: timeRange.start,
      end_time: timeRange.end,
      level: 'error' // or 'info', 'debug'
    })
  });
  
  return await response.json();
};
```

## Performance Optimization

### Batch Processing
```javascript
// Process orders in batches for better performance
const processBatchOrders = async (orders, batchSize = 50) => {
  const batches = [];
  for (let i = 0; i < orders.length; i += batchSize) {
    batches.push(orders.slice(i, i + batchSize));
  }
  
  const results = [];
  for (const batch of batches) {
    const batchResult = await fetch('/api/orders/batch-process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ orders: batch })
    });
    
    results.push(await batchResult.json());
  }
  
  return results;
};
```

### Caching Strategy
```javascript
// Implement caching for frequently accessed data
class PlatformCache {
  constructor(ttl = 300000) { // 5 minutes default
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
}

const cache = new PlatformCache();
```

## Security Best Practices

### API Key Management
```javascript
// Secure API key storage
class SecureStorage {
  static encrypt(data, key) {
    // Use crypto library for encryption
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }
  
  static decrypt(encryptedData, key) {
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
```

### Request Signing
```javascript
// Sign requests for additional security
const signRequest = (method, url, body, secret) => {
  const timestamp = Date.now();
  const payload = `${method}${url}${body}${timestamp}`;
  const signature = crypto.createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  return {
    timestamp,
    signature
  };
};
```

For additional support and advanced configuration options, consult the [API Reference](./api-reference.md) and [Troubleshooting Guide](./troubleshooting.md).
