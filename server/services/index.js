const TurkishComplianceService = require('./turkishComplianceService');
const TurkishPaymentService = require('./turkishPaymentService');
const TurkishShippingService = require('./turkishShippingService');

module.exports = {
  turkishComplianceService: new TurkishComplianceService(),
  turkishPaymentService: new TurkishPaymentService(),
  turkishShippingService: new TurkishShippingService()
};
