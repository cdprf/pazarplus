/**
 * Shipping Templates Controller
 * Handles CRUD operations for shipping slip templates
 */

const { User } = require("../models");
const logger = require("../utils/logger");
const templateBasedPdfGenerator = require("../services/templateBasedPdfGenerator");

class ShippingTemplatesController {
  /**
   * Get all shipping templates for the authenticated user
   */
  async getTemplates(req, res) {
    try {
      const userId = req.user.id;

      // Get user settings which may contain templates
      const user = await User.findByPk(userId);
      const settings = user.settings ? JSON.parse(user.settings) : {};
      const templates = settings.shippingTemplates || [];

      res.json({
        success: true,
        data: templates,
        message: "Shipping templates retrieved successfully",
      });
    } catch (error) {
      logger.error(`Failed to get shipping templates: ${error.message}`, {
        error,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to get shipping templates",
        error: error.message,
      });
    }
  }

  /**
   * Get a single shipping template by ID
   */
  async getTemplate(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const user = await User.findByPk(userId);
      const settings = user.settings ? JSON.parse(user.settings) : {};
      const templates = settings.shippingTemplates || [];

      const template = templates.find((t) => t.id === id);

      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Template not found",
        });
      }

      res.json({
        success: true,
        data: template,
        message: "Template retrieved successfully",
      });
    } catch (error) {
      logger.error(`Failed to get shipping template: ${error.message}`, {
        error,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to get template",
        error: error.message,
      });
    }
  }

  /**
   * Create or update a shipping template
   */
  async saveTemplate(req, res) {
    try {
      const userId = req.user.id;
      const templateData = req.body;

      // Validate required fields
      if (!templateData.name) {
        return res.status(400).json({
          success: false,
          message: "Template name is required",
        });
      }

      // Get current user settings
      const user = await User.findByPk(userId);
      const settings = user.settings ? JSON.parse(user.settings) : {};
      const templates = settings.shippingTemplates || [];

      // Generate ID if not provided
      if (!templateData.id) {
        templateData.id = `template_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 15)}`;
        templateData.createdAt = new Date().toISOString();
      }
      templateData.updatedAt = new Date().toISOString();

      // Find existing template or add new one
      const existingIndex = templates.findIndex(
        (t) => t.id === templateData.id
      );
      if (existingIndex >= 0) {
        templates[existingIndex] = templateData;
      } else {
        templates.push(templateData);
      }

      // Update user settings
      settings.shippingTemplates = templates;
      await user.update({
        settings: JSON.stringify(settings),
      });

      res.json({
        success: true,
        data: templateData,
        message: "Template saved successfully",
      });
    } catch (error) {
      logger.error(`Failed to save shipping template: ${error.message}`, {
        error,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to save template",
        error: error.message,
      });
    }
  }

  /**
   * Delete a shipping template
   */
  async deleteTemplate(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const user = await User.findByPk(userId);
      const settings = user.settings ? JSON.parse(user.settings) : {};
      const templates = settings.shippingTemplates || [];

      const templateIndex = templates.findIndex((t) => t.id === id);

      if (templateIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Template not found",
        });
      }

      // Remove template
      templates.splice(templateIndex, 1);

      // Update user settings
      settings.shippingTemplates = templates;
      await user.update({
        settings: JSON.stringify(settings),
      });

      res.json({
        success: true,
        message: "Template deleted successfully",
      });
    } catch (error) {
      logger.error(`Failed to delete shipping template: ${error.message}`, {
        error,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to delete template",
        error: error.message,
      });
    }
  }

  /**
   * Get default shipping template settings
   */
  async getDefaultTemplate(req, res) {
    try {
      const userId = req.user.id;

      const user = await User.findByPk(userId);
      const settings = user.settings ? JSON.parse(user.settings) : {};
      const defaultTemplateId = settings.defaultShippingTemplateId || null;
      const templates = settings.shippingTemplates || [];

      let defaultTemplate = null;
      if (defaultTemplateId) {
        defaultTemplate = templates.find((t) => t.id === defaultTemplateId);
      }

      res.json({
        success: true,
        data: {
          defaultTemplateId,
          defaultTemplate,
          availableTemplates: templates,
        },
        message: "Default template settings retrieved successfully",
      });
    } catch (error) {
      logger.error(`Failed to get default template: ${error.message}`, {
        error,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to get default template",
        error: error.message,
      });
    }
  }

  /**
   * Set default shipping template
   */
  async setDefaultTemplate(req, res) {
    try {
      const userId = req.user.id;
      const { templateId } = req.body;

      const user = await User.findByPk(userId);
      const settings = user.settings ? JSON.parse(user.settings) : {};
      const templates = settings.shippingTemplates || [];

      // Validate template exists if templateId is provided
      if (templateId && !templates.find((t) => t.id === templateId)) {
        return res.status(404).json({
          success: false,
          message: "Template not found",
        });
      }

      // Update default template setting
      settings.defaultShippingTemplateId = templateId;
      await user.update({
        settings: JSON.stringify(settings),
      });

      res.json({
        success: true,
        data: { defaultTemplateId: templateId },
        message: templateId
          ? "Default template set successfully"
          : "Default template cleared successfully",
      });
    } catch (error) {
      logger.error(`Failed to set default template: ${error.message}`, {
        error,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to set default template",
        error: error.message,
      });
    }
  }

  /**
   * Generate shipping slip for an order using default or specified template
   */
  async generateShippingSlip(req, res) {
    try {
      const userId = req.user.id;
      const { orderId, templateId } = req.body;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: "Order ID is required",
        });
      }

      const user = await User.findByPk(userId);
      const settings = user.settings ? JSON.parse(user.settings) : {};
      const templates = settings.shippingTemplates || [];

      // Use provided templateId or fall back to default
      let useTemplateId = templateId || settings.defaultShippingTemplateId;

      if (!useTemplateId && templates.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "No shipping templates found. Please create a template first.",
        });
      }

      // If no template specified and no default, use the first available template
      if (!useTemplateId && templates.length > 0) {
        useTemplateId = templates[0].id;
      }

      const template = templates.find((t) => t.id === useTemplateId);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Specified template not found",
        });
      }

      // Get order data
      const { Order, OrderItem, ShippingDetail } = require("../models");
      const order = await Order.findByPk(orderId, {
        include: [
          { model: OrderItem, as: "items" },
          { model: ShippingDetail, as: "shippingDetail" },
        ],
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Map order data to template format
      const orderData = this.mapOrderDataForTemplate(order);

      res.json({
        success: true,
        data: {
          template,
          orderData,
          generatedAt: new Date().toISOString(),
        },
        message: "Shipping slip data generated successfully",
      });
    } catch (error) {
      logger.error(`Failed to generate shipping slip: ${error.message}`, {
        error,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to generate shipping slip",
        error: error.message,
      });
    }
  }

  /**
   * Generate PDF using template and order data
   */
  async generatePDF(req, res) {
    try {
      const userId = req.user.id;
      const { orderId, templateId } = req.body;

      console.log(
        `GeneratePDF request: orderId=${orderId}, templateId=${templateId}, userId=${userId}`
      );

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: "Order ID is required",
        });
      }

      const user = await User.findByPk(userId);
      const settings = user.settings ? JSON.parse(user.settings) : {};
      const templates = settings.shippingTemplates || [];

      console.log(
        `GeneratePDF: User has ${templates.length} templates available`
      );
      console.log(
        `GeneratePDF: User default template ID: ${
          settings.defaultShippingTemplateId || "none"
        }`
      );

      // Use provided templateId or fall back to default
      let useTemplateId = templateId || settings.defaultShippingTemplateId;
      console.log(
        `GeneratePDF: Initial template selection: ${useTemplateId || "none"}`
      );

      // Handle null/undefined templateId values more explicitly
      if (
        (!useTemplateId ||
          useTemplateId === "null" ||
          useTemplateId === "undefined") &&
        templates.length > 0
      ) {
        useTemplateId = templates[0].id;
        console.log(
          `GeneratePDF: No valid template ID provided, using first available template: ${useTemplateId}`
        );
      }

      if (
        (!useTemplateId ||
          useTemplateId === "null" ||
          useTemplateId === "undefined") &&
        templates.length === 0
      ) {
        console.log(`GeneratePDF: No templates found for this user`);
        return res.status(404).json({
          success: false,
          message:
            "No shipping templates found. Please create a template first.",
        });
      }

      let template = templates.find((t) => t.id === useTemplateId);

      // If specified template not found but we have other templates, fall back to first template
      if (!template && templates.length > 0) {
        template = templates[0];
        console.log(
          `GeneratePDF: Specified template not found, falling back to first available template: ${template.id}`
        );
      }

      if (!template) {
        console.log(`GeneratePDF: No valid template found after fallbacks`);
        return res.status(404).json({
          success: false,
          message:
            "Specified template not found and no fallback templates available",
        });
      }

      console.log(`GeneratePDF: Selected template: ${template.id}`);

      // Get order data
      const { Order, OrderItem, ShippingDetail } = require("../models");
      const order = await Order.findByPk(orderId, {
        include: [
          { model: OrderItem, as: "items" },
          { model: ShippingDetail, as: "shippingDetail" },
        ],
      });

      if (!order) {
        console.log(`GeneratePDF: Order not found: ${orderId}`);
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      console.log(`GeneratePDF: Found order: ${order.id}, mapping data`);

      // Map order data to template format
      const orderData = this.mapOrderDataForTemplate(order);

      // Generate PDF using template-based generator
      const TemplateBasedPDFGenerator = require("../services/templateBasedPdfGenerator");
      const pdfGenerator = new TemplateBasedPDFGenerator();

      console.log(`GeneratePDF: Generating PDF from template...`);
      const result = await pdfGenerator.generateFromTemplate(
        template,
        orderData
      );

      if (result.success) {
        // Update order with the generated label URL
        await order.update({
          labelUrl: result.data.labelUrl,
          shippingTemplateId: template.id,
        });

        console.log(
          `GeneratePDF: PDF generated successfully: ${result.data.labelUrl}`
        );
        res.json({
          success: true,
          data: {
            orderId: order.id,
            templateId: template.id,
            templateName:
              template.config?.name || template.name || "Untitled Template",
            labelUrl: result.data.labelUrl,
            filePath: result.data.filePath,
            generatedAt: new Date().toISOString(),
          },
          message: "Shipping slip PDF generated successfully",
        });
      } else {
        console.log(
          `GeneratePDF: PDF generation failed: ${
            result.message || "Unknown error"
          }`
        );
        res.status(500).json({
          success: false,
          message: result.message || "Failed to generate PDF",
          error: result.error,
        });
      }
    } catch (error) {
      console.error(`GeneratePDF ERROR: ${error.message}`, error);
      logger.error(`Failed to generate PDF: ${error.message}`, {
        error,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to generate shipping slip PDF",
        error: error.message,
      });
    }
  }

  /**
   * Link an order to a shipping template
   */
  async linkOrderTemplate(req, res) {
    try {
      const userId = req.user.id;
      const { orderId, templateId, autoMap = true } = req.body;

      // Get Order model
      const { Order, OrderItem, ShippingDetail } = require("../models");

      // Verify order exists and belongs to user
      const order = await Order.findOne({
        where: { id: orderId, userId: userId },
        include: [
          { model: OrderItem, as: "items" },
          { model: ShippingDetail, as: "shippingDetail" },
        ],
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found or access denied",
        });
      }

      // Get user settings and verify template exists
      const user = await User.findByPk(userId);
      const settings = user.settings ? JSON.parse(user.settings) : {};
      const templates = settings.shippingTemplates || [];

      const template = templates.find((t) => t.id === templateId);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Template not found",
        });
      }

      // Update order with template ID
      await order.update({ shippingTemplateId: templateId });

      // If autoMap is enabled, prepare the mapped data
      let mappedData = null;
      if (autoMap) {
        mappedData = this.mapOrderDataForTemplate(order);
      }

      res.json({
        success: true,
        data: {
          orderId: order.id,
          templateId: template.id,
          templateName: template.name,
          autoMapped: autoMap,
          mappedData: mappedData,
        },
        message: `Order successfully linked to template "${template.name}"`,
      });
    } catch (error) {
      logger.error(`Failed to link order to template: ${error.message}`, {
        error,
        userId: req.user?.id,
      });
      res.status(500).json({
        success: false,
        message: "Failed to link order to template",
        error: error.message,
      });
    }
  }

  /**
   * Helper method to get user by ID
   */
  async getUser(userId) {
    const { User } = require("../models");
    return await User.findByPk(userId);
  }

  /**
   * Map order data to shipping template format
   */
  mapOrderDataForTemplate(order) {
    const shippingDetail = order.shippingDetail || order.ShippingDetail;
    const items = order.items || order.OrderItems || [];

    return {
      id: order.id, // Add id field for filename generation
      orderNumber: order.orderNumber || order.platformOrderId || order.id,
      createdAt: order.orderDate || order.createdAt,
      status: order.status || order.orderStatus,
      platform: order.platform || order.platformType,
      totalAmount: order.totalAmount,
      currency: order.currency || "TRY",
      customer: {
        name: order.customerName,
        phone: order.customerPhone,
        email: order.customerEmail,
      },
      shippingAddress: shippingDetail
        ? {
            name: shippingDetail.recipientName || order.customerName,
            street: shippingDetail.address,
            city: shippingDetail.city,
            district: shippingDetail.district,
            neighborhood: shippingDetail.neighborhood,
            postalCode: shippingDetail.postalCode,
            country: shippingDetail.country || "Turkey",
            phone: shippingDetail.phone || order.customerPhone,
          }
        : null,
      // Add recipient object for template compatibility
      recipient: shippingDetail
        ? {
            name: shippingDetail.recipientName || order.customerName,
            address: shippingDetail.address,
            city: shippingDetail.city,
            district: shippingDetail.district,
            neighborhood: shippingDetail.neighborhood,
            postalCode: shippingDetail.postalCode,
            country: shippingDetail.country || "Turkey",
            phone: shippingDetail.phone || order.customerPhone,
          }
        : null,
      items: items.map((item) => ({
        product: {
          name: item.productName || item.name,
          sku: item.sku,
          barcode: item.barcode,
        },
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice || item.amount,
      })),
      sender: {
        company: "Pazar+",
        address: "Merkez Mahallesi, İş Merkezi No:45",
        city: "İstanbul",
        postalCode: "34000",
        phone: "+90 212 123 45 67",
        email: "info@pazarplus.com",
        website: "www.pazarplus.com",
      },
      tracking: {
        number: order.trackingNumber,
        carrier: order.carrier,
        url: order.trackingUrl,
      },
    };
  }
}

module.exports = new ShippingTemplatesController();
