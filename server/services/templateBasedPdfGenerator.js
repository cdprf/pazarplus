// Template-based PDF Generator Service
// Generates shipping slips using custom templates from the designer

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// Try to require bwip-js for barcode generation - make it optional
let bwipjs = null;
try {
  bwipjs = require("bwip-js");
} catch (_error) {
  logger.warn(
    "bwip-js barcode library not available, barcode generation will be limited"
  );
}

// Try to require sharp for image processing - make it optional
let sharp = null;
try {
  sharp = require("sharp");
} catch (_error) {
  logger.warn(
    "Sharp image processing library not available, image operations will be limited"
  );
}

const logger = require("../utils/logger");
const FontManager = require("../utils/FontManager");

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

    // Initialize FontManager for better font handling
    this.fontManager = new FontManager();

    // Font registry for available fonts
    this.availableFonts = [
      "DejaVuSans",
      "DejaVuSans-Bold",
      "Helvetica",
      "Helvetica-Bold",
      "Times-Roman",
      "Times-Bold",
      "Courier",
      "Courier-Bold",
      // Add more registered fonts here if needed
    ];
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
        compress: true,
        bufferPages: true,
        autoFirstPage: true,
        pdfVersion: "1.4",
      });

      // Register fonts using FontManager
      try {
        const fontRegistrationResult = await this.fontManager.registerFonts(
          doc
        );

        if (fontRegistrationResult.success.length > 0) {
          logger.info(
            `Successfully registered ${fontRegistrationResult.success.length} fonts`,
            {
              fonts: fontRegistrationResult.success.map((f) => f.name),
            }
          );

          // Update available fonts list with registered fonts
          this.availableFonts = [
            ...fontRegistrationResult.success.map((f) => f.name),
            ...this.availableFonts,
          ];
        }

        if (fontRegistrationResult.failed.length > 0) {
          logger.warn(
            `Failed to register ${fontRegistrationResult.failed.length} fonts`,
            {
              fonts: fontRegistrationResult.failed.map(
                (f) => f.file || f.name || "Unknown"
              ),
            }
          );
        }

        if (fontRegistrationResult.fallback) {
          logger.info(
            `Using fallback font: ${fontRegistrationResult.fallback}`
          );
        }
      } catch (fontError) {
        logger.warn(
          "FontManager registration failed, using manual registration",
          {
            error: fontError.message,
          }
        );

        // Fallback to manual font registration
        const fontsPath = path.join(__dirname, "../fonts");
        const dejavuSansPath = path.join(fontsPath, "DejaVuSans.ttf");
        const dejavuSansBoldPath = path.join(fontsPath, "DejaVuSans-Bold.ttf");

        if (fs.existsSync(dejavuSansPath)) {
          doc.registerFont("DejaVuSans", dejavuSansPath);
          logger.debug("DejaVuSans font registered successfully (manual)");
        }

        if (fs.existsSync(dejavuSansBoldPath)) {
          doc.registerFont("DejaVuSans-Bold", dejavuSansBoldPath);
          logger.debug("DejaVuSans-Bold font registered successfully (manual)");
        }
      }

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
    // Conversion factor: 1mm = 2.835 points (72 dpi)
    // Using exact same conversion factor as frontend for consistency
    const MM_TO_PT = 2.835;

    // Paper sizes in millimeters - same values as frontend for consistency
    const paperSizesMM = {
      A4: { width: 210, height: 297 },
      A5: { width: 148, height: 210 },
      A6: { width: 105, height: 148 },
      Letter: { width: 216, height: 279 },
      Legal: { width: 216, height: 356 },
    };

    // Get dimensions in millimeters first
    let dimensionsMM;

    if (config.paperSize === "CUSTOM" && config.customDimensions) {
      dimensionsMM = {
        width: config.customDimensions.width,
        height: config.customDimensions.height,
      };
    } else {
      // Use the same paper size definitions as frontend
      dimensionsMM = paperSizesMM[config.paperSize] || paperSizesMM.A4;
    }

    // Handle orientation
    if (config.orientation === "landscape") {
      dimensionsMM = {
        width: dimensionsMM.height,
        height: dimensionsMM.width,
      };
    }

    // Convert to points for PDF
    return {
      width: Math.round(dimensionsMM.width * MM_TO_PT),
      height: Math.round(dimensionsMM.height * MM_TO_PT),
    };
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
    // Now that both frontend and backend use the same scaling factor for dimensions,
    // we don't need the additional scale factor. Elements should be properly sized.

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

    // Apply styling from element.style and resolve CSS variables
    const rawStyle = element.style || {};
    const style = this.resolveStyleVariables(rawStyle);

    // Convert font size from CSS units to PDF points
    let fontSize = 12; // default

    if (style.fontSize) {
      if (typeof style.fontSize === "string" && style.fontSize.includes("px")) {
        // Convert px to pt (1px = 0.75pt) - standard conversion
        fontSize = parseInt(style.fontSize) * 0.75;
      } else if (typeof style.fontSize === "number") {
        fontSize = style.fontSize;
      } else {
        fontSize = parseInt(style.fontSize) || 12;
      }
    }

    const requestedFont = style.fontFamily || "Helvetica";
    const fontWeight = style.fontWeight || "normal";

    // Use FontManager to validate text and get best font
    let font, validatedContent;

    // Simple font handling without Unicode detection
    font = this.getFontFamily(requestedFont) || "Helvetica";
    validatedContent = content.toString();

    // Apply bold font variant if needed
    if (fontWeight === "bold") {
      if (font === "DejaVuSans") {
        font = "DejaVuSans-Bold";
      } else if (font.endsWith("-Bold")) {
        // Already bold variant
      } else {
        font = `${font}-Bold`;
      }
    }

    // Set font with proper fallback handling
    try {
      doc.font(font).fontSize(fontSize);
    } catch (fontError) {
      logger.warn(`Font ${font} not available, falling back to Helvetica`, {
        error: fontError.message,
      });
      const fallbackFont =
        fontWeight === "bold" ? "Helvetica-Bold" : "Helvetica";
      doc.font(fallbackFont).fontSize(fontSize);
    }

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

    // Calculate text positioning with padding and vertical alignment
    const padding = this.parsePadding(style.padding);
    const textX = x + padding.left;
    const textWidth = width - padding.left - padding.right;
    const textHeight = height - padding.top - padding.bottom;

    // Modern CSS Flexbox alignment calculation
    const elementStyle = element.style || {};
    const verticalAlign = elementStyle.verticalAlign || "top"; // Keep for backward compatibility
    const alignItems = elementStyle.alignItems || "flex-start"; // Modern CSS
    const justifyContent = elementStyle.justifyContent || "flex-start"; // Modern CSS

    let textY = y + padding.top;

    // Use modern CSS properties if available, fall back to legacy
    const effectiveVerticalAlign = this.convertAlignItemsToVerticalAlign(
      alignItems,
      verticalAlign
    );

    if (
      effectiveVerticalAlign === "middle" ||
      effectiveVerticalAlign === "center"
    ) {
      // For middle alignment, estimate text height and center it within available space
      const estimatedTextHeight = fontSize * (elementStyle.lineHeight || 1.4);
      const availableHeight = height - padding.top - padding.bottom;
      textY = y + padding.top + (availableHeight - estimatedTextHeight) / 2;
    } else if (
      effectiveVerticalAlign === "bottom" ||
      effectiveVerticalAlign === "flex-end"
    ) {
      // For bottom alignment, position text at bottom of available space
      const estimatedTextHeight = fontSize * (elementStyle.lineHeight || 1.4);
      textY = y + height - padding.bottom - estimatedTextHeight;
    }
    // "top" or "flex-start" alignment uses original calculation: y + padding.top

    // Handle modern horizontal alignment
    const effectiveTextAlign = this.convertJustifyContentToTextAlign(
      justifyContent,
      elementStyle.textAlign
    );
    const align = effectiveTextAlign || "left";

    // Draw text within the bounds
    try {
      // Calculate proper line gap for multi-line text
      const lineHeight = style.lineHeight || 1.4; // Default to 1.4x font size
      const lineGap =
        typeof lineHeight === "number" && lineHeight > 1
          ? (lineHeight - 1) * fontSize // Convert line-height ratio to gap
          : Math.max(2, fontSize * 0.2); // Minimum 2pt or 20% of font size

      doc.text(validatedContent, textX, textY, {
        width: textWidth,
        height: textHeight,
        align: align,
        lineGap: lineGap,
      });
    } catch (error) {
      logger.error(`Error rendering text: ${error.message}`, {
        content: validatedContent.substring(0, 50),
        originalContent: content.substring(0, 50),
        color: textColor,
        fontSize,
        fontFamily: font,
        error,
      });

      // Fallback: try with basic settings
      doc.font("Helvetica").fontSize(12).fillColor("#000000");
      doc.text(validatedContent || "Text Error", textX, textY, {
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

      // Calculate space for title
      const titleHeight = 16; // Space for "Kargo Barkodu" title
      const titleMargin = 4; // Margin between title and barcode
      const availableBarcodeHeight = height - titleHeight - titleMargin;

      // Render title "Kargo Barkodu" above the barcode
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000");

      doc.text("Kargo Barkodu", x, y, {
        width: width,
        align: "center",
      });

      // Adjust barcode position to be below the title
      const barcodeY = y + titleHeight + titleMargin;

      // Get the barcode type from either barcodeType or options.format (for backward compatibility)
      // Always use lowercase for bwip-js compatibility
      const barcodeType = (
        element.barcodeType ||
        element.options?.format ||
        "code128"
      ).toLowerCase();

      // Generate a better proportioned barcode with fixed height parameters
      // This ensures consistent barcode bars regardless of the element's height
      // CRITICAL FIX: Convert points to mm for bwip-js (1 point = 0.352778 mm)
      const PT_TO_MM = 0.352778;
      let widthMM = width * PT_TO_MM;
      let heightMM = availableBarcodeHeight * PT_TO_MM;

      // Enforce aspect ratio constraints for scanning reliability (same as client)
      const MIN_ASPECT_RATIO = 2.0; // width:height
      const MAX_ASPECT_RATIO = 6.0;
      const aspectRatio = widthMM / heightMM;

      let aspectRatioAdjusted = false;
      if (aspectRatio < MIN_ASPECT_RATIO) {
        heightMM = widthMM / MIN_ASPECT_RATIO;
        aspectRatioAdjusted = true;
        logger.warn(
          `Barcode aspect ratio too narrow (${aspectRatio.toFixed(
            2
          )}), adjusted to ${MIN_ASPECT_RATIO}`
        );
      } else if (aspectRatio > MAX_ASPECT_RATIO) {
        widthMM = heightMM * MAX_ASPECT_RATIO;
        aspectRatioAdjusted = true;
        logger.warn(
          `Barcode aspect ratio too wide (${aspectRatio.toFixed(
            2
          )}), adjusted to ${MAX_ASPECT_RATIO}`
        );
      }

      const barcodeBuffer = bwipjs
        ? await bwipjs.toBuffer({
            bcid: barcodeType,
            text: content,
            scale: 2,
            width: widthMM, // Actual width in mm (converted from points, aspect-ratio adjusted)
            height: heightMM, // Actual height in mm (converted from points, aspect-ratio adjusted)
            includetext: element.showText !== false,
            textxalign: "center",
          })
        : null;

      if (!barcodeBuffer) {
        // If bwip-js is not available, render a text fallback
        const fallbackText = bwipjs
          ? "Error generating barcode"
          : "Barcode library not available";
        doc.font("Helvetica").fontSize(10).fillColor("#666666");
        doc.text(fallbackText, x, y + height / 2, {
          width: width,
          align: "center",
        });
        return;
      }

      // Get alignment settings from element style with modern CSS support
      const elementStyle = element.style || {};
      const modernStyle = this.modernizeAlignment(elementStyle);

      const horizontalAlign = this.convertJustifyContentToTextAlign(
        modernStyle.justifyContent,
        elementStyle.textAlign || "center"
      );
      const verticalAlign = this.convertAlignItemsToVerticalAlign(
        modernStyle.alignItems,
        elementStyle.verticalAlign || "top"
      );

      // Calculate positioning based on alignment
      let barcodeX = x;
      let finalBarcodeY = barcodeY;

      // Horizontal alignment for barcode
      if (horizontalAlign === "center") {
        barcodeX = x; // Use original x as barcode is drawn within the container
      } else if (horizontalAlign === "right") {
        barcodeX = x; // Use original x as barcode is drawn within the container
      } else {
        // "left" alignment uses original x position
        barcodeX = x;
      }

      // Vertical alignment for barcode
      if (verticalAlign === "middle") {
        const totalBarcodeHeight =
          titleHeight + titleMargin + availableBarcodeHeight;
        finalBarcodeY =
          y + (height - totalBarcodeHeight) / 2 + titleHeight + titleMargin;
        // Adjust title position too
        const titleY = y + (height - totalBarcodeHeight) / 2;
        doc.text("Kargo Barkodu", x, titleY, {
          width: width,
          align: "center",
        });
      } else if (verticalAlign === "bottom") {
        const totalBarcodeHeight =
          titleHeight + titleMargin + availableBarcodeHeight;
        finalBarcodeY = y + height - availableBarcodeHeight;
        // Adjust title position too
        const titleY = y + height - totalBarcodeHeight;
        doc.text("Kargo Barkodu", x, titleY, {
          width: width,
          align: "center",
        });
      } else {
        // "top" alignment - render title normally
        doc.text("Kargo Barkodu", x, y, {
          width: width,
          align: "center",
        });
      }

      // Draw barcode image - preserving aspect ratio, positioned with alignment
      doc.image(barcodeBuffer, barcodeX, finalBarcodeY, {
        width: width,
        height: undefined, // Don't force height to preserve aspect ratio
        align: "center",
        valign: "center",
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

      // Use errorCorrectionLevel if provided
      const options = {
        bcid: "qrcode",
        text: content,
        scale: 2,
        width: Math.min(width, height) / 4,
        height: Math.min(width, height) / 4,
      };

      // Add error correction level if specified
      if (element.errorCorrectionLevel) {
        options.eclevel = element.errorCorrectionLevel;
      }

      const qrBuffer = bwipjs ? await bwipjs.toBuffer(options) : null;

      if (!qrBuffer) {
        // If bwip-js is not available, render a text fallback
        const fallbackText = bwipjs
          ? "Error generating QR code"
          : "QR code library not available";
        doc.font("Helvetica").fontSize(10).fillColor("#666666");
        doc.text(fallbackText, x, y + height / 2, {
          width: width,
          align: "center",
        });
        return;
      }

      // Get alignment settings from element style with modern CSS support
      const elementStyle = element.style || {};
      const modernStyle = this.modernizeAlignment(elementStyle);

      const horizontalAlign = this.convertJustifyContentToTextAlign(
        modernStyle.justifyContent,
        elementStyle.textAlign || "center"
      );
      const verticalAlign = this.convertAlignItemsToVerticalAlign(
        modernStyle.alignItems,
        elementStyle.verticalAlign || "top"
      );

      // Calculate QR code dimensions
      const qrSize = Math.min(width, height);

      // Calculate positioning based on alignment
      let qrX = x;
      let qrY = y;

      // Horizontal alignment
      if (horizontalAlign === "center") {
        qrX = x + (width - qrSize) / 2;
      } else if (horizontalAlign === "right") {
        qrX = x + width - qrSize;
      }
      // "left" alignment uses original x position

      // Vertical alignment
      if (verticalAlign === "middle") {
        qrY = y + (height - qrSize) / 2;
      } else if (verticalAlign === "bottom") {
        qrY = y + height - qrSize;
      }
      // "top" alignment uses original y position

      // Draw QR code image with alignment
      doc.image(qrBuffer, qrX, qrY, {
        width: qrSize,
        height: qrSize,
        fit: [qrSize, qrSize],
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
      // Get image source from element - could be in src, content, or other properties
      const imageSource = element.src || element.content || element.imageSrc;

      if (!imageSource) {
        throw new Error("No image source provided");
      }

      let imagePath = imageSource;

      // Handle different types of image sources
      if (
        imageSource.startsWith("http://") ||
        imageSource.startsWith("https://")
      ) {
        // URL - use as is
        imagePath = imageSource;
      } else if (imageSource.startsWith("data:")) {
        // Base64 data URL - PDFKit can handle this directly
        imagePath = imageSource;
      } else {
        // Local file path
        if (!path.isAbsolute(imageSource)) {
          // Try different possible paths
          const possiblePaths = [
            path.join(__dirname, "../public", imageSource),
            path.join(__dirname, "../public/images", imageSource),
            path.join(__dirname, "../", imageSource),
            path.join(process.cwd(), "server/public", imageSource),
            path.join(process.cwd(), "server/public/images", imageSource),
          ];

          let foundPath = null;
          for (const testPath of possiblePaths) {
            if (require("fs").existsSync(testPath)) {
              foundPath = testPath;
              break;
            }
          }

          if (foundPath) {
            imagePath = foundPath;
          } else {
            throw new Error(
              `Image file not found. Tried paths: ${possiblePaths.join(", ")}`
            );
          }
        } else {
          // Absolute path - check if it exists
          if (!require("fs").existsSync(imageSource)) {
            throw new Error(
              `Image file not found at absolute path: ${imageSource}`
            );
          }
          imagePath = imageSource;
        }
      }

      // Get alignment settings from element style with modern CSS support
      const elementStyle = element.style || {};
      const modernStyle = this.modernizeAlignment(elementStyle);

      const horizontalAlign = this.convertJustifyContentToTextAlign(
        modernStyle.justifyContent,
        elementStyle.textAlign || "left"
      );
      const verticalAlign = this.convertAlignItemsToVerticalAlign(
        modernStyle.alignItems,
        elementStyle.verticalAlign || "top"
      );

      // Handle object-position for images
      const objectPosition = elementStyle.objectPosition || "center";

      // Calculate positioning based on alignment
      let imageX = x;
      let imageY = y;
      let imageWidth = width;
      let imageHeight = height;

      // For proper alignment, we need to consider the fit property
      // Since images can have different aspect ratios, we'll maintain aspect ratio

      // Calculate actual image dimensions maintaining aspect ratio
      // Only try to get metadata for local files with supported formats
      const canUseSharp =
        sharp && // Check if sharp is available
        !imageSource.startsWith("http://") &&
        !imageSource.startsWith("https://") &&
        !imageSource.startsWith("data:") &&
        require("fs").existsSync(imagePath);

      if (canUseSharp) {
        try {
          // Check if file extension is supported by Sharp
          const supportedExtensions = [
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
            ".gif",
            ".svg",
            ".tiff",
            ".tif",
            ".bmp",
          ];
          const fileExtension = path.extname(imagePath).toLowerCase();

          if (supportedExtensions.includes(fileExtension)) {
            const imageInfo = await sharp(imagePath).metadata();
            if (imageInfo && imageInfo.width && imageInfo.height) {
              const aspectRatio = imageInfo.width / imageInfo.height;
              const containerAspectRatio = width / height;

              if (aspectRatio > containerAspectRatio) {
                // Image is wider - fit to width
                imageWidth = width;
                imageHeight = width / aspectRatio;
              } else {
                // Image is taller - fit to height
                imageHeight = height;
                imageWidth = height * aspectRatio;
              }

              logger.debug("Successfully got image metadata with Sharp", {
                originalDimensions: {
                  width: imageInfo.width,
                  height: imageInfo.height,
                },
                calculatedDimensions: {
                  width: imageWidth,
                  height: imageHeight,
                },
                aspectRatio: aspectRatio.toFixed(2),
              });
            }
          } else {
            logger.debug("Unsupported image format for Sharp metadata", {
              extension: fileExtension,
              supportedExtensions,
            });
          }
        } catch (err) {
          logger.warn(
            "Sharp metadata extraction failed, using container dimensions",
            {
              error: err.message,
              imagePath: imagePath.substring(0, 100), // Truncate long paths
            }
          );
          // If we can't get image info, use container dimensions
          imageWidth = width;
          imageHeight = height;
        }
      } else {
        logger.debug("Skipping Sharp metadata for non-local image", {
          imageType: imageSource.startsWith("http")
            ? "URL"
            : imageSource.startsWith("data:")
            ? "Data URL"
            : "Other",
          imagePath: imagePath.substring(0, 100), // Truncate long paths
        });
        // For URLs and data URLs, use container dimensions
        imageWidth = width;
        imageHeight = height;
      }

      // Horizontal alignment
      if (horizontalAlign === "center") {
        imageX = x + (width - imageWidth) / 2;
      } else if (horizontalAlign === "right") {
        imageX = x + width - imageWidth;
      }
      // "left" alignment uses original x position

      // Vertical alignment
      if (verticalAlign === "middle") {
        imageY = y + (height - imageHeight) / 2;
      } else if (verticalAlign === "bottom") {
        imageY = y + height - imageHeight;
      }
      // "top" alignment uses original y position

      // Add the image to the PDF
      doc.image(imagePath, imageX, imageY, {
        width: imageWidth,
        height: imageHeight,
        fit: [imageWidth, imageHeight],
      });
    } catch (error) {
      console.error(`Error rendering image element:`, {
        src: element.src,
        content: element.content,
        imageSrc: element.imageSrc,
        error: error.message,
        position: { x, y, width, height },
      });

      // Draw placeholder rectangle with error info
      doc.rect(x, y, width, height).stroke("#ff0000");

      // Show error message in the placeholder
      const fontSize = Math.min(10, Math.max(8, width / 20));
      doc.font("Helvetica").fontSize(fontSize).fillColor("#ff0000");

      const errorText = `IMAGE ERROR\n${
        element.src || element.content || "No source"
      }\n${error.message}`;
      doc.text(errorText, x + 5, y + 5, {
        width: width - 10,
        height: height - 10,
        align: "center",
        valign: "center",
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
      if (currentY + rowHeight > y + height) {
        return;
      } // Stop if we exceed bounds

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
  /**
   * Ensure proper text encoding for Turkish characters
   * @param {string} text - Input text
   * @returns {string} - Properly encoded text
   */
  ensureProperEncoding(text) {
    if (!text || typeof text !== "string") {
      return text;
    }

    // Simple text processing without Unicode normalization
    return text;
  }

  /**
   * Process content with encoding and placeholder replacement
   * @param {string} content - Content to process
   * @param {Object} orderData - Order data for placeholders
   * @returns {string} - Processed content
   */
  processContent(content, orderData) {
    if (!content) {
      return "";
    }

    // First process placeholders
    const processed = content.replace(
      /\{\{([^}]+)\}\}/g,
      (match, placeholder) => {
        const value = this.getFieldValue(orderData, placeholder.trim());
        return value !== undefined ? String(value) : match;
      }
    );

    // Then ensure proper encoding
    return this.ensureProperEncoding(processed);
  }

  /**
   * Get field value from object using dot notation
   * @param {Object} obj - Object to get value from
   * @param {String} path - Dot notation path
   * @returns {Any} - Field value
   */
  getFieldValue(obj, path) {
    // Handle special placeholders
    switch (path.toUpperCase()) {
      case "CARGO_TRACKING_NUMBER":
      case "TRACKING_NUMBER":
        // Try to get cargo tracking number from multiple sources
        let trackingNumber =
          obj.cargoTrackingNumber || obj.trackingNumber || obj.tracking?.number;

        // Check for cargoTrackingNumber in raw data (Trendyol and N11)
        if (!trackingNumber && obj.rawData) {
          if (obj.rawData.cargoTrackingNumber) {
            trackingNumber = obj.rawData.cargoTrackingNumber;
          }
        }

        return trackingNumber || "TRK" + Date.now();

      case "ORDER_NUMBER":
        return obj.orderNumber || obj.externalOrderId;

      case "ORDER_DATE":
        return obj.orderDate
          ? new Date(obj.orderDate).toLocaleDateString("tr-TR")
          : "";

      case "SENDER_NAME":
        return "PAZAR PLUS";

      case "SENDER_ADDRESS":
        return "Merkez Mahallesi, Merkezi No:45";

      case "SENDER_CITY":
        return "İstanbul";

      case "SENDER_POSTAL_CODE":
        return "34000";

      case "RECIPIENT_NAME":
        return (
          obj.customerName ||
          obj.customer?.firstName + " " + obj.customer?.lastName ||
          "Müşteri"
        );

      case "RECIPIENT_ADDRESS":
        return obj.shippingAddress || obj.customer?.address || "";

      case "RECIPIENT_CITY":
        return obj.customer?.city || "";

      case "RECIPIENT_POSTAL_CODE":
        return obj.customer?.postalCode || "";

      case "RECIPIENT_PHONE":
        return obj.customerPhone || obj.customer?.phone || "";

      case "CARGO_TRACKING_LINK":
        return obj.cargoTrackingLink || "";

      case "CARGO_COMPANY":
        return obj.cargoCompany || "";
    }

    // Default dot notation handling
    return path.split(".").reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  // === CONTACT & ADDRESS ELEMENTS ===

  /**
   * Render recipient element
   */
  async renderRecipientElement(doc, element, orderData, x, y, width, height) {
    try {
      // Fix: Handle both object and string formats for shipping address
      const recipient = orderData.recipient || orderData.customer || {};
      const order = orderData.order || orderData;

      // Extract recipient information with multiple fallback paths
      const recipientName =
        recipient.name ||
        recipient.recipientName ||
        (recipient.firstName && recipient.lastName
          ? `${recipient.firstName} ${recipient.lastName}`
          : null) ||
        orderData.customerName ||
        "Alıcı bilgisi yok";

      // Fix: Properly handle shippingAddress as both object and string
      let recipientAddress = "Adres bilgisi yok";

      if (
        typeof orderData.shippingAddress === "string" &&
        orderData.shippingAddress.trim()
      ) {
        // If shippingAddress is a string (which it usually is), use it directly
        recipientAddress = orderData.shippingAddress;
      } else if (
        typeof orderData.shippingAddress === "object" &&
        orderData.shippingAddress
      ) {
        // If it's an object, try to extract address properties
        recipientAddress =
          `${orderData.shippingAddress.street} - ${orderData.shippingAddress.city}/${orderData.shippingAddress.country}` ||
          `${orderData.recipient.address} - ${orderData.recipient.city}/${orderData.recipient.country}` ||
          "Adres bilgisi yok";
      } else if (recipient.address) {
        // Fallback to recipient object address
        recipientAddress = recipient.address;
      } else if (orderData.address) {
        // Fallback to orderData.address
        recipientAddress = orderData.address;
      }

      const orderNumber =
        order.orderNumber ||
        order.id ||
        orderData.orderNumber ||
        orderData.id ||
        "Sipariş no yok";

      // Create formatted content with proper encoding for each component
      const encodedRecipientName = this.ensureProperEncoding(recipientName);
      const encodedRecipientAddress =
        this.ensureProperEncoding(recipientAddress);
      const encodedOrderNumber = this.ensureProperEncoding(orderNumber);

      // Get font options from element
      const fontOptions = this.extractFontOptions(element);

      // Prepare structured data for custom rendering with bold labels
      const recipientData = [
        { label: "Sipariş No", value: orderNumber },
        { label: "Alıcı Ad / Soyad", value: recipientName },
        { label: "Adres", value: recipientAddress },
      ];

      // Render with custom bold label formatting
      await this.renderLabelValuePairs(
        doc,
        recipientData,
        fontOptions,
        x,
        y,
        width,
        height
      );
    } catch (error) {
      console.error("Error in renderRecipientElement:", error);

      // Fallback rendering with proper encoding
      const fallbackText = "Alıcı bilgisi yüklenemedi";
      doc.fontSize(12).fillColor("#ff0000");
      doc.text(fallbackText, x, y, {
        width: width,
        align: "left",
      });
    }
  }

  /**
   * Extract font options from element with defaults
   */
  extractFontOptions(element) {
    const style = element.style || {};

    // Use the SAME font mapping as renderTextElement for consistency
    const requestedFont = style.fontFamily || "Helvetica";
    const mappedFont = this.getFontFamily(requestedFont) || "DejaVuSans";

    // Get font size with various fallbacks (same logic as renderTextElement)
    let fontSize = 12;
    if (style.fontSize) {
      if (typeof style.fontSize === "string" && style.fontSize.includes("px")) {
        fontSize = parseInt(style.fontSize) * 0.75; // Convert px to pt
      } else if (typeof style.fontSize === "number") {
        fontSize = style.fontSize;
      } else {
        fontSize = parseInt(style.fontSize) || 12;
      }
    }

    return {
      fontSize: fontSize,
      fontFamily: mappedFont, // Use consistent font mapping
      color: style.color || "#000000",
      lineHeight: parseFloat(style.lineHeight) || 1.4,
      letterSpacing: parseFloat(style.letterSpacing) || 0,
      textAlign: style.textAlign || "left",
      verticalAlign: style.verticalAlign || "top", // top, middle, bottom
      fontWeight: style.fontWeight || "normal",
      // Custom options for spacing
      labelSpacing: element.labelSpacing || 5, // Space between label and value
      lineSpacing: element.lineSpacing || 2, // Extra space between lines
    };
  }

  /**
   * Render label-value pairs with bold labels
   */
  async renderLabelValuePairs(doc, data, fontOptions, x, y, width, height) {
    const {
      fontSize,
      fontFamily,
      color,
      lineHeight,
      labelSpacing,
      lineSpacing,
      letterSpacing,
      textAlign,
      verticalAlign,
    } = fontOptions;

    // Calculate better estimates for content height
    const lineHeightPx = fontSize * lineHeight;

    // Estimate initial content height more accurately by looking at actual data
    let estimatedLines = 0;
    for (const item of data) {
      if (!item.value) {
        continue;
      }
      const valueString = String(item.value);

      // Check if this will likely be a multi-line entry
      if (
        valueString.includes("\n") ||
        valueString.length > 30 ||
        (item.label && item.label.toLowerCase().includes("adres"))
      ) {
        // Address or multi-line: count at least 2 lines (label + 1 line of value)
        estimatedLines += 2 + Math.min(2, Math.floor(valueString.length / 40));
      } else {
        // Regular single-line entry
        estimatedLines += 1;
      }
    }

    // Calculate total height with proper spacing
    const totalContentHeight =
      estimatedLines * lineHeightPx + (data.length - 1) * lineSpacing;

    // Use more conservative padding to maximize content space
    const padding = fontSize * 0.5; // Reduced from fontSize to fontSize * 0.5

    // Calculate vertical alignment offset - improved
    let startY = y + padding;

    if (verticalAlign === "middle") {
      startY = y + Math.max(padding, (height - totalContentHeight) / 2);
    } else if (verticalAlign === "bottom") {
      startY = y + Math.max(padding, height - totalContentHeight - padding);
    }

    // Reduce the top buffer to allow more content
    const topBuffer = fontSize * 0.1; // Reduced from fontSize * 0.3 to fontSize * 0.1
    let currentY = Math.max(startY, y + topBuffer);

    // Use less restrictive boundary checking to allow more content
    const maxY = y + height - padding * 0.5; // Reduced bottom padding

    for (const item of data) {
      // Skip items with truly empty values, but allow "0" and other falsy but meaningful values
      // Also check for whitespace-only strings
      if (
        item.value === null ||
        item.value === undefined ||
        (typeof item.value === "string" && item.value.trim() === "")
      ) {
        logger.debug("Skipping empty item in renderLabelValuePairs", {
          label: item.label,
          value: item.value,
          valueType: typeof item.value,
        });
        continue;
      }

      // Check if we have space for at least one line (less restrictive boundary check)
      if (currentY + lineHeightPx > maxY) {
        logger.debug("Truncating content - not enough space", {
          currentY,
          maxY,
          remainingItems: data.length - data.indexOf(item),
        });
        break; // Stop if we've exceeded the element height
      }

      // Ensure text stays within vertical boundaries
      if (currentY < y) {
        currentY = y + fontSize * 0.1; // Reduced from fontSize * 0.3 to fontSize * 0.1
      }

      try {
        // Set bold font for label with better error handling
        const boldFont = this.getBoldFont(fontFamily);

        logger.debug("Setting bold font for recipient label", {
          requestedFont: fontFamily,
          boldFont: boldFont,
          fontSize: fontSize,
          item: item.label,
          value: item.value,
          valueLength: item.value ? item.value.length : 0,
        });

        // Try to set the bold font, fall back to regular font if it fails
        try {
          doc.font(boldFont).fontSize(fontSize).fillColor(color);
        } catch (fontError) {
          logger.warn(
            `Bold font ${boldFont} not available, using regular font`,
            {
              error: fontError.message,
              fallbackFont: fontFamily,
            }
          );
          try {
            doc.font(fontFamily).fontSize(fontSize).fillColor(color);
          } catch (fallbackError) {
            logger.warn(
              `Regular font ${fontFamily} not available, using Helvetica`,
              {
                error: fallbackError.message,
              }
            );
            doc.font("Helvetica").fontSize(fontSize).fillColor(color);
          }
        }

        // PDFKit doesn't support letter spacing directly
        // For now, we'll render text normally without letter spacing
        const textOptions = {
          width: width,
          align: "left",
        };

        // Normalize label text to prevent wrapping
        const normalizedLabel = item.label.replace(/\s+/g, " ").trim();
        const labelText = `${normalizedLabel}:`;

        // Measure width with the normal text (with spaces) for calculations
        // Check if doc.widthOfString exists (PDFKit method)
        let labelWidth = labelText.length * fontSize * 0.6; // Fallback calculation
        if (typeof doc.widthOfString === "function") {
          try {
            labelWidth = doc.widthOfString(labelText);
          } catch (error) {
            logger.debug("Failed to calculate text width, using fallback", {
              error: error.message,
              text: labelText.substring(0, 30),
            });
          }
        }

        // Ensure labels never wrap - they should be on a single line
        // If label is too long, we'll truncate with ellipsis
        const maxLabelWidth = width * 0.6; // Labels shouldn't take more than 60% of width
        const actualLabelWidth = Math.min(labelWidth, maxLabelWidth);

        // Calculate available width for value
        const availableValueWidth = Math.max(
          width - actualLabelWidth - labelSpacing,
          width * 0.3
        );

        // For long addresses, we might need to wrap text
        const valueString = String(item.value);

        // Better wrapping detection:
        // 1. Check for explicit line breaks
        // 2. Check if text is too long to fit in one line (using PDFKit's widthOfString)
        // 3. Special handling for address field (always wrap address)
        const textWidth = doc.widthOfString(valueString);
        const isAddress =
          item.label && item.label.toLowerCase().includes("adres");
        const shouldWrapText =
          valueString.includes("\n") ||
          textWidth > (width - labelWidth - labelSpacing) * 0.9 ||
          (isAddress && valueString.length > 25);

        if (shouldWrapText) {
          // Check if we're too close to the top or a previous element
          // This ensures labels don't overlap with content above
          const labelTopBuffer = fontSize * 0.3;

          // Make sure there's enough space for the label
          if (currentY < y + labelTopBuffer) {
            currentY = y + labelTopBuffer;
          }

          // Render label on its own line - ensure it NEVER wraps
          // Force rendering as a single line by replacing spaces with non-breaking spaces
          const noWrapLabelText = labelText.replace(/ /g, "\u00A0");
          // Also replace slash character which can cause wrapping
          const finalLabelText = noWrapLabelText.replace(/\//g, "\u2215");

          doc.text(finalLabelText, x, currentY, {
            width: width,
            align: textAlign || "left",
            ellipsis: true, // Use ellipsis if too long
            lineBreak: false, // No line breaks in labels
          });

          // Move down for value with appropriate spacing
          currentY += lineHeightPx;

          // Check if we still have space for the value
          if (currentY + lineHeightPx > maxY) {
            break;
          }

          // Set normal font for value
          try {
            doc.font(fontFamily).fontSize(fontSize).fillColor(color);
          } catch (fontError) {
            logger.warn(
              `Font ${fontFamily} not available for value, using DejaVuSans`,
              {
                error: fontError.message,
              }
            );
            try {
              doc.font("DejaVuSans").fontSize(fontSize).fillColor(color);
            } catch (fallbackError) {
              logger.warn(
                `DejaVuSans not available for value, using Helvetica`,
                {
                  error: fallbackError.message,
                }
              );
              doc.font("Helvetica").fontSize(fontSize).fillColor(color);
            }
          }

          // Special handling for address fields - better formatting
          const isAddress =
            item.label && item.label.toLowerCase().includes("adres");
          const indentX = x + (isAddress ? 10 : 5);
          const remainingHeight = maxY - currentY;

          // For addresses, pre-format with linebreaks if it doesn't have them already
          let formattedValue = valueString;
          if (isAddress && !formattedValue.includes("\n")) {
            // Try to intelligently split address on commas or dashes
            formattedValue = formattedValue
              .replace(/,\s*/g, ",\n") // Break after commas
              .replace(/\s-\s/g, "\n-") // Break before dashes
              .replace(/(\d{5})\s+([A-Z])/g, "$1\n$2"); // Break after postal codes
          }

          // Now render with proper formatting
          doc.text(formattedValue, indentX, currentY, {
            width: width - (indentX - x),
            align: textAlign || "left",
            ellipsis: true,
            height: Math.min(lineHeightPx * 4, remainingHeight), // Allow up to 4 lines for addresses
            lineGap: isAddress ? lineSpacing * 0.5 : lineSpacing * 0.25, // Better line spacing for addresses
          });

          // Better calculation of how many lines the text actually took
          // Count actual line breaks plus estimated wrapping
          const explicitLines = (valueString.match(/\n/g) || []).length + 1;
          const estimatedLines = Math.ceil(
            doc.widthOfString(valueString) / (width - 10)
          );
          const actualLines = Math.max(explicitLines, estimatedLines);

          // Calculate actual text height and ensure we don't overlap with next element
          const textHeight = Math.min(
            lineHeightPx * Math.min(actualLines, 5), // Cap at 5 lines maximum
            lineHeightPx * 3,
            remainingHeight
          );

          // Add more conservative spacing after multiline text
          const nextLabelBuffer = fontSize * 0.2; // Reduced from fontSize * 0.5 to fontSize * 0.2
          currentY += textHeight + lineSpacing + nextLabelBuffer;
        } else {
          // Single line layout

          // Render bold label - ensure it NEVER wraps, even with spaces or slashes
          // Force rendering as a single line by replacing spaces with non-breaking spaces
          const noWrapLabelText = labelText.replace(/ /g, "\u00A0");
          // Also replace slash character which can cause wrapping
          const finalLabelText = noWrapLabelText.replace(/\//g, "\u2215");

          doc.text(finalLabelText, x, currentY, {
            width: actualLabelWidth, // Use the capped width to prevent wrapping
            align: textAlign || "left",
            continued: false,
            ellipsis: true, // Use ellipsis if label is too long
            lineBreak: false, // Explicitly disable line breaks
          });

          // Add label spacing - ensure value starts after label but not beyond reasonable width
          const valueStartX =
            x + Math.min(actualLabelWidth, width * 0.6) + labelSpacing;

          // Set normal font for value
          try {
            doc.font(fontFamily).fontSize(fontSize).fillColor(color);
          } catch (fontError) {
            logger.warn(
              `Font ${fontFamily} not available for single-line value, using DejaVuSans`,
              {
                error: fontError.message,
              }
            );
            try {
              doc.font("DejaVuSans").fontSize(fontSize).fillColor(color);
            } catch (fallbackError) {
              logger.warn(
                `DejaVuSans not available for single-line value, using Helvetica`,
                {
                  error: fallbackError.message,
                }
              );
              doc.font("Helvetica").fontSize(fontSize).fillColor(color);
            }
          }

          // Render normal value with spacing from label
          logger.debug("Rendering value text", {
            valueString: valueString,
            valueStartX: valueStartX,
            currentY: currentY,
            availableValueWidth: availableValueWidth,
            labelWidth: labelWidth,
            actualLabelWidth: actualLabelWidth,
          });

          // Ensure we have a reasonable width for the value
          const minValueWidth = 100; // Minimum 100 points for value
          const safeValueWidth = Math.max(availableValueWidth, minValueWidth);
          const safeValueStartX = Math.min(
            valueStartX,
            x + width - safeValueWidth
          );

          try {
            doc.text(valueString, safeValueStartX, currentY, {
              width: safeValueWidth,
              align: textAlign || "left",
              continued: false,
              ellipsis: true,
            });
          } catch (textError) {
            // Fallback: render on next line if positioning fails
            logger.warn(
              "Value text positioning failed, rendering on next line",
              {
                error: textError.message,
                valueString: valueString,
              }
            );
            currentY += lineHeightPx * 0.5;
            doc.text(valueString, x + 10, currentY, {
              width: width - 20,
              align: textAlign || "left",
              continued: false,
              ellipsis: true,
            });
          }

          // Move to next line with more conservative spacing
          const nextLabelSpacing = fontSize * 0.3; // Reduced from fontSize * 0.7 to fontSize * 0.3
          currentY += lineHeightPx + lineSpacing + nextLabelSpacing;
        }
      } catch (error) {
        logger.error("Error rendering label-value pair in recipient element", {
          error: error.message,
          stack: error.stack,
          item: item,
          fontOptions: fontOptions,
        });

        // Fallback to simple text rendering (same as renderTextElement)
        try {
          doc.font("DejaVuSans").fontSize(fontSize).fillColor(color);
          const remainingHeight = maxY - currentY;
          const fallbackValueString = String(item.value);
          doc.text(`${item.label}: ${fallbackValueString}`, x, currentY, {
            width: width,
            align: textAlign || "left",
            ellipsis: true,
            height: Math.min(lineHeightPx * 2, remainingHeight),
          });
          currentY += Math.min(lineHeightPx + lineSpacing, remainingHeight);
        } catch (fallbackError) {
          logger.error("Even fallback rendering failed in recipient element", {
            error: fallbackError.message,
            item: item,
          });
        }
      }
    }
  }

  /**
   * Get bold font variant for a given font family
   */
  getBoldFont(fontFamily) {
    const boldFontMap = {
      DejaVuSans: "DejaVuSans-Bold",
      Helvetica: "Helvetica-Bold",
      "Times-Roman": "Times-Bold",
      Courier: "Courier-Bold",
    };

    const boldFont = boldFontMap[fontFamily];

    // If we don't have a bold variant, use the regular font and rely on fontWeight
    if (!boldFont) {
      return fontFamily || "Helvetica";
    }

    return boldFont;
  }

  /**
   * Render sender element
   */
  async renderSenderElement(doc, element, orderData, x, y, width, height) {
    logger.debug("Rendering sender element", {
      element: element.id,
      orderData: Object.keys(orderData),
    });

    try {
      // Extract font options with robust fallbacks
      const fontOptions = this.extractFontOptions(element);

      // Handle both object and string formats for sender data
      let senderData = [];

      if (typeof orderData.sender === "string" && orderData.sender.trim()) {
        // If sender is a string, use it directly
        senderData = [{ label: "Gönderen", value: orderData.sender }];
      } else if (typeof orderData.sender === "object" && orderData.sender) {
        // If it's an object, extract relevant fields
        const sender = orderData.sender;
        senderData = [
          { label: "Gönderen", value: sender.name || sender.companyName },
          { label: "Adres", value: sender.address },
          {
            label: "Şehir",
            value:
              sender.city + (sender.postalCode ? " " + sender.postalCode : ""),
          },
          { label: "Ülke", value: sender.country },
          { label: "Telefon", value: sender.phone },
          { label: "E-posta", value: sender.email },
        ].filter((item) => item.value);
      } else if (typeof orderData.company === "object" && orderData.company) {
        // Fallback to company data
        const company = orderData.company;
        senderData = [
          { label: "Şirket", value: company.name || company.companyName },
          { label: "Adres", value: company.address },
          {
            label: "Şehir",
            value:
              company.city +
              (company.postalCode ? " " + company.postalCode : ""),
          },
          { label: "Ülke", value: company.country },
          { label: "Telefon", value: company.phone },
          { label: "E-posta", value: company.email },
        ].filter((item) => item.value);
      } else {
        // If no sender data available, show placeholder
        senderData = [
          { label: "Gönderen", value: "Gönderen bilgisi mevcut değil" },
        ];
      }

      // Render using the robust label-value pairs method
      await this.renderLabelValuePairs(
        doc,
        senderData,
        fontOptions,
        x,
        y,
        width,
        height
      );
    } catch (error) {
      logger.error("Error rendering sender element", {
        error: error.message,
        element: element.id,
        orderData: Object.keys(orderData),
      });

      // Fallback to simple text rendering
      try {
        await this.renderFormattedText(
          doc,
          element,
          "Gönderen bilgisi yüklenemedi",
          x,
          y,
          width,
          height
        );
      } catch (fallbackError) {
        logger.error("Fallback rendering failed for sender element", {
          error: fallbackError.message,
        });
      }
    }
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
    logger.debug("Rendering customer info element", {
      element: element.id,
      orderData: Object.keys(orderData),
    });

    try {
      // Extract font options with robust fallbacks
      const fontOptions = this.extractFontOptions(element);

      // Handle both object and string formats for customer data
      let customerData = [];

      if (typeof orderData.customer === "string" && orderData.customer.trim()) {
        // If customer is a string, use it directly
        customerData = [{ label: "Müşteri", value: orderData.customer }];
      } else if (typeof orderData.customer === "object" && orderData.customer) {
        // If it's an object, extract relevant fields
        const customer = orderData.customer;
        const fullName =
          customer.name ||
          (customer.firstName && customer.lastName
            ? `${customer.firstName} ${customer.lastName}`
            : customer.firstName || customer.lastName || "");

        customerData = [
          { label: "Müşteri", value: fullName },
          { label: "E-posta", value: customer.email },
          { label: "Telefon", value: customer.phone },
          { label: "Müşteri ID", value: customer.id || customer.customerId },
        ].filter((item) => item.value);
      } else if (orderData.customerName) {
        // Fallback to direct customer name field
        customerData = [{ label: "Müşteri", value: orderData.customerName }];
      } else if (orderData.buyer) {
        // Another fallback for buyer info
        const buyer = orderData.buyer;
        if (typeof buyer === "string") {
          customerData = [{ label: "Alıcı", value: buyer }];
        } else if (typeof buyer === "object") {
          customerData = [
            { label: "Alıcı", value: buyer.name || buyer.fullName },
            { label: "E-posta", value: buyer.email },
            { label: "Telefon", value: buyer.phone },
          ].filter((item) => item.value);
        }
      } else {
        // If no customer data available, show placeholder
        customerData = [
          { label: "Müşteri", value: "Müşteri bilgisi mevcut değil" },
        ];
      }

      // Render using the robust label-value pairs method
      await this.renderLabelValuePairs(
        doc,
        customerData,
        fontOptions,
        x,
        y,
        width,
        height
      );
    } catch (error) {
      logger.error("Error rendering customer info element", {
        error: error.message,
        element: element.id,
        orderData: Object.keys(orderData),
      });

      // Fallback to simple text rendering
      try {
        await this.renderFormattedText(
          doc,
          element,
          "Müşteri bilgisi yüklenemedi",
          x,
          y,
          width,
          height
        );
      } catch (fallbackError) {
        logger.error("Fallback rendering failed for customer info element", {
          error: fallbackError.message,
        });
      }
    }
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
    // Fix: Handle both object and string formats for shipping address
    let content = "Teslimat adresi yok";

    if (
      typeof orderData.shippingAddress === "string" &&
      orderData.shippingAddress.trim()
    ) {
      // If shippingAddress is a string (which it usually is), use it directly
      content = orderData.shippingAddress;
    } else if (
      typeof orderData.shippingAddress === "object" &&
      orderData.shippingAddress
    ) {
      // If it's an object, format it properly
      const address = orderData.shippingAddress;
      content = this.formatAddressBlock(
        [
          address.fullName || address.name,
          address.addressLine1,
          address.addressLine2,
          address.city + " " + address.state + " " + address.postalCode,
          address.country,
        ].filter(Boolean)
      );
    } else if (orderData.address) {
      // Fallback to orderData.address
      if (typeof orderData.address === "string") {
        content = orderData.address;
      } else {
        const address = orderData.address;
        content = this.formatAddressBlock(
          [
            address.fullName || address.name,
            address.addressLine1,
            address.addressLine2,
            address.city + " " + address.state + " " + address.postalCode,
            address.country,
          ].filter(Boolean)
        );
      }
    }

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
    logger.debug("Rendering billing address element", {
      element: element.id,
      orderData: Object.keys(orderData),
    });

    try {
      // Extract font options with robust fallbacks
      const fontOptions = this.extractFontOptions(element);

      // Handle both object and string formats for billing address
      let billingData = [];

      if (
        typeof orderData.billingAddress === "string" &&
        orderData.billingAddress.trim()
      ) {
        // If billingAddress is a string, use it directly
        billingData = [
          { label: "Fatura Adresi", value: orderData.billingAddress },
        ];
      } else if (
        typeof orderData.billingAddress === "object" &&
        orderData.billingAddress
      ) {
        // If it's an object, extract relevant fields
        const address = orderData.billingAddress;
        billingData = [
          { label: "İsim", value: address.fullName || address.name },
          { label: "Adres 1", value: address.addressLine1 },
          { label: "Adres 2", value: address.addressLine2 },
          { label: "Şehir", value: address.city },
          { label: "İl/Eyalet", value: address.state },
          { label: "Posta Kodu", value: address.postalCode },
          { label: "Ülke", value: address.country },
        ].filter((item) => item.value);
      } else if (
        typeof orderData.address === "string" &&
        orderData.address.trim()
      ) {
        // Fallback to general address field as string
        billingData = [{ label: "Fatura Adresi", value: orderData.address }];
      } else if (typeof orderData.address === "object" && orderData.address) {
        // Fallback to general address field as object
        const address = orderData.address;
        billingData = [
          { label: "İsim", value: address.fullName || address.name },
          { label: "Adres 1", value: address.addressLine1 },
          { label: "Adres 2", value: address.addressLine2 },
          { label: "Şehir", value: address.city },
          { label: "İl/Eyalet", value: address.state },
          { label: "Posta Kodu", value: address.postalCode },
          { label: "Ülke", value: address.country },
        ].filter((item) => item.value);
      } else {
        // If no billing address data available, show placeholder
        billingData = [
          { label: "Fatura Adresi", value: "Fatura adresi mevcut değil" },
        ];
      }

      // Render using the robust label-value pairs method
      await this.renderLabelValuePairs(
        doc,
        billingData,
        fontOptions,
        x,
        y,
        width,
        height
      );
    } catch (error) {
      logger.error("Error rendering billing address element", {
        error: error.message,
        element: element.id,
        orderData: Object.keys(orderData),
      });

      // Fallback to simple text rendering
      try {
        await this.renderFormattedText(
          doc,
          element,
          "Fatura adresi yüklenemedi",
          x,
          y,
          width,
          height
        );
      } catch (fallbackError) {
        logger.error("Fallback rendering failed for billing address element", {
          error: fallbackError.message,
        });
      }
    }
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
    logger.debug("Rendering order summary element", {
      element: element.id,
      orderData: Object.keys(orderData),
    });

    try {
      // Extract font options with robust fallbacks
      const fontOptions = this.extractFontOptions(element);

      // Build order summary data with fallbacks
      const orderSummaryData = [
        {
          label: "Sipariş No",
          value: orderData.orderNumber || orderData.id || orderData.orderId,
        },
        {
          label: "Tarih",
          value: this.formatDate(
            orderData.createdAt || orderData.orderDate || orderData.date
          ),
        },
        { label: "Durum", value: orderData.status || orderData.orderStatus },
        {
          label: "Toplam",
          value: this.formatCurrency(
            orderData.total || orderData.totalAmount || orderData.totalPrice
          ),
        },
        {
          label: "Ürün Sayısı",
          value: orderData.items?.length || orderData.itemCount || 0,
        },
        { label: "Platform", value: orderData.platform || orderData.source },
      ].filter(
        (item) =>
          item.value !== undefined && item.value !== null && item.value !== ""
      );

      // If no data available, show minimal info
      if (orderSummaryData.length === 0) {
        orderSummaryData.push({
          label: "Sipariş",
          value: "Sipariş bilgisi mevcut değil",
        });
      }

      // Render using the robust label-value pairs method
      await this.renderLabelValuePairs(
        doc,
        orderSummaryData,
        fontOptions,
        x,
        y,
        width,
        height
      );
    } catch (error) {
      logger.error("Error rendering order summary element", {
        error: error.message,
        element: element.id,
        orderData: Object.keys(orderData),
      });

      // Fallback to simple text rendering
      try {
        await this.renderFormattedText(
          doc,
          element,
          "Sipariş özeti yüklenemedi",
          x,
          y,
          width,
          height
        );
      } catch (fallbackError) {
        logger.error("Fallback rendering failed for order summary element", {
          error: fallbackError.message,
        });
      }
    }
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
    logger.debug("Rendering order details element", {
      element: element.id,
      orderData: Object.keys(orderData),
    });

    try {
      // Extract font options with robust fallbacks
      const fontOptions = this.extractFontOptions(element);

      // Build order details data with fallbacks
      const orderDetailsData = [
        { label: "Sipariş ID", value: orderData.id || orderData.orderId },
        {
          label: "Platform Sipariş ID",
          value: orderData.platformOrderId || orderData.externalOrderId,
        },
        {
          label: "Ödeme Yöntemi",
          value: orderData.paymentMethod || orderData.payment?.method,
        },
        {
          label: "Kargo Yöntemi",
          value: orderData.shippingMethod || orderData.shipping?.method,
        },
        { label: "Notlar", value: orderData.notes || orderData.customerNotes },
        { label: "Sipariş Türü", value: orderData.orderType },
        { label: "Öncelik", value: orderData.priority },
      ].filter(
        (item) =>
          item.value !== undefined && item.value !== null && item.value !== ""
      );

      // If no data available, show minimal info
      if (orderDetailsData.length === 0) {
        orderDetailsData.push({
          label: "Detaylar",
          value: "Sipariş detayları mevcut değil",
        });
      }

      // Render using the robust label-value pairs method
      await this.renderLabelValuePairs(
        doc,
        orderDetailsData,
        fontOptions,
        x,
        y,
        width,
        height
      );
    } catch (error) {
      logger.error("Error rendering order details element", {
        error: error.message,
        element: element.id,
        orderData: Object.keys(orderData),
      });

      // Fallback to simple text rendering
      try {
        await this.renderFormattedText(
          doc,
          element,
          "Sipariş detayları yüklenemedi",
          x,
          y,
          width,
          height
        );
      } catch (fallbackError) {
        logger.error("Fallback rendering failed for order details element", {
          error: fallbackError.message,
        });
      }
    }
  }

  /**
   * Render order items element
   */
  async renderOrderItemsElement(doc, element, orderData, x, y, width, height) {
    logger.debug("Rendering order items element", {
      element: element.id,
      orderData: Object.keys(orderData),
    });

    try {
      // Extract font options with robust fallbacks
      const fontOptions = this.extractFontOptions(element);

      // Check if we have items data
      if (
        !orderData.items ||
        !Array.isArray(orderData.items) ||
        orderData.items.length === 0
      ) {
        // Show placeholder
        const noItemsData = [
          { label: "Ürünler", value: "Ürün bilgisi mevcut değil" },
        ];
        await this.renderLabelValuePairs(
          doc,
          noItemsData,
          fontOptions,
          x,
          y,
          width,
          height
        );
        return;
      }

      // Build items data with Turkish labels
      const itemsData = [];

      orderData.items.forEach((item, index) => {
        // Try multiple field combinations for product name with better fallbacks
        const itemName =
          item.product?.name ||
          item.product?.title ||
          item.name ||
          item.title ||
          item.productName ||
          `Ürün ${index + 1}`;

        // Handle quantity with multiple field names
        const quantity = item.quantity || item.qty || 1;

        // Try multiple field combinations for SKU with better fallbacks
        const sku =
          item.product?.sku ||
          item.sku ||
          item.productSku ||
          item.platformProductId ||
          item.barcode ||
          "Bilinmiyor";

        // Improve empty value handling
        const cleanItemName =
          itemName && itemName.trim() ? itemName.trim() : `Ürün ${index + 1}`;
        const cleanSku = sku && sku.trim() ? sku.trim() : "Bilinmiyor";

        // Create a more readable format that handles empty values better
        let productDescription = cleanItemName;
        if (cleanSku !== "Bilinmiyor") {
          productDescription = `(${cleanSku}) ${cleanItemName}`;
        }

        itemsData.push({
          label: `${index + 1}. Ürün`,
          value: `${quantity} adet - ${productDescription}`,
        });

        // Debug logging for item construction
        logger.debug("Order item constructed", {
          index: index + 1,
          itemName: itemName,
          cleanItemName: cleanItemName,
          sku: sku,
          cleanSku: cleanSku,
          quantity: quantity,
          productDescription: productDescription,
          finalValue: `${quantity} adet - ${productDescription}`,
        });
      });

      // Add total items count
      itemsData.push({
        label: "Toplam Ürün",
        value: `${orderData.items.length} çeşit`,
      });

      // Render using the robust label-value pairs method
      await this.renderLabelValuePairs(
        doc,
        itemsData,
        fontOptions,
        x,
        y,
        width,
        height
      );
    } catch (error) {
      logger.error("Error rendering order items element", {
        error: error.message,
        element: element.id,
        orderData: Object.keys(orderData),
      });

      // Fallback to simple text rendering
      try {
        await this.renderFormattedText(
          doc,
          element,
          "Ürün listesi yüklenemedi",
          x,
          y,
          width,
          height
        );
      } catch (fallbackError) {
        logger.error("Fallback rendering failed for order items element", {
          error: fallbackError.message,
        });
      }
    }
  }

  /**
   * Render order totals element
   */
  async renderOrderTotalsElement(doc, element, orderData, x, y, width, height) {
    logger.debug("Rendering order totals element", {
      element: element.id,
      orderData: Object.keys(orderData),
    });

    try {
      // Extract font options with robust fallbacks
      const fontOptions = this.extractFontOptions(element);

      // Build totals data with Turkish labels and fallbacks
      const totalsData = [
        {
          label: "Ara Toplam",
          value: this.formatCurrency(orderData.subtotal || orderData.subTotal),
        },
        {
          label: "KDV",
          value: this.formatCurrency(orderData.tax || orderData.vatAmount),
        },
        {
          label: "Kargo",
          value: this.formatCurrency(
            orderData.shippingCost || orderData.shippingFee
          ),
        },
        {
          label: "İndirim",
          value: this.formatCurrency(
            orderData.discount || orderData.discountAmount
          ),
        },
        {
          label: "TOPLAM",
          value: this.formatCurrency(
            orderData.total || orderData.totalAmount || orderData.grandTotal
          ),
        },
      ].filter(
        (item) =>
          item.value !== undefined &&
          item.value !== null &&
          item.value !== "₺0.00"
      );

      // If no totals data available, show basic total
      if (totalsData.length === 0) {
        const basicTotal =
          orderData.total || orderData.totalAmount || orderData.price;
        if (basicTotal) {
          totalsData.push({
            label: "TOPLAM",
            value: this.formatCurrency(basicTotal),
          });
        } else {
          totalsData.push({
            label: "Toplam",
            value: "Tutar bilgisi mevcut değil",
          });
        }
      }

      // Render using the robust label-value pairs method
      await this.renderLabelValuePairs(
        doc,
        totalsData,
        fontOptions,
        x,
        y,
        width,
        height
      );
    } catch (error) {
      logger.error("Error rendering order totals element", {
        error: error.message,
        element: element.id,
        orderData: Object.keys(orderData),
      });

      // Fallback to simple text rendering
      try {
        await this.renderFormattedText(
          doc,
          element,
          "Toplam bilgisi yüklenemedi",
          x,
          y,
          width,
          height
        );
      } catch (fallbackError) {
        logger.error("Fallback rendering failed for order totals element", {
          error: fallbackError.message,
        });
      }
    }
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
    if (!date) {
      return "";
    }
    return new Date(date).toLocaleDateString();
  }

  /**
   * Format currency
   */
  formatCurrency(amount, currency = "₺") {
    if (amount === undefined || amount === null) {
      return "";
    }
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
      .map((item, index) => {
        // Try multiple field combinations for product name
        const productName =
          item.name ||
          item.title ||
          item.productName ||
          item.product?.name ||
          item.product?.title ||
          `Product ${index + 1}`;

        // Try multiple field combinations for SKU
        const sku =
          item.sku ||
          item.productSku ||
          item.product?.sku ||
          item.platformProductId ||
          item.barcode ||
          "N/A";

        // Clean up empty values
        const cleanProductName =
          productName && productName.trim()
            ? productName.trim()
            : `Product ${index + 1}`;
        const cleanSku = sku && sku.trim() ? sku.trim() : "N/A";

        // More readable format
        if (cleanSku === "N/A") {
          return `${index + 1}. ${cleanProductName}`;
        } else {
          return `${index + 1}. (${cleanSku}) - ${cleanProductName}`;
        }
      })
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
      .map((item) => {
        // Try multiple field combinations for product name
        const productName =
          item.name ||
          item.title ||
          item.productName ||
          item.product?.name ||
          item.product?.title ||
          "Unknown Product";

        // Try multiple field combinations for SKU
        const sku =
          item.sku ||
          item.productSku ||
          item.product?.sku ||
          item.platformProductId ||
          item.barcode ||
          "N/A";

        // Handle different price field names
        const unitPrice =
          item.price || item.unitPrice || item.product?.price || 0;

        // Handle quantity
        const quantity = item.quantity || item.qty || 1;

        // Calculate total
        const totalPrice = item.totalPrice || quantity * unitPrice;

        return [
          `Product: ${productName}`,
          `SKU: ${sku}`,
          `Quantity: ${quantity}`,
          `Price: ${this.formatCurrency(unitPrice)}`,
          `Total: ${this.formatCurrency(totalPrice)}`,
          "---",
        ].join("\n");
      })
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
    logger.debug("Rendering tracking info element", {
      element: element.id,
      orderData: Object.keys(orderData),
    });

    try {
      // Extract font options with robust fallbacks
      const fontOptions = this.extractFontOptions(element);

      // Build tracking info data with fallbacks
      const trackingData = [];

      if (typeof orderData.tracking === "object" && orderData.tracking) {
        // If tracking is an object
        const tracking = orderData.tracking;
        trackingData.push(
          {
            label: "Takip Numarası",
            value: tracking.number || tracking.trackingNumber,
          },
          {
            label: "Kargo Şirketi",
            value: tracking.carrier || tracking.carrierName,
          },
          { label: "Durum", value: tracking.status || tracking.trackingStatus },
          {
            label: "Tahmini Teslimat",
            value: this.formatDate(
              tracking.estimatedDelivery || tracking.deliveryDate
            ),
          }
        );
      } else {
        // Fallback to direct fields
        trackingData.push(
          {
            label: "Takip Numarası",
            value: orderData.trackingNumber || orderData.trackingId,
          },
          {
            label: "Kargo Şirketi",
            value: orderData.carrier || orderData.carrierName,
          },
          { label: "Durum", value: orderData.trackingStatus || "İşleniyor" },
          {
            label: "Tahmini Teslimat",
            value: this.formatDate(
              orderData.estimatedDelivery || orderData.deliveryDate
            ),
          }
        );
      }

      // Filter out empty values
      const filteredData = trackingData.filter(
        (item) =>
          item.value !== undefined && item.value !== null && item.value !== ""
      );

      // If no tracking data available, show placeholder
      if (filteredData.length === 0) {
        filteredData.push({
          label: "Takip",
          value: "Takip bilgisi mevcut değil",
        });
      }

      // Render using the robust label-value pairs method
      await this.renderLabelValuePairs(
        doc,
        filteredData,
        fontOptions,
        x,
        y,
        width,
        height
      );
    } catch (error) {
      logger.error("Error rendering tracking info element", {
        error: error.message,
        element: element.id,
        orderData: Object.keys(orderData),
      });

      // Fallback to simple text rendering
      try {
        await this.renderFormattedText(
          doc,
          element,
          "Takip bilgisi yüklenemedi",
          x,
          y,
          width,
          height
        );
      } catch (fallbackError) {
        logger.error("Fallback rendering failed for tracking info element", {
          error: fallbackError.message,
        });
      }
    }
  }

  /**
   * Render carrier info element
   */
  async renderCarrierInfoElement(doc, element, orderData, x, y, width, height) {
    const carrier =
      orderData.tracking.carrier || orderData.shipping?.carrier || {};
    const content = this.formatInfoBlock([
      { label: "Kargo Şirketi", value: carrier || orderData.carrierName },
      { label: "Takip Numara", value: orderData.tracking.number },
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
    logger.debug("Rendering platform info element", {
      element: element.id,
      orderData: Object.keys(orderData),
    });

    try {
      // Extract font options with robust fallbacks
      const fontOptions = this.extractFontOptions(element);

      // Build platform info data with fallbacks
      const platformData = [
        {
          label: "Platform",
          value: orderData.platform || orderData.source || orderData.siteName,
        },
        {
          label: "Platform Sipariş ID",
          value: orderData.platformOrderId || orderData.externalOrderId,
        },
        {
          label: "Mağaza",
          value:
            orderData.store || orderData.storeName || orderData.merchantName,
        },
        { label: "Kanal", value: orderData.channel || orderData.salesChannel },
        {
          label: "Referans",
          value: orderData.reference || orderData.referenceNumber,
        },
      ].filter(
        (item) =>
          item.value !== undefined && item.value !== null && item.value !== ""
      );

      // If no platform data available, show placeholder
      if (platformData.length === 0) {
        platformData.push({
          label: "Platform",
          value: "Platform bilgisi mevcut değil",
        });
      }

      // Render using the robust label-value pairs method
      await this.renderLabelValuePairs(
        doc,
        platformData,
        fontOptions,
        x,
        y,
        width,
        height
      );
    } catch (error) {
      logger.error("Error rendering platform info element", {
        error: error.message,
        element: element.id,
        orderData: Object.keys(orderData),
      });

      // Fallback to simple text rendering
      try {
        await this.renderFormattedText(
          doc,
          element,
          "Platform bilgisi yüklenemedi",
          x,
          y,
          width,
          height
        );
      } catch (fallbackError) {
        logger.error("Fallback rendering failed for platform info element", {
          error: fallbackError.message,
        });
      }
    }
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
    // Try to get cargo tracking number from platform-specific data
    let trackingNumber = orderData.trackingNumber || orderData.tracking?.number;

    // Check for cargoTrackingNumber in raw data (Trendyol and N11)
    if (!trackingNumber && orderData.rawData) {
      if (orderData.rawData.cargoTrackingNumber) {
        trackingNumber = orderData.rawData.cargoTrackingNumber;
      }
    }

    // Fallback to generated tracking if none found
    if (!trackingNumber) {
      trackingNumber = "TRK" + Date.now();
    }

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
    // If the requested font is registered, use it directly
    if (this.availableFonts && this.availableFonts.includes(fontFamily)) {
      return fontFamily;
    }
    // Otherwise, fallback to DejaVuSans for Turkish support
    const fontMap = {
      Arial: "DejaVuSans",
      Times: "DejaVuSans",
      Courier: "DejaVuSans",
      Helvetica: "DejaVuSans",
      "Times New Roman": "DejaVuSans",
      "Courier New": "DejaVuSans",
      // Add system fonts that better support Turkish characters
      "DejaVu Sans": "DejaVuSans",
      "Liberation Sans": "DejaVuSans",
      "Noto Sans": "DejaVuSans",
    };

    return fontMap[fontFamily] || "DejaVuSans";
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

  /**
   * Convert modern CSS alignItems to legacy verticalAlign
   */
  convertAlignItemsToVerticalAlign(alignItems, fallbackVerticalAlign) {
    switch (alignItems) {
      case "flex-start":
        return "top";
      case "center":
        return "middle";
      case "flex-end":
        return "bottom";
      case "stretch":
        return "top"; // Fallback to top for stretch
      case "baseline":
        return "top"; // Fallback to top for baseline
      default:
        return fallbackVerticalAlign || "top";
    }
  }

  /**
   * Convert modern CSS justifyContent to legacy textAlign
   */
  convertJustifyContentToTextAlign(justifyContent, fallbackTextAlign) {
    switch (justifyContent) {
      case "flex-start":
        return "left";
      case "center":
        return "center";
      case "flex-end":
        return "right";
      case "space-between":
      case "space-around":
      case "space-evenly":
        return "justify"; // Approximate with justify
      default:
        return fallbackTextAlign || "left";
    }
  }

  /**
   * Convert legacy alignment to modern CSS for consistent handling
   */
  modernizeAlignment(elementStyle) {
    const modernStyle = { ...elementStyle };

    // Convert verticalAlign to alignItems if not already set
    if (elementStyle.verticalAlign && !elementStyle.alignItems) {
      switch (elementStyle.verticalAlign) {
        case "top":
          modernStyle.alignItems = "flex-start";
          break;
        case "middle":
          modernStyle.alignItems = "center";
          break;
        case "bottom":
          modernStyle.alignItems = "flex-end";
          break;
      }
    }

    // Convert textAlign to justifyContent if not already set
    if (elementStyle.textAlign && !elementStyle.justifyContent) {
      switch (elementStyle.textAlign) {
        case "left":
          modernStyle.justifyContent = "flex-start";
          break;
        case "center":
          modernStyle.justifyContent = "center";
          break;
        case "right":
          modernStyle.justifyContent = "flex-end";
          break;
        case "justify":
          modernStyle.justifyContent = "space-between";
          break;
      }
    }

    return modernStyle;
  }
}

module.exports = TemplateBasedPDFGenerator;
