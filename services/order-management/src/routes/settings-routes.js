const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const settingsController = require('../controllers/settings-controller');
const authMiddleware = require('../middleware/auth-middleware');

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

// GET - Retrieve company info
router.get('/company', authMiddleware.authenticateToken, settingsController.getCompanyInfo);

// POST - Save company info
router.post('/company', authMiddleware.authenticateToken, settingsController.saveCompanyInfo);

// POST - Upload company logo
router.post(
  '/company/logo', 
  authMiddleware.authenticateToken, 
  upload.single('logo'), 
  settingsController.uploadCompanyLogo
);

module.exports = router;