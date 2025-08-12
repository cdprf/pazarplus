# API Reference

![API](https://img.shields.io/badge/API-REST-blue.svg)
![Version](https://img.shields.io/badge/version-v1.0-green.svg)
![Auth](https://img.shields.io/badge/auth-JWT-orange.svg)
![Format](https://img.shields.io/badge/format-JSON-lightgrey.svg)

Complete API documentation for the Pazar+ Platform with usage examples and detailed explanations.

## Base URL

```
Development: http://localhost:3000/api
Production: https://yarukai.com/api
```

## Authentication

All API endpoints require authentication using JWT tokens. Include the token in the Authorization header.

```http
Authorization: Bearer <your_jwt_token>
```

### Login
Get an authentication token.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "FrVCxFsLb7Rfshn#"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "name": "Administrator"
  }
}
```

**Example (JavaScript):**
```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'FrVCxFsLb7Rfshn#'
  })
});

const data = await response.json();
localStorage.setItem('token', data.token);
```

**Example (cURL):**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "FrVCxFsLb7Rfshn#"
  }'
```

### Register
Create a new user account.

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": 2,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

## Product Management

### Classify Product Identifiers
Use the intelligent SKU classifier to distinguish between barcodes and SKU codes.

**Endpoint:** `POST /products/classify`

**Request Body:**
```json
{
  "products": [
    {
      "id": "prod_1",
      "sku": "ABC123",
      "name": "Product Name",
      "barcode": "1234567890123"
    },
    {
      "id": "prod_2", 
      "sku": "nwadas003orj",
      "name": "Another Product"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "classifications": {
    "prod_1": {
      "type": "sku",
      "confidence": 0.92,
      "reasoning": "Alphanumeric pattern with moderate length",
      "primary_identifier": "ABC123"
    },
    "prod_2": {
      "type": "sku", 
      "confidence": 0.89,
      "reasoning": "Complex alphanumeric pattern characteristic of SKU",
      "primary_identifier": "nwadas003orj"
    }
  },
  "summary": {
    "total_products": 2,
    "sku_count": 2,
    "barcode_count": 0,
    "processing_time": 45
  }
}
```

**Example (JavaScript):**
```javascript
const classifyProducts = async (products) => {
  const response = await fetch('/api/products/classify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ products })
  });
  
  return await response.json();
};

// Usage
const products = [
  { id: 'p1', sku: 'ABC123', name: 'Product 1' },
  { id: 'p2', sku: '1234567890123', name: 'Product 2' }
];

const result = await classifyProducts(products);
console.log(result.classifications);
```

### Detect Product Variants
Automatically detect and group product variants.

**Endpoint:** `POST /products/detect-variants`

**Request Body:**
```json
{
  "products": [
    {
      "id": "p1",
      "sku": "ABC123-RED-L",
      "name": "T-Shirt Red Large"
    },
    {
      "id": "p2", 
      "sku": "ABC123-BLU-L",
      "name": "T-Shirt Blue Large"
    },
    {
      "id": "p3",
      "sku": "ABC123-RED-M", 
      "name": "T-Shirt Red Medium"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "variant_groups": [
    {
      "base_sku": "ABC123",
      "products": [
        {
          "id": "p1",
          "variant_type": "color_size",
          "variant_values": ["RED", "L"],
          "confidence": 0.95
        },
        {
          "id": "p2",
          "variant_type": "color_size", 
          "variant_values": ["BLU", "L"],
          "confidence": 0.95
        },
        {
          "id": "p3",
          "variant_type": "color_size",
          "variant_values": ["RED", "M"],
          "confidence": 0.95
        }
      ]
    }
  ],
  "processing_time": 78
}
```

### Get Products
Retrieve user's products with optional filtering and intelligence data.

**Endpoint:** `GET /products`

**Query Parameters:**
- `page` (number): Page number for pagination (default: 1)
- `limit` (number): Number of products per page (default: 20)
- `platform` (string): Filter by platform (trendyol, hepsiburada, n11)
- `include_intelligence` (boolean): Include AI classification data (default: false)

