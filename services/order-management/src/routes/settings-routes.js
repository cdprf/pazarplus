const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const settingsController = require('../controllers/settings-controller');
// Remove old auth middleware
// const { authenticateToken } = require('../middleware/auth-middleware');
// Import new auth middleware
const { protect, authorize } = require('../middleware/auth');

// Setup multer storage for company logo uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, path.join(__dirname, '../../public/uploads/company-logo'));
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'company-logo-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // Limit file size to 2MB
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Replace old middleware usage
// router.use(authenticateToken);
router.use(protect);

// Company info routes
router.get('/company', protect, settingsController.getCompanyInfo);
router.post('/company', protect, settingsController.saveCompanyInfo);
router.post(
  '/company/logo', 
  protect, 
  upload.single('logo'), 
  settingsController.uploadCompanyLogo
);

// General settings routes
router.get('/general', protect, settingsController.getGeneralSettings);
router.post('/general', protect, settingsController.saveGeneralSettings);

// Notification settings routes
router.get('/notifications', protect, settingsController.getNotificationSettings);
router.post('/notifications', protect, settingsController.saveNotificationSettings);

// Shipping settings routes
router.get('/shipping', protect, settingsController.getShippingSettings);
router.post('/shipping', protect, settingsController.saveShippingSettings);

// Email settings routes
router.get('/email', protect, settingsController.getEmailSettings);
router.post('/email', protect, settingsController.saveEmailSettings);
router.post('/email/test', protect, settingsController.testEmailSettings);

module.exports = router;