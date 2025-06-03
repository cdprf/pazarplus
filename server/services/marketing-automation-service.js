const { EventEmitter } = require("events");
const logger = require("../utils/logger");
const { User, Customer, Order, Campaign, EmailTemplate } = require("../models");
const EmailService = require("../modules/order-management/services/email.service");
const { Op } = require("sequelize");

/**
 * Marketing Automation Service
 * Handles customer segmentation, email campaigns, and automated marketing workflows
 */
class MarketingAutomationService extends EventEmitter {
  constructor() {
    super();
    this.emailService = new EmailService();
    this.campaigns = new Map();
    this.automationRules = new Map();
    this.setupAutomationRules();
  }

  /**
   * Setup default automation rules
   */
  setupAutomationRules() {
    // Welcome series for new customers
    this.automationRules.set("welcome_series", {
      trigger: "customer_registered",
      emails: [
        { delay: 0, template: "welcome_email" },
        { delay: 24 * 60 * 60 * 1000, template: "getting_started" },
        { delay: 7 * 24 * 60 * 60 * 1000, template: "tips_and_tricks" },
      ],
    });

    // Cart abandonment
    this.automationRules.set("cart_abandonment", {
      trigger: "cart_abandoned",
      emails: [
        { delay: 1 * 60 * 60 * 1000, template: "cart_reminder" },
        { delay: 24 * 60 * 60 * 1000, template: "cart_recovery_discount" },
        { delay: 72 * 60 * 60 * 1000, template: "final_cart_reminder" },
      ],
    });

    // Customer reactivation
    this.automationRules.set("reactivation", {
      trigger: "customer_inactive",
      emails: [
        { delay: 0, template: "we_miss_you" },
        { delay: 7 * 24 * 60 * 60 * 1000, template: "comeback_offer" },
        { delay: 14 * 24 * 60 * 60 * 1000, template: "feedback_request" },
      ],
    });

    // Post-purchase follow-up
    this.automationRules.set("post_purchase", {
      trigger: "order_delivered",
      emails: [
        { delay: 2 * 24 * 60 * 60 * 1000, template: "delivery_confirmation" },
        { delay: 7 * 24 * 60 * 60 * 1000, template: "review_request" },
        { delay: 30 * 24 * 60 * 60 * 1000, template: "cross_sell" },
      ],
    });

    logger.info("Marketing automation rules setup complete");
  }

  /**
   * Trigger automation based on customer action
   */
  async triggerAutomation(trigger, data) {
    try {
      const rule = this.automationRules.get(trigger);
      if (!rule) return;

      logger.info(`Triggering automation: ${trigger}`, data);

      for (const email of rule.emails) {
        setTimeout(async () => {
          await this.sendAutomatedEmail(data.customerId, email.template, data);
        }, email.delay);
      }
    } catch (error) {
      logger.error("Error triggering automation:", error);
    }
  }

  /**
   * Send automated email
   */
  async sendAutomatedEmail(customerId, templateName, data = {}) {
    try {
      const customer = await Customer.findByPk(customerId);
      if (!customer) return;

      const template = await this.getEmailTemplate(templateName);
      if (!template) return;

      const personalizedContent = this.personalizeContent(template.content, {
        ...data,
        customerName: customer.name,
        customerEmail: customer.email,
      });

      await this.emailService.transporter.sendMail({
        from: process.env.SMTP_FROM || "no-reply@pazar.plus",
        to: customer.email,
        subject: template.subject,
        html: personalizedContent,
      });

      logger.info(`Automated email sent: ${templateName} to ${customer.email}`);
    } catch (error) {
      logger.error("Error sending automated email:", error);
    }
  }

  /**
   * Customer segmentation based on behavior and demographics
   */
  async segmentCustomers() {
    try {
      const segments = {
        high_value: await this.getHighValueCustomers(),
        recent_buyers: await this.getRecentBuyers(),
        at_risk: await this.getAtRiskCustomers(),
        new_customers: await this.getNewCustomers(),
        dormant: await this.getDormantCustomers(),
      };

      logger.info("Customer segmentation complete", {
        segments: Object.keys(segments).map((key) => ({
          name: key,
          count: segments[key].length,
        })),
      });

      return segments;
    } catch (error) {
      logger.error("Error segmenting customers:", error);
      throw error;
    }
  }

