#!/usr/bin/env node

/**
 * Create Sample Products for Product-Order Linking Testing
 *
 * This script creates products that match existing unlinked order items
 * to enable realistic testing of the product-order linking system.
 */

const { Product, OrderItem, Order, User } = require('../models');
const logger = require('../utils/logger');

async function createSampleProducts() {
  try {
    logger.info('Starting sample product creation for linking tests');

    // Get the first user to associate products with
    const user = await User.findOne();
    if (!user) {
      throw new Error('No users found. Please create a user first.');
    }

    // Get unlinked order items to create matching products for
    const unlinkedItems = await OrderItem.findAll({
      where: { productId: null },
      limit: 50,
      include: [{ model: Order, as: 'order' }],
      group: ['sku', 'platformProductId'] // Group by unique identifiers
    });

    logger.info(
      `Found ${unlinkedItems.length} unique unlinked items to create products for`
    );

    const productsToCreate = [];
    const categories = [
      'Electronics',
      'Computer Accessories',
      'Mobile Accessories',
      'Audio & Video',
      'Gaming'
    ];
    const brands = ['Koodmax', 'Tech Pro', 'Universal', 'Compatible', 'OEM'];

    for (const item of unlinkedItems) {
      // Skip items without proper identifiers
      if (!item.sku && !item.platformProductId) {continue;}

      // Create product data based on order item
      const productData = {
        userId: user.id,
        name: item.title || `Product for ${item.sku || item.platformProductId}`,
        description: `Compatible product for ${
          item.title || 'various devices'
        }. High quality replacement part.`,
        sku: item.sku || `SKU-${item.platformProductId}`,
        barcode: item.barcode,
        platformProductId: item.platformProductId,
        price: item.price
          ? parseFloat(item.price)
          : Math.floor(Math.random() * 1000) + 100,
        costPrice: item.price
          ? parseFloat(item.price) * 0.7
          : Math.floor(Math.random() * 700) + 50,
        stockQuantity: Math.floor(Math.random() * 100) + 10,
        minStockLevel: 5,
        category: categories[Math.floor(Math.random() * categories.length)],
        brand: brands[Math.floor(Math.random() * brands.length)],
        weight: Math.random() * 2 + 0.1, // 0.1 to 2.1 kg
        dimensions: JSON.stringify({
          length: Math.floor(Math.random() * 20) + 5,
          width: Math.floor(Math.random() * 15) + 3,
          height: Math.floor(Math.random() * 10) + 2
        }),
        status: 'active',
        tags: JSON.stringify(['electronics', 'replacement', 'compatible']),
        images: JSON.stringify([
          '/images/products/sample-1.jpg',
          '/images/products/sample-2.jpg'
        ]),
        platformSpecific: JSON.stringify({
          [item.order?.platform || 'n11']: {
            platformProductId: item.platformProductId,
            status: 'active',
            lastSynced: new Date().toISOString()
          }
        })
      };

      productsToCreate.push(productData);
    }

    // Remove duplicates based on SKU
    const uniqueProducts = productsToCreate.filter(
      (product, index, array) =>
        array.findIndex((p) => p.sku === product.sku) === index
    );

    logger.info(`Creating ${uniqueProducts.length} unique products`);

    // Bulk create products
    const createdProducts = await Product.bulkCreate(uniqueProducts, {
      ignoreDuplicates: true, // Skip if SKU already exists
      validate: true
    });

    logger.info(
      `Successfully created ${createdProducts.length} sample products`
    );

    // Log some examples
    console.log('\nSample products created:');
    createdProducts.slice(0, 5).forEach((product) => {
      console.log(
        `- ${product.name} (SKU: ${product.sku}, Price: ${product.price}₺)`
      );
    });

    // Get linking statistics after creation
    const totalProducts = await Product.count({ where: { userId: user.id } });
    const totalUnlinkedItems = await OrderItem.count({
      where: { productId: null }
    });

    console.log(`\nLinking Statistics:`);
    console.log(`- Total Products: ${totalProducts}`);
    console.log(`- Unlinked Order Items: ${totalUnlinkedItems}`);
    console.log(
      `- Potential for ${Math.min(
        createdProducts.length,
        totalUnlinkedItems
      )} new links`
    );

    return {
      created: createdProducts.length,
      totalProducts,
      unlinkedItems: totalUnlinkedItems
    };
  } catch (error) {
    logger.error('Error creating sample products:', error);
    throw error;
  }
}

