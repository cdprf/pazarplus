const { User, Order, OrderItem, Product, sequelize } = require('../models');
const logger = require("../utils/logger");
const bcrypt = require('bcryptjs'); // Fixed: use bcryptjs instead of bcrypt

const seedSampleData = async () => {
  try {
    logger.info('🌱 Starting database seeding...');

    // Create a test user if it doesn't exist
    let testUser = await User.findOne({ where: { email: 'test@example.com' } });

    if (!testUser) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      testUser = await User.create({
        username: 'testuser', // Added required username field
        fullName: 'Test User', // Fixed: use fullName instead of name
        email: 'test@example.com',
        password: hashedPassword,
        isActive: true
      });
      logger.info('✅ Created test user');
    } else {
      logger.info('ℹ️ Test user already exists');
    }

    // Create sample products
    const sampleProducts = [
      {
        name: 'Wireless Bluetooth Headphones',
        sku: 'WBH-001',
        description: 'High-quality wireless headphones with noise cancellation',
        category: 'Electronics',
        price: 299.99,
        costPrice: 150.0,
        stockQuantity: 50,
        minStockLevel: 10,
        weight: 0.3,
        status: 'active',
        userId: testUser.id
      },
      {
        name: 'Cotton T-Shirt',
        sku: 'CTS-001',
        description: '100% cotton comfortable t-shirt',
        category: 'Clothing',
        price: 29.99,
        costPrice: 12.0,
        stockQuantity: 100,
        minStockLevel: 20,
        weight: 0.15,
        status: 'active',
        userId: testUser.id
      },
      {
        name: 'LED Desk Lamp',
        sku: 'LDL-001',
        description: 'Adjustable LED desk lamp with USB charging',
        category: 'Home & Office',
        price: 79.99,
        costPrice: 35.0,
        stockQuantity: 25,
        minStockLevel: 5,
        weight: 1.2,
        status: 'active',
        userId: testUser.id
      },
      {
        name: 'Smartphone Case',
        sku: 'SPC-001',
        description: 'Protective case for smartphones',
        category: 'Electronics',
        price: 19.99,
        costPrice: 8.0,
        stockQuantity: 0,
        minStockLevel: 15,
        weight: 0.05,
        status: 'inactive',
        userId: testUser.id
      }
    ];

    for (const productData of sampleProducts) {
      const existingProduct = await Product.findOne({
        where: { sku: productData.sku, userId: testUser.id }
      });

      if (!existingProduct) {
        // Add sourcePlatform to sample data
        const productWithSource = {
          ...productData,
          sourcePlatform: 'sample' // Mark as sample data
        };
        await Product.create(productWithSource);
        logger.info(`✅ Created product: ${productData.name}`);
      } else {
        logger.info(`ℹ️ Product already exists: ${productData.name}`);
      }
    }

    // Create sample orders
    const sampleOrders = [
      {
        orderNumber: 'ORD-2024-001',
        externalOrderId: 'TY-2024-001',
        customerName: 'Ahmet Yılmaz',
        customerEmail: 'ahmet@example.com',
        platform: 'trendyol',
        platformType: 'trendyol',
        platformOrderId: 'TY-2024-001',
        platformId: 'trendyol',
        orderStatus: 'pending',
        totalAmount: 329.98,
        currency: 'TRY',
        orderDate: new Date('2024-05-20'),
        userId: testUser.id,
        items: [
          {
            productName: 'Wireless Bluetooth Headphones',
            productSku: 'WBH-001',
            quantity: 1,
            unitPrice: 299.99,
            totalPrice: 299.99
          },
          {
            productName: 'Cotton T-Shirt',
            productSku: 'CTS-001',
            quantity: 1,
            unitPrice: 29.99,
            totalPrice: 29.99
          }
        ]
      },
      {
        orderNumber: 'ORD-2024-002',
        externalOrderId: 'HB-2024-002',
        customerName: 'Fatma Demir',
        customerEmail: 'fatma@example.com',
        platform: 'hepsiburada',
        platformType: 'hepsiburada',
        platformOrderId: 'HB-2024-002',
        platformId: 'hepsiburada',
        orderStatus: 'processing',
        totalAmount: 79.99,
        currency: 'TRY',
        orderDate: new Date('2024-05-21'),
        userId: testUser.id,
        items: [
          {
            productName: 'LED Desk Lamp',
            productSku: 'LDL-001',
            quantity: 1,
            unitPrice: 79.99,
            totalPrice: 79.99
          }
        ]
      },
      {
        orderNumber: 'ORD-2024-003',
        externalOrderId: 'N11-2024-003',
        customerName: 'Mehmet Özkan',
        customerEmail: 'mehmet@example.com',
        platform: 'n11',
        platformType: 'n11',
        platformOrderId: 'N11-2024-003',
        platformId: 'n11',
        orderStatus: 'shipped',
        totalAmount: 59.98,
        currency: 'TRY',
        orderDate: new Date('2024-05-19'),
        userId: testUser.id,
        items: [
          {
            productName: 'Cotton T-Shirt',
            productSku: 'CTS-001',
            quantity: 2,
            unitPrice: 29.99,
            totalPrice: 59.98
          }
        ]
      },
      {
        orderNumber: 'ORD-2024-004',
        externalOrderId: 'TY-2024-004',
        customerName: 'Ayşe Kaya',
        customerEmail: 'ayse@example.com',
        platform: 'trendyol',
        platformType: 'trendyol',
        platformOrderId: 'TY-2024-004',
        platformId: 'trendyol',
        orderStatus: 'delivered',
        totalAmount: 19.99,
        currency: 'TRY',
        orderDate: new Date('2024-05-18'),
        userId: testUser.id,
        items: [
          {
            productName: 'Smartphone Case',
            productSku: 'SPC-001',
            quantity: 1,
            unitPrice: 19.99,
            totalPrice: 19.99
          }
        ]
      },
      {
        orderNumber: 'ORD-2024-005',
        externalOrderId: 'HB-2024-005',
        customerName: 'Can Şen',
        customerEmail: 'can@example.com',
        platform: 'hepsiburada',
        platformType: 'hepsiburada',
        platformOrderId: 'HB-2024-005',
        platformId: 'hepsiburada',
        orderStatus: 'cancelled',
        totalAmount: 299.99,
        currency: 'TRY',
        orderDate: new Date('2024-05-22'),
        userId: testUser.id,
        items: [
          {
            productName: 'Wireless Bluetooth Headphones',
            productSku: 'WBH-001',
            quantity: 1,
            unitPrice: 299.99,
            totalPrice: 299.99
          }
        ]
      }
    ];

    for (const orderData of sampleOrders) {
      const existingOrder = await Order.findOne({
        where: { orderNumber: orderData.orderNumber, userId: testUser.id }
      });

      if (!existingOrder) {
        const { items, ...orderInfo } = orderData;
        const order = await Order.create(orderInfo);

        // Create order items
        for (const item of items) {
          await OrderItem.create({
            orderId: order.id,
            ...item,
            userId: testUser.id
          });
        }

        logger.info(`✅ Created order: ${orderData.orderNumber}`);
      } else {
        logger.info(`ℹ️ Order already exists: ${orderData.orderNumber}`);
      }
    }

    logger.info('🎉 Database seeding completed successfully!');
    logger.info('📊 Sample data summary:');
    logger.info(`   - Products: ${sampleProducts.length}`);
    logger.info(`   - Orders: ${sampleOrders.length}`);
    logger.info(`   - Test user: ${testUser.email}`);
  } catch (error) {
    logger.error('❌ Error seeding database:', error);
    throw error;
  }
};

module.exports = { seedSampleData };

// Run seeding if this file is executed directly
if (require.main === module) {
  seedSampleData()
    .then(() => {
      logger.info('✅ Seeding complete, exiting...');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}
