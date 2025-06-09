// Template-based PDF Generator Service
// Generates shipping slips using custom templates from the designer

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const bwipjs = require("bwip-js");
const logger = require("../utils/logger");

// Element types constants
const ELEMENT_TYPES = {
  // Basic elements
  TEXT: "text",
  IMAGE: "image",
  BARCODE: "barcode",
  QR_CODE: "qr_code",
  // Contact & Address
  RECIPIENT: "recipient",
  SENDER: "sender",
  CUSTOMER_INFO: "customer_info",
  SHIPPING_ADDRESS: "shipping_address",
  BILLING_ADDRESS: "billing_address",
  // Order Information
  ORDER_SUMMARY: "order_summary",
  ORDER_DETAILS: "order_details",
  ORDER_ITEMS: "order_items",
  ORDER_TOTALS: "order_totals",
  PAYMENT_INFO: "payment_info",
  // Product Information
  PRODUCT_LIST: "product_list",
  PRODUCT_DETAILS: "product_details",
  INVENTORY_INFO: "inventory_info",
  // Shipping & Tracking
  TRACKING_INFO: "tracking_info",
  CARRIER_INFO: "carrier_info",
  SHIPPING_METHOD: "shipping_method",
  DELIVERY_INFO: "delivery_info",
  // Platform Specific
  PLATFORM_INFO: "platform_info",
  TRENDYOL_DATA: "trendyol_data",
  HEPSIBURADA_DATA: "hepsiburada_data",
  N11_DATA: "n11_data",
  // Financial & Compliance
  INVOICE_INFO: "invoice_info",
  TAX_INFO: "tax_info",
  COMPLIANCE_DATA: "compliance_data",
  // Layout & Design
  HEADER: "header",
  FOOTER: "footer",
  DIVIDER: "divider",
  SPACER: "spacer",
  LINE: "line",
  RECTANGLE: "rectangle",
  // Date & Time
  DATE: "date",
  TRACKING_NUMBER: "tracking_number",
  // Custom Fields
  CUSTOM_FIELD: "custom_field",
  CUSTOM_TABLE: "custom_table",
  CUSTOM_LIST: "custom_list",
};