// Additional function to create variety products for comprehensive testing
async function createVarietyProducts() {
  try {
    const user = await User.findOne();
    if (!user) {
      throw new Error('No users found');
    }

    const varietyProducts = [
      {
        name: 'Universal Laptop Charger 65W',
        sku: 'UNI-CHARGER-65W',
        platformProductId: '999001',
        category: 'Electronics',
        brand: 'Universal',
        price: 299.99
      },
      {
        name: 'Bluetooth Wireless Mouse',
        sku: 'BT-MOUSE-001',
        platformProductId: '999002',
        category: 'Computer Accessories',
        brand: 'Tech Pro',
        price: 149.5
      },
      {
        name: 'USB-C Hub Multiport Adapter',
        sku: 'USBC-HUB-007',
        platformProductId: '999003',
        category: 'Computer Accessories',
        brand: 'Compatible',
        price: 199.99
      },
      {
        name: 'Wireless Keyboard Turkish Q Layout',
        sku: 'KB-WIRELESS-TR',
        platformProductId: '999004',
        category: 'Computer Accessories',
        brand: 'Koodmax',
        price: 399.99
      },
      {
        name: 'Phone Screen Protector Premium',
        sku: 'SCREEN-PROT-PREM',
        platformProductId: '999005',
        category: 'Mobile Accessories',
        brand: 'OEM',
        price: 79.99
      }
    ];

    const productsToCreate = varietyProducts.map((product) => ({
      userId: user.id,
      name: product.name,
      description: `High quality ${product.name.toLowerCase()} with excellent compatibility and performance.`,
      sku: product.sku,
      platformProductId: product.platformProductId,
      price: product.price,
      costPrice: product.price * 0.7,
      stockQuantity: Math.floor(Math.random() * 50) + 20,
      minStockLevel: 5,
      category: product.category,
      brand: product.brand,
      weight: Math.random() * 1 + 0.1,
      dimensions: JSON.stringify({
        length: Math.floor(Math.random() * 15) + 10,
        width: Math.floor(Math.random() * 10) + 5,
        height: Math.floor(Math.random() * 5) + 2
      }),
      status: 'active',
      tags: JSON.stringify(['electronics', 'tech', 'accessory']),
      images: JSON.stringify(['/images/products/variety-1.jpg']),
      platformSpecific: JSON.stringify({
        n11: {
          platformProductId: product.platformProductId,
          status: 'active',
          lastSynced: new Date().toISOString()
        }
      })
    }));

    const varietyCreated = await Product.bulkCreate(productsToCreate, {
      ignoreDuplicates: true,
      validate: true
    });

    logger.info(
      `Created ${varietyCreated.length} variety products for testing`
    );
    return varietyCreated.length;
  } catch (error) {
    logger.error('Error creating variety products:', error);
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  (async () => {
    try {
      console.log(
        '🔧 Creating sample products for product-order linking tests...\n'
      );

      const results = await createSampleProducts();

      console.log(
        '\n🎯 Creating variety products for comprehensive testing...\n'
      );

      const varietyCount = await createVarietyProducts();

      console.log(`\n✅ Sample product creation completed!`);
      console.log(`📊 Summary:`);
      console.log(`   - Matching products: ${results.created}`);
      console.log(`   - Variety products: ${varietyCount}`);
      console.log(
        `   - Total products: ${results.totalProducts + varietyCount}`
      );
      console.log(`   - Unlinked items: ${results.unlinkedItems}`);
      console.log(`\n🚀 Product-order linking system is ready for testing!`);

      process.exit(0);
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = { createSampleProducts, createVarietyProducts };
