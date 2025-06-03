const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
  TurkishComplianceService,
} = require("../services/turkishComplianceService");
const { TurkishPaymentService } = require("../services/turkishPaymentService");
const logger = require("../utils/logger");

const complianceService = new TurkishComplianceService();
const paymentService = new TurkishPaymentService();

/**
 * @swagger
 * /api/compliance/status/{orderId}:
 *   get:
 *     summary: Get compliance status for an order
 *     tags: [Turkish Compliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Compliance status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [COMPLIANT, NON_COMPLIANT, PENDING]
 *                 kvkkConsent:
 *                   type: boolean
 *                 eFaturaStatus:
 *                   type: string
 *                 eArsivStatus:
 *                   type: string
 *                 taxCalculations:
 *                   type: object
 */
router.get("/status/:orderId", auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const complianceStatus = await complianceService.getComplianceStatus(
      orderId
    );

    res.json(complianceStatus);
  } catch (error) {
    logger.error("Failed to get compliance status:", error);
    res.status(500).json({
      error: "Failed to retrieve compliance status",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/compliance/kvkk/{orderId}:
 *   post:
 *     summary: Record KVKK consent for an order
 *     tags: [Turkish Compliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               consentGiven:
 *                 type: boolean
 *               consentMethod:
 *                 type: string
 *                 enum: [WEBSITE, EMAIL, PHONE, SMS]
 *               consentDate:
 *                 type: string
 *                 format: date
 *               ipAddress:
 *                 type: string
 *     responses:
 *       200:
 *         description: KVKK consent recorded successfully
 */
router.post("/kvkk/:orderId", auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { consentGiven, consentMethod, consentDate, ipAddress } = req.body;

    if (!consentGiven) {
      return res.status(400).json({
        error: "KVKK consent is required for processing orders",
      });
    }

    const result = await complianceService.recordKVKKConsent(orderId, {
      consentGiven,
      consentMethod: consentMethod || "WEBSITE",
      consentDate: consentDate || new Date(),
      ipAddress: ipAddress || req.ip,
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: "KVKK consent recorded successfully",
      data: result,
    });
  } catch (error) {
    logger.error("Failed to record KVKK consent:", error);
    res.status(500).json({
      error: "Failed to record KVKK consent",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/compliance/efatura/{orderId}:
 *   post:
 *     summary: Create E-Fatura for an order
 *     tags: [Turkish Compliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customerType:
 *                 type: string
 *                 enum: [COMPANY, INDIVIDUAL]
 *               taxNumber:
 *                 type: string
 *               taxOffice:
 *                 type: string
 *               identityNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: E-Fatura created successfully
 */
router.post("/efatura/:orderId", auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { customerType, taxNumber, taxOffice, identityNumber } = req.body;

    if (customerType === "COMPANY" && (!taxNumber || !taxOffice)) {
      return res.status(400).json({
        error: "Tax number and tax office are required for company customers",
      });
    }

    const result = await complianceService.createEFatura(orderId, {
      customerType,
      taxNumber,
      taxOffice,
      identityNumber,
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: "E-Fatura created successfully",
      data: result,
    });
  } catch (error) {
    logger.error("Failed to create E-Fatura:", error);
    res.status(500).json({
      error: "Failed to create E-Fatura",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/compliance/earsiv/{orderId}:
 *   post:
 *     summary: Create E-Arşiv for an order
 *     tags: [Turkish Compliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: E-Arşiv created successfully
 */
router.post("/earsiv/:orderId", auth, async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await complianceService.createEArsiv(orderId, {
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: "E-Arşiv created successfully",
      data: result,
    });
  } catch (error) {
    logger.error("Failed to create E-Arşiv:", error);
    res.status(500).json({
      error: "Failed to create E-Arşiv",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/compliance/tax/calculate:
 *   post:
 *     summary: Calculate Turkish taxes (KDV)
 *     tags: [Turkish Compliance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               productCategory:
 *                 type: string
 *               customerType:
 *                 type: string
 *                 enum: [COMPANY, INDIVIDUAL]
 *     responses:
 *       200:
 *         description: Tax calculation completed
 */
router.post("/tax/calculate", auth, async (req, res) => {
  try {
    const { amount, productCategory, customerType } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: "Valid amount is required for tax calculation",
      });
    }

    const taxCalculation = await complianceService.calculateKDV(amount, {
      productCategory,
      customerType,
    });

    res.json({
      success: true,
      data: taxCalculation,
    });
  } catch (error) {
    logger.error("Failed to calculate tax:", error);
    res.status(500).json({
      error: "Failed to calculate tax",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/compliance/irsaliye/{orderId}:
 *   post:
 *     summary: Generate İrsaliye (delivery note) for an order
 *     tags: [Turkish Compliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: İrsaliye generated successfully
 */
router.post("/irsaliye/:orderId", auth, async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await complianceService.generateIrsaliye(orderId, {
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: "İrsaliye generated successfully",
      data: result,
    });
  } catch (error) {
    logger.error("Failed to generate İrsaliye:", error);
    res.status(500).json({
      error: "Failed to generate İrsaliye",
      message: error.message,
    });
  }
});

/**
 * Payment Gateway Routes
 */

/**
 * @swagger
 * /api/compliance/payments/methods:
 *   get:
 *     summary: Get available Turkish payment methods
 *     tags: [Turkish Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: amount
 *         schema:
 *           type: number
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *           default: TRY
 *     responses:
 *       200:
 *         description: Payment methods retrieved successfully
 */
router.get("/payments/methods", auth, async (req, res) => {
  try {
    const { amount, currency } = req.query;

    const paymentMethods = await paymentService.getPaymentMethods({
      amount: parseFloat(amount),
      currency: currency || "TRY",
    });

    res.json({
      success: true,
      data: paymentMethods,
    });
  } catch (error) {
    logger.error("Failed to get payment methods:", error);
    res.status(500).json({
      error: "Failed to get payment methods",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/compliance/payments/installments:
 *   get:
 *     summary: Get installment options for Turkish market
 *     tags: [Turkish Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: amount
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *           default: TRY
 *     responses:
 *       200:
 *         description: Installment options retrieved successfully
 */
router.get("/payments/installments", auth, async (req, res) => {
  try {
    const { amount, currency } = req.query;

    if (!amount) {
      return res.status(400).json({
        error: "Amount is required for installment calculation",
      });
    }

    const installmentOptions = await paymentService.getInstallmentOptions(
      parseFloat(amount),
      currency || "TRY"
    );

    res.json({
      success: true,
      data: installmentOptions,
    });
  } catch (error) {
    logger.error("Failed to get installment options:", error);
    res.status(500).json({
      error: "Failed to get installment options",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/compliance/payments/process:
 *   post:
 *     summary: Process payment with Turkish gateway
 *     tags: [Turkish Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               gateway:
 *                 type: string
 *                 enum: [IYZICO, PAYU, GARANTI, AKBANK]
 *               orderId:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *               cardData:
 *                 type: object
 *               customerData:
 *                 type: object
 *               installments:
 *                 type: number
 *     responses:
 *       200:
 *         description: Payment processed successfully
 */
router.post("/payments/process", auth, async (req, res) => {
  try {
    const {
      gateway,
      orderId,
      amount,
      currency,
      cardData,
      customerData,
      installments,
    } = req.body;

    if (!gateway || !orderId || !amount || !cardData || !customerData) {
      return res.status(400).json({
        error: "Missing required payment parameters",
      });
    }

    let result;

    switch (gateway.toUpperCase()) {
      case "IYZICO":
        result = await paymentService.processIyzicoPayment({
          orderId,
          amount,
          currency: currency || "TRY",
          cardData,
          customerData: {
            ...customerData,
            id: req.user.id,
            ip: req.ip,
          },
          installments: installments || 1,
        });
        break;

      case "PAYU":
        result = await paymentService.processPayUPayment({
          orderId,
          amount,
          currency: currency || "TRY",
          cardData,
          customerData: {
            ...customerData,
            id: req.user.id,
          },
          installments: installments || 1,
        });
        break;

      default:
        return res.status(400).json({
          error: `Unsupported payment gateway: ${gateway}`,
        });
    }

    res.json(result);
  } catch (error) {
    logger.error("Payment processing failed:", error);
    res.status(500).json({
      error: "Payment processing failed",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/compliance/payments/validate-card:
 *   post:
 *     summary: Validate Turkish credit card
 *     tags: [Turkish Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cardNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Card validation result
 */
router.post("/payments/validate-card", auth, async (req, res) => {
  try {
    const { cardNumber } = req.body;

    if (!cardNumber) {
      return res.status(400).json({
        error: "Card number is required",
      });
    }

    const validation = paymentService.validateTurkishCreditCard(cardNumber);

    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    logger.error("Card validation failed:", error);
    res.status(500).json({
      error: "Card validation failed",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/compliance/payments/gateways:
 *   get:
 *     summary: Get available payment gateways status
 *     tags: [Turkish Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment gateways status retrieved successfully
 */
router.get("/payments/gateways", auth, async (req, res) => {
  try {
    const gateways = ["IYZICO", "PAYU", "GARANTI", "AKBANK"];
    const gatewayStatus = {};

    gateways.forEach((gateway) => {
      gatewayStatus[gateway] = paymentService.getGatewayStatus(gateway);
    });

    res.json({
      success: true,
      data: gatewayStatus,
    });
  } catch (error) {
    logger.error("Failed to get gateway status:", error);
    res.status(500).json({
      error: "Failed to get gateway status",
      message: error.message,
    });
  }
});

/**
 * Enhanced Dashboard & Analytics Routes
 */

/**
 * @swagger
 * /api/compliance/dashboard/overview:
 *   get:
 *     summary: Get Turkish compliance dashboard overview
 *     tags: [Turkish Compliance Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard overview retrieved successfully
 */
router.get("/dashboard/overview", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const overview = await complianceService.getDashboardOverview(userId);

    res.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    logger.error("Failed to get dashboard overview:", error);
    res.status(500).json({
      error: "Dashboard verilerini yüklerken hata oluştu",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/compliance/dashboard/alerts:
 *   get:
 *     summary: Get compliance alerts
 *     tags: [Turkish Compliance Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Compliance alerts retrieved successfully
 */
router.get("/dashboard/alerts", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const alerts = await complianceService.getComplianceAlerts(userId);

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    logger.error("Failed to get compliance alerts:", error);
    res.status(500).json({
      error: "Uyumluluk uyarıları yüklenirken hata oluştu",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/compliance/dashboard/stats:
 *   get:
 *     summary: Get compliance statistics
 *     tags: [Turkish Compliance Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly]
 *         description: Statistics period
 *     responses:
 *       200:
 *         description: Compliance statistics retrieved successfully
 */
router.get("/dashboard/stats", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = "monthly" } = req.query;

    const stats = await complianceService.getComplianceStats(userId, period);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("Failed to get compliance stats:", error);
    res.status(500).json({
      error: "İstatistikler yüklenirken hata oluştu",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/compliance/reports/generate:
 *   post:
 *     summary: Generate compliance report
 *     tags: [Turkish Compliance Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reportType:
 *                 type: string
 *                 enum: [KVKK, EFATURA, EARSIV, TAX, FULL]
 *               dateFrom:
 *                 type: string
 *                 format: date
 *               dateTo:
 *                 type: string
 *                 format: date
 *               format:
 *                 type: string
 *                 enum: [PDF, EXCEL, JSON]
 *     responses:
 *       200:
 *         description: Report generated successfully
 */
router.post("/reports/generate", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { reportType, dateFrom, dateTo, format = "PDF" } = req.body;

    if (!reportType || !dateFrom || !dateTo) {
      return res.status(400).json({
        error: "Rapor türü ve tarih aralığı gereklidir",
      });
    }

    const report = await complianceService.generateComplianceReport({
      userId,
      reportType,
      dateFrom: new Date(dateFrom),
      dateTo: new Date(dateTo),
      format,
    });

    res.json({
      success: true,
      message: "Rapor başarıyla oluşturuldu",
      data: report,
    });
  } catch (error) {
    logger.error("Failed to generate compliance report:", error);
    res.status(500).json({
      error: "Rapor oluşturulurken hata oluştu",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/compliance/notifications/preferences:
 *   get:
 *     summary: Get notification preferences
 *     tags: [Turkish Compliance Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification preferences retrieved successfully
 */
router.get("/notifications/preferences", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = await complianceService.getNotificationPreferences(
      userId
    );

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    logger.error("Failed to get notification preferences:", error);
    res.status(500).json({
      error: "Bildirim tercihleri yüklenirken hata oluştu",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/compliance/notifications/preferences:
 *   put:
 *     summary: Update notification preferences
 *     tags: [Turkish Compliance Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: object
 *               sms:
 *                 type: object
 *               push:
 *                 type: object
 *     responses:
 *       200:
 *         description: Notification preferences updated successfully
 */
router.put("/notifications/preferences", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = req.body;

    const result = await complianceService.updateNotificationPreferences(
      userId,
      preferences
    );

    res.json({
      success: true,
      message: "Bildirim tercihleri güncellendi",
      data: result,
    });
  } catch (error) {
    logger.error("Failed to update notification preferences:", error);
    res.status(500).json({
      error: "Bildirim tercihleri güncellenirken hata oluştu",
      message: error.message,
    });
  }
});

/**
 * Advanced Compliance Features
 */

/**
 * @swagger
 * /api/compliance/automation/rules:
 *   get:
 *     summary: Get compliance automation rules
 *     tags: [Turkish Compliance Automation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Automation rules retrieved successfully
 */
router.get("/automation/rules", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const rules = await complianceService.getAutomationRules(userId);

    res.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    logger.error("Failed to get automation rules:", error);
    res.status(500).json({
      error: "Otomasyon kuralları yüklenirken hata oluştu",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/compliance/automation/rules:
 *   post:
 *     summary: Create compliance automation rule
 *     tags: [Turkish Compliance Automation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               trigger:
 *                 type: object
 *               actions:
 *                 type: array
 *               conditions:
 *                 type: object
 *     responses:
 *       201:
 *         description: Automation rule created successfully
 */
router.post("/automation/rules", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const ruleData = req.body;

    const rule = await complianceService.createAutomationRule(userId, ruleData);

    res.status(201).json({
      success: true,
      message: "Otomasyon kuralı oluşturuldu",
      data: rule,
    });
  } catch (error) {
    logger.error("Failed to create automation rule:", error);
    res.status(500).json({
      error: "Otomasyon kuralı oluşturulurken hata oluştu",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/compliance/integration/status:
 *   get:
 *     summary: Get Turkish integration status
 *     tags: [Turkish Compliance Integration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Integration status retrieved successfully
 */
router.get("/integration/status", auth, async (req, res) => {
  try {
    const integrationStatus = await complianceService.getIntegrationStatus();

    res.json({
      success: true,
      data: integrationStatus,
    });
  } catch (error) {
    logger.error("Failed to get integration status:", error);
    res.status(500).json({
      error: "Entegrasyon durumu yüklenirken hata oluştu",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/compliance/audit/trail:
 *   get:
 *     summary: Get compliance audit trail
 *     tags: [Turkish Compliance Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Audit trail retrieved successfully
 */
router.get("/audit/trail", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 50, action, dateFrom, dateTo } = req.query;

    const auditTrail = await complianceService.getAuditTrail({
      userId,
      page: parseInt(page),
      limit: parseInt(limit),
      action,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });

    res.json({
      success: true,
      data: auditTrail,
    });
  } catch (error) {
    logger.error("Failed to get audit trail:", error);
    res.status(500).json({
      error: "Denetim kaydı yüklenirken hata oluştu",
      message: error.message,
    });
  }
});

/**
 * Data Protection & KVKK Routes
 */

/**
 * @swagger
 * /api/compliance/kvkk/export/{userId}:
 *   get:
 *     summary: Export user data for KVKK compliance
 *     tags: [KVKK Data Protection]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User data exported successfully
 */
router.get("/kvkk/export/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Only users can export their own data, or admins can export any data
    if (req.user.id !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        error: "Unauthorized to export this user data",
      });
    }

    const userData = await complianceService.exportUserData(userId);

    res.json({
      success: true,
      message: "User data exported successfully",
      data: userData,
    });
  } catch (error) {
    logger.error("Failed to export user data:", error);
    res.status(500).json({
      error: "Failed to export user data",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/compliance/kvkk/delete/{userId}:
 *   delete:
 *     summary: Delete user data for KVKK compliance
 *     tags: [KVKK Data Protection]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User data deleted successfully
 */
router.delete("/kvkk/delete/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Only users can delete their own data, or admins can delete any data
    if (req.user.id !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        error: "Unauthorized to delete this user data",
      });
    }

    const result = await complianceService.deleteUserData(userId, {
      requestedBy: req.user.id,
      requestDate: new Date(),
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: "User data deletion request processed",
      data: result,
    });
  } catch (error) {
    logger.error("Failed to delete user data:", error);
    res.status(500).json({
      error: "Failed to delete user data",
      message: error.message,
    });
  }
});

module.exports = router;
