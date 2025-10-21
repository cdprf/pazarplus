const express = require("express");
const router = express.Router();
const marketplaceController = require("../controllers/marketplaceController");
const { isAuthenticated } = require("../middleware/auth");

// @route   POST /api/marketplaces/sync
// @desc    Sync all products to all active marketplaces
// @access  Private
router.post("/sync", isAuthenticated, marketplaceController.syncAllMarketplaces);

module.exports = router;