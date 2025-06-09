const express = require("express");
const router = express.Router();
const shippingTemplatesController = require("../controllers/shipping-templates-controller");
const { auth } = require("../middleware/auth");

// Apply authentication middleware
router.use(auth);

// This is the route that will be accessible at /api/shipping
router.post("/templates/generate-pdf", async (req, res) => {
    console.log("Received generate-pdf request at /api/shipping/templates/generate-pdf:", {
        url: req.originalUrl,
        method: req.method,
        body: req.body,
        path: req.path,
        baseUrl: req.baseUrl
    });
    
    // Forward to the controller
    return shippingTemplatesController.generatePDF(req, res);
});

module.exports = router;
