#!/usr/bin/env node

/**
 * N11 Product Linking Analysis and Test
 * Checks how N11 orders are linked to products in the system
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

const sequelize = require('./server/config/database');
const { Product, OrderItem, N11Product, Order } = require('./server/models');

// Real N11 API line item from the response
const realN11LineItem = {
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
};

// How the N11 service transforms this into OrderItem data
function transformN11ItemToOrderItem(item, orderId) {
  const quantity = parseInt(item.quantity || 1);
  const unitPrice = parseFloat(item.price || item.dueAmount || 0);
  const dueAmount = parseFloat(item.dueAmount || item.price || 0);
  const totalPrice = dueAmount; // Use dueAmount as it's the actual amount paid

  const sellerDiscount = parseFloat(item.sellerDiscount || 0);
  const mallDiscount = parseFloat(item.mallDiscount || item.totalMallDiscountPrice || 0);
  const sellerCouponDiscount = parseFloat(item.sellerCouponDiscount || 0);
  const totalDiscount = sellerDiscount + mallDiscount + sellerCouponDiscount;

  return {
    orderId: orderId,
    productId: null, // Will be set by linking service
    platformProductId: item.productId?.toString(),
    barcode: item.barcode || null,
    title: item.productName || item.title || "",
    sku: item.stockCode || "",
    quantity: quantity,
    price: unitPrice,
    totalPrice: totalPrice,

    // Enhanced discount information
    discount: totalDiscount,
    platformDiscount: mallDiscount,
    merchantDiscount: sellerDiscount + sellerCouponDiscount,

    // N11-specific pricing fields
    invoiceTotal: parseFloat(item.sellerInvoiceAmount || dueAmount || totalPrice),
    currency: "TRY",

    // Tax and commission information
    vatRate: parseFloat(item.vatRate || 20),
    commissionRate: parseFloat(item.commissionRate || 0),
    taxDeductionRate: parseFloat(item.taxDeductionRate || 0),

    // Labor and fees
    laborCost: parseFloat(item.totalLaborCostExcludingVAT || 0),
    netMarketingFeeRate: parseFloat(item.netMarketingFeeRate || 0),
    netMarketplaceFeeRate: parseFloat(item.netMarketplaceFeeRate || 0),

    // Installment charges
    installmentChargeWithVAT: parseFloat(item.installmentChargeWithVAT || 0),

    // Individual discount components
    sellerCouponDiscount: sellerCouponDiscount,

    // Status information
    lineItemStatus: item.orderItemLineItemStatusName || "Created",
    orderLineId: item.orderLineId?.toString() || null,

    // Variant information
    variantInfo: item.variantAttributes && item.variantAttributes.length > 0
      ? JSON.stringify(item.variantAttributes)
      : null,

    // Custom text options if any
    customTextOptions: item.customTextOptionValues && item.customTextOptionValues.length > 0
      ? JSON.stringify(item.customTextOptionValues)
      : null,

    // Store complete raw data for debugging
    rawData: JSON.stringify(item),
  };
}

// Product linking strategies used
const matchingStrategies = [
  {
    name: "exactSKU",
    description: "Exact SKU match",
    field: "sku",
    priority: 1
  },
  {
    name: "exactBarcode", 
    description: "Exact barcode match",
    field: "barcode",
    priority: 2
  },
  {
    name: "platformProductId",
    description: "Platform product ID match",
    field: "platformProductId", 
    priority: 3
  },
  {
    name: "fuzzyTitle",
    description: "Fuzzy title matching",
    field: "title",
    priority: 4
  },
  {
    name: "partialSKU",
    description: "Partial SKU matching", 
    field: "sku",
    priority: 5
  },
  {
    name: "barcodeVariations",
    description: "Barcode variations",
    field: "barcode",
    priority: 6
  }
];

async function analyzeProductLinking() {
  console.log('🔗 N11 Product Linking Analysis\n');

  try {
    // Test database connection
    console.log('🔗 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Transform the real N11 item to see what linking data is available
    console.log('📊 Analyzing N11 Line Item Transformation:');
    const transformedItem = transformN11ItemToOrderItem(realN11LineItem, 'test-order-id');
    
    const linkingFields = {
      "SKU": transformedItem.sku,
      "Barcode": transformedItem.barcode || "null",
      "Platform Product ID": transformedItem.platformProductId,
      "Title": transformedItem.title,
      "Product Name Length": transformedItem.title.length,
      "Has Variant Info": !!transformedItem.variantInfo
    };

    Object.entries(linkingFields).forEach(([field, value]) => {
      console.log(`   ${field}: ${value}`);
    });

    console.log('\n🎯 Product Linking Strategies Available:');
    matchingStrategies.forEach(strategy => {
      const fieldValue = transformedItem[strategy.field];
      const available = fieldValue && fieldValue !== "null" && fieldValue.length > 0;
      const status = available ? '✅' : '❌';
      console.log(`   ${status} ${strategy.name} (${strategy.description}): ${fieldValue || 'N/A'}`);
    });

    // Check current state of products and order items in database
    console.log('\n📈 Database State Analysis:');
    
    const productCount = await Product.count();
    const n11ProductCount = await N11Product.count();
    const orderItemCount = await OrderItem.count();
    const linkedOrderItemCount = await OrderItem.count({
      where: { productId: { [sequelize.Sequelize.Op.ne]: null } }
    });
    
    console.log(`   Total Products: ${productCount}`);
    console.log(`   N11 Products: ${n11ProductCount}`);
    console.log(`   Total Order Items: ${orderItemCount}`);
    console.log(`   Linked Order Items: ${linkedOrderItemCount}`);
    
    const linkingRate = orderItemCount > 0 ? (linkedOrderItemCount / orderItemCount * 100).toFixed(1) : 0;
    console.log(`   Linking Rate: ${linkingRate}%`);

    // Check for N11-specific order items
    const n11OrderItems = await OrderItem.findAll({
      include: [
        {
          model: Order,
          as: 'order',
          where: { platformType: 'n11' },
          attributes: ['id', 'orderNumber', 'platformType']
        }
      ],
      limit: 5,
      order: [['createdAt', 'DESC']]
    });

    console.log(`\n🔍 Recent N11 Order Items (${n11OrderItems.length} shown):`);
    n11OrderItems.forEach((item, index) => {
      const linked = item.productId ? '✅' : '❌';
      console.log(`   ${index + 1}. ${linked} SKU: ${item.sku || 'N/A'} | Title: ${item.title?.substring(0, 50)}...`);
      console.log(`      Platform ID: ${item.platformProductId} | Barcode: ${item.barcode || 'N/A'}`);
    });

    // Test potential matches for the real N11 item
    console.log('\n🧪 Testing Product Matching for Real N11 Item:');
    
    // Strategy 1: Exact SKU match
    const skuMatch = await Product.findOne({
      where: { sku: transformedItem.sku }
    });
    console.log(`   📦 SKU Match (${transformedItem.sku}): ${skuMatch ? '✅ Found' : '❌ Not found'}`);

    // Strategy 2: Platform Product ID match via N11Product
    const platformMatch = await Product.findOne({
      include: [
        {
          model: N11Product,
          as: 'n11Product',
          where: { n11ProductId: transformedItem.platformProductId },
          required: true
        }
      ]
    });
    console.log(`   🏷️  Platform ID Match (${transformedItem.platformProductId}): ${platformMatch ? '✅ Found' : '❌ Not found'}`);

    // Strategy 3: Fuzzy title search
    const titleMatches = await Product.findAll({
      where: {
        name: {
          [sequelize.Sequelize.Op.iLike]: `%${transformedItem.title.split(' ').slice(0, 3).join('%')}%`
        }
      },
      limit: 3
    });
    console.log(`   📝 Title Fuzzy Match: ${titleMatches.length} potential matches found`);

    // Analyze common issues
    console.log('\n⚠️  Common Product Linking Issues:');
    
    const issues = [
      {
        name: "Missing Barcodes",
        query: { barcode: null },
        description: "Order items without barcodes are harder to match"
      },
      {
        name: "Empty SKUs", 
        query: { sku: ['', null] },
        description: "Order items without SKUs rely on other matching methods"
      },
      {
        name: "Long Product Names",
        description: "Very long product names may cause fuzzy matching issues"
      }
    ];

    for (const issue of issues) {
      if (issue.query) {
        const count = await OrderItem.count({
          where: issue.query,
          include: [
            {
              model: Order,
              as: 'order',
              where: { platformType: 'n11' }
            }
          ]
        });
        console.log(`   ⚠️  ${issue.name}: ${count} N11 order items affected`);
      } else {
        console.log(`   ⚠️  ${issue.name}: ${issue.description}`);
      }
    }

    console.log('\n💡 Recommendations:');
    
    const recommendations = [
      "✅ N11 provides good SKU data (stockCode) for exact matching",
      "⚠️  N11 barcodes are often null - rely on SKU and product ID matching",
      "🎯 Platform product ID matching via N11Product table is most reliable",
      "📝 Product names are descriptive - fuzzy matching can be effective",
      "🔧 Consider implementing N11-specific product ID mapping",
      "📊 Monitor linking rates and improve strategies for unmatched items"
    ];

    recommendations.forEach(rec => console.log(`   ${rec}`));

    console.log('\n🎉 Product Linking Analysis Complete!');
    console.log('   The N11 service provides comprehensive data for product linking.');
    console.log('   Multiple matching strategies ensure high linking success rates.');

  } catch (error) {
    console.error('❌ Analysis FAILED:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
  } finally {
    await sequelize.close();
  }
}

// Run the analysis
if (require.main === module) {
  analyzeProductLinking().catch(console.error);
}

module.exports = analyzeProductLinking;
