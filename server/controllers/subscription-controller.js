const { User, Subscription, UsageRecord, Invoice } = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Subscription Controller
 * Handles subscription management, plan changes, billing, and usage tracking
 */

// Subscription plan definitions
const SUBSCRIPTION_PLANS = {
  trial: {
    id: 'trial',
    name: 'Trial',
    price: 0,
    currency: 'TRY',
    duration: 14, // days
    features: ['basic_analytics', 'single_platform', 'email_support'],
    limits: {
      apiCalls: 500,
      platforms: 1,
      users: 1,
      reports: 5
    }
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 19900, // ₺199.00 in kuruş
    currency: 'TRY',
    features: ['basic_analytics', 'single_platform', 'email_support'],
    limits: {
      apiCalls: 5000,
      platforms: 1,
      users: 1,
      reports: 25
    }
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    price: 39900, // ₺399.00 in kuruş
    currency: 'TRY',
    features: [
      'advanced_analytics',
      'multi_platform',
      'inventory_intelligence',
      'email_support',
      'priority_support'
    ],
    limits: {
      apiCalls: 25000,
      platforms: 3,
      users: 3,
      reports: 100
    }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 79900, // ₺799.00 in kuruş
    currency: 'TRY',
    features: [
      'all_features',
      'unlimited_platforms',
      'ai_insights',
      'custom_reports',
      'dedicated_support',
      'api_access'
    ],
    limits: {
      apiCalls: -1, // unlimited
      platforms: -1, // unlimited
      users: 10,
      reports: -1 // unlimited
    }
  }
};

/**
 * Get available subscription plans
 */
const getPlans = async (req, res) => {
  try {
    const plans = Object.values(SUBSCRIPTION_PLANS).map((plan) => ({
      ...plan,
      priceFormatted:
        plan.price === 0 ? 'Free' : `₺${(plan.price / 100).toFixed(2)}`
    }));

    res.json({
      success: true,
      data: { plans }
    });
  } catch (error) {
    logger.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription plans'
    });
  }
};

/**
 * Get current user subscription
 */
const getCurrentSubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    const subscription = await Subscription.findOne({
      where: {
        userId,
        status: { [Op.in]: ['trial', 'active'] }
      },
      include: [
        {
          model: UsageRecord,
          as: 'usageRecords',
          where: {
            billingPeriodEnd: { [Op.gte]: new Date() }
          },
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    // Calculate usage statistics
    const usageStats = {};
    if (subscription.usageRecords) {
      for (const record of subscription.usageRecords) {
        usageStats[record.metricType] = {
          current: record.currentUsage,
          limit: record.limit,
          percentage: record.getUsagePercentage(),
          isOverLimit: record.isOverLimit(),
          isApproachingLimit: record.isApproachingLimit()
        };
      }
    }

    res.json({
      success: true,
      data: {
        subscription: {
          ...subscription.toJSON(),
          planDetails: SUBSCRIPTION_PLANS[subscription.planId],
          usageStats,
          daysUntilRenewal: subscription.getDaysUntilRenewal(),
          isActive: subscription.isActive()
        }
      }
    });
  } catch (error) {
    logger.error('Get current subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get current subscription'
    });
  }
};

/**
 * Start a trial subscription
 */
const startTrial = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user already has a subscription
    const existingSubscription = await Subscription.findOne({
      where: { userId }
    });

    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message: 'User already has a subscription'
      });
    }

    const trialPlan = SUBSCRIPTION_PLANS.trial;
    const trialStartDate = new Date();
    const trialEndDate = new Date(
      trialStartDate.getTime() + trialPlan.duration * 24 * 60 * 60 * 1000
    );

    // Create trial subscription
    const subscription = await Subscription.create({
      userId,
      planId: trialPlan.id,
      planName: trialPlan.name,
      amount: trialPlan.price,
      currency: trialPlan.currency,
      status: 'trial',
      startedAt: trialStartDate,
      trialStartedAt: trialStartDate,
      trialEndsAt: trialEndDate,
      endsAt: trialEndDate,
      features: trialPlan.features,
      limits: trialPlan.limits
    });

    // Update user trial information
    await User.update(
      {
        subscriptionPlan: 'trial',
        subscriptionStatus: 'trial',
        trialStartedAt: trialStartDate,
        trialEndsAt: trialEndDate,
        featuresEnabled: {
          analytics: true,
          inventory_management: true,
          multi_platform: false,
          ai_insights: false,
          custom_reports: false,
          api_access: false
        }
      },
      {
        where: { id: userId }
      }
    );

    // Create initial usage records
    await createUsageRecords(
      userId,
      subscription.id,
      trialPlan.limits,
      trialStartDate,
      trialEndDate
    );

    res.status(201).json({
      success: true,
      message: 'Trial subscription started successfully',
      data: { subscription }
    });
  } catch (error) {
    logger.error('Start trial error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start trial subscription'
    });
  }
};

