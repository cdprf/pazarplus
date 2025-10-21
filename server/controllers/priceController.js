const { Product, Supplier, SupplierPrice } = require("../models");
const logger = require("../utils/logger");
const { Op } = require("sequelize");

class PriceController {
  /**
   * Simulate updating prices and stock from a specific supplier's API with more realistic data.
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

      logger.info(`Simulating realistic price update from supplier: ${supplier.name}`);

      // Find all products currently offered by this supplier
      const supplierProducts = await SupplierPrice.findAll({
        where: { supplierId },
        include: [{ model: Product, as: 'product' }]
      });

      if (supplierProducts.length === 0) {
        return res.json({
          success: true,
          message: "No products found for this supplier to update.",
          data: { updatedCount: 0 },
        });
      }

      const updatePromises = supplierProducts.map(item => {
        // Simulate a more realistic price/stock change (e.g., +/- 5-10%)
        const currentPrice = parseFloat(item.priceTl);
        const priceChangePercentage = (Math.random() * 0.10) - 0.05; // -5% to +5%
        const newPrice = (currentPrice * (1 + priceChangePercentage)).toFixed(2);

        const currentStock = item.stockStatus;
        const stockChange = Math.floor(Math.random() * 10) - 5; // -5 to +4
        const newStock = Math.max(0, currentStock + stockChange); // Ensure stock doesn't go below 0

        logger.info(`Updating product SKU ${item.product.sku}: Price ${currentPrice} -> ${newPrice}, Stock ${currentStock} -> ${newStock}`);

        return SupplierPrice.update({
          priceTl: newPrice,
          stockStatus: newStock,
          lastUpdated: new Date(),
        }, {
          where: {
            id: item.id
          }
        });
      });

      await Promise.all(updatePromises);

      logger.info(`Successfully updated ${supplierProducts.length} price records for supplier: ${supplier.name}`);

      res.json({
        success: true,
        message: `Simulated realistic price update complete for supplier ${supplier.name}.`,
        data: {
          updatedCount: supplierProducts.length,
          updatedProductIds: supplierProducts.map(p => p.productId),
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