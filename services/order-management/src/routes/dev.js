const express = require('express');
const { generateDevToken } = require('../utils/generateDevToken');
const router = express.Router();

// Only enable in development
if (process.env.NODE_ENV === 'development') {
  router.get('/token', async (req, res) => {
    try {
      const result = await generateDevToken();
      
      if (!result) {
        return res.status(500).json({
          success: false,
          message: 'Failed to generate development token'
        });
      }

      res.json({
        success: true,
        message: 'Development token generated',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });
}

module.exports = router;
