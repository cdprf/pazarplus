const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const settingsController = require("../controllers/settings-controller");
const shippingTemplatesController = require("../controllers/shipping-templates-controller");
const { auth } = require("../middleware/auth");

// Setup multer storage for company logo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/uploads/company-logo"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "company-logo-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // Limit file size to 2MB
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
});

// Apply authentication middleware
router.use(auth);

// Company info routes
router.get("/company", settingsController.getCompanyInfo);
router.post("/company", settingsController.saveCompanyInfo);
router.post(
  "/company/logo",
  upload.single("logo"),
  settingsController.uploadCompanyLogo
);

// General settings routes
router.get("/general", settingsController.getGeneralSettings);
router.post("/general", settingsController.saveGeneralSettings);

// Notification settings routes
router.get("/notifications", settingsController.getNotificationSettings);
router.post("/notifications", settingsController.saveNotificationSettings);

// Shipping settings routes
router.get("/shipping", settingsController.getShippingSettings);
router.post("/shipping", settingsController.saveShippingSettings);

// Shipping Templates & PDF Designer routes (moved from shipping routes)
router.get("/shipping/templates", shippingTemplatesController.getTemplates);
router.post("/shipping/templates", shippingTemplatesController.saveTemplate);
router.get("/shipping/templates/:id", shippingTemplatesController.getTemplate);
router.post(
  "/shipping/templates/generate-pdf",
  shippingTemplatesController.generatePDF
);
router.get(
  "/shipping/templates/default",
  shippingTemplatesController.getDefaultTemplate
);
router.post(
  "/shipping/templates/default",
  shippingTemplatesController.setDefaultTemplate
);

// Email settings routes
router.get("/email", settingsController.getEmailSettings);
router.post("/email", settingsController.saveEmailSettings);
router.post("/email/test", settingsController.testEmailSettings);

module.exports = router;
