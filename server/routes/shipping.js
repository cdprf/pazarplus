const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");

// Apply authentication middleware
router.use(auth);

// Coming Soon response for shipping routes
const comingSoonResponse = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Shipping Management - Coming Soon",
    description:
      "Advanced shipping features are currently under development and will be available soon.",
    features: [
      "Shipping Label Generation",
      "Carrier Integration",
      "Tracking Management",
      "Rate Calculation",
      "Delivery Management",
      "Shipping Analytics",
    ],
    status: "development",
    expectedRelease: "Q3 2025",
    note: "PDF Template Designer has been moved to Settings > Shipping Templates",
  });
};

// Specific routes that show coming soon
router.get("/", comingSoonResponse);
router.get("/create", comingSoonResponse);
router.get("/tracking", comingSoonResponse);
router.get("/carriers", comingSoonResponse);
router.get("/rates", comingSoonResponse);
router.post("/create", comingSoonResponse);
router.post("/tracking", comingSoonResponse);
router.put("*", comingSoonResponse);
router.delete("*", comingSoonResponse);

// Catch remaining routes
router.get("*", comingSoonResponse);
router.post("*", comingSoonResponse);

module.exports = router;
