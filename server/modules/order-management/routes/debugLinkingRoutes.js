const express = require("express");
const router = express.Router();
const debugController = require("../controllers/debug-linking-controller");
const { auth, adminAuth } = require("../../../middleware/auth");

// Debug route (requires admin auth)
router.use(adminAuth);
router.get("/test-stats", debugController.testLinkingStats);

module.exports = router;