class TemplateBasedPDFGenerator {
  constructor() {
    this.outputDir = path.join(__dirname, "../public/shipping");

    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate a shipping slip PDF using a custom template
   * @param {Object} template - Template configuration with elements
   * @param {Object} orderData - Order data to populate the template
   * @param {Object} options - Additional options
   * @returns {Object} - Result containing the path to the generated PDF
   */
  async generateFromTemplate(template, orderData, options = {}) {
    try {
      // Validate inputs
      if (!template || !template.config || !template.elements) {
        throw new Error("Invalid template: missing config or elements");
      }

      if (!orderData) {
        throw new Error("Order data is required");
      }

      // Create file path for PDF
      const fileName = `shipping_slip_${orderData.id}_${Date.now()}.pdf`;
      const filePath = path.join(this.outputDir, fileName);

      // Get paper dimensions from template config
      const paperDimensions = this.getPaperDimensions(template.config);

      // Create PDF document with template dimensions and proper encoding
      const doc = new PDFDocument({
        size: [paperDimensions.width, paperDimensions.height],
        margin: 0,
        info: {
          Title: `Shipping Slip ${orderData.id}`,
          Author: "Pazar+ Order Management System",
          Subject: "Shipping Label",
          Creator: "Pazar+ Order Management System",
        },
        // Ensure proper Unicode support for Turkish characters
        compress: true,
        bufferPages: true,
        // Add encoding options for better Unicode support
        autoFirstPage: true,
        pdfVersion: "1.4",
      });

      // Write to file
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Process template elements
      await this.renderTemplateElements(
        doc,
        template.elements,
        orderData,
        paperDimensions
      );

      // Finalize PDF
      doc.end();

      // Wait for the PDF to be fully written
      return new Promise((resolve, reject) => {
        stream.on("finish", () => {
          const publicUrl = `/shipping/${fileName}`;

          resolve({
            success: true,
            message: "Shipping slip generated successfully",
            data: {
              orderId: orderData.id,
              templateName: template.config.name,
              labelUrl: publicUrl,
              filePath,
            },
          });
        });

        stream.on("error", (error) => {
          logger.error(
            `Error writing template-based PDF file: ${error.message}`,
            {
              error,
              orderId: orderData.id,
              templateName: template.config.name,
              filePath,
            }
          );
          reject(error);
        });
      });
    } catch (error) {
      logger.error(
        `Failed to generate template-based shipping slip: ${error.message}`,
        {
          error,
          orderId: orderData?.id,
          templateName: template?.config?.name,
        }
      );

      return {
        success: false,
        message: `Failed to generate shipping slip: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Get paper dimensions based on template config
   * @param {Object} config - Template configuration
   * @returns {Object} - Width and height in points
   */
  getPaperDimensions(config) {
    const paperSizes = {
      A4: { width: 595, height: 842 },
      A5: { width: 420, height: 595 },
      A6: { width: 298, height: 420 },
      Letter: { width: 612, height: 792 },
      Legal: { width: 612, height: 1008 },
    };

    let dimensions = paperSizes[config.paperSize] || paperSizes.A4;

    // Handle orientation
    if (config.orientation === "landscape") {
      dimensions = {
        width: dimensions.height,
        height: dimensions.width,
      };
    }

    return dimensions;
  }

  /**
   * Render all template elements on the PDF
   * @param {PDFDocument} doc - PDF document
   * @param {Array} elements - Template elements
   * @param {Object} orderData - Order data
   * @param {Object} paperDimensions - Paper dimensions
   */
  async renderTemplateElements(doc, elements, orderData, paperDimensions) {
    // Sort elements by z-index
    const sortedElements = elements
      .filter((element) => element.visible !== false)
      .sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));

    for (const element of sortedElements) {
      await this.renderElement(doc, element, orderData, paperDimensions);
    }
  }

  /**
   * Render a single template element
   * @param {PDFDocument} doc - PDF document
   * @param {Object} element - Element to render
   * @param {Object} orderData - Order data
   * @param {Object} paperDimensions - Paper dimensions
   */
  async renderElement(doc, element, orderData, paperDimensions) {
    // Calculate absolute position and size
    const x = (element.position.x / 100) * paperDimensions.width;
    const y = (element.position.y / 100) * paperDimensions.height;
    const width = (element.size.width / 100) * paperDimensions.width;
    const height = (element.size.height / 100) * paperDimensions.height;

    // Debug logging for element positioning
    logger.debug("Rendering element", {
      type: element.type,
      id: element.id?.substring(0, 20),
      position: { x: element.position.x + "%", y: element.position.y + "%" },
      absolutePosition: { x: Math.round(x), y: Math.round(y) },
      size: {
        width: element.size.width + "%",
        height: element.size.height + "%",
      },
      absoluteSize: { width: Math.round(width), height: Math.round(height) },
    });

    // Apply rotation if specified
    if (element.rotation && element.rotation !== 0) {
      doc.save();
      doc.rotate(element.rotation, x + width / 2, y + height / 2);
    }

    try {
      switch (element.type) {
        case ELEMENT_TYPES.TEXT:
        case "text":
          await this.renderTextElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.BARCODE:
        case "barcode":
          await this.renderBarcodeElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.QR_CODE:
        case "qr_code":
        case "qrcode":
          await this.renderQRCodeElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.IMAGE:
        case "image":
          await this.renderImageElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.RECTANGLE:
        case "rectangle":
          await this.renderRectangleElement(doc, element, x, y, width, height);
          break;
        case ELEMENT_TYPES.LINE:
        case "line":
          await this.renderLineElement(doc, element, x, y, width, height);
          break;
        case ELEMENT_TYPES.DIVIDER:
        case "divider":
          await this.renderDividerElement(doc, element, x, y, width, height);
          break;
        case "table":
          await this.renderTableElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;

        // Contact & Address Elements
        case ELEMENT_TYPES.RECIPIENT:
        case "recipient":
          await this.renderRecipientElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.SENDER:
        case "sender":
          await this.renderSenderElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.CUSTOMER_INFO:
        case "customer_info":
          await this.renderCustomerInfoElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.SHIPPING_ADDRESS:
        case "shipping_address":
          await this.renderShippingAddressElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.BILLING_ADDRESS:
        case "billing_address":
          await this.renderBillingAddressElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;

        // Order Information Elements
        case ELEMENT_TYPES.ORDER_SUMMARY:
        case "order_summary":
          await this.renderOrderSummaryElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.ORDER_DETAILS:
        case "order_details":
          await this.renderOrderDetailsElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.ORDER_ITEMS:
        case "order_items":
          await this.renderOrderItemsElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.ORDER_TOTALS:
        case "order_totals":
          await this.renderOrderTotalsElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.PAYMENT_INFO:
        case "payment_info":
          await this.renderPaymentInfoElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;

        // Product Information Elements
        case ELEMENT_TYPES.PRODUCT_LIST:
        case "product_list":
          await this.renderProductListElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.PRODUCT_DETAILS:
        case "product_details":
          await this.renderProductDetailsElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.INVENTORY_INFO:
        case "inventory_info":
          await this.renderInventoryInfoElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;

        // Shipping & Tracking Elements
        case ELEMENT_TYPES.TRACKING_INFO:
        case "tracking_info":
          await this.renderTrackingInfoElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.CARRIER_INFO:
        case "carrier_info":
          await this.renderCarrierInfoElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.SHIPPING_METHOD:
        case "shipping_method":
          await this.renderShippingMethodElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.DELIVERY_INFO:
        case "delivery_info":
          await this.renderDeliveryInfoElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;

        // Platform Specific Elements
        case ELEMENT_TYPES.PLATFORM_INFO:
        case "platform_info":
          await this.renderPlatformInfoElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.TRENDYOL_DATA:
        case "trendyol_data":
          await this.renderTrendyolDataElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.HEPSIBURADA_DATA:
        case "hepsiburada_data":
          await this.renderHepsiburadaDataElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.N11_DATA:
        case "n11_data":
          await this.renderN11DataElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;

        // Financial & Compliance Elements
        case ELEMENT_TYPES.INVOICE_INFO:
        case "invoice_info":
          await this.renderInvoiceInfoElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.TAX_INFO:
        case "tax_info":
          await this.renderTaxInfoElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.COMPLIANCE_DATA:
        case "compliance_data":
          await this.renderComplianceDataElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;

        // Layout & Design Elements
        case ELEMENT_TYPES.HEADER:
        case "header":
          await this.renderHeaderElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.FOOTER:
        case "footer":
          await this.renderFooterElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.SPACER:
        case "spacer":
          // Spacer doesn't render anything, just takes up space
          break;

        // Date & Time Elements
        case ELEMENT_TYPES.DATE:
        case "date":
          await this.renderDateElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.TRACKING_NUMBER:
        case "tracking_number":
          await this.renderTrackingNumberElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;

        // Custom Fields
        case ELEMENT_TYPES.CUSTOM_FIELD:
        case "custom_field":
          await this.renderCustomFieldElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.CUSTOM_TABLE:
        case "custom_table":
          await this.renderCustomTableElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;
        case ELEMENT_TYPES.CUSTOM_LIST:
        case "custom_list":
          await this.renderCustomListElement(
            doc,
            element,
            orderData,
            x,
            y,
            width,
            height
          );
          break;

        default:
          logger.warn(`Unknown element type: ${element.type}`);
          // Render a placeholder for unknown element types
          await this.renderPlaceholderElement(
            doc,
            element,
            x,
            y,
            width,
            height
          );
      }
    } catch (error) {
      logger.error(`Error rendering element ${element.id}: ${error.message}`, {
        element,
        error,
      });
    }

    // Restore transformation if rotation was applied
    if (element.rotation && element.rotation !== 0) {
      doc.restore();
    }
  }

  /**
   * Render text element with enhanced styling support
   */
  async renderTextElement(doc, element, orderData, x, y, width, height) {
    let content = element.content || "";

    // Apply data mapping if element has dataMapping
    if (element.dataMapping) {
      content = this.applyDataMapping(content, element.dataMapping, orderData);
    } else {
      // Fallback to simple placeholder replacement
      content = this.processContent(content, orderData);
    }

    // Ensure proper UTF-8 encoding for Turkish characters
    content = content.toString().normalize("NFC");

    // Clean up any problematic characters and ensure proper encoding
    content = Buffer.from(content, "utf8").toString("utf8");

    // Apply styling from element.style and resolve CSS variables
    const rawStyle = element.style || {};
    const style = this.resolveStyleVariables(rawStyle);
    const fontSize = style.fontSize || 12;
    const fontFamily = this.getFontFamily(style.fontFamily) || "Helvetica";
    const fontWeight = style.fontWeight || "normal";

    // Set font
    const font = fontWeight === "bold" ? `${fontFamily}-Bold` : fontFamily;
    doc.font(font).fontSize(fontSize);

    // Set text color - ALWAYS set a default color
    const textColor = style.color || "#000000"; // Default to black if no color specified
    doc.fillColor(textColor);

    // Apply background color if specified
    if (style.backgroundColor && style.backgroundColor !== "transparent") {
      doc.save();
      doc.fillColor(style.backgroundColor);
      doc.rect(x, y, width, height).fill();
      doc.restore();
      // Restore text color after background
      doc.fillColor(textColor);
    }

    // Apply border if specified
    if (style.border && style.border !== "none") {
      this.applyBorder(doc, style, x, y, width, height);
    }

    // Calculate text positioning with padding
    const padding = this.parsePadding(style.padding);
    const textX = x + padding.left;
    const textY = y + padding.top;
    const textWidth = width - padding.left - padding.right;
    const textHeight = height - padding.top - padding.bottom;

    // Set text alignment
    const align = style.textAlign || "left";

    // Draw text within the bounds
    try {
      // Calculate proper line gap for multi-line text
      const lineHeight = style.lineHeight || 1.4; // Default to 1.4x font size
      const lineGap =
        typeof lineHeight === "number" && lineHeight > 1
          ? (lineHeight - 1) * fontSize // Convert line-height ratio to gap
          : Math.max(2, fontSize * 0.2); // Minimum 2pt or 20% of font size

      doc.text(content, textX, textY, {
        width: textWidth,
        height: textHeight,
        align: align,
        lineGap: lineGap,
      });

      // Debug logging for text rendering
      logger.debug("Text rendered successfully", {
        content: content.substring(0, 50),
        color: textColor,
        fontSize,
        fontFamily: font,
        position: { x: textX, y: textY },
        dimensions: { width: textWidth, height: textHeight },
      });
    } catch (error) {
      logger.error(`Error rendering text: ${error.message}`, {
        content: content.substring(0, 50),
        color: textColor,
        fontSize,
        fontFamily: font,
        error,
      });

      // Fallback: try with basic settings
      doc.font("Helvetica").fontSize(12).fillColor("#000000");
      doc.text(content || "Text Error", textX, textY, {
        width: textWidth,
        align: "left",
      });
    }
  }

  /**
   * Render barcode element
   */
  async renderBarcodeElement(doc, element, orderData, x, y, width, height) {
    try {
      const content = this.processContent(element.content, orderData);

      const barcodeBuffer = await bwipjs.toBuffer({
        bcid: element.barcodeType || "code128",
        text: content,
        scale: 2,
        height: Math.floor(height / 4),
        includetext: element.showText !== false,
        textxalign: "center",
      });

      // Draw barcode image
      doc.image(barcodeBuffer, x, y, {
        width: width,
        height: height,
        fit: [width, height],
      });
    } catch (error) {
      logger.error(`Error generating barcode: ${error.message}`, {
        element,
        error,
      });
      // Fallback to text with proper line spacing
      const fontSize = 12;
      const lineHeight = 1.4;
      const lineGap = (lineHeight - 1) * fontSize;

      doc.font("Helvetica").fontSize(fontSize).fillColor("#ff0000");
      doc.text("BARCODE ERROR", x, y, {
        width: width,
        height: height,
        align: "center",
        lineGap: lineGap,
      });
    }
  }

  /**
   * Render QR code element
   */
  async renderQRCodeElement(doc, element, orderData, x, y, width, height) {
    try {
      const content = this.processContent(element.content, orderData);

      const qrBuffer = await bwipjs.toBuffer({
        bcid: "qrcode",
        text: content,
        scale: 2,
        width: Math.min(width, height) / 4,
        height: Math.min(width, height) / 4,
      });

      // Draw QR code image
      doc.image(qrBuffer, x, y, {
        width: Math.min(width, height),
        height: Math.min(width, height),
        fit: [Math.min(width, height), Math.min(width, height)],
      });
    } catch (error) {
      logger.error(`Error generating QR code: ${error.message}`, {
        element,
        error,
      });
      // Fallback to text with proper line spacing
      const fontSize = 12;
      const lineHeight = 1.4;
      const lineGap = (lineHeight - 1) * fontSize;

      doc.font("Helvetica").fontSize(fontSize).fillColor("#ff0000");
      doc.text("QR ERROR", x, y, {
        width: width,
        height: height,
        align: "center",
        lineGap: lineGap,
      });
    }
  }

  /**
   * Render image element
   */
  async renderImageElement(doc, element, orderData, x, y, width, height) {
    try {
      if (element.src) {
        // Handle both local files and URLs
        let imagePath = element.src;

        // If it's a relative path, make it absolute
        if (!element.src.startsWith("http") && !path.isAbsolute(element.src)) {
          imagePath = path.join(__dirname, "../public", element.src);
        }

        doc.image(imagePath, x, y, {
          width: width,
          height: height,
          fit: [width, height],
        });
      }
    } catch (error) {
      logger.error(`Error rendering image: ${error.message}`, {
        element,
        error,
      });
      // Draw placeholder rectangle
      doc.rect(x, y, width, height).stroke();

      // Fallback text with proper line spacing
      const fontSize = 12;
      const lineHeight = 1.4;
      const lineGap = (lineHeight - 1) * fontSize;

      doc.font("Helvetica").fontSize(fontSize).fillColor("#666666");
      doc.text("IMAGE", x + width / 2 - 15, y + height / 2 - 6, {
        width: 30,
        align: "center",
        lineGap: lineGap,
      });
    }
  }

  /**
   * Render rectangle element
   */
  async renderRectangleElement(doc, element, x, y, width, height) {
    // Set fill color
    if (element.fillColor) {
      doc.fillColor(element.fillColor);
      doc.rect(x, y, width, height).fill();
    }

    // Set stroke
    if (element.strokeColor && element.strokeWidth > 0) {
      doc.strokeColor(element.strokeColor);
      doc.lineWidth(element.strokeWidth);
      doc.rect(x, y, width, height).stroke();
    }
  }

  /**
   * Render line element
   */
  async renderLineElement(doc, element, x, y, width, height) {
    if (element.strokeColor) {
      doc.strokeColor(element.strokeColor);
    }

    doc.lineWidth(element.strokeWidth || 1);

    // Draw line from start to end point
    const endX = x + width;
    const endY = y + height;

    doc.moveTo(x, y).lineTo(endX, endY).stroke();
  }

  /**
   * Render table element for order items
   */
  async renderTableElement(doc, element, orderData, x, y, width, height) {
    if (!orderData.items || !Array.isArray(orderData.items)) {
      return;
    }

    const fontSize = element.fontSize || 10;
    const rowHeight = fontSize + 4;
    const columns = element.columns || [
      { field: "name", title: "Product", width: 0.4 },
      { field: "quantity", title: "Qty", width: 0.2 },
      { field: "price", title: "Price", width: 0.4 },
    ];

    let currentY = y;

    // Calculate proper line gap for multi-line text
    const lineHeight = element.style?.lineHeight || 1.4; // Default to 1.4x font size
    const lineGap =
      typeof lineHeight === "number" && lineHeight > 1
        ? (lineHeight - 1) * fontSize // Convert line-height ratio to gap
        : Math.max(2, fontSize * 0.2); // Minimum 2pt or 20% of font size

    // Draw headers
    doc.font("Helvetica-Bold").fontSize(fontSize);
    let currentX = x;

    columns.forEach((col) => {
      const colWidth = col.width * width;
      doc.text(col.title, currentX, currentY, {
        width: colWidth,
        lineGap: lineGap,
      });
      currentX += colWidth;
    });

    currentY += rowHeight;

    // Draw items
    doc.font("Helvetica").fontSize(fontSize);

    orderData.items.forEach((item) => {
      if (currentY + rowHeight > y + height) return; // Stop if we exceed bounds

      currentX = x;
      columns.forEach((col) => {
        const colWidth = col.width * width;
        const value = this.getFieldValue(item, col.field);
        doc.text(String(value), currentX, currentY, {
          width: colWidth,
          lineGap: lineGap,
        });
        currentX += colWidth;
      });

      currentY += rowHeight;
    });
  }

  /**
   * Process content by replacing placeholders with actual data
   * @param {String} content - Content with placeholders
   * @param {Object} orderData - Order data
   * @returns {String} - Processed content
   */
  processContent(content, orderData) {
    if (!content) return "";

    return content.replace(/\{\{([^}]+)\}\}/g, (match, placeholder) => {
      const value = this.getFieldValue(orderData, placeholder.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Get field value from object using dot notation
   * @param {Object} obj - Object to get value from
   * @param {String} path - Dot notation path
   * @returns {Any} - Field value
   */
  getFieldValue(obj, path) {
    return path.split(".").reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  // === CONTACT & ADDRESS ELEMENTS ===

  /**
   * Render recipient element
   */
  async renderRecipientElement(doc, element, orderData, x, y, width, height) {
    const recipient = orderData.recipient || orderData.customer || {};
    const content = this.formatAddressBlock(
      [
        recipient.name || recipient.firstName + " " + recipient.lastName,
        recipient.company,
        recipient.address,
        recipient.city + " " + recipient.postalCode,
        recipient.country,
      ].filter(Boolean)
    );

    await this.renderFormattedText(doc, element, content, x, y, width, height);
  }

  /**
   * Render sender element
   */
  async renderSenderElement(doc, element, orderData, x, y, width, height) {
    const sender = orderData.sender || orderData.company || {};
    const content = this.formatAddressBlock(
      [
        sender.name || sender.companyName,
        sender.address,
        sender.city + " " + sender.postalCode,
        sender.country,
        sender.phone,
        sender.email,
      ].filter(Boolean)
    );

    await this.renderFormattedText(doc, element, content, x, y, width, height);
  }

  /**
   * Render customer info element
   */
  async renderCustomerInfoElement(
    doc,
    element,
    orderData,
    x,
    y,
    width,
    height
  ) {
    const customer = orderData.customer || {};
    const content = this.formatInfoBlock([
      {
        label: "Customer",
        value: customer.name || customer.firstName + " " + customer.lastName,
      },
      { label: "Email", value: customer.email },
      { label: "Phone", value: customer.phone },
      { label: "Customer ID", value: customer.id },
    ]);

    await this.renderFormattedText(doc, element, content, x, y, width, height);
  }

  /**
   * Render shipping address element
   */
  async renderShippingAddressElement(
    doc,
    element,
    orderData,
    x,
    y,
    width,
    height
  ) {
    const address = orderData.shippingAddress || orderData.address || {};
    const content = this.formatAddressBlock(
      [
        address.fullName || address.name,
        address.addressLine1,
        address.addressLine2,
        address.city + " " + address.state + " " + address.postalCode,
        address.country,
      ].filter(Boolean)
    );

    await this.renderFormattedText(doc, element, content, x, y, width, height);
  }

  /**
   * Render billing address element
   */
  async renderBillingAddressElement(
    doc,
    element,
    orderData,
    x,
    y,
    width,
    height
  ) {
    const address = orderData.billingAddress || orderData.address || {};
    const content = this.formatAddressBlock(
      [
        address.fullName || address.name,
        address.addressLine1,
        address.addressLine2,
        address.city + " " + address.state + " " + address.postalCode,
        address.country,
      ].filter(Boolean)
    );

    await this.renderFormattedText(doc, element, content, x, y, width, height);
  }

  // === ORDER INFORMATION ELEMENTS ===

  /**
   * Render order summary element
   */
  async renderOrderSummaryElement(
    doc,
    element,
    orderData,
    x,
    y,
    width,
    height
  ) {
    const content = this.formatInfoBlock([
      { label: "Order #", value: orderData.orderNumber || orderData.id },
      {
        label: "Date",
        value: this.formatDate(orderData.createdAt || orderData.orderDate),
      },
      { label: "Status", value: orderData.status },
      {
        label: "Total",
        value: this.formatCurrency(orderData.total || orderData.totalAmount),
      },
      { label: "Items", value: orderData.items?.length || 0 },
    ]);

    await this.renderFormattedText(doc, element, content, x, y, width, height);
  }

  /**
   * Render order details element
   */
  async renderOrderDetailsElement(
    doc,
    element,
    orderData,
    x,
    y,
    width,
    height
  ) {
    const content = this.formatInfoBlock(
      [
        { label: "Order ID", value: orderData.id },
        { label: "Platform Order ID", value: orderData.platformOrderId },
        { label: "Payment Method", value: orderData.paymentMethod },
        { label: "Shipping Method", value: orderData.shippingMethod },
        { label: "Notes", value: orderData.notes },
      ].filter((item) => item.value)
    );

    await this.renderFormattedText(doc, element, content, x, y, width, height);
  }

  /**
   * Render order items element
   */
  async renderOrderItemsElement(doc, element, orderData, x, y, width, height) {
    if (!orderData.items || !Array.isArray(orderData.items)) {
      await this.renderFormattedText(
        doc,
        element,
        "No items",
        x,
        y,
        width,
        height
      );
      return;
    }

    const items = orderData.items
      .map(
        (item) =>
          `${item.quantity}x ${item.name || item.title} - ${this.formatCurrency(
            item.price
          )}`
      )
      .join("\n");

    await this.renderFormattedText(doc, element, items, x, y, width, height);
  }

  /**
   * Render order totals element
   */
  async renderOrderTotalsElement(doc, element, orderData, x, y, width, height) {
    const content = this.formatInfoBlock(
      [
        { label: "Subtotal", value: this.formatCurrency(orderData.subtotal) },
        { label: "Tax", value: this.formatCurrency(orderData.tax) },
        {
          label: "Shipping",
          value: this.formatCurrency(orderData.shippingCost),
        },
        { label: "Discount", value: this.formatCurrency(orderData.discount) },
        {
          label: "Total",
          value: this.formatCurrency(orderData.total || orderData.totalAmount),
        },
      ].filter((item) => item.value !== undefined)
    );

    await this.renderFormattedText(doc, element, content, x, y, width, height);
  }

  /**
   * Render payment info element
   */
  async renderPaymentInfoElement(doc, element, orderData, x, y, width, height) {
    const payment = orderData.payment || {};
    const content = this.formatInfoBlock(
      [
        {
          label: "Payment Method",
          value: payment.method || orderData.paymentMethod,
        },
        {
          label: "Payment Status",
          value: payment.status || orderData.paymentStatus,
        },
        { label: "Transaction ID", value: payment.transactionId },
        { label: "Payment Date", value: this.formatDate(payment.date) },
      ].filter((item) => item.value)
    );

    await this.renderFormattedText(doc, element, content, x, y, width, height);
  }

  // === HELPER METHODS ===

  /**
   * Render formatted text with styling
   */
  async renderFormattedText(doc, element, content, x, y, width, height) {
    const tempElement = { ...element, content };
    await this.renderTextElement(doc, tempElement, {}, x, y, width, height);
  }

  /**
   * Format address block
   */
  formatAddressBlock(lines) {
    return lines.filter(Boolean).join("\n");
  }

  /**
   * Format info block with labels and values
   */
  formatInfoBlock(items) {
    return items
      .filter(
        (item) =>
          item.value !== undefined && item.value !== null && item.value !== ""
      )
      .map((item) => `${item.label}: ${item.value}`)
      .join("\n");
  }

  /**
   * Format date
   */
  formatDate(date) {
    if (!date) return "";
    return new Date(date).toLocaleDateString();
  }

  /**
   * Format currency
   */
  formatCurrency(amount, currency = "₺") {
    if (amount === undefined || amount === null) return "";
    return `${currency}${Number(amount).toFixed(2)}`;
  }

  // === PRODUCT INFORMATION ELEMENTS ===

  /**
   * Render product list element
   */
  async renderProductListElement(doc, element, orderData, x, y, width, height) {
    if (!orderData.items || !Array.isArray(orderData.items)) {
      await this.renderFormattedText(
        doc,
        element,
        "No products",
        x,
        y,
        width,
        height
      );
      return;
    }

    const products = orderData.items
      .map(
        (item, index) =>
          `${index + 1}. ${item.name || item.title} (SKU: ${item.sku || "N/A"})`
      )
      .join("\n");

    await this.renderFormattedText(doc, element, products, x, y, width, height);
  }

  /**
   * Render product details element
   */
  async renderProductDetailsElement(
    doc,
    element,
    orderData,
    x,
    y,
    width,
    height
  ) {
    if (!orderData.items || !Array.isArray(orderData.items)) {
      await this.renderFormattedText(
        doc,
        element,
        "No product details",
        x,
        y,
        width,
        height
      );
      return;
    }

    const details = orderData.items
      .map((item) =>
        [
          `Product: ${item.name || item.title}`,
          `SKU: ${item.sku || "N/A"}`,
          `Quantity: ${item.quantity}`,
          `Price: ${this.formatCurrency(item.price)}`,
          `Total: ${this.formatCurrency(item.quantity * item.price)}`,
          "---",
        ].join("\n")
      )
      .join("\n");

    await this.renderFormattedText(doc, element, details, x, y, width, height);
  }

  /**
   * Render inventory info element
   */
  async renderInventoryInfoElement(
    doc,
    element,
    orderData,
    x,
    y,
    width,
    height
  ) {
    if (!orderData.items || !Array.isArray(orderData.items)) {
      await this.renderFormattedText(
        doc,
        element,
        "No inventory info",
        x,
        y,
        width,
        height
      );
      return;
    }

    const inventory = orderData.items
      .map(
        (item) => `${item.name || item.title}: Stock ${item.stock || "Unknown"}`
      )
      .join("\n");

    await this.renderFormattedText(
      doc,
      element,
      inventory,
      x,
      y,
      width,
      height
    );
  }

  // === SHIPPING & TRACKING ELEMENTS ===

  /**
   * Render tracking info element
   */
  async renderTrackingInfoElement(
    doc,
    element,
    orderData,
    x,
    y,
    width,
    height
  ) {
    const tracking = orderData.tracking || {};
    const content = this.formatInfoBlock([
      {
        label: "Tracking Number",
        value: tracking.number || orderData.trackingNumber,
      },
      { label: "Carrier", value: tracking.carrier || orderData.carrier },
      { label: "Status", value: tracking.status || "Processing" },
      {
        label: "Estimated Delivery",
        value: this.formatDate(tracking.estimatedDelivery),
      },
    ]);

    await this.renderFormattedText(doc, element, content, x, y, width, height);
  }

  /**
   * Render carrier info element
   */
  async renderCarrierInfoElement(doc, element, orderData, x, y, width, height) {
    const carrier = orderData.carrier || orderData.shipping?.carrier || {};
    const content = this.formatInfoBlock([
      { label: "Carrier", value: carrier.name || orderData.carrierName },
      { label: "Service", value: carrier.service || orderData.shippingService },
      { label: "Tracking URL", value: carrier.trackingUrl },
    ]);

    await this.renderFormattedText(doc, element, content, x, y, width, height);
  }

  /**
   * Render shipping method element
   */
  async renderShippingMethodElement(
    doc,
    element,
    orderData,
    x,
    y,
    width,
    height
  ) {
    const method = orderData.shippingMethod || "Standard Shipping";
    const cost = this.formatCurrency(orderData.shippingCost);
    const content = `${method}${cost ? ` - ${cost}` : ""}`;

    await this.renderFormattedText(doc, element, content, x, y, width, height);
  }

  /**
   * Render delivery info element
   */
  async renderDeliveryInfoElement(
    doc,
    element,
    orderData,
    x,
    y,
    width,
    height
  ) {
    const delivery = orderData.delivery || {};
    const content = this.formatInfoBlock([
      {
        label: "Delivery Date",
        value: this.formatDate(delivery.date || orderData.deliveryDate),
      },
      {
        label: "Delivery Time",
        value: delivery.timeSlot || orderData.deliveryTimeSlot,
      },
      {
        label: "Instructions",
        value: delivery.instructions || orderData.deliveryInstructions,
      },
    ]);

    await this.renderFormattedText(doc, element, content, x, y, width, height);
  }

  // === PLATFORM SPECIFIC ELEMENTS ===

  /**
   * Render platform info element
   */
  async renderPlatformInfoElement(
    doc,
    element,
    orderData,
    x,
    y,
    width,
    height
  ) {
    const content = this.formatInfoBlock([
      { label: "Platform", value: orderData.platform || orderData.source },
      { label: "Platform Order ID", value: orderData.platformOrderId },
      { label: "Store", value: orderData.store || orderData.storeName },
      { label: "Channel", value: orderData.channel },
    ]);

    await this.renderFormattedText(doc, element, content, x, y, width, height);
  }

  /**
   * Render Trendyol data element
   */
  async renderTrendyolDataElement(
    doc,
    element,
    orderData,
    x,
    y,
    width,
    height
  ) {
    const trendyol = orderData.trendyol || orderData.platformData || {};
    const content = this.formatInfoBlock([
      {
        label: "Trendyol Order ID",
        value: trendyol.orderId || orderData.platformOrderId,
      },
      { label: "Shipment Package ID", value: trendyol.shipmentPackageId },
      { label: "Cargo Provider", value: trendyol.cargoProvider },
      {
        label: "Estimated Delivery",
        value: this.formatDate(trendyol.estimatedDeliveryDate),
      },
    ]);

    await this.renderFormattedText(doc, element, content, x, y, width, height);
  }

  /**
   * Render Hepsiburada data element
   */
  async renderHepsiburadaDataElement(
    doc,
    element,
    orderData,
    x,
    y,
    width,
    height
  ) {
    const hepsiburada = orderData.hepsiburada || orderData.platformData || {};
    const content = this.formatInfoBlock([
      {
        label: "HB Order Number",
        value: hepsiburada.orderNumber || orderData.platformOrderId,
      },
      { label: "Package ID", value: hepsiburada.packageId },
      { label: "Merchant ID", value: hepsiburada.merchantId },
      { label: "Delivery Type", value: hepsiburada.deliveryType },
    ]);

    await this.renderFormattedText(doc, element, content, x, y, width, height);
  }

  /**
   * Render N11 data element
   */
  async renderN11DataElement(doc, element, orderData, x, y, width, height) {
    const n11 = orderData.n11 || orderData.platformData || {};
    const content = this.formatInfoBlock([
      {
        label: "N11 Order ID",
        value: n11.orderId || orderData.platformOrderId,
      },
      { label: "Shipment ID", value: n11.shipmentId },
      { label: "Cargo Company", value: n11.cargoCompany },
      { label: "Service Type", value: n11.serviceType },
    ]);

    await this.renderFormattedText(doc, element, content, x, y, width, height);
  }

  // === FINANCIAL & COMPLIANCE ELEMENTS ===

  /**
   * Render invoice info element
   */
  async renderInvoiceInfoElement(doc, element, orderData, x, y, width, height) {
    const invoice = orderData.invoice || {};
    const content = this.formatInfoBlock([
      {
        label: "Invoice Number",
        value: invoice.number || orderData.invoiceNumber,
      },
      {
        label: "Invoice Date",
        value: this.formatDate(invoice.date || orderData.invoiceDate),
      },
      { label: "Due Date", value: this.formatDate(invoice.dueDate) },
      { label: "Tax ID", value: invoice.taxId || orderData.taxId },
    ]);

    await this.renderFormattedText(doc, element, content, x, y, width, height);
  }

  /**
   * Render tax info element
   */
  async renderTaxInfoElement(doc, element, orderData, x, y, width, height) {
    const tax = orderData.tax || {};
    const content = this.formatInfoBlock([
      { label: "Tax Rate", value: tax.rate ? `${tax.rate}%` : undefined },
      {
        label: "Tax Amount",
        value: this.formatCurrency(tax.amount || orderData.taxAmount),
      },
      { label: "Tax Type", value: tax.type },
      { label: "Tax Number", value: tax.number || orderData.taxNumber },
    ]);

    await this.renderFormattedText(doc, element, content, x, y, width, height);
  }

  /**
   * Render compliance data element
   */
  async renderComplianceDataElement(
    doc,
    element,
    orderData,
    x,
    y,
    width,
    height
  ) {
    const compliance = orderData.compliance || {};
    const content = this.formatInfoBlock([
      { label: "Compliance Code", value: compliance.code },
      { label: "Regulatory Info", value: compliance.regulatory },
      { label: "Certification", value: compliance.certification },
      { label: "Legal Notice", value: compliance.legalNotice },
    ]);

    await this.renderFormattedText(doc, element, content, x, y, width, height);
  }

  // === LAYOUT & DESIGN ELEMENTS ===

  /**
   * Render header element
   */
  async renderHeaderElement(doc, element, orderData, x, y, width, height) {
    const header = element.content || "SHIPPING LABEL";
    await this.renderFormattedText(doc, element, header, x, y, width, height);
  }

  /**
   * Render footer element
   */
  async renderFooterElement(doc, element, orderData, x, y, width, height) {
    const footer = element.content || "Thank you for your business!";
    await this.renderFormattedText(doc, element, footer, x, y, width, height);
  }

  /**
   * Render divider element
   */
  async renderDividerElement(doc, element, x, y, width, height) {
    const color = element.color || element.strokeColor || "#000000";
    const thickness = element.thickness || element.strokeWidth || 1;

    doc.strokeColor(color);
    doc.lineWidth(thickness);

    if (width > height) {
      // Horizontal divider
      const lineY = y + height / 2;
      doc
        .moveTo(x, lineY)
        .lineTo(x + width, lineY)
        .stroke();
    } else {
      // Vertical divider
      const lineX = x + width / 2;
      doc
        .moveTo(lineX, y)
        .lineTo(lineX, y + height)
        .stroke();
    }
  }

  // === DATE & TIME ELEMENTS ===

  /**
   * Render date element
   */
  async renderDateElement(doc, element, orderData, x, y, width, height) {
    const dateField = element.dateField || "createdAt";
    const format = element.dateFormat || "default";
    const date = orderData[dateField] || new Date();

    let formattedDate;
    switch (format) {
      case "short":
        formattedDate = new Date(date).toLocaleDateString();
        break;
      case "long":
        formattedDate = new Date(date).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        break;
      case "iso":
        formattedDate = new Date(date).toISOString().split("T")[0];
        break;
      default:
        formattedDate = this.formatDate(date);
    }

    await this.renderFormattedText(
      doc,
      element,
      formattedDate,
      x,
      y,
      width,
      height
    );
  }

  /**
   * Render tracking number element
   */
  async renderTrackingNumberElement(
    doc,
    element,
    orderData,
    x,
    y,
    width,
    height
  ) {
    const trackingNumber =
      orderData.trackingNumber ||
      orderData.tracking?.number ||
      "TRK" + Date.now();

    await this.renderFormattedText(
      doc,
      element,
      trackingNumber,
      x,
      y,
      width,
      height
    );
  }

  // === CUSTOM FIELD ELEMENTS ===

  /**
   * Render custom field element
   */
  async renderCustomFieldElement(doc, element, orderData, x, y, width, height) {
    const fieldName = element.fieldName || element.dataMapping?.field;
    const value = fieldName
      ? this.getFieldValue(orderData, fieldName)
      : element.content;
    const content =
      value !== undefined ? String(value) : element.placeholder || "";

    await this.renderFormattedText(doc, element, content, x, y, width, height);
  }

  /**
   * Render custom table element
   */
  async renderCustomTableElement(doc, element, orderData, x, y, width, height) {
    const data = element.dataSource
      ? this.getFieldValue(orderData, element.dataSource)
      : orderData.items;

    if (!data || !Array.isArray(data)) {
      await this.renderFormattedText(
        doc,
        element,
        "No data",
        x,
        y,
        width,
        height
      );
      return;
    }

    // Use table rendering logic
    const tableElement = {
      ...element,
      type: "table",
      columns: element.columns || [
        { field: "name", title: "Item", width: 0.6 },
        { field: "quantity", title: "Qty", width: 0.2 },
        { field: "price", title: "Price", width: 0.2 },
      ],
    };

    await this.renderTableElement(
      doc,
      tableElement,
      { items: data },
      x,
      y,
      width,
      height
    );
  }

  /**
   * Render custom list element
   */
  async renderCustomListElement(doc, element, orderData, x, y, width, height) {
    const data = element.dataSource
      ? this.getFieldValue(orderData, element.dataSource)
      : orderData.items;

    if (!data || !Array.isArray(data)) {
      await this.renderFormattedText(
        doc,
        element,
        "No data",
        x,
        y,
        width,
        height
      );
      return;
    }

    const field = element.displayField || "name";
    const prefix =
      element.listStyle === "numbered" ? (index) => `${index + 1}. ` : "• ";

    const content = data
      .map((item, index) => {
        const value = this.getFieldValue(item, field);
        const prefixStr = typeof prefix === "function" ? prefix(index) : prefix;
        return `${prefixStr}${value || ""}`;
      })
      .join("\n");

    await this.renderFormattedText(doc, element, content, x, y, width, height);
  }

  // === ADDITIONAL HELPER METHODS ===

  /**
   * Render placeholder element for unknown types
   */
  async renderPlaceholderElement(doc, element, x, y, width, height) {
    doc.save();
    doc.strokeColor("#ff0000");
    doc.lineWidth(1);
    doc.rect(x, y, width, height).stroke();

    doc.font("Helvetica").fontSize(10).fillColor("#ff0000");

    // Calculate proper line gap for error text
    const fontSize = 10;
    const lineHeight = 1.4; // Default line height
    const lineGap = (lineHeight - 1) * fontSize;

    doc.text(`Unknown: ${element.type}`, x + 5, y + 5, {
      width: width - 10,
      height: height - 10,
      align: "center",
      lineGap: lineGap,
    });
    doc.restore();
  }

  /**
   * Apply data mapping to content
   */
  applyDataMapping(content, dataMapping, orderData) {
    if (!dataMapping || !dataMapping.field) {
      return this.processContent(content, orderData);
    }

    const value = this.getFieldValue(orderData, dataMapping.field);

    if (dataMapping.format) {
      switch (dataMapping.format) {
        case "currency":
          return this.formatCurrency(value, dataMapping.currency);
        case "date":
          return this.formatDate(value);
        case "uppercase":
          return String(value || "").toUpperCase();
        case "lowercase":
          return String(value || "").toLowerCase();
        default:
          return String(value || "");
      }
    }

    return String(value || "");
  }

  /**
   * Get font family mapping with enhanced Turkish character support
   */
  getFontFamily(fontFamily) {
    const fontMap = {
      Arial: "Helvetica",
      Times: "Times-Roman",
      Courier: "Courier",
      Helvetica: "Helvetica",
      "Times New Roman": "Times-Roman",
      "Courier New": "Courier",
      // Add system fonts that better support Turkish characters
      "DejaVu Sans": "Helvetica", // Fallback to Helvetica but with better handling
      "Liberation Sans": "Helvetica",
      "Noto Sans": "Helvetica",
    };

    return fontMap[fontFamily] || "Helvetica";
  }

  /**
   * Apply border styling
   */
  applyBorder(doc, style, x, y, width, height) {
    const borderColor = style.borderColor || "#000000";
    const borderWidth = style.borderWidth || 1;

    doc.save();
    doc.strokeColor(borderColor);
    doc.lineWidth(borderWidth);
    doc.rect(x, y, width, height).stroke();
    doc.restore();
  }

  /**
   * Parse padding values
   */
  parsePadding(padding) {
    if (!padding) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    if (typeof padding === "number") {
      return { top: padding, right: padding, bottom: padding, left: padding };
    }

    if (typeof padding === "string") {
      const values = padding.split(" ").map((v) => parseInt(v) || 0);
      switch (values.length) {
        case 1:
          return {
            top: values[0],
            right: values[0],
            bottom: values[0],
            left: values[0],
          };
        case 2:
          return {
            top: values[0],
            right: values[1],
            bottom: values[0],
            left: values[1],
          };
        case 4:
          return {
            top: values[0],
            right: values[1],
            bottom: values[2],
            left: values[3],
          };
        default:
          return { top: 0, right: 0, bottom: 0, left: 0 };
      }
    }

    return padding;
  }

  /**
   * Resolve CSS variables to actual values
   */
  resolveCSSVariables(value) {
    if (!value || typeof value !== "string") {
      return value;
    }

    // CSS variable mapping for the design system
    const cssVariables = {
      "--brand-primary": "#0066CC",
      "--brand-secondary": "#004499",
      "--text-primary": "#1A1A1A",
      "--text-secondary": "#666666",
      "--surface-primary": "#FFFFFF",
      "--surface-secondary": "#F8F9FA",
      "--border-primary": "#E5E7EB",
      "--border-secondary": "#D1D5DB",
      "--space-sm": "8px",
      "--space-md": "16px",
      "--space-lg": "24px",
      "--space-xl": "32px",
      "--radius-sm": "4px",
      "--radius-md": "8px",
      "--radius-lg": "12px",
    };

    // Replace CSS variables with actual values
    let resolvedValue = value;
    for (const [variable, actualValue] of Object.entries(cssVariables)) {
      const varPattern = new RegExp(
        `var\\(${variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`,
        "g"
      );
      resolvedValue = resolvedValue.replace(varPattern, actualValue);
    }

    // Remove any remaining var() calls that we don't have mappings for
    resolvedValue = resolvedValue.replace(/var\([^)]+\)/g, "");

    return resolvedValue;
  }

  /**
   * Resolve all CSS variables in a style object
   */
  resolveStyleVariables(style) {
    if (!style || typeof style !== "object") {
      return style;
    }

    const resolvedStyle = { ...style };

    // Properties that might contain CSS variables
    const cssProperties = [
      "color",
      "backgroundColor",
      "borderColor",
      "padding",
      "margin",
      "borderRadius",
    ];

    cssProperties.forEach((prop) => {
      if (resolvedStyle[prop]) {
        resolvedStyle[prop] = this.resolveCSSVariables(resolvedStyle[prop]);
      }
    });

    return resolvedStyle;
  }
}

module.exports = TemplateBasedPDFGenerator;
