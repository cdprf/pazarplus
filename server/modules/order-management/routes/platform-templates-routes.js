const express = require('express');
const router = express.Router();

// Platform templates routes
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Platform templates endpoint',
    templates: []
  });
});

router.get('/hepsiburada', (req, res) => {
  res.json({
    success: true,
    platform: 'hepsiburada',
    templates: []
  });
});

router.get('/trendyol', (req, res) => {
  res.json({
    success: true,
    platform: 'trendyol',
    templates: []
  });
});

router.get('/n11', (req, res) => {
  res.json({
    success: true,
    platform: 'n11',
    templates: []
  });
});

module.exports = router;
