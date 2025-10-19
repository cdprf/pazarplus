const express = require("express");
const router = express.Router();
const vehicleController = require("../controllers/vehicleController");
const { isAuthenticated } = require("../middleware/auth"); // Assuming an auth middleware exists

// @route   GET /api/vehicles/search
// @desc    Search for vehicles with filters
// @access  Private
router.get("/search", isAuthenticated, vehicleController.searchVehicles);

// @route   GET /api/vehicles/vin/:vin
// @desc    Get a vehicle by VIN code
// @access  Private
router.get("/vin/:vin", isAuthenticated, vehicleController.getVehicleByVIN);

// @route   GET /api/vehicles/compatibilities
// @desc    Get compatible parts by vehicle properties
// @access  Private
router.get(
  "/compatibilities",
  isAuthenticated,
  vehicleController.getPartCompatibilities
);

module.exports = router;