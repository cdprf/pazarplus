const { Customer, Order, OrderItem } = require('./models');
const logger = require("../utils/logger");
const CustomerService = require('./services/CustomerService');

async function syncCustomers() {
  try {
    logger.info('Starting customer sync...');

    // Check if Customer table exists
    await Customer.sync({ force: false });
    logger.info('Customer table is ready');

    // Check how many orders we have
    const orderCount = await Order.count();
    logger.info(`Found ${orderCount} orders to process`);

    // Extract customers from orders
    const result = await CustomerService.extractAndSaveCustomersFromOrders();
    logger.info('Customer sync completed:', result);

    // Get customer stats
    const stats = await CustomerService.getCustomerStats();
    logger.info('Customer stats:', stats);

    process.exit(0);
  } catch (error) {
    logger.error('Error during customer sync:', error);
    process.exit(1);
  }
}

syncCustomers();
