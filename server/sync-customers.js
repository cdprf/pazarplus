const { Customer, Order, OrderItem } = require('./models');
const CustomerService = require('./services/CustomerService');

async function syncCustomers() {
  try {
    console.log('Starting customer sync...');

    // Check if Customer table exists
    await Customer.sync({ force: false });
    console.log('Customer table is ready');

    // Check how many orders we have
    const orderCount = await Order.count();
    console.log(`Found ${orderCount} orders to process`);

    // Extract customers from orders
    const result = await CustomerService.extractAndSaveCustomersFromOrders();
    console.log('Customer sync completed:', result);

    // Get customer stats
    const stats = await CustomerService.getCustomerStats();
    console.log('Customer stats:', stats);

    process.exit(0);
  } catch (error) {
    console.error('Error during customer sync:', error);
    process.exit(1);
  }
}

syncCustomers();
