const express = require('express');
const router = express.Router();
const MarketingAutomationService = require('../services/marketing-automation-service');
const logger = require('../utils/logger');
const { auth, requireRole } = require('../middleware/auth');

const marketingService = new MarketingAutomationService();

/**
 * Get customer segments
 */
router.get(
  '/segments',
  auth,
  requireRole(['admin', 'marketing']),
  async (req, res) => {
    try {
      const segments = await marketingService.segmentCustomers();

      res.json({
        success: true,
        data: segments,
        summary: {
          totalSegments: Object.keys(segments).length,
          totalCustomers: Object.values(segments).reduce(
            (sum, segment) => sum + segment.length,
            0
          )
        }
      });
    } catch (error) {
      logger.error('Error getting customer segments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve customer segments'
      });
    }
  }
);

/**
 * Create and send marketing campaign
 */
router.post(
  '/campaigns',
  auth,
  requireRole(['admin', 'marketing']),
  async (req, res) => {
    try {
      const { name, subject, content, segmentIds, scheduledAt } = req.body;

      if (!name || !subject || !content || !segmentIds) {
        return res.status(400).json({
          success: false,
          message:
            'Missing required fields: name, subject, content, segmentIds'
        });
      }

      const campaign = await marketingService.createCampaign({
        name,
        subject,
        content,
        segmentIds,
        scheduledAt
      });

      res.json({
        success: true,
        data: campaign,
        message: 'Campaign created successfully'
      });
    } catch (error) {
      logger.error('Error creating campaign:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create campaign'
      });
    }
  }
);

/**
 * Get marketing insights and recommendations
 */
router.get(
  '/insights',
  auth,
  requireRole(['admin', 'marketing']),
  async (req, res) => {
    try {
      const insights = await marketingService.generateMarketingInsights();

      res.json({
        success: true,
        data: insights,
        generatedAt: new Date()
      });
    } catch (error) {
      logger.error('Error generating marketing insights:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate marketing insights'
      });
    }
  }
);

/**
 * Trigger automation manually (for testing)
 */
router.post(
  '/automation/trigger',
  auth,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { trigger, customerId, data } = req.body;

      if (!trigger || !customerId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: trigger, customerId'
        });
      }

      await marketingService.triggerAutomation(trigger, {
        customerId,
        ...data
      });

      res.json({
        success: true,
        message: `Automation triggered: ${trigger} for customer ${customerId}`
      });
    } catch (error) {
      logger.error('Error triggering automation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to trigger automation'
      });
    }
  }
);

/**
 * Get campaign performance analytics
 */
router.get(
  '/campaigns/analytics',
  auth,
  requireRole(['admin', 'marketing']),
  async (req, res) => {
    try {
      const { timeframe = '30d' } = req.query;

      const campaignStats = await marketingService.getCampaignStats();

      res.json({
        success: true,
        data: {
          campaigns: campaignStats,
          timeframe,
          summary: {
            totalCampaigns: campaignStats.length,
            totalSent: campaignStats.reduce(
              (sum, c) => sum + (c.sentCount || 0),
              0
            ),
            avgOpenRate:
              campaignStats.reduce((sum, c) => sum + (c.openRate || 0), 0) /
                campaignStats.length || 0,
            avgClickRate:
              campaignStats.reduce((sum, c) => sum + (c.clickRate || 0), 0) /
                campaignStats.length || 0
          }
        }
      });
    } catch (error) {
      logger.error('Error getting campaign analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve campaign analytics'
      });
    }
  }
);

/**
 * Create email template
 */
router.post(
  '/templates',
  auth,
  requireRole(['admin', 'marketing']),
  async (req, res) => {
    try {
      const { name, subject, content, type } = req.body;

      if (!name || !subject || !content) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, subject, content'
        });
      }

      const { EmailTemplate } = require('../models');
      const template = await EmailTemplate.create({
        name,
        subject,
        content,
        type: type || 'marketing'
      });

      res.json({
        success: true,
        data: template,
        message: 'Email template created successfully'
      });
    } catch (error) {
      logger.error('Error creating email template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create email template'
      });
    }
  }
);

/**
 * Get all email templates
 */
router.get(
  '/templates',
  auth,
  requireRole(['admin', 'marketing']),
  async (req, res) => {
    try {
      const { EmailTemplate } = require('../models');
      const templates = await EmailTemplate.findAll({
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      logger.error('Error getting email templates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve email templates'
      });
    }
  }
);

/**
 * Get automation rules status
 */
router.get(
  '/automation/rules',
  auth,
  requireRole(['admin', 'marketing']),
  async (req, res) => {
    try {
      const rules = Array.from(marketingService.automationRules.entries()).map(
        ([key, rule]) => ({
          name: key,
          trigger: rule.trigger,
          emailCount: rule.emails.length,
          emails: rule.emails.map((email) => ({
            template: email.template,
            delayHours: email.delay / (1000 * 60 * 60)
          }))
        })
      );

      res.json({
        success: true,
        data: rules,
        totalRules: rules.length
      });
    } catch (error) {
      logger.error('Error getting automation rules:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve automation rules'
      });
    }
  }
);

module.exports = router;
