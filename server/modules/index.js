/**
 * Central exports for all modules
 */
const authModule = require('./auth');
const orderManagementModule = require('./order-management');

module.exports = {
  auth: authModule,
  orderManagement: orderManagementModule
};