**Example Request:**
```http
GET /api/products?page=1&limit=10&platform=trendyol&include_intelligence=true
```

**Response:**
```json
{
  "success": true,
  "products": [
    {
      "id": 1,
      "sku": "ABC123",
      "name": "Product Name",
      "platform": "trendyol",
      "price": 29.99,
      "stock": 100,
      "_intelligence": {
        "identifier_type": "sku",
        "confidence": 0.92,
        "variant_group": "ABC",
        "is_main_product": false
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_products": 87,
    "per_page": 10
  }
}
```

## Order Management

### Get Orders
Retrieve orders with filtering options.

**Endpoint:** `GET /orders`

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Orders per page  
- `platform` (string): Filter by platform
- `status` (string): Filter by order status
- `start_date` (string): ISO date string
- `end_date` (string): ISO date string

**Example:**
```javascript
const getOrders = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/orders?${params}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  return await response.json();
};

// Get recent orders from Trendyol
const orders = await getOrders({
  platform: 'trendyol',
  status: 'pending',
  limit: 20
});
```

### Create Order
Create a new order manually.

**Endpoint:** `POST /orders`

**Request Body:**
```json
{
  "platform": "manual",
  "customerName": "John Doe",
  "customerEmail": "john@example.com", 
  "customerPhone": "+1234567890",
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "USA"
  },
  "items": [
    {
      "sku": "ABC123",
      "title": "Product Name",
      "quantity": 2,
      "unitPrice": 29.99
    }
  ]
}
```

### Update Order Status
Update the status of an existing order.

**Endpoint:** `PUT /orders/:orderId/status`

**Request Body:**
```json
{
  "status": "shipped",
  "tracking_number": "1Z999AA1234567890",
  "carrier": "UPS",
  "notes": "Shipped via UPS Ground"
}
```

## Platform Connections

### Get Platform Connections
Retrieve configured platform connections.

**Endpoint:** `GET /platform-connections`

**Response:**
```json
{
  "success": true,
  "connections": [
    {
      "id": 1,
      "platform": "trendyol",
      "name": "My Trendyol Store",
      "status": "active",
      "last_sync": "2025-08-12T10:30:00Z",
      "total_orders": 1250,
      "total_products": 89
    }
  ]
}
```

### Test Platform Connection
Test connectivity to a platform.

**Endpoint:** `POST /platform-connections/:connectionId/test`

**Response:**
```json
{
  "success": true,
  "connection_status": "healthy",
  "response_time": 234,
  "api_version": "v2.1",
  "rate_limit": {
    "remaining": 4950,
    "reset_time": "2025-08-12T11:00:00Z"
  }
}
```

## Shipping Management

### Generate Shipping Label
Generate a shipping label PDF.

**Endpoint:** `POST /shipping/labels`

**Request Body:**
```json
{
  "order_id": 123,
  "template_id": "default",
  "carrier": "ups",
  "service_type": "ground"
}
```

**Response:**
```json
{
  "success": true,
  "label_url": "/shipping/labels/order_123_20250812.pdf",
  "tracking_number": "1Z999AA1234567890",
  "estimated_delivery": "2025-08-15"
}
```

### Get Shipping Templates
Retrieve available shipping label templates.

**Endpoint:** `GET /shipping/templates`

**Response:**
```json
{
  "success": true,
  "templates": [
    {
      "id": "default",
      "name": "Standard Label",
      "size": "4x6",
      "languages": ["en", "tr", "ar"]
    },
    {
      "id": "international", 
      "name": "International Shipping",
      "size": "A4",
      "languages": ["en", "fr", "de", "ar"]
    }
  ]
}
```

## Analytics

### Get Dashboard Analytics
Retrieve analytics data for the dashboard.

**Endpoint:** `GET /analytics/dashboard`

**Query Parameters:**
- `timeframe` (string): Time period (7d, 30d, 90d, 1y)
- `platform` (string): Filter by platform

