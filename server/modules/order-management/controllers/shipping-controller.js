// src/controllers/shipping-controller.js

const express = require("express");
const pdfGenerator = require("../services/pdfGenerator");
const orderProcessorService = require("../services/orderProcessorService");
const { Order, OrderItem, ShippingDetail, User } = require("../../../models");
const logger = require("../../../utils/logger");
const shippingFactory = require("../../public/shipping/ShippingServiceFactory");
const fs = require("fs");
const path = require("path");

async function generateShippingLabel(req, res) {
  try {
    const { orderId, carrier } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    // Check if order exists
    const order = await Order.findByPk(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order with ID ${orderId} not found`,
      });
    }

    // Generate shipping label
    const result = await pdfGenerator.generateShippingLabel(orderId, {
      carrier,
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error(`Failed to generate shipping label: ${error.message}`, {
      error,
      userId: req.user.id,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to generate shipping label",
      error: error.message,
    });
  }
}

async function generateBulkShippingLabels(req, res) {
  try {
    const { orderIds, carrier } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order IDs are required",
      });
    }

    // Generate bulk shipping labels
    const result = await pdfGenerator.generateBulkShippingLabels(orderIds, {
      carrier,
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error(`Failed to generate bulk shipping labels: ${error.message}`, {
      error,
      userId: req.user.id,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to generate bulk shipping labels",
      error: error.message,
    });
  }
}

async function getShippingLabel(req, res) {
  try {
    const { id } = req.params;

    // Check if order exists
    const order = await Order.findByPk(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order with ID ${id} not found`,
      });
    }

    // Check if order has a label URL
    if (!order.labelUrl) {
      return res.status(404).json({
        success: false,
        message: `No shipping label found for order ${id}`,
      });
    }

    // Extract file path from label URL
    const fileName = order.labelUrl.split("/").pop().split("#")[0]; // Remove page fragment
    const filePath = path.join(__dirname, "../../public/shipping", fileName);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: `Shipping label file not found for order ${id}`,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        platformOrderId: order.platformOrderId,
        trackingNumber: order.trackingNumber,
        carrier: order.carrier,
        labelUrl: order.labelUrl,
      },
    });
  } catch (error) {
    logger.error(`Failed to get shipping label: ${error.message}`, {
      error,
      userId: req.user.id,
      orderId: req.params.id,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to get shipping label",
      error: error.message,
    });
  }
}

async function markAsShipped(req, res) {
  try {
    const { orderIds, trackingNumber, carrier, shippingDate } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order IDs are required",
      });
    }

    if (!trackingNumber || !carrier) {
      return res.status(400).json({
        success: false,
        message: "Tracking number and carrier are required",
      });
    }

    // Add to processing queue
    const result = await orderProcessorService.addToQueue(
      orderIds,
      "markAsShipped",
      {
        trackingNumber,
        carrier,
        shippingDate: shippingDate ? new Date(shippingDate) : new Date(),
      }
    );

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error(`Failed to mark orders as shipped: ${error.message}`, {
      error,
      userId: req.user.id,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to mark orders as shipped",
      error: error.message,
    });
  }
}

async function getSupportedCarriers(req, res) {
  try {
    // Use the modern shipping factory to get supported carriers
    const carriers = shippingFactory.getSupportedCarriers();

    // Transform the data to match the order management format
    const formattedCarriers = carriers.map((carrier) => ({
      id: carrier.code,
      name: carrier.name,
      logo: `/images/carriers/${carrier.code}.png`,
      trackingUrlTemplate: carrier.website
        ? carrier.website
            .replace("https://www.", "https://")
            .replace(".com", ".com/track?tracknum={trackingNumber}")
        : null,
      description: carrier.description,
      features: carrier.features,
      coverage: carrier.coverage,
      estimatedDeliveryDays: carrier.estimatedDeliveryDays,
    }));

    // Add some additional carriers for backward compatibility
    const additionalCarriers = [
      {
        id: "ups",
        name: "UPS",
        logo: "/images/carriers/ups.png",
        trackingUrlTemplate:
          "https://www.ups.com/track?tracknum={trackingNumber}",
        description: "International express delivery",
        coverage: "Turkey and International",
        estimatedDeliveryDays: "1-3",
      },
      {
        id: "dhl",
        name: "DHL",
        logo: "/images/carriers/dhl.png",
        trackingUrlTemplate:
          "https://www.dhl.com/tr-en/home/tracking/tracking-express.html?submit=1&tracking-id={trackingNumber}",
        description: "International express delivery",
        coverage: "Turkey and International",
        estimatedDeliveryDays: "1-3",
      },
      {
        id: "fedex",
        name: "FedEx",
        logo: "/images/carriers/fedex.png",
        trackingUrlTemplate:
          "https://www.fedex.com/fedextrack/?trknbr={trackingNumber}",
        description: "International express delivery",
        coverage: "Turkey and International",
        estimatedDeliveryDays: "1-3",
      },
      {
        id: "generic",
        name: "Generic Carrier",
        logo: "/images/carriers/generic.png",
        trackingUrlTemplate: null,
        description: "Generic shipping option",
        coverage: "Various",
        estimatedDeliveryDays: "2-7",
      },
    ];

    return res.status(200).json({
      success: true,
      data: [...formattedCarriers, ...additionalCarriers],
    });
  } catch (error) {
    logger.error(`Failed to get supported carriers: ${error.message}`, {
      error,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to get supported carriers",
      error: error.message,
    });
  }
}

module.exports = {
  generateShippingLabel,
  generateBulkShippingLabels,
  getShippingLabel,
  markAsShipped,
  getSupportedCarriers,
};
