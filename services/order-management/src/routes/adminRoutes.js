const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin-controller');
const { protect, authorize } = require('../middleware/auth');

// Apply both authentication and authorization
router.use(protect);
router.use(authorize('admin'));

router.get('/users', adminController.getAllUsers);
// Other admin routes...

module.exports = router;