  /**
   * Get high-value customers (top 20% by revenue)
   */
  async getHighValueCustomers() {
    return await Customer.findAll({
      include: [
        {
          model: Order,
          attributes: [],
          required: true,
        },
      ],
      attributes: [
        "id",
        "name",
        "email",
        [
          sequelize.fn("SUM", sequelize.col("Orders.totalAmount")),
          "totalSpent",
        ],
      ],
      group: ["Customer.id"],
      having: sequelize.where(
        sequelize.fn("SUM", sequelize.col("Orders.totalAmount")),
        ">=",
        1000
      ),
      order: [
        [sequelize.fn("SUM", sequelize.col("Orders.totalAmount")), "DESC"],
      ],
    });
  }

  /**
   * Get recent buyers (purchased within last 30 days)
   */
  async getRecentBuyers() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    return await Customer.findAll({
      include: [
        {
          model: Order,
          where: {
            createdAt: { [Op.gte]: thirtyDaysAgo },
          },
          required: true,
        },
      ],
      distinct: true,
    });
  }

  /**
   * Get at-risk customers (haven't purchased in 60-90 days)
   */
  async getAtRiskCustomers() {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    return await Customer.findAll({
      include: [
        {
          model: Order,
          where: {
            createdAt: {
              [Op.between]: [ninetyDaysAgo, sixtyDaysAgo],
            },
          },
          required: true,
        },
      ],
      distinct: true,
    });
  }

  /**
   * Get new customers (registered within last 7 days)
   */
  async getNewCustomers() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return await Customer.findAll({
      where: {
        createdAt: { [Op.gte]: sevenDaysAgo },
      },
    });
  }

  /**
   * Get dormant customers (no purchases in 6+ months)
   */
  async getDormantCustomers() {
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

    return await Customer.findAll({
      include: [
        {
          model: Order,
          where: {
            createdAt: { [Op.lt]: sixMonthsAgo },
          },
          required: false,
        },
      ],
      where: {
        "$Orders.id$": null,
      },
    });
  }

  /**
   * Create and send marketing campaign
   */
  async createCampaign(campaignData) {
    try {
      const { name, subject, content, segmentIds, scheduledAt } = campaignData;

      const campaign = await Campaign.create({
        name,
        subject,
        content,
        segmentIds,
        scheduledAt: scheduledAt || new Date(),
        status: "draft",
      });

      if (!scheduledAt || new Date(scheduledAt) <= new Date()) {
        await this.sendCampaign(campaign.id);
      } else {
        this.scheduleCampaign(campaign.id, new Date(scheduledAt));
      }

      return campaign;
    } catch (error) {
      logger.error("Error creating campaign:", error);
      throw error;
    }
  }

  /**
   * Send campaign to segmented customers
   */
  async sendCampaign(campaignId) {
    try {
      const campaign = await Campaign.findByPk(campaignId);
      if (!campaign) throw new Error("Campaign not found");

      campaign.status = "sending";
      campaign.sentAt = new Date();
      await campaign.save();

      const segments = await this.segmentCustomers();
      let recipients = [];

      // Collect recipients from specified segments
      for (const segmentId of campaign.segmentIds) {
        if (segments[segmentId]) {
          recipients = [...recipients, ...segments[segmentId]];
        }
      }

      // Remove duplicates
      recipients = recipients.filter(
        (customer, index, self) =>
          index === self.findIndex((c) => c.id === customer.id)
      );

      let sentCount = 0;
      let failedCount = 0;

      for (const customer of recipients) {
        try {
          const personalizedContent = this.personalizeContent(
            campaign.content,
            {
              customerName: customer.name,
              customerEmail: customer.email,
            }
          );

          await this.emailService.transporter.sendMail({
            from: process.env.SMTP_FROM || "no-reply@pazar.plus",
            to: customer.email,
            subject: campaign.subject,
            html: personalizedContent,
          });

          sentCount++;
        } catch (error) {
          logger.error(`Failed to send campaign to ${customer.email}:`, error);
          failedCount++;
        }
      }

      campaign.status = "sent";
      campaign.sentCount = sentCount;
      campaign.failedCount = failedCount;
      await campaign.save();

      logger.info(
        `Campaign ${campaign.name} sent to ${sentCount} recipients, ${failedCount} failed`
      );
      return { sentCount, failedCount };
    } catch (error) {
      logger.error("Error sending campaign:", error);
      throw error;
    }
  }

  /**
   * Schedule campaign for future sending
   */
  scheduleCampaign(campaignId, scheduledAt) {
    const delay = scheduledAt.getTime() - Date.now();

    setTimeout(async () => {
      await this.sendCampaign(campaignId);
    }, delay);

    logger.info(`Campaign ${campaignId} scheduled for ${scheduledAt}`);
  }

  /**
   * Personalize email content with customer data
   */
  personalizeContent(content, data) {
    let personalizedContent = content;

    Object.keys(data).forEach((key) => {
      const placeholder = `{{${key}}}`;
      personalizedContent = personalizedContent.replace(
        new RegExp(placeholder, "g"),
        data[key] || ""
      );
    });

    return personalizedContent;
  }

  /**
   * Get email template
   */
  async getEmailTemplate(templateName) {
    try {
      return await EmailTemplate.findOne({
        where: { name: templateName },
      });
    } catch (error) {
      logger.error("Error getting email template:", error);
      return null;
    }
  }

  /**
   * Generate marketing insights and recommendations
   */
  async generateMarketingInsights() {
    try {
      const segments = await this.segmentCustomers();
      const campaignStats = await this.getCampaignStats();

      const insights = {
        customerSegments: segments,
        campaignPerformance: campaignStats,
        recommendations: this.generateRecommendations(segments, campaignStats),
        trends: await this.analyzeTrends(),
      };

      return insights;
    } catch (error) {
      logger.error("Error generating marketing insights:", error);
      throw error;
    }
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats() {
    const campaigns = await Campaign.findAll({
      where: { status: "sent" },
      order: [["sentAt", "DESC"]],
      limit: 10,
    });

    return campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      sentCount: campaign.sentCount,
      failedCount: campaign.failedCount,
      openRate: campaign.openRate || 0,
      clickRate: campaign.clickRate || 0,
      sentAt: campaign.sentAt,
    }));
  }

  /**
   * Generate marketing recommendations based on data
   */
  generateRecommendations(segments, campaignStats) {
    const recommendations = [];

    // High-value customer recommendations
    if (segments.high_value && segments.high_value.length > 0) {
      recommendations.push({
        type: "high_value_retention",
        title: "VIP Customer Program",
        description: `You have ${segments.high_value.length} high-value customers. Consider creating a VIP program with exclusive offers.`,
        priority: "high",
      });
    }

    // At-risk customer recommendations
    if (segments.at_risk && segments.at_risk.length > 0) {
      recommendations.push({
        type: "reactivation_campaign",
        title: "Customer Reactivation",
        description: `${segments.at_risk.length} customers are at risk of churning. Launch a reactivation campaign with special offers.`,
        priority: "high",
      });
    }

    // New customer onboarding
    if (segments.new_customers && segments.new_customers.length > 0) {
      recommendations.push({
        type: "onboarding_optimization",
        title: "Improve Onboarding",
        description: `${segments.new_customers.length} new customers joined recently. Optimize your welcome series for better engagement.`,
        priority: "medium",
      });
    }

    return recommendations;
  }

  /**
   * Analyze marketing trends
   */
  async analyzeTrends() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const recentCustomers = await Customer.count({
      where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
    });

    const previousCustomers = await Customer.count({
      where: {
        createdAt: {
          [Op.between]: [sixtyDaysAgo, thirtyDaysAgo],
        },
      },
    });

    const customerGrowthRate =
      previousCustomers > 0
        ? ((recentCustomers - previousCustomers) / previousCustomers) * 100
        : 0;

    return {
      customerAcquisition: {
        recent: recentCustomers,
        previous: previousCustomers,
        growthRate: customerGrowthRate,
      },
      // Add more trend analysis as needed
    };
  }
}

module.exports = MarketingAutomationService;
