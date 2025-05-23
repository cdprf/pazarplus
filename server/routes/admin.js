const express = require('express');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes in this router
router.use(protect);
router.use(authorize('admin'));

// Admin-only routes
router.get('/dashboard', (req, res) => {
  res.status(200).json({
    success: true,
    data: 'Welcome to the admin dashboard!'
  });
});

// Add more admin routes here...

module.exports = router;
