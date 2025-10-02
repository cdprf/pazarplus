const { Vehicle } = require("../models");
const { Op } = require("sequelize");
const logger = require("../utils/logger");

class VehicleController {
  /**
   * Search for vehicles with optional filtering and pagination
   */
  async searchVehicles(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        brand,
        model,
        yearRange,
        engineType,
        transmission,
        fuelType,
        sortBy = "brand",
        sortOrder = "ASC",
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};

      if (brand) {
        whereClause.brand = { [Op.iLike]: `%${brand}%` };
      }
      if (model) {
        whereClause.model = { [Op.iLike]: `%${model}%` };
      }
      if (yearRange) {
        whereClause.yearRange = { [Op.iLike]: `%${yearRange}%` };
      }
      if (engineType) {
        whereClause.engineType = { [Op.iLike]: `%${engineType}%` };
      }
      if (transmission) {
        whereClause.transmission = transmission;
      }
      if (fuelType) {
        whereClause.fuelType = fuelType;
      }

      const { count, rows } = await Vehicle.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset,
        order: [[sortBy, sortOrder]],
      });

      res.json({
        success: true,
        data: {
          vehicles: rows,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / parseInt(limit)),
            totalItems: count,
            itemsPerPage: parseInt(limit),
          },
        },
      });
    } catch (error) {
      logger.error("Failed to search for vehicles:", error);
      res.status(500).json({
        success: false,
        message: "Failed to search for vehicles",
        error: error.message,
      });
    }
  }
}

module.exports = new VehicleController();