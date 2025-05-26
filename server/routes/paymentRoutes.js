const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware');
const { turkishPaymentService } = require('../services');
const { logger } = require('../utils');

/**
 * @swagger
 * components:
 *   schemas:
 *     TurkishPayment:
 *       type: object
 *       required:
 *         - amount
 *         - currency
 *         - paymentMethod
 *       properties:
 *         amount:
 *           type: number
 *           description: Payment amount
 *         currency:
 *           type: string
 *           enum: [TRY]
 *           description: Payment currency (Turkish Lira)
 *         paymentMethod:
 *           type: string
 *           enum: [CREDIT_CARD, DEBIT_CARD, BKM_EXPRESS, TROY, PAYME, PAPARA, ININAL, BANK_TRANSFER, HAVALE_EFT]
 *           description: Payment method
 *         installments:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *           description: Number of installments for credit card payments
 *         orderId:
 *           type: string
 *           description: Order ID for the payment
 *         customerInfo:
 *           type: object
 *           properties:
 *             tcKimlik:
 *               type: string
 *               description: Turkish ID number
 *             vergiNo:
 *               type: string
 *               description: Tax number for businesses
 */

/**
 * @swagger
 * /api/payments/methods:
 *   get:
 *     summary: Get available Turkish payment methods
 *     tags: [Turkish Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available payment methods retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/methods', auth, async (req, res) => {
  try {
    const paymentMethods = await turkishPaymentService.getAvailablePaymentMethods();
    
    res.json({
      success: true,
      data: paymentMethods
    });
  } catch (error) {
    logger.error('Failed to get payment methods:', error);
    res.status(500).json({
      error: 'Ödeme yöntemleri yüklenirken hata oluştu',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/payments/installments:
 *   get:
 *     summary: Get available installment options
 *     tags: [Turkish Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: amount
 *         required: true
 *         schema:
 *           type: number
 *         description: Payment amount
 *       - in: query
 *         name: cardType
 *         schema:
 *           type: string
 *           enum: [CREDIT, DEBIT]
 *         description: Card type
 *     responses:
 *       200:
 *         description: Installment options retrieved successfully
 */
