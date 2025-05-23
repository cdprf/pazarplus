const express = require('express');
const router = express.Router();
const axios = require('axios');
const logger = require('../utils/logger');
const { protect, authorize } = require('../middleware/auth');

// Authenticate all routes
router.use(protect);

/**
 * Proxy endpoint for Hepsiburada API requests
 * This allows frontend to make authenticated requests to Hepsiburada without exposing credentials
 */
router.post('/hepsiburada', async (req, res) => {
  try {
    const { url, headers, method = 'GET', data = null } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required'
      });
    }
    
    logger.info(`Proxying request to: ${url}`);
    
    const response = await axios({
      method,
      url,
      headers,
      data,
      timeout: 30000
    });
    
    return res.status(response.status).json(response.data);
  } catch (error) {
    logger.error(`Proxy request failed: ${error.message}`, {
      error: error.response?.data || error.message,
      url: req.body.url
    });
    
    return res.status(error.response?.status || 500).json({
      success: false,
      message: `Proxy request failed: ${error.message}`,
      error: error.response?.data || error.message
    });
  }
});

// Specific endpoint for getting Hepsiburada order details
router.get('/hepsiburada/order/:merchantId/:orderNumber', async (req, res) => {
  try {
    const { merchantId, orderNumber } = req.params;
    const { authorization } = req.headers;
    
    if (!merchantId || !orderNumber || !authorization) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: merchantId, orderNumber, or authorization header'
      });
    }
    
    const url = `https://oms-external.hepsiburada.com/orders/merchantid/${merchantId}/ordernumber/${orderNumber}`;
    
    logger.info(`Fetching order details from Hepsiburada: ${orderNumber}`);
    
    const response = await axios({
      method: 'GET',
      url,
      headers: {
        'User-Agent': 'sentosyazilim_dev',
        'Authorization': authorization
      },
      timeout: 30000
    });
    
    return res.status(response.status).json({
      success: true,
      data: response.data
    });
  } catch (error) {
    logger.error(`Failed to fetch Hepsiburada order details: ${error.message}`, {
      error: error.response?.data || error.message
    });
    
    return res.status(error.response?.status || 500).json({
      success: false,
      message: `Failed to fetch order details: ${error.message}`,
      error: error.response?.data || error.message
    });
  }
});

module.exports = router;