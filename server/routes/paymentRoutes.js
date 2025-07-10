const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// Apply authentication middleware
router.use(auth);

// Coming Soon response for payment routes
const comingSoonResponse = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Payment Management - Coming Soon',
    description:
      'Advanced payment processing features are currently under development and will be available soon.',
    features: [
      'Turkish Payment Gateway Integration',
      'Credit Card Processing',
      'BKM Express Support',
      'TROY Payment System',
      'PayMe Integration',
      'Papara Support',
      'İninal Integration',
      'Bank Transfer & Havale/EFT',
      'Installment Processing',
      'Payment Analytics'
    ],
    status: 'development',
    expectedRelease: 'Q4 2025',
    supportedCurrency: 'TRY (Turkish Lira)',
    compliance: 'PCI DSS compliant payment processing'
  });
};

// Catch all payment routes
router.get('*', comingSoonResponse);
router.post('*', comingSoonResponse);
router.put('*', comingSoonResponse);
router.delete('*', comingSoonResponse);

module.exports = router;
