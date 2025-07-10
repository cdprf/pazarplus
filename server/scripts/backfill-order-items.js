#!/usr/bin/env node

/**
 * Script to backfill missing order items for existing orders
 * This addresses the issue where orders exist but have no associated order items,
 * causing "Ürün bilgisi mevcut değil" to appear in PDFs and order displays.
 */

const { Order, OrderItem, sequelize } = require('../models');
const logger = require('../utils/logger');

async function backfillOrderItems() {
  try {
    console.log('Starting order items backfill process...');

    // Find all orders that have no order items
    const ordersWithoutItems = await Order.findAll({
      include: [
        {
          model: OrderItem,
          as: 'items',
          required: false
        }
      ]
    });

    // Filter to only orders that actually have no items
    const ordersNeedingItems = ordersWithoutItems.filter(
      (order) => !order.items || order.items.length === 0
    );

    console.log(`Found ${ordersNeedingItems.length} orders without items`);

    if (ordersNeedingItems.length === 0) {
      console.log('No orders need backfilling. Exiting.');
      return;
    }

    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const order of ordersNeedingItems) {
      try {
        console.log(
          `Processing order ${order.orderNumber} (${order.platform})`
        );

        // Parse raw data to extract item information
        let rawData;
        try {
          rawData =
            typeof order.rawData === 'string'
              ? JSON.parse(order.rawData)
              : order.rawData;
        } catch (parseError) {
          console.warn(
            `Failed to parse rawData for order ${order.orderNumber}: ${parseError.message}`
          );
          skippedCount++;
          continue;
        }

        if (!rawData) {
          console.warn(`No rawData for order ${order.orderNumber}`);
          skippedCount++;
          continue;
        }

        // Extract items based on platform
        let items = [];

        if (order.platform === 'trendyol') {
          items = rawData.lines || [];
        } else if (order.platform === 'hepsiburada') {
          items = rawData.items || [];
        } else if (order.platform === 'n11') {
          items = rawData.orderItemList || [];
        }

        if (!items || items.length === 0) {
          console.warn(
            `No items found in rawData for order ${order.orderNumber}, creating fallback item`
          );

          // Create a fallback order item using order-level information
          await sequelize.transaction(async (t) => {
            const fallbackItem = {
              orderId: order.id,
              platformProductId: '',
              productId: null,
              title: order.orderNumber || 'Unknown Product',
              sku: '',
              barcode: '',
              quantity: 1,
              price: order.totalAmount || 0,
              totalPrice: order.totalAmount || 0,
              taxAmount: 0,
              discountAmount: 0,
              discount: 0,
              platformDiscount: 0,
              merchantDiscount: 0,
              invoiceTotal: order.totalAmount || 0,
              currency: order.currency || 'TRY',
              productSize: null,
              productColor: null,
              productCategoryId: null,
              productOrigin: null,
              salesCampaignId: null,
              lineItemStatus: null,
              vatBaseAmount: 0,
              laborCost: 0,
              fastDeliveryOptions: null,
              discountDetails: null,
              variantInfo: null,
              rawData: JSON.stringify({
                fallback: true,
                orderNumber: order.orderNumber
              })
            };

            await OrderItem.create(fallbackItem, { transaction: t });
          });

          processedCount++;
          console.log(`✓ Created fallback item for order ${order.orderNumber}`);
          continue;
        }

        // Create order items in a transaction
        await sequelize.transaction(async (t) => {
          for (const item of items) {
            let orderItemData;

            if (order.platform === 'trendyol') {
              const unitPrice = item.price || item.amount || 0;
              const quantity = item.quantity || 1;

              orderItemData = {
                orderId: order.id,
                platformProductId: item.merchantSku || item.sku || '',
                productId: null, // Will be linked later if needed
                title: item.productName || 'Unknown Product',
                sku: item.merchantSku || item.sku || '',
                quantity: quantity,
                price: unitPrice,
                totalPrice: unitPrice * quantity,
                discount: item.discount || 0,
                platformDiscount: item.tyDiscount || 0,
                merchantDiscount: item.discount || 0,
                invoiceTotal: item.amount || unitPrice * quantity,
                currency: item.currencyCode || order.currency || 'TRY',
                barcode: item.barcode || '',
                productSize: item.productSize || null,
                productCategoryId: item.productCategoryId || null,
                salesCampaignId: item.salesCampaignId || null,
                lineItemStatus: item.orderLineItemStatusName || null,
                vatBaseAmount: item.vatBaseAmount || 0,
                laborCost: 0,
                variantInfo: item.productSize
                  ? JSON.stringify({ size: item.productSize })
                  : null,
                rawData: JSON.stringify(item)
              };
            } else if (order.platform === 'hepsiburada') {
              const unitPrice = item.price?.amount || 0;
              const quantity = item.quantity || 1;

              orderItemData = {
                orderId: order.id,
                platformProductId:
                  item.productBarcode || item.merchantSku || '',
                productId: null,
                title: item.productName || item.title || 'Unknown Product',
                sku: item.merchantSku || item.sku || '',
                quantity: quantity,
                price: unitPrice,
                totalPrice: unitPrice * quantity,
                discount:
                  item.totalMerchantDiscount?.amount ||
                  item.totalHBDiscount?.amount ||
                  0,
                platformDiscount: item.totalHBDiscount?.amount || 0,
                merchantDiscount: item.totalMerchantDiscount?.amount || 0,
                invoiceTotal: item.totalPrice?.amount || unitPrice * quantity,
                currency: item.totalPrice?.currency || 'TRY',
                barcode: item.productBarcode || '',
                vatBaseAmount: 0,
                laborCost: 0,
                variantInfo: item.properties
                  ? JSON.stringify(item.properties)
                  : null,
                rawData: JSON.stringify(item)
              };
            } else if (order.platform === 'n11') {
              const unitPrice = item.price || 0;
              const quantity = item.quantity || 1;

              orderItemData = {
                orderId: order.id,
                platformProductId: item.productSellerCode || '',
                productId: null,
                title: item.productName || 'Unknown Product',
                sku: item.productSellerCode || '',
                quantity: quantity,
                price: unitPrice,
                totalPrice: unitPrice * quantity,
                discount: 0,
                platformDiscount: 0,
                merchantDiscount: 0,
                invoiceTotal: unitPrice * quantity,
                currency: 'TRY',
                barcode: '',
                vatBaseAmount: 0,
                laborCost: 0,
                variantInfo: null,
                rawData: JSON.stringify(item)
              };
            }

            if (orderItemData) {
              await OrderItem.create(orderItemData, { transaction: t });
            }
          }
        });

        processedCount++;
        console.log(
          `✓ Created ${items.length} items for order ${order.orderNumber}`
        );
      } catch (error) {
        console.error(
          `Failed to process order ${order.orderNumber}: ${error.message}`
        );
        errorCount++;
      }
    }

    console.log('\n=== Backfill Summary ===');
    console.log(`Processed: ${processedCount} orders`);
    console.log(`Skipped: ${skippedCount} orders`);
    console.log(`Errors: ${errorCount} orders`);
    console.log(`Total: ${ordersNeedingItems.length} orders`);
  } catch (error) {
    console.error('Backfill process failed:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  backfillOrderItems()
    .then(() => {
      console.log('Backfill process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Backfill process failed:', error);
      process.exit(1);
    });
}

module.exports = { backfillOrderItems };