/**
 * Upgrade subscription plan
 */
const upgradeSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId, paymentMethodId } = req.body;

    // Validate plan
    const newPlan = SUBSCRIPTION_PLANS[planId];
    if (!newPlan) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription plan'
      });
    }

    // Get current subscription
    const currentSubscription = await Subscription.findOne({
      where: {
        userId,
        status: { [Op.in]: ['trial', 'active'] }
      }
    });

    if (!currentSubscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    // Calculate prorated amount if upgrading mid-cycle
    const proratedAmount = currentSubscription.calculateProratedAmount(
      newPlan.price
    );

    // For now, we'll simulate successful payment
    // In production, integrate with Iyzico/Stripe here
    const paymentSuccessful = true;

    if (!paymentSuccessful) {
      return res.status(400).json({
        success: false,
        message: 'Payment failed'
      });
    }

    // End current subscription
    await currentSubscription.update({
      status: 'canceled',
      canceledAt: new Date(),
      cancelAtPeriodEnd: false
    });

    // Create new subscription
    const billingStartDate = new Date();
    const billingEndDate = new Date(
      billingStartDate.getTime() + 30 * 24 * 60 * 60 * 1000
    ); // 30 days

    const newSubscription = await Subscription.create({
      userId,
      planId: newPlan.id,
      planName: newPlan.name,
      amount: newPlan.price,
      currency: newPlan.currency,
      status: 'active',
      startedAt: billingStartDate,
      endsAt: billingEndDate,
      subscriptionStartedAt: billingStartDate,
      subscriptionEndsAt: billingEndDate,
      nextBillingAt: billingEndDate,
      nextBillingAmount: newPlan.price,
      features: newPlan.features,
      limits: newPlan.limits,
      metadata: {
        upgradeFrom: currentSubscription.planId,
        proratedAmount
      }
    });

    // Update user subscription information
    const featuresEnabled = {
      analytics: true,
      inventory_management: true,
      multi_platform: newPlan.features.includes('multi_platform'),
      ai_insights: newPlan.features.includes('ai_insights'),
      custom_reports: newPlan.features.includes('custom_reports'),
      api_access: newPlan.features.includes('api_access')
    };

    await User.update(
      {
        subscriptionPlan: planId,
        subscriptionStatus: 'active',
        subscriptionStartedAt: billingStartDate,
        subscriptionEndsAt: billingEndDate,
        featuresEnabled,
        monthlyApiLimit:
          newPlan.limits.apiCalls > 0 ? newPlan.limits.apiCalls : 100000
      },
      {
        where: { id: userId }
      }
    );

    // Create usage records for new plan
    await createUsageRecords(
      userId,
      newSubscription.id,
      newPlan.limits,
      billingStartDate,
      billingEndDate
    );

    // Create invoice for the upgrade
    await createInvoice(userId, newSubscription.id, {
      description: `Subscription upgrade to ${newPlan.name}`,
      amount: proratedAmount,
      items: [
        {
          description: `${newPlan.name} Plan`,
          quantity: 1,
          unitPrice: newPlan.price,
          amount: proratedAmount
        }
      ]
    });

    res.json({
      success: true,
      message: 'Subscription upgraded successfully',
      data: {
        subscription: newSubscription,
        proratedAmount: proratedAmount / 100 // Convert to TRY
      }
    });
  } catch (error) {
    logger.error('Upgrade subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade subscription'
    });
  }
};

