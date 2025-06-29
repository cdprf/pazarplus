# QNB Finans E-Solutions Integration Guide

## Overview

This document provides a comprehensive guide for integrating QNB Finans e-solutions API for e-invoice (e-fatura) and e-archive (e-arşiv) functionality into the Pazar+ e-commerce platform.

## Features Implemented

### ✅ Backend Services
- **QNB Finans Service** (`/server/services/qnbFinansService.js`)
  - E-invoice generation for corporate customers
  - E-archive generation for individual customers
  - Invoice status checking
  - Invoice cancellation
  - Connection testing
  
- **QNB Finans Controller** (`/server/controllers/qnbFinansInvoiceController.js`)
  - RESTful API endpoints for invoice operations
  - Order-based invoice generation
  - Error handling and logging

### ✅ Frontend Components
- **Invoice Settings Page** (`/client/src/components/settings/InvoiceSettings.jsx`)
  - QNB Finans API configuration
  - Connection testing
  - Company information management
  
- **Print Settings Integration** (`/client/src/components/settings/PrintSettings.jsx`)
  - QNB Finans options added to existing print settings
  
- **Order Actions Enhancement** (`/client/src/components/orders/OrderActions.jsx`)
  - Dropdown menu with multiple invoice options
  - QNB Finans e-invoice and e-archive generation
  - Automatic document type selection

### ✅ API Routes
- **Settings Routes** (`/server/modules/order-management/routes/settingsRoutes.js`)
  - `GET /settings/qnb-finans` - Get QNB Finans settings
  - `POST /settings/qnb-finans` - Save QNB Finans settings
  - `POST /settings/qnb-finans/test` - Test connection
  
- **QNB Finans Routes** (`/server/modules/order-management/routes/qnbFinansRoutes.js`)
  - `POST /qnb-finans/orders/:orderId/qnb-einvoice` - Generate e-invoice
  - `POST /qnb-finans/orders/:orderId/qnb-earsiv` - Generate e-archive
  - `GET /qnb-finans/invoices/:invoiceId/status` - Get invoice status
  - `POST /qnb-finans/invoices/:invoiceId/cancel` - Cancel invoice

### ✅ Frontend Services
- **QNB Finans Service** (`/client/src/services/qnbFinansService.js`)
  - API communication wrapper
  - Credential validation
  - Error message formatting
  - Automatic document type determination

## Configuration Required

### QNB Finans API Credentials
To use this integration, you need to obtain the following credentials from QNB Finans:

1. **API Key** - Your unique API access key
2. **Client ID** - Application identifier
3. **Client Secret** - Application secret key
4. **Environment** - `test` or `production`

### Settings Configuration
Navigate to **Settings > Invoice Settings** in the application to configure:

1. **Enable QNB Finans Integration**
2. **Set Environment** (Test/Production)
3. **Enter API Credentials**
4. **Configure Document Type**:
   - **Auto**: Automatically chooses e-invoice for companies, e-archive for individuals
   - **E-Invoice Only**: Forces e-invoice generation for all orders
   - **E-Archive Only**: Forces e-archive generation for all orders
5. **Enable Auto-Generation** (optional)

## Usage Instructions

### Manual Invoice Generation
1. Go to **Orders** page
2. Find the order you want to generate invoice for
3. Click the **Invoice Options** dropdown (📄 with arrow)
4. Choose from:
   - **Standard Invoice** - Local PDF generation
   - **QNB Finans (Auto)** - Automatic document type selection
   - **QNB E-Invoice** - Force e-invoice generation
   - **QNB E-Archive** - Force e-archive generation

### Automatic Invoice Generation
When enabled in settings, invoices will be automatically generated when orders are completed.

## API Endpoints Documentation

### Authentication
All QNB Finans API requests require authentication using Bearer token and client credentials.

### Generate E-Invoice
```http
POST /api/qnb-finans/orders/:orderId/qnb-einvoice
Authorization: Bearer {token}
```

### Generate E-Archive
```http
POST /api/qnb-finans/orders/:orderId/qnb-earsiv
Authorization: Bearer {token}
```

### Check Invoice Status
```http
GET /api/qnb-finans/invoices/:invoiceId/status
Authorization: Bearer {token}
```

### Cancel Invoice
```http
POST /api/qnb-finans/invoices/:invoiceId/cancel
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "Cancellation reason"
}
```

## Turkish E-Invoice/E-Archive Rules

### E-Invoice Requirements
- **Corporate customers** (VKN holders) must receive e-invoice
- **Individual customers** with orders over **5,000 TRY** must receive e-invoice
- Generated in **UBL-TR format** compliant with GIB standards