router.get('/installments', auth, async (req, res) => {
  try {
    const { amount, cardType = 'CREDIT' } = req.query;
    
    if (!amount) {
      return res.status(400).json({
        error: 'Ödeme tutarı gereklidir'
      });
    }

    const installmentOptions = await turkishPaymentService.getInstallmentOptions({
      amount: parseFloat(amount),
      cardType
    });
    
    res.json({
      success: true,
      data: installmentOptions
    });
  } catch (error) {
    logger.error('Failed to get installment options:', error);
    res.status(500).json({
      error: 'Taksit seçenekleri yüklenirken hata oluştu',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/payments/process:
 *   post:
 *     summary: Process Turkish payment
 *     tags: [Turkish Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TurkishPayment'
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *       400:
 *         description: Invalid payment data
 *       402:
 *         description: Payment failed
 */
router.post('/process', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const paymentData = req.body;
    
    // Validate required fields
    const { amount, currency, paymentMethod, orderId } = paymentData;
    
    if (!amount || !currency || !paymentMethod || !orderId) {
      return res.status(400).json({
        error: 'Eksik ödeme bilgileri',
        details: 'Tutar, para birimi, ödeme yöntemi ve sipariş ID gereklidir'
      });
    }

    if (currency !== 'TRY') {
      return res.status(400).json({
        error: 'Geçersiz para birimi',
        details: 'Sadece Türk Lirası (TRY) desteklenmektedir'
      });
    }

    // Process payment
    const paymentResult = await turkishPaymentService.processPayment({
      ...paymentData,
      userId
    });
    
    if (paymentResult.success) {
      res.json({
        success: true,
        message: 'Ödeme başarıyla işlendi',
        data: paymentResult
      });
    } else {
      res.status(402).json({
        success: false,
        error: 'Ödeme işlenemedi',
        message: paymentResult.errorMessage,
        data: paymentResult
      });
    }
  } catch (error) {
    logger.error('Payment processing failed:', error);
    res.status(500).json({
      error: 'Ödeme işlenirken hata oluştu',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/payments/verify:
 *   post:
 *     summary: Verify payment status
 *     tags: [Turkish Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentId
 *             properties:
 *               paymentId:
 *                 type: string
 *                 description: Payment transaction ID
 *     responses:
 *       200:
 *         description: Payment status verified
 */
router.post('/verify', auth, async (req, res) => {
  try {
    const { paymentId } = req.body;
    
    if (!paymentId) {
      return res.status(400).json({
        error: 'Ödeme ID gereklidir'
      });
    }

    const verification = await turkishPaymentService.verifyPayment(paymentId);
    
    res.json({
      success: true,
      data: verification
    });
  } catch (error) {
    logger.error('Payment verification failed:', error);
    res.status(500).json({
      error: 'Ödeme doğrulaması yapılırken hata oluştu',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/payments/refund:
 *   post:
 *     summary: Process payment refund
 *     tags: [Turkish Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentId
 *               - amount
 *               - reason
 *             properties:
 *               paymentId:
 *                 type: string
 *               amount:
 *                 type: number
 *               reason:
 *                 type: string
 *               refundType:
 *                 type: string
 *                 enum: [FULL, PARTIAL]
 *     responses:
 *       200:
 *         description: Refund processed successfully
 */
router.post('/refund', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentId, amount, reason, refundType = 'FULL' } = req.body;
    
    if (!paymentId || !amount || !reason) {
      return res.status(400).json({
        error: 'Eksik iade bilgileri',
        details: 'Ödeme ID, tutar ve sebep gereklidir'
      });
    }

    const refundResult = await turkishPaymentService.processRefund({
      paymentId,
      amount,
      reason,
      refundType,
      userId
    });
    
    res.json({
      success: true,
      message: 'İade işlemi başlatıldı',
      data: refundResult
    });
  } catch (error) {
    logger.error('Refund processing failed:', error);
    res.status(500).json({
      error: 'İade işlemi yapılırken hata oluştu',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/payments/history:
 *   get:
 *     summary: Get user payment history
 *     tags: [Turkish Payments]
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
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SUCCESS, FAILED, PENDING, REFUNDED]
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
 *         description: Payment history retrieved successfully
 */
router.get('/history', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      status, 
      dateFrom, 
      dateTo 
    } = req.query;
    
    const history = await turkishPaymentService.getPaymentHistory({
      userId,
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined
    });
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Failed to get payment history:', error);
    res.status(500).json({
      error: 'Ödeme geçmişi yüklenirken hata oluştu',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/payments/cards:
 *   get:
 *     summary: Get saved payment cards
 *     tags: [Turkish Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Saved cards retrieved successfully
 */
router.get('/cards', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const savedCards = await turkishPaymentService.getSavedCards(userId);
    
    res.json({
      success: true,
      data: savedCards
    });
  } catch (error) {
    logger.error('Failed to get saved cards:', error);
    res.status(500).json({
      error: 'Kayıtlı kartlar yüklenirken hata oluştu',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/payments/cards:
 *   post:
 *     summary: Save payment card
 *     tags: [Turkish Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cardToken
 *               - cardAlias
 *             properties:
 *               cardToken:
 *                 type: string
 *               cardAlias:
 *                 type: string
 *               cardType:
 *                 type: string
 *               bankName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Card saved successfully
 */
router.post('/cards', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const cardData = req.body;
    
    const savedCard = await turkishPaymentService.saveCard({
      ...cardData,
      userId
    });
    
    res.status(201).json({
      success: true,
      message: 'Kart başarıyla kaydedildi',
      data: savedCard
    });
  } catch (error) {
    logger.error('Failed to save card:', error);
    res.status(500).json({
      error: 'Kart kaydedilirken hata oluştu',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/payments/cards/{cardId}:
 *   delete:
 *     summary: Delete saved payment card
 *     tags: [Turkish Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cardId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Card deleted successfully
 */
router.delete('/cards/:cardId', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { cardId } = req.params;
    
    await turkishPaymentService.deleteCard(cardId, userId);
    
    res.json({
      success: true,
      message: 'Kart başarıyla silindi'
    });
  } catch (error) {
    logger.error('Failed to delete card:', error);
    res.status(500).json({
      error: 'Kart silinirken hata oluştu',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/payments/webhooks/payment-status:
 *   post:
 *     summary: Handle payment status webhook
 *     tags: [Turkish Payments Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
router.post('/webhooks/payment-status', async (req, res) => {
  try {
    const webhookData = req.body;
    
    // Verify webhook signature
    const isValid = await turkishPaymentService.verifyWebhookSignature(
      req.headers['x-signature'],
      JSON.stringify(webhookData)
    );
    
    if (!isValid) {
      return res.status(401).json({
        error: 'Geçersiz webhook imzası'
      });
    }

    await turkishPaymentService.handlePaymentStatusWebhook(webhookData);
    
    res.json({
      success: true,
      message: 'Webhook işlendi'
    });
  } catch (error) {
    logger.error('Webhook processing failed:', error);
    res.status(500).json({
      error: 'Webhook işlenirken hata oluştu',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/payments/compliance/check:
 *   post:
 *     summary: Check payment compliance
 *     tags: [Turkish Payments Compliance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - customerInfo
 *             properties:
 *               amount:
 *                 type: number
 *               customerInfo:
 *                 type: object
 *     responses:
 *       200:
 *         description: Compliance check completed
 */
router.post('/compliance/check', auth, async (req, res) => {
  try {
    const { amount, customerInfo } = req.body;
    
    const complianceResult = await turkishPaymentService.checkPaymentCompliance({
      amount,
      customerInfo
    });
    
    res.json({
      success: true,
      data: complianceResult
    });
  } catch (error) {
    logger.error('Payment compliance check failed:', error);
    res.status(500).json({
      error: 'Uyumluluk kontrolü yapılırken hata oluştu',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/payments/rates:
 *   get:
 *     summary: Get current exchange rates
 *     tags: [Turkish Payments]
 *     responses:
 *       200:
 *         description: Exchange rates retrieved successfully
 */
router.get('/rates', async (req, res) => {
  try {
    const rates = await turkishPaymentService.getExchangeRates();
    
    res.json({
      success: true,
      data: rates
    });
  } catch (error) {
    logger.error('Failed to get exchange rates:', error);
    res.status(500).json({
      error: 'Döviz kurları yüklenirken hata oluştu',
      message: error.message
    });
  }
});

module.exports = router;