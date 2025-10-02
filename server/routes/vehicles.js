const express = require("express");
const router = express.Router();
const vehicleController = require("../controllers/vehicleController");
const { isAuthenticated } = require("../middleware/auth"); // Assuming an auth middleware exists

// @route   GET /api/vehicles/search
// @desc    Search for vehicles with filters
// @access  Private
router.get("/search", isAuthenticated, vehicleController.searchVehicles);

module.exports = router;