'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create Vehicles table
    await queryInterface.createTable('vehicles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      brand: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      model: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      yearRange: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'e.g., 2020-2023',
      },
      engineType: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'e.g., 1.6 TDI, 2.0 Petrol',
      },
      transmission: {
        type: Sequelize.ENUM('Manual', 'Automatic'),
        allowNull: true,
      },
      fuelType: {
        type: Sequelize.ENUM('Petrol', 'Diesel', 'Hybrid', 'Electric'),
        allowNull: true,
      },
      vinCode: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('vehicles', ['brand', 'model', 'yearRange']);

    // Create Suppliers table
    await queryInterface.createTable('suppliers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      apiDetails: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'API URL, keys, and other connection info',
      },
      priority: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Lower number means higher priority',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create Part Compatibilities table
    await queryInterface.createTable('part_compatibilities', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      vehicleId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'vehicles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('part_compatibilities', ['productId', 'vehicleId'], { unique: true });

    // Create Supplier Prices table
    await queryInterface.createTable('supplier_prices', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      supplierId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'suppliers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      priceTl: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      priceUsd: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      activeCurrency: {
        type: Sequelize.ENUM('TL', 'USD'),
        allowNull: false,
        defaultValue: 'TL',
      },
      stockStatus: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      deliveryTime: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "e.g., '1-3 days'",
      },
      lastUpdated: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('supplier_prices', ['productId', 'supplierId'], { unique: true });

    // Create AI Chat Logs table
    await queryInterface.createTable('ai_chat_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true, // Can be null for guest users
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      sessionId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      response: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      intent: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      entities: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      timestamp: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('ai_chat_logs', ['userId']);
    await queryInterface.addIndex('ai_chat_logs', ['sessionId']);

    // Add columns to Products table
    await queryInterface.addColumn('products', 'tecdocId', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'TecDoc ID for the spare part',
    });

    await queryInterface.addColumn('products', 'oemCode', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'OEM code for the spare part',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('products', 'oemCode');
    await queryInterface.removeColumn('products', 'tecdocId');
    await queryInterface.dropTable('ai_chat_logs');
    await queryInterface.dropTable('supplier_prices');
    await queryInterface.dropTable('part_compatibilities');
    await queryInterface.dropTable('suppliers');
    await queryInterface.dropTable('vehicles');
  },
};