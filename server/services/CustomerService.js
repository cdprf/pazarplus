const { Customer, Order, OrderItem } = require("../models");
const { Op } = require("sequelize");
const logger = require("../utils/logger");

class CustomerService {
  /**
   * Extract customers from orders and save/update them in the customers table
   */
  static async extractAndSaveCustomersFromOrders() {
    try {
      logger.info("Starting customer extraction from orders");

      // Get all orders with customer information
      const orders = await Order.findAll({
        attributes: [
          "customerEmail",
          "customerName",
          "customerPhone",
          "orderDate",
          "totalAmount",
          "platform",
          "shippingAddress",
          "createdAt",
        ],
        where: {
          customerEmail: {
            [Op.ne]: null,
            [Op.ne]: "",
          },
        },
        include: [
          {
            model: OrderItem,
            as: "items",
            attributes: ["title", "sku", "quantity", "price"],
          },
        ],
        order: [["orderDate", "DESC"]],
      });

      if (!orders.length) {
        logger.info("No orders with customer information found");
        return { extracted: 0, updated: 0 };
      }

      // Group orders by customer email
      const customerMap = new Map();

      orders.forEach((order) => {
        const email = order.customerEmail.toLowerCase().trim();

        if (!customerMap.has(email)) {
          customerMap.set(email, {
            email: email,
            name: order.customerName || "Unknown Customer",
            phone: order.customerPhone,
            orders: [],
            addresses: new Set(),
            platforms: new Map(),
            products: new Map(),
            categories: new Set(),
          });
        }

        const customerData = customerMap.get(email);
        customerData.orders.push(order);

        // Update name if current one is better
        if (order.customerName && order.customerName !== "Unknown Customer") {
          customerData.name = order.customerName;
        }

        // Update phone if available
        if (order.customerPhone && !customerData.phone) {
          customerData.phone = order.customerPhone;
        }

        // Collect addresses
        if (order.shippingAddress) {
          const addressKey = `${order.shippingAddress.city}-${order.shippingAddress.district}`;
          customerData.addresses.add(
            JSON.stringify({
              ...order.shippingAddress,
              _key: addressKey,
            })
          );
        }

        // Collect platform usage
        if (order.platform) {
          const platform = order.platform.toLowerCase();
          customerData.platforms.set(
            platform,
            (customerData.platforms.get(platform) || 0) + 1
          );
        }

        // Collect product preferences
        if (order.items) {
          order.items.forEach((item) => {
            if (item.title) {
              const productKey = item.title.toLowerCase();
              customerData.products.set(productKey, {
                name: item.title,
                sku: item.sku,
                count:
                  (customerData.products.get(productKey)?.count || 0) +
                  item.quantity,
              });
            }
          });
        }
      });

      let extractedCount = 0;
      let updatedCount = 0;

      // Process each customer
      for (const [email, customerData] of customerMap) {
        try {
          const analytics = this.calculateCustomerAnalytics(customerData);

          const customerRecord = {
            email: email,
            name: customerData.name,
            phone: customerData.phone,
            totalOrders: analytics.totalOrders,
            totalSpent: analytics.totalSpent,
            averageOrderValue: analytics.averageOrderValue,
            loyaltyScore: analytics.loyaltyScore,
            customerType: analytics.customerType,
            riskLevel: analytics.riskLevel,
            firstOrderDate: analytics.firstOrderDate,
            lastOrderDate: analytics.lastOrderDate,
            primaryPlatform: analytics.primaryPlatform,
            platformUsage: analytics.platformUsage,
            shippingAddresses: analytics.shippingAddresses,
            favoriteProducts: analytics.favoriteProducts,
            favoriteCategories: [], // Will be enhanced later
            lastUpdated: new Date(),
          };

          // Use upsert to create or update customer
          const [customer, created] = await Customer.upsert(customerRecord, {
            returning: true,
          });

          if (created) {
            extractedCount++;
          } else {
            updatedCount++;
          }
        } catch (error) {
          logger.error(`Error processing customer ${email}:`, error);
        }
      }

      logger.info(
        `Customer extraction completed: ${extractedCount} new, ${updatedCount} updated`
      );
      return { extracted: extractedCount, updated: updatedCount };
    } catch (error) {
      logger.error("Error in customer extraction:", error);
      throw error;
    }
  }