**Example:**
```http
GET /api/analytics/dashboard?timeframe=30d&platform=trendyol
```

**Response:**
```json
{
  "success": true,
  "timeframe": "30d",
  "data": {
    "orders": {
      "total": 1250,
      "growth": 12.5,
      "by_status": {
        "pending": 45,
        "shipped": 1180,
        "delivered": 25
      }
    },
    "revenue": {
      "total": 125000.50,
      "growth": 8.3,
      "currency": "USD"
    },
    "products": {
      "total": 89,
      "variants_detected": 156,
      "classification_accuracy": 94.2
    },
    "platforms": {
      "active_connections": 3,
      "sync_health": 98.5
    }
  }
}
```

## WebSocket Events

### Real-time Order Updates
Connect to WebSocket for real-time order updates.

**Connection:**
```javascript
const socket = new WebSocket('ws://localhost:3000');

socket.onopen = () => {
  // Authenticate the WebSocket connection
  socket.send(JSON.stringify({
    type: 'auth',
    token: localStorage.getItem('token')
  }));
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'order_update':
      handleOrderUpdate(data.order);
      break;
    case 'sync_progress':
      updateSyncProgress(data.progress);
      break;
    case 'classification_complete':
      handleClassificationResults(data.results);
      break;
  }
};
```

**Event Types:**
- `order_update`: New or updated order
- `sync_progress`: Platform synchronization progress
- `classification_complete`: Product classification results
- `error`: Error notifications

## Error Handling

### Error Response Format
All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "value": "invalid-email",
      "constraint": "Must be a valid email address"
    }
  }
}
```

### Common Error Codes
- `AUTHENTICATION_FAILED`: Invalid credentials
- `AUTHORIZATION_DENIED`: Insufficient permissions
- `VALIDATION_ERROR`: Input validation failed
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `PLATFORM_ERROR`: External platform API error
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

### Rate Limiting
API requests are rate limited to prevent abuse:
- **Authentication endpoints**: 5 requests per minute
- **General API**: 100 requests per minute  
- **Platform sync**: 10 requests per minute

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1692696000
```

## SDKs and Examples

### JavaScript SDK Example
```javascript
class PazarAPI {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return await response.json();
  }

  async getProducts(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/products?${params}`);
  }

  async classifyProducts(products) {
    return this.request('/products/classify', {
      method: 'POST',
      body: JSON.stringify({ products })
    });
  }

  async getOrders(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/orders?${params}`);
  }
}

// Usage
const api = new PazarAPI('http://localhost:3000/api', 'your_token');
const products = await api.getProducts({ platform: 'trendyol' });
```

### Python SDK Example
```python
import requests
import json

class PazarAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}'
        }
    
    def request(self, endpoint, method='GET', data=None):
        url = f"{self.base_url}{endpoint}"
        response = requests.request(
            method, url, 
            headers=self.headers, 
            json=data if data else None
        )
        response.raise_for_status()
        return response.json()
    
    def get_products(self, **filters):
        params = '&'.join([f"{k}={v}" for k, v in filters.items()])
        endpoint = f"/products?{params}" if params else "/products"
        return self.request(endpoint)
    
    def classify_products(self, products):
        return self.request('/products/classify', 'POST', {'products': products})

# Usage
api = PazarAPI('http://localhost:3000/api', 'your_token')
products = api.get_products(platform='trendyol')
```

## Testing

### Running API Tests
```bash
# Run all API tests
npm test

# Run specific test suite
npm test -- --grep "Product Classification"

# Run tests with coverage
npm run test:coverage
```

### Example Test Cases
```javascript
describe('Product Classification API', () => {
  it('should classify SKU correctly', async () => {
    const response = await request(app)
      .post('/api/products/classify')
      .set('Authorization', `Bearer ${token}`)
      .send({
        products: [
          { id: 'test1', sku: 'ABC123', name: 'Test Product' }
        ]
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.classifications.test1.type).toBe('sku');
  });
});
```

For more examples and advanced usage, see the [examples directory](../examples/) in the repository.
