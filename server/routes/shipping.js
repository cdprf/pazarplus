const express = require("express");
const router = express.Router();
const shippingTemplatesController = require("../controllers/shipping-templates-controller");
const { auth } = require("../middleware/auth");

// Apply authentication middleware
router.use(auth);

// This is the route that will be accessible at /api/shipping
router.post("/templates/generate-pdf", async (req, res) => {
  // Forward to the controller
  return shippingTemplatesController.generatePDF(req, res);
});

module.exports = router;
