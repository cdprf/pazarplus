const express = require('express');
const subscriptionController = require('../controllers/subscription-controller');
const { auth } = require('../middleware/auth');
const { body, query, validationResult } = require('express-validator');

const router = express.Router();

// Validation middleware - define it locally to avoid import issues
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Validation middleware
const upgradeValidation = [
  body('planId')
    .isIn(['starter', 'professional', 'enterprise'])
    .withMessage('Invalid plan ID'),
  body('paymentMethodId')
    .optional()
    .isString()
    .withMessage('Payment method ID must be a string')
];

const cancelValidation = [
  body('reason')
    .optional()
    .isString()
    .isLength({ min: 3, max: 500 })
    .withMessage('Cancellation reason must be between 3 and 500 characters'),
  body('cancelAtPeriodEnd')
    .optional()
    .isBoolean()
    .withMessage('cancelAtPeriodEnd must be a boolean')
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

/**
 * @swagger
 * /api/subscription/plans:
 *   get:
 *     summary: Get available subscription plans
 *     tags: [Subscription]
 *     responses:
 *       200:
 *         description: List of available subscription plans
 */
router.get('/plans', subscriptionController.getPlans);

/**
 * @swagger
 * /api/subscription/current:
 *   get:
 *     summary: Get current user subscription
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription details
 *       404:
 *         description: No active subscription found
 */
router.get('/current', auth, subscriptionController.getCurrentSubscription);

/**
 * @swagger
 * /api/subscription/trial:
 *   post:
 *     summary: Start a trial subscription
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Trial subscription started successfully
 *       400:
 *         description: User already has a subscription
 */
router.post('/trial', auth, subscriptionController.startTrial);

/**
 * @swagger
 * /api/subscription/upgrade:
 *   post:
 *     summary: Upgrade subscription plan
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *             properties:
 *               planId:
 *                 type: string
 *                 enum: [starter, professional, enterprise]
 *               paymentMethodId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subscription upgraded successfully
 *       400:
 *         description: Invalid plan or payment failed
 */
router.post(
  '/upgrade',
  auth,
  upgradeValidation,
  validateRequest,
  subscriptionController.upgradeSubscription
);

/**
 * @swagger
 * /api/subscription/cancel:
 *   post:
 *     summary: Cancel subscription
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *               cancelAtPeriodEnd:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Subscription canceled successfully
 *       404:
 *         description: No active subscription found
 */
router.post(
  '/cancel',
  auth,
  cancelValidation,
  validateRequest,
  subscriptionController.cancelSubscription
);

/**
 * @swagger
 * /api/subscription/billing-history:
 *   get:
 *     summary: Get billing history
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *     responses:
 *       200:
 *         description: Billing history retrieved successfully
 */
router.get(
  '/billing-history',
  auth,
  paginationValidation,
  validateRequest,
  subscriptionController.getBillingHistory
);

module.exports = router;
