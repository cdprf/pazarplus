'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Creating orders table with improved schema...');
    
    // Create the orders table with the correct schema
    await queryInterface.sequelize.query(`
      CREATE TABLE orders (
        id UUID PRIMARY KEY,
        externalOrderId VARCHAR(255) NOT NULL,
        platformType VARCHAR(255) NOT NULL DEFAULT 'unknown',
        connectionId UUID NOT NULL,
        platformId UUID NOT NULL,
        userId UUID NOT NULL,
        customerName VARCHAR(255) NOT NULL,
        customerEmail VARCHAR(255),
        customerPhone VARCHAR(255),
        orderDate DATETIME NOT NULL,
        totalAmount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(255) NOT NULL DEFAULT 'USD',
        status TEXT NOT NULL DEFAULT 'new',
        notes TEXT,
        paymentMethod VARCHAR(255),
        paymentStatus TEXT NOT NULL DEFAULT 'pending',
        shippingMethod VARCHAR(255),
        rawData JSON,
        lastSyncedAt DATETIME,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (userId) REFERENCES Users(id),
        FOREIGN KEY (platformId) REFERENCES PlatformConnections(id),
        FOREIGN KEY (connectionId) REFERENCES PlatformConnections(id),
        UNIQUE (externalOrderId, connectionId)
      );
    `);
    
    console.log('Orders table created successfully.');
    
    // Create the necessary indexes
    await queryInterface.sequelize.query(`
      CREATE INDEX orders_user_id ON orders (userId);
    `);
    
    await queryInterface.sequelize.query(`
      CREATE INDEX orders_status ON orders (status);
    `);
    
    await queryInterface.sequelize.query(`
      CREATE INDEX orders_order_date ON orders (orderDate);
    `);
    
    await queryInterface.sequelize.query(`
      CREATE INDEX orders_platform_type ON orders (platformType);
    `);
    
    console.log('Created indexes on the orders table.');
    console.log('Migration completed successfully.');
  },

  async down(queryInterface, Sequelize) {
    // Drop the orders table
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS orders;
    `);
    
    console.log('Dropped orders table.');
  }
};
