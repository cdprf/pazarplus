const { Vehicle, Product, PartCompatibility } = require("../models");
const { Op } = require("sequelize");
const sequelize = require("../config/database");
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

  /**
   * Get a single vehicle by its VIN code.
   */
  async getVehicleByVIN(req, res) {
    try {
      const { vin } = req.params;

      if (!vin) {
        return res.status(400).json({
          success: false,
          message: "VIN code is required.",
        });
      }

      const vehicle = await Vehicle.findOne({
        where: { vinCode: vin },
      });

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: `Vehicle with VIN code ${vin} not found.`,
        });
      }

      res.json({ success: true, data: vehicle });
    } catch (error) {
      logger.error("Failed to get vehicle by VIN:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve vehicle by VIN.",
        error: error.message,
      });
    }
  }

  /**
   * Get compatible parts based on vehicle properties
   */
  async getPartCompatibilities(req, res) {
    try {
      const {
        brand,
        model,
        yearRange,
        engineType,
        transmission,
        fuelType,
      } = req.query;

      const vehicleWhereClause = {};
      if (brand) vehicleWhereClause.brand = { [Op.iLike]: `%${brand}%` };
      if (model) vehicleWhereClause.model = { [Op.iLike]: `%${model}%` };
      if (yearRange) vehicleWhereClause.yearRange = { [Op.iLike]: `%${yearRange}%` };
      if (engineType) vehicleWhereClause.engineType = { [Op.iLike]: `%${engineType}%` };
      if (transmission) vehicleWhereClause.transmission = transmission;
      if (fuelType) vehicleWhereClause.fuelType = fuelType;

      const compatibilities = await PartCompatibility.findAll({
        include: [
          {
            model: Vehicle,
            as: "vehicle",
            where: vehicleWhereClause,
            attributes: [], // Don't include vehicle attributes in the final result
          },
          {
            model: Product,
            as: "product",
            required: true, // INNER JOIN
          },
        ],
        attributes: [
          [sequelize.fn("DISTINCT", sequelize.col("product.id")), "productId"],
        ],
        raw: true,
      });

      const productIds = compatibilities.map((c) => c.productId);

      const products = await Product.findAll({
        where: {
          id: {
            [Op.in]: productIds,
          },
        },
      });

      res.json({ success: true, data: products });
    } catch (error) {
      logger.error("Failed to get part compatibilities:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get part compatibilities.",
        error: error.message,
      });
    }
  }
}

module.exports = new VehicleController();