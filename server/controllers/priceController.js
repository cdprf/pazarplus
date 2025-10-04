const { Product, Supplier, SupplierPrice } = require("../models");
const logger = require("../utils/logger");
const { Op } = require("sequelize");

class PriceController {
  /**
   * Simulate updating prices and stock from a specific supplier's API.
   */
  async updatePrices(req, res) {
    try {
      const { supplierId } = req.body;

      if (!supplierId) {
        return res.status(400).json({
          success: false,
          message: "supplierId is required.",
        });
      }

      const supplier = await Supplier.findByPk(supplierId);
      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: "Supplier not found.",
        });
      }

      // Simulate fetching data from the supplier's API.
      // In a real scenario, this would be an actual API call.
      logger.info(`Simulating price update from supplier: ${supplier.name}`);

      // Get a few products to update as a sample.
      const productsToUpdate = await Product.findAll({
        limit: 5,
        order: [["createdAt", "DESC"]],
      });

      if (productsToUpdate.length === 0) {
        return res.json({
          success: true,
          message: "No products found to update.",
          data: { updatedCount: 0 },
        });
      }

      const updatePromises = productsToUpdate.map((product) => {
        // Simulate new price and stock
        const newPrice = (Math.random() * 500 + 50).toFixed(2); // Random price between 50 and 550
        const newStock = Math.floor(Math.random() * 100); // Random stock between 0 and 99

        return SupplierPrice.upsert({
          productId: product.id,
          supplierId: supplierId,
          priceTl: newPrice,
          stockStatus: newStock,
          lastUpdated: new Date(),
        });
      });

      await Promise.all(updatePromises);

      logger.info(`Successfully updated/created ${productsToUpdate.length} price records for supplier: ${supplier.name}`);

      res.json({
        success: true,
        message: `Simulated price update complete for supplier ${supplier.name}.`,
        data: {
          updatedCount: productsToUpdate.length,
          updatedProductIds: productsToUpdate.map(p => p.id),
        },
      });
    } catch (error) {
      logger.error("Failed to simulate price update:", error);
      res.status(500).json({
        success: false,
        message: "Failed to simulate price update.",
        error: error.message,
      });
    }
  }
}

module.exports = new PriceController();