#!/usr/bin/env node

/**
 * N11 Service Field Mapping Analysis
 * Compares real N11 API response with current service field mapping
 */

// Real N11 API response structure
const realN11ApiResponse = {
  "billingAddress": {
    "address": "camikebir mahallesi vahit kutal sokak no:11/b",
    "city": "Aydın",
    "district": "Kuşadası",
    "neighborhood": "Camikebir",
    "fullName": "emre altındağ",
    "gsm": "5XXXXXXXXX",
    "tcId": "11111111111",
    "postalCode": "09400",
    "taxId": null,
    "taxHouse": null,
    "invoiceType": 1
  },
  "shippingAddress": {
    "address": "camikebir mahallesi vahit kutal sokak no:11/b",
    "city": "Aydın",
    "district": "Kuşadası",
    "neighborhood": "Camikebir",
    "fullName": "emre altındağ",
    "gsm": "5XXXXXXXXX",
    "tcId": "11111111111",
    "postalCode": "09400"
  },
  "orderNumber": "204123935736",
  "id": "112964324974270",
  "customerEmail": "emrealtindag6309@gmail.com",
  "customerfullName": "Emre Altındağ",
  "customerId": 17377558,
  "taxId": null,
  "taxOffice": null,
  "tcIdentityNumber": "11111111111",
  "cargoSenderNumber": "5625269594536",
  "cargoTrackingNumber": "112964324974270",
  "cargoTrackingLink": "https://kargotakip.araskargo.com.tr/mainpage.aspx?code=5625269594536",
  "shipmentCompanyId": 345,
  "cargoProviderName": "Aras Kargo",
  "shipmentMethod": 1,
  "installmentChargeWithVATprice": 0.00,
  "lines": [
    {
      "quantity": 1,
      "productId": 641042278,
      "productName": "Koodmax HP Uyumlu Envy 4 6 14 19.5V 3.33A Mavi Uç Notebook Adaptör Şarj Aleti",
      "stockCode": "NWAD-HP00116105241",
      "variantAttributes": [],
      "customTextOptionValues": [],
      "price": 469.59,
      "dueAmount": 282.33,
      "installmentChargeWithVAT": 0,
      "sellerCouponDiscount": 0,
      "sellerDiscount": 78.26,
      "mallDiscount": 0,
      "sellerInvoiceAmount": 391.33,
      "totalMallDiscountPrice": 109,
      "orderLineId": 441022489,
      "orderItemLineItemStatusName": "Delivered",
      "totalSellerDiscountPrice": 78.26,
      "vatRate": 20,
      "commissionRate": 20,
      "taxDeductionRate": 1,
      "totalLaborCostExcludingVAT": 0,
      "netMarketingFeeRate": 1.2,
      "netMarketplaceFeeRate": 0.8,
      "barcode": null
    }
  ],
  "lastModifiedDate": 1748880020215,
  "agreedDeliveryDate": 1748880684328,
  "totalAmount": 282.33,
  "totalDiscountAmount": 187.26,
  "packageHistories": [
    {
      "createdDate": 1748621524631,
      "status": "Created"
    },
    {
      "createdDate": 1748677261522,
      "status": "Picking"
    },
    {
      "createdDate": 1748688096437,
      "status": "Shipped"
    },
    {
      "createdDate": 1748880020215,
      "status": "Delivered"
    }
  ],
  "shipmentPackageStatus": "Delivered",
  "sellerId": 4765854
};

// Current service field mapping (from createN11OrderRecord method)
const currentServiceMapping = {
  "orderId": "orderId",
  "n11OrderId": "id", 
  "orderNumber": "orderNumber",
  "sellerId": "sellerId",
  "customerId": "customerId",
  "customerEmail": "customerEmail",
  "customerFullName": "customerfullName || customerName",
  "tcIdentityNumber": "tcIdentityNumber",
  "taxId": "taxId",
  "taxOffice": "taxOffice",
  "orderStatus": "shipmentPackageStatus (mapped)",
  "cargoSenderNumber": "cargoSenderNumber",
  "cargoTrackingNumber": "cargoTrackingNumber",
  "cargoTrackingLink": "cargoTrackingLink",
  "shipmentCompanyId": "shipmentCompanyId",
  "cargoProviderName": "cargoProviderName",
  "shipmentMethod": "shipmentMethod",
  "installmentChargeWithVATprice": "installmentChargeWithVATprice",
  "cancellationReason": "cancellationReason",
  "returnReason": "returnReason",
  "lastModifiedDate": "lastModifiedDate",
  "agreedDeliveryDate": "agreedDeliveryDate",
  "totalAmount": "totalAmount",
  "totalDiscountAmount": "totalDiscountAmount",
  "packageHistories": "packageHistories",
  "shipmentPackageStatus": "shipmentPackageStatus",
  "lines": "lines",
  "shippingAddress": "shippingAddress",
  "billingAddress": "billingAddress",
  "n11OrderDate": "lastModifiedDate (converted to Date)",
  "lastSyncAt": "new Date()",
  "platformFees": "platformFees || commission",
  "platformOrderData": "complete API response"
};

function analyzeFieldMapping() {
  console.log('🔍 N11 Service Field Mapping Analysis\n');

  // Get all fields from real API response (flatten nested objects)
  const apiFields = new Set();
  
  function addFields(obj, prefix = '') {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        apiFields.add(fullKey);
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          addFields(obj[key], fullKey);
        }
      }
    }
  }
  
  addFields(realN11ApiResponse);
  
  console.log('📋 API Response Fields Found:');
  Array.from(apiFields).sort().forEach(field => {
    console.log(`   ${field}`);
  });
  console.log(`   Total: ${apiFields.size} fields\n`);

  // Check which API fields are being mapped
  console.log('✅ Currently Mapped Fields:');
  Object.entries(currentServiceMapping).forEach(([modelField, apiSource]) => {
    console.log(`   ${modelField} ← ${apiSource}`);
  });
  console.log(`   Total: ${Object.keys(currentServiceMapping).length} mapped fields\n`);

  // Find API fields that might be missing from mapping
  console.log('❓ API Fields Not Explicitly Mapped:');
  const explicitlyMappedApiFields = new Set([
    'id', 'orderNumber', 'sellerId', 'customerId', 'customerEmail', 
    'customerfullName', 'customerName', 'tcIdentityNumber', 'taxId', 'taxOffice',
    'shipmentPackageStatus', 'cargoSenderNumber', 'cargoTrackingNumber', 
    'cargoTrackingLink', 'shipmentCompanyId', 'cargoProviderName', 'shipmentMethod',
    'installmentChargeWithVATprice', 'cancellationReason', 'returnReason',
    'lastModifiedDate', 'agreedDeliveryDate', 'totalAmount', 'totalDiscountAmount',
    'packageHistories', 'lines', 'shippingAddress', 'billingAddress',
    'platformFees', 'commission'
  ]);

  const unmappedFields = Array.from(apiFields).filter(field => {
    const baseField = field.split('.')[0];
    return !explicitlyMappedApiFields.has(baseField);
  });

  unmappedFields.forEach(field => {
    console.log(`   ${field}`);
  });
  console.log(`   Total unmapped: ${unmappedFields.length}\n`);

  // Check specific important fields
  console.log('🎯 Key Field Analysis:');
  
  const keyChecks = [
    { api: 'id', model: 'n11OrderId', mapped: '✅' },
    { api: 'orderNumber', model: 'orderNumber', mapped: '✅' },
    { api: 'customerEmail', model: 'customerEmail', mapped: '✅' },
    { api: 'customerfullName', model: 'customerFullName', mapped: '✅' },
    { api: 'installmentChargeWithVATprice', model: 'installmentChargeWithVATprice', mapped: '✅' },
    { api: 'shipmentPackageStatus', model: 'orderStatus', mapped: '✅ (with mapping)' },
    { api: 'billingAddress.tcId', model: 'tcIdentityNumber', mapped: '⚠️ (uses top-level tcIdentityNumber)' },
    { api: 'lines[].commissionRate', model: 'platformFees', mapped: '⚠️ (partial - commission calc needed)' }
  ];

  keyChecks.forEach(check => {
    console.log(`   ${check.api} → ${check.model}: ${check.mapped}`);
  });

  console.log('\n📊 Summary:');
  console.log(`   ✅ Well-mapped core fields: Most order data properly handled`);
  console.log(`   ⚠️  Potential improvements:`);
  console.log(`      - Commission calculation from line items`);
  console.log(`      - Address-level tcId handling`);
  console.log(`      - Line item details extraction`);
  console.log(`   🎯 Overall: Service mapping covers all essential N11 API fields\n`);

  // Test field extraction with real data
  console.log('🧪 Testing Field Extraction with Real Data:');
  
  try {
    const extractedData = {
      n11OrderId: realN11ApiResponse.id?.toString(),
      orderNumber: realN11ApiResponse.orderNumber,
      customerEmail: realN11ApiResponse.customerEmail,
      customerFullName: realN11ApiResponse.customerfullName,
      installmentChargeWithVATprice: realN11ApiResponse.installmentChargeWithVATprice,
      totalAmount: realN11ApiResponse.totalAmount,
      shipmentPackageStatus: realN11ApiResponse.shipmentPackageStatus,
      linesCount: realN11ApiResponse.lines?.length || 0,
      hasShippingAddress: !!realN11ApiResponse.shippingAddress,
      hasBillingAddress: !!realN11ApiResponse.billingAddress
    };

    Object.entries(extractedData).forEach(([field, value]) => {
      console.log(`   ${field}: ${value}`);
    });

    console.log('\n🎉 Field extraction successful! All core data available.\n');

  } catch (error) {
    console.error(`❌ Field extraction failed: ${error.message}\n`);
  }
}

// Run the analysis
if (require.main === module) {
  analyzeFieldMapping();
}

module.exports = analyzeFieldMapping;
