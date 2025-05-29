const TurkishComplianceService = require("./turkishComplianceService");
const TurkishPaymentService = require("./turkishPaymentService");
// Legacy Turkish shipping service - deprecated in favor of modular shipping services
// const TurkishShippingService = require('./turkishShippingService');
const shippingFactory = require("../modules/public/shipping/ShippingServiceFactory");

module.exports = {
  turkishComplianceService: new TurkishComplianceService(),
  turkishPaymentService: new TurkishPaymentService(),
  // Use modern shipping factory instead of legacy service
  shippingService: shippingFactory,
  // Backward compatibility - deprecated, use shippingService instead
  turkishShippingService: shippingFactory,
};