  /**
   * Calculate customer analytics from order data
   */
  static calculateCustomerAnalytics(customerData) {
    const orders = customerData.orders.sort(
      (a, b) => new Date(a.orderDate) - new Date(b.orderDate)
    );

    const totalOrders = orders.length;
    const totalSpent = orders.reduce(
      (sum, order) => sum + parseFloat(order.totalAmount || 0),
      0
    );
    const averageOrderValue = totalSpent / totalOrders;

    const firstOrderDate = new Date(orders[0].orderDate);
    const lastOrderDate = new Date(orders[orders.length - 1].orderDate);

    // Calculate loyalty score
    const daysSinceFirstOrder =
      (new Date() - firstOrderDate) / (1000 * 60 * 60 * 24);
    const orderFrequency = totalOrders / Math.max(daysSinceFirstOrder / 30, 1); // orders per month

    const platformUsage = Object.fromEntries(customerData.platforms);
    const totalPlatformOrders = Object.values(platformUsage).reduce(
      (sum, count) => sum + count,
      0
    );
    const platformLoyalty =
      Math.max(...Object.values(platformUsage)) / totalPlatformOrders;

    const loyaltyScore = Math.min(
      100,
      Math.round(
        orderFrequency * 20 +
          Math.min(averageOrderValue / 100, 20) + // Cap AV contribution at 20 points
          platformLoyalty * 30 +
          Math.min(totalOrders * 2, 30) // Cap order count contribution at 30 points
      )
    );

    // Risk assessment
    const daysSinceLastOrder =
      (new Date() - lastOrderDate) / (1000 * 60 * 60 * 24);
    let riskLevel = "low";
    if (daysSinceLastOrder > 90) riskLevel = "high";
    else if (daysSinceLastOrder > 30) riskLevel = "medium";

    // Customer type
    let customerType = "new";
    if (loyaltyScore >= 70) customerType = "vip";
    else if (loyaltyScore >= 40) customerType = "loyal";

    // Primary platform
    const primaryPlatform =
      Object.entries(platformUsage).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      "unknown";

    // Shipping addresses
    const shippingAddresses = Array.from(customerData.addresses)
      .map((addr) => JSON.parse(addr))
      .slice(0, 5); // Keep max 5 addresses

    // Favorite products
    const favoriteProducts = Array.from(customerData.products.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([key, product]) => ({
        name: product.name,
        sku: product.sku,
        purchaseCount: product.count,
      }));

    return {
      totalOrders,
      totalSpent: parseFloat(totalSpent.toFixed(2)),
      averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
      loyaltyScore,
      customerType,
      riskLevel,
      firstOrderDate,
      lastOrderDate,
      primaryPlatform,
      platformUsage,
      shippingAddresses,
      favoriteProducts,
    };
  }

  /**
   * Get customers with analytics (for API endpoints)
   */
  static async getCustomersWithAnalytics(options = {}) {
    const {
      page = 1,
      limit = 20,
      search = "",
      customerType = "all",
      riskLevel = "all",
      sortBy = "totalSpent",
      sortOrder = "desc",
    } = options;

    const whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (customerType !== "all") {
      whereClause.customerType = customerType;
    }

    if (riskLevel !== "all") {
      whereClause.riskLevel = riskLevel;
    }

    const offset = (page - 1) * limit;
    const order = [[sortBy, sortOrder.toUpperCase()]];

    const { count, rows: customers } = await Customer.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order,
      include: [
        {
          model: Order,
          as: "orders",
          attributes: ["id", "orderDate", "totalAmount", "platform"],
          limit: 5,
          order: [["orderDate", "DESC"]],
          required: false,
        },
      ],
    });

    return {
      customers,
      pagination: {
        total: count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        limit: parseInt(limit),
        hasNext: page * limit < count,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get customer statistics
   */
  static async getCustomerStats() {
    const totalCustomers = await Customer.count();

    const vipCustomers = await Customer.count({
      where: { customerType: "vip" },
    });

    const atRiskCustomers = await Customer.count({
      where: { riskLevel: "high" },
    });

    const totalRevenueResult = await Customer.sum("totalSpent");
    const totalRevenue = totalRevenueResult || 0;

    return {
      totalCustomers,
      vipCustomers,
      atRiskCustomers,
      totalRevenue: parseFloat(totalRevenue),
    };
  }

  /**
   * Get customer by email
   */
  static async getCustomerByEmail(email) {
    return await Customer.findOne({
      where: { email: email.toLowerCase().trim() },
      include: [
        {
          model: Order,
          as: "orders",
          include: [
            {
              model: OrderItem,
              as: "items",
            },
          ],
          order: [["orderDate", "DESC"]],
        },
      ],
    });
  }

  /**
   * Refresh a specific customer's data from their orders
   */
  static async refreshCustomerData(email) {
    try {
      // Get all orders for this customer
      const orders = await Order.findAll({
        where: {
          customerEmail: {
            [Op.iLike]: email.toLowerCase().trim(),
          },
        },
        include: [
          {
            model: OrderItem,
            as: "items",
          },
        ],
        order: [["orderDate", "DESC"]],
      });

      if (!orders.length) {
        throw new Error("No orders found for customer");
      }

      // Create temporary customer data structure
      const customerData = {
        email: email.toLowerCase().trim(),
        name: orders[0].customerName || "Unknown Customer",
        phone: orders[0].customerPhone,
        orders: orders,
        addresses: new Set(),
        platforms: new Map(),
        products: new Map(),
      };

      // Process orders
      orders.forEach((order) => {
        // Update name and phone
        if (order.customerName && order.customerName !== "Unknown Customer") {
          customerData.name = order.customerName;
        }
        if (order.customerPhone && !customerData.phone) {
          customerData.phone = order.customerPhone;
        }

        // Collect data
        if (order.shippingAddress) {
          customerData.addresses.add(JSON.stringify(order.shippingAddress));
        }
        if (order.platform) {
          const platform = order.platform.toLowerCase();
          customerData.platforms.set(
            platform,
            (customerData.platforms.get(platform) || 0) + 1
          );
        }
        if (order.items) {
          order.items.forEach((item) => {
            if (item.title) {
              const productKey = item.title.toLowerCase();
              customerData.products.set(productKey, {
                name: item.title,
                sku: item.sku,
                count:
                  (customerData.products.get(productKey)?.count || 0) +
                  item.quantity,
              });
            }
          });
        }
      });

      // Calculate analytics
      const analytics = this.calculateCustomerAnalytics(customerData);

      // Update customer record
      const [customer] = await Customer.upsert({
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone,
        ...analytics,
        lastUpdated: new Date(),
      });

      return customer;
    } catch (error) {
      logger.error(`Error refreshing customer data for ${email}:`, error);
      throw error;
    }
  }
}

module.exports = CustomerService;