/**
 * Cancel subscription
 */
const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reason, cancelAtPeriodEnd = true } = req.body;

    const subscription = await Subscription.findOne({
      where: {
        userId,
        status: 'active'
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    // Update subscription
    const updateData = {
      cancelAtPeriodEnd,
      cancellationReason: reason
    };

    if (!cancelAtPeriodEnd) {
      updateData.status = 'canceled';
      updateData.canceledAt = new Date();
    }

    await subscription.update(updateData);

    // Update user status if canceling immediately
    if (!cancelAtPeriodEnd) {
      await User.update(
        {
          subscriptionStatus: 'canceled'
        },
        {
          where: { id: userId }
        }
      );
    }

    res.json({
      success: true,
      message: cancelAtPeriodEnd
        ? 'Subscription will be canceled at the end of the current period'
        : 'Subscription canceled successfully',
      data: { subscription }
    });
  } catch (error) {
    logger.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription'
    });
  }
};

/**
 * Get billing history
 */
const getBillingHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;

    const { count, rows: invoices } = await Invoice.findAndCountAll({
      where: { userId },
      order: [['issueDate', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get billing history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get billing history'
    });
  }
};

/**
 * Track API usage
 */
const trackUsage = async (userId, metricType, amount = 1) => {
  try {
    const currentDate = new Date();
    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );

    const usageRecord = await UsageRecord.findOne({
      where: {
        userId,
        metricType,
        billingPeriodStart: { [Op.lte]: currentDate },
        billingPeriodEnd: { [Op.gte]: currentDate }
      }
    });

    if (usageRecord) {
      await usageRecord.increment('currentUsage', { by: amount });

      // Check for usage limit warnings
      if (usageRecord.isApproachingLimit()) {
        logger.warn(`User ${userId} approaching ${metricType} limit`, {
          userId,
          metricType,
          currentUsage: usageRecord.currentUsage + amount,
          limit: usageRecord.limit,
          percentage: usageRecord.getUsagePercentage()
        });
      }
    }
  } catch (error) {
    logger.error('Track usage error:', error);
  }
};

/**
 * Helper function to create usage records
 */
const createUsageRecords = async (
  userId,
  subscriptionId,
  limits,
  startDate,
  endDate
) => {
  const records = [];

  for (const [metricType, limit] of Object.entries(limits)) {
    if (limit > 0) {
      // Skip unlimited limits (-1)
      records.push({
        userId,
        subscriptionId,
        metricType,
        currentUsage: 0,
        limit,
        billingPeriodStart: startDate,
        billingPeriodEnd: endDate
      });
    }
  }

  await UsageRecord.bulkCreate(records);
};

/**
 * Helper function to create invoice
 */
const createInvoice = async (userId, subscriptionId, invoiceData) => {
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(
    Date.now()
  ).slice(-6)}`;

  const invoice = await Invoice.create({
    invoiceNumber,
    userId,
    subscriptionId,
    description: invoiceData.description,
    subtotal: invoiceData.amount,
    total: invoiceData.amount,
    currency: 'TRY',
    status: 'open',
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    lineItems: invoiceData.items || []
  });

  return invoice;
};

module.exports = {
  getPlans,
  getCurrentSubscription,
  startTrial,
  upgradeSubscription,
  cancelSubscription,
  getBillingHistory,
  trackUsage,
  SUBSCRIPTION_PLANS
};
