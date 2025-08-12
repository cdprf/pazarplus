# User Guide

![User Guide](https://img.shields.io/badge/guide-comprehensive-blue.svg)
![Features](https://img.shields.io/badge/features-complete-success.svg)
![Updated](https://img.shields.io/badge/updated-Aug%202025-brightgreen.svg)

Complete guide for using the Pazar+ Platform, from getting started to advanced features.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Order Management](#order-management)
4. [Product Management](#product-management)
5. [Platform Connections](#platform-connections)
6. [Shipping Management](#shipping-management)
7. [Analytics & Reporting](#analytics--reporting)
8. [Settings & Configuration](#settings--configuration)
9. [Advanced Features](#advanced-features)
10. [Troubleshooting](#troubleshooting)

## Getting Started

### First Login

1. **Access the Platform**
   - Navigate to [yarukai.com](https://yarukai.com)
   - Use the demo credentials for testing:
     ```
     Email: admin@example.com
     Password: FrVCxFsLb7Rfshn#
     ```

2. **Initial Setup**
   - Complete your profile information
   - Set up your first platform connection
   - Configure basic settings

### Interface Overview

The Pazar+ interface consists of several main sections:

- **Dashboard**: Overview of your business metrics
- **Orders**: Order management and processing
- **Products**: Product catalog and classification
- **Platforms**: Marketplace connections and sync
- **Shipping**: Label generation and carrier management
- **Analytics**: Business insights and reports
- **Settings**: Configuration and preferences

## Dashboard Overview

### Key Metrics Display

The dashboard provides a comprehensive overview of your e-commerce operations:

#### Orders Summary
- **Total Orders**: Current period order count
- **Pending Orders**: Orders awaiting processing
- **Shipped Orders**: Orders in transit
- **Revenue**: Total sales value

#### Platform Health
- **Active Connections**: Number of connected platforms
- **Sync Status**: Last synchronization status
- **API Health**: Platform connectivity status

#### Product Intelligence
- **Total Products**: Products in your catalog
- **Classified Products**: Products with AI classification
- **Variant Groups**: Detected product variants

### Real-time Updates

The dashboard updates in real-time using WebSocket connections:

```javascript
// Dashboard updates are handled automatically
// You'll see live updates for:
// - New orders arriving
// - Sync progress
// - Classification results
// - Error notifications
```

### Customizing Your Dashboard

1. **Widget Configuration**
   - Click the settings icon on any widget
   - Choose which metrics to display
   - Set refresh intervals

2. **Date Range Selection**
   - Use the date picker to change time periods
   - Available ranges: 7 days, 30 days, 90 days, 1 year

## Order Management

### Viewing Orders

#### Order List View
Access your orders through **Orders > All Orders**:

- **Search & Filter**: Find orders by ID, customer name, or platform
- **Sort Options**: Sort by date, amount, status, or platform
- **Bulk Actions**: Process multiple orders simultaneously

#### Order Details
Click any order to view detailed information:

```
Order Information:
├── Order ID: ORD-2025-001234
├── Platform: Trendyol
├── Date: 2025-08-12 14:30:00
├── Status: Pending
└── Total: $59.98

Customer Information:
├── Name: John Doe
├── Email: john@example.com
├── Phone: +1-555-0123
└── Shipping Address: 123 Main St, New York, NY 10001

Items:
├── Product A (SKU: ABC123) - Qty: 2 - $29.99 each
└── Product B (SKU: DEF456) - Qty: 1 - $19.99 each
```

### Processing Orders

#### Manual Order Creation
Create orders manually for phone or in-person sales:

1. **Navigate to Orders > Create New**
2. **Fill Customer Information**:
   ```
   Customer Name: John Doe
   Email: john@example.com (optional)
   Phone: +1-555-0123
   ```

3. **Add Shipping Address**:
   ```
   Street: 123 Main Street
   City: New York
   State/Province: NY
   Postal Code: 10001
   Country: United States
   ```

4. **Add Products**:
   - Search by SKU or product name
   - Set quantities and prices
   - Apply discounts if needed

5. **Review and Save**

#### Order Status Management

**Available Statuses**:
- `pending` - New order, awaiting processing
- `confirmed` - Order confirmed and ready for fulfillment
- `processing` - Order being prepared
- `shipped` - Order dispatched to customer
- `delivered` - Order received by customer
- `cancelled` - Order cancelled
- `returned` - Order returned by customer

**Updating Order Status**:
```javascript
// Status updates can be done via:
// 1. Individual order page
// 2. Bulk actions from order list
// 3. API integration
// 4. Platform synchronization
```

### Bulk Operations

Select multiple orders to perform bulk actions:

1. **Bulk Status Update**
   - Select orders with checkboxes
   - Choose "Update Status" from actions menu
   - Select new status and confirm

2. **Bulk Export**
   - Export selected orders to CSV
   - Choose export format and fields
   - Download generated file

3. **Bulk Label Generation**
   - Generate shipping labels for multiple orders
   - Select label template
   - Download combined PDF

## Product Management

### Product Catalog

#### Viewing Products
Access your product catalog through **Products > Catalog**:

- **Grid/List View**: Toggle between visual and detailed views
- **Categories**: Filter by product categories
- **Platforms**: Filter by source platform
- **Stock Status**: View inventory levels

#### Product Details
Each product displays comprehensive information:

```
Product Information:
├── Name: Premium Wireless Headphones
├── SKU: WH-PREM-001
├── Barcode: 1234567890123
├── Category: Electronics > Audio
├── Price: $99.99
├── Stock: 45 units
└── Platforms: Trendyol, Hepsiburada

Intelligence Data:
├── Classification: SKU (Confidence: 92%)
├── Variant Group: WH-PREM (3 variants detected)
├── Main Product: Yes
└── Last Updated: 2025-08-12 10:30:00
```

### Intelligent Product Classification

The platform automatically classifies product identifiers to distinguish between SKUs and barcodes:

#### Understanding Classifications

**SKU Classification**:
```
Example: "ABC123-RED-L"
├── Type: SKU
├── Confidence: 89%
├── Reasoning: "Alphanumeric pattern with variant indicators"
└── Recommended Use: Inventory tracking, variant grouping
```

**Barcode Classification**:
```
Example: "1234567890123"
├── Type: Barcode (EAN-13)
├── Confidence: 98%
├── Reasoning: "13-digit numeric pattern matching EAN-13 standard"
└── Recommended Use: Point-of-sale scanning, product lookup
```

#### Manual Classification Override

1. **Access Product Details**
2. **Click "Edit Classification"**
3. **Choose Correct Type**:
   - SKU: For internal product codes
   - Barcode: For standardized product codes
4. **Provide Reasoning** (optional)
5. **Save Changes**

The system learns from your corrections to improve future classifications.

### Variant Detection

The platform automatically detects product variants based on SKU patterns and product names:

#### Viewing Variant Groups
Navigate to **Products > Variants** to see detected groups:

```
Variant Group: T-SHIRT-BASIC
├── Base Product: Basic T-Shirt
├── Total Variants: 6
├── Attributes: Color, Size
└── Variants:
    ├── T-SHIRT-BASIC-RED-S (Red, Small)
    ├── T-SHIRT-BASIC-RED-M (Red, Medium)
    ├── T-SHIRT-BASIC-RED-L (Red, Large)
    ├── T-SHIRT-BASIC-BLU-S (Blue, Small)
    ├── T-SHIRT-BASIC-BLU-M (Blue, Medium)
    └── T-SHIRT-BASIC-BLU-L (Blue, Large)
```

#### Managing Variants

1. **Create Variant Group**
   - Select related products
   - Choose "Create Variant Group"
   - Define base product and attributes

2. **Edit Variant Relationships**
   - Modify variant attributes
   - Add or remove products from group
   - Set variant hierarchy

3. **Inventory Management**
   - View total stock across variants
   - Set reorder points by variant
   - Track sales by attribute

### Product Import/Export

#### CSV Import
Import products from CSV files:

1. **Navigate to Products > Import**
2. **Download Template**:
   ```csv
   SKU,Name,Description,Price,Stock,Category,Barcode,Weight
   ABC123,Product Name,Description,29.99,100,Electronics,1234567890123,0.5
   ```
3. **Upload Your File**
4. **Map Columns** (if different from template)
5. **Review and Confirm Import**

#### Export Options
Export your product data:

- **Full Catalog**: All products with complete data
- **Filtered Export**: Based on current filters
- **Classified Data**: Include AI classification results
- **Variant Groups**: Export with variant relationships

## Platform Connections

### Setting Up Connections

#### Adding a New Platform

1. **Navigate to Settings > Platform Connections**
2. **Click "Add New Connection"**
3. **Select Platform Type**:
   - Trendyol
   - Hepsiburada
   - N11
   - CSV Import

4. **Enter Credentials**:
   ```
   Connection Name: My Trendyol Store
   API Key: your_api_key
   API Secret: your_api_secret
   Seller ID: your_seller_id
   ```

5. **Configure Sync Settings**:
   ```
   Sync Frequency: Hourly
   Auto Accept Orders: No
   Sync Products: Yes
   Sync Inventory: Yes
   Webhook URL: https://your-domain.com/webhooks/trendyol
   ```

6. **Test Connection** and **Save**

#### Managing Existing Connections

**Connection Status Indicators**:
- **Active**: Connection working normally
- **Warning**: Minor issues detected
- **Error**: Connection failed
- **Disabled**: Connection turned off

**Connection Actions**:
- **Test**: Verify connectivity and credentials
- **Sync Now**: Trigger immediate synchronization
- **View Logs**: Check recent activity and errors
- **Edit**: Modify settings and credentials
- **Disable/Enable**: Turn connection on/off

### Synchronization Management

#### Manual Synchronization

**Sync Orders**:
1. Select platform connection
2. Click "Sync Orders"
3. Choose date range
4. Monitor progress in real-time

**Sync Products**:
1. Select platform connection
2. Click "Sync Products"
3. Choose sync direction:
   - Import from platform
   - Export to platform
   - Bidirectional sync

#### Automatic Synchronization

**Scheduled Sync**:
- Set up recurring synchronization
- Choose frequency (hourly, daily, weekly)
- Configure retry logic for failures

**Webhook Integration**:
- Real-time updates from platforms
- Immediate order notifications
- Instant inventory updates

#### Monitoring Sync Progress

**Real-time Progress Tracking**:
```
Trendyol Sync Progress:
├── Status: In Progress
├── Progress: 75% (750/1000 orders)
├── Current Period: 2025-07
├── Elapsed Time: 2m 30s
├── Estimated Remaining: 50s
└── Errors: 0
```

**Sync History**:
- View past synchronization sessions
- Analyze performance metrics
- Identify recurring issues

## Shipping Management

### Label Generation

#### Creating Shipping Labels

1. **From Order Details**:
   - Open any order
   - Click "Generate Shipping Label"
   - Select template and carrier
   - Download PDF label

2. **Bulk Label Generation**:
   - Select multiple orders
   - Choose "Generate Labels" from bulk actions
   - Configure label settings
   - Download combined PDF

#### Label Templates

**Available Templates**:
- **Standard 4x6**: Most common shipping label size
- **International A4**: For international shipments
- **Custom Size**: Configure your own dimensions

**Template Features**:
- Multi-language support
- QR codes and barcodes
- Custom logo placement
- Address validation
- Return address inclusion

#### Advanced Text Processing

The platform handles complex text requirements:

**Multi-language Support**:
```
Supported Scripts:
├── Latin (English, French, German, Spanish, etc.)
├── Arabic (Arabic, Persian, Urdu)
├── Cyrillic (Russian, Bulgarian, Serbian)
├── Greek
├── Turkish
└── Mixed scripts in single label
```

**Bidirectional Text Handling**:
- Automatic detection of RTL languages
- Proper text alignment
- Mixed LTR/RTL text support

### Carrier Integration

#### Supported Carriers

Configure shipping carriers in **Settings > Shipping**:

**Carrier Configuration Example**:
```
Carrier: UPS
├── Name: UPS Ground
├── API Endpoint: https://api.ups.com
├── Account Number: 123456
├── Access Key: your_access_key
├── Username: your_username
├── Password: your_password
└── Services:
    ├── Ground
    ├── Express
    └── International
```

#### Rate Calculation

**Get Shipping Rates**:
1. Enter package dimensions and weight
2. Specify origin and destination
3. Select service type
4. Compare rates across carriers

**Rate Comparison Example**:
```
Shipping Options for Order #12345:
├── UPS Ground: $8.50 (3-5 business days)
├── FedEx Ground: $9.25 (3-5 business days)
├── USPS Priority: $7.75 (2-3 business days)
└── Local Courier: $12.00 (Same day)
```

### Package Tracking

#### Tracking Integration

**Automatic Tracking Updates**:
- Carrier webhooks provide real-time updates
- Customer notifications sent automatically
- Order status updated based on tracking events

**Manual Tracking Entry**:
1. Open order details
2. Click "Add Tracking Information"
3. Enter tracking number and carrier
4. Save to enable tracking

#### Customer Communication

**Automated Notifications**:
```
Email Templates:
├── Order Confirmation
├── Shipping Notification
├── Tracking Information
├── Delivery Confirmation
└── Return Instructions
```

## Analytics & Reporting

### Dashboard Analytics

#### Key Performance Indicators

**Sales Metrics**:
- Total revenue by period
- Average order value
- Orders per day/week/month
- Growth rates and trends

**Product Performance**:
- Best-selling products
- Category performance
- Inventory turnover
- Variant analysis

**Platform Analysis**:
- Revenue by platform
- Order volume comparison
- Platform growth rates
- Sync efficiency metrics

#### Custom Date Ranges

Select custom time periods for analysis:
- Last 7 days
- Last 30 days
- Last 90 days
- Custom date range
- Year-over-year comparison

### Advanced Reports

#### Order Reports

**Order Summary Report**:
```
Orders Summary (Last 30 Days):
├── Total Orders: 1,247
├── Total Revenue: $52,340.50
├── Average Order Value: $41.98
├── Platform Breakdown:
│   ├── Trendyol: 687 orders ($28,920.30)
│   ├── Hepsiburada: 425 orders ($18,760.80)
│   └── N11: 135 orders ($4,659.40)
└── Status Distribution:
    ├── Delivered: 1,180 (94.6%)
    ├── Shipped: 45 (3.6%)
    ├── Processing: 15 (1.2%)
    └── Cancelled: 7 (0.6%)
```

**Detailed Order Export**:
- Export with custom date ranges
- Include customer information
- Add product details
- Filter by platform or status

#### Product Reports

**Product Performance Report**:
```
Top Products (Last 30 Days):
├── Wireless Headphones (SKU: WH001): 156 sold, $15,444 revenue
├── Bluetooth Speaker (SKU: BS002): 134 sold, $8,040 revenue
├── Phone Case (SKU: PC003): 289 sold, $4,335 revenue
└── USB Cable (SKU: UC004): 445 sold, $2,225 revenue

Classification Accuracy:
├── Total Products Processed: 2,847
├── SKU Classifications: 1,923 (67.5%)
├── Barcode Classifications: 924 (32.5%)
└── Average Confidence: 91.2%
```

#### Platform Reports

**Platform Performance Analysis**:
- Sync success rates
- API response times
- Error frequencies
- Data quality metrics

### Exporting Data

#### Export Formats

**Available Formats**:
- CSV: For spreadsheet analysis
- PDF: For formal reports
- JSON: For system integration
- Excel: For advanced analysis

**Export Options**:
```
Export Configuration:
├── Date Range: Custom selection
├── Platforms: All or specific
├── Include Fields:
│   ├── Order details
│   ├── Customer information
│   ├── Product classifications
│   └── Sync metadata
└── File Format: CSV/PDF/Excel
```

## Settings & Configuration

### User Profile

#### Account Information
Update your profile through **Settings > Profile**:

```
Profile Information:
├── Name: John Doe
├── Email: john@example.com
├── Phone: +1-555-0123
├── Company: Example Store
├── Time Zone: America/New_York
└── Language: English
```

#### Security Settings

**Password Management**:
- Change password
- Enable two-factor authentication
- Review login sessions
- Set session timeout

**API Access**:
- Generate API keys
- Manage webhook endpoints
- Configure rate limits
- View API usage

### System Configuration

#### General Settings

**Business Information**:
```
Business Details:
├── Company Name: Your Company
├── Address: 123 Business St
├── Tax ID: 12-3456789
├── Phone: +1-555-0123
└── Website: https://yourstore.com
```

**Regional Settings**:
- Default currency
- Tax calculation rules
- Date/time formats
- Measurement units

#### Platform Settings

**Default Sync Configuration**:
```
Sync Preferences:
├── Default Frequency: Hourly
├── Retry Attempts: 3
├── Batch Size: 100 orders
├── Error Threshold: 5%
└── Notification Settings:
    ├── Email on errors: Yes
    ├── SMS for critical issues: No
    └── Webhook notifications: Yes
```

### Notification Preferences

#### Email Notifications

Configure email alerts for:
- New orders received
- Sync errors or failures
- Low inventory warnings
- System maintenance notifications

#### Real-time Notifications

**In-app Notifications**:
- Order status updates
- Sync progress
- Error alerts
- System messages

**WebSocket Notifications**:
- Real-time order updates
- Live sync progress
- Instant error reporting

## Advanced Features

### Webhook Integration

#### Setting Up Webhooks

**Webhook Configuration**:
```json
{
  "url": "https://your-domain.com/webhooks/pazar",
  "events": [
    "order.created",
    "order.updated", 
    "product.classified",
    "sync.completed"
  ],
  "secret": "your_webhook_secret",
  "active": true
}
```

**Webhook Events**:
- `order.created`: New order received
- `order.updated`: Order status changed
- `product.classified`: Product classification completed
- `sync.started`: Platform sync initiated
- `sync.completed`: Platform sync finished
- `error.occurred`: System error detected

#### Webhook Security

**Signature Verification**:
```javascript
// Verify webhook signatures
const crypto = require('crypto');

const verifyWebhook = (payload, signature, secret) => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  return signature === `sha256=${expectedSignature}`;
};
```

### API Integration

#### Using the REST API

**Authentication**:
```javascript
// Get access token
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'your@email.com',
    password: 'your_password'
  })
});

const { token } = await response.json();

// Use token for subsequent requests
const orders = await fetch('/api/orders', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**Common API Operations**:
```javascript
// Classify products
const classification = await fetch('/api/products/classify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    products: [{ sku: 'ABC123', name: 'Product Name' }]
  })
});

// Get order analytics
const analytics = await fetch('/api/analytics/dashboard?timeframe=30d', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Custom Workflows

#### Automation Rules

Create custom automation rules in **Settings > Automation**:

**Order Processing Rules**:
```
Rule: Auto-approve small orders
├── Trigger: New order created
├── Conditions:
│   ├── Order value < $50
│   ├── Customer has previous orders
│   └── Payment verified
└── Actions:
    ├── Set status to "confirmed"
    ├── Generate shipping label
    └── Send confirmation email
```

**Inventory Rules**:
```
Rule: Low stock alert
├── Trigger: Stock level changed
├── Conditions:
│   └── Stock quantity < reorder point
└── Actions:
    ├── Send email notification
    ├── Create reorder task
    └── Update product status
```

#### Custom Fields

Add custom fields to orders and products:

**Order Custom Fields**:
- Gift message
- Special instructions
- Internal notes
- Customer preferences

**Product Custom Fields**:
- Supplier information
- Warranty details
- Seasonal flags
- Custom categories

## Troubleshooting

### Common Issues

#### Login Problems

**Forgot Password**:
1. Click "Forgot Password" on login page
2. Enter your email address
3. Check email for reset link
4. Create new password

**Account Locked**:
- Contact support if account is locked
- Provide account email and reason for lockout
- Follow security verification process

#### Sync Issues

**Platform Connection Failed**:
1. **Check Credentials**:
   - Verify API keys are correct
   - Ensure credentials haven't expired
   - Test connection in platform settings

2. **Review Error Logs**:
   - Navigate to platform connection
   - Click "View Logs"
   - Look for specific error messages

3. **Common Solutions**:
   - Refresh API credentials
   - Check platform API status
   - Verify webhook URLs
   - Review rate limiting settings

#### Classification Problems

**Incorrect Product Classification**:
1. **Manual Override**:
   - Open product details
   - Click "Edit Classification"
   - Select correct type
   - Provide feedback

2. **Bulk Corrections**:
   - Use bulk edit tool
   - Select affected products
   - Apply correct classification
   - Train system with feedback

### Getting Help

#### Documentation Resources

- **API Reference**: Complete API documentation
- **Platform Integration Guide**: Platform-specific setup
- **Video Tutorials**: Step-by-step walkthroughs
- **FAQ**: Frequently asked questions

#### Diagnostic Tools

**Built-in Diagnostics**:
1. **Connection Test**: Test platform connectivity
2. **Sync Status**: Review synchronization health
3. **System Health**: Check overall system status
4. **Performance Monitor**: Analyze response times

**Log Analysis**:
- Download diagnostic logs
- Search error patterns
- Review sync performance
- Analyze API usage

---

For the most current information and updates, always refer to the latest version of this guide and the platform's built-in help system.