### E-Archive Requirements  
- **Individual customers** under the e-invoice threshold receive e-archive
- Simpler format compared to e-invoice
- Stored electronically for tax compliance

## Error Handling

### Common Error Scenarios
1. **Invalid Credentials**: Check API key, client ID, and secret
2. **Network Issues**: Verify QNB Finans API availability
3. **Missing Customer Information**: Ensure order has complete customer data
4. **Invalid Order Data**: Check order items and amounts

### Error Messages
The system provides user-friendly error messages in Turkish:
- "QNB Finans bağlantısı başarısız" - Connection failed
- "API anahtarı gereklidir" - API key required
- "Fatura oluşturulurken hata oluştu" - Error creating invoice

## Technical Implementation Details

### Document Type Auto-Selection Logic
```javascript
const determineDocumentType = (order, customerType) => {
  const E_INVOICE_THRESHOLD = 5000; // TRY
  
  if (customerType === 'company') {
    return 'einvoice';
  }
  
  const orderAmount = order.totalAmount || 0;
  if (orderAmount >= E_INVOICE_THRESHOLD) {
    return 'einvoice';
  }
  
  return 'earsiv';
};
```

### Database Integration
The system updates order records with invoice information:
- `invoicePrinted`: Boolean flag
- `invoicePrintedAt`: Timestamp
- `invoiceNumber`: Generated invoice/archive number
- `invoiceProvider`: 'qnb_finans' or 'qnb_finans_archive'
- `invoiceMetadata`: JSON with QNB response data

## Security Considerations

### Credential Storage
- API credentials are encrypted in the database
- Client secrets are never logged
- Connection testing doesn't store actual responses

### Data Protection
- Customer information is validated before transmission
- All API calls use HTTPS
- Sensitive data is not cached in the frontend

## Testing

### Connection Testing
Use the built-in connection test feature in Invoice Settings:
1. Enter your QNB Finans credentials
2. Click "Test Connection"
3. Verify successful authentication

### Invoice Generation Testing
1. Create test orders with different customer types
2. Test automatic document type selection
3. Verify PDF generation and download
4. Check invoice status updates

## QNB Finans API Documentation

> **Important**: This implementation is based on common Turkish e-invoice API patterns. 
> You must obtain the official QNB Finans API documentation to update:
> - Base URLs
> - Authentication methods
> - Request/response formats
> - Error codes

### Required Updates for Production

1. **Update Base URLs** in `/server/services/qnbFinansService.js`:
   ```javascript
   this.baseURL = "https://api.qnbfinans.com.tr/e-solutions/v1";
   this.testURL = "https://test-api.qnbfinans.com.tr/e-solutions/v1";
   ```

2. **Update Authentication Headers**:
   ```javascript
   headers: {
     'Content-Type': 'application/json',
     'Authorization': `Bearer ${config.apiKey}`,
     'X-Client-ID': config.clientId,
     'X-Client-Secret': config.clientSecret,
   }
   ```

3. **Update Request/Response Formats** based on official documentation

4. **Update Error Handling** for QNB-specific error codes

## Support and Maintenance

### Getting QNB Finans API Access
1. Contact QNB Finans business development
2. Apply for e-solutions API access
3. Obtain test environment credentials
4. Request production environment access after testing

### Monitoring and Logging
- All QNB Finans API calls are logged
- Error rates are tracked
- Connection status is monitored
- Invoice generation success rates are recorded

## Troubleshooting

### Common Issues

1. **"API credentials not configured"**
   - Solution: Configure QNB Finans settings in Invoice Settings page

2. **"Connection test failed"**
   - Check internet connectivity
   - Verify API credentials
   - Check QNB Finans service status

3. **"Invoice generation failed"**
   - Verify order has complete customer information
   - Check order total amount
   - Ensure customer type is correctly identified

4. **"PDF not opening"**
   - Check browser popup settings
   - Verify network connectivity
   - Check PDF URL accessibility

### Debug Mode
Enable debug logging by setting:
```javascript
const DEBUG_QNB_FINANS = process.env.NODE_ENV === 'development';
```

## Future Enhancements

### Planned Features
- [ ] Bulk invoice generation
- [ ] Invoice templates customization
- [ ] Advanced reporting and analytics
- [ ] Multi-company support
- [ ] Webhook integration for real-time status updates

### Integration Improvements
- [ ] QNB Finans webhook endpoints
- [ ] Real-time invoice status synchronization
- [ ] Advanced error recovery mechanisms
- [ ] Performance optimization for bulk operations

---

**Note**: This integration serves as a foundation for QNB Finans e-solutions. Update all placeholder URLs, authentication methods, and data formats according to the official QNB Finans API documentation once obtained.
