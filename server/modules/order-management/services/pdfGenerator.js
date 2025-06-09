// src/services/pdfGenerator.js

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { Order, OrderItem, User, ShippingDetail } = require("../../../models"); // Fixed: import from models index
const logger = require("../../../utils/logger");
const bwipjs = require("bwip-js");

class PDFGeneratorService {
  constructor() {
    this.outputDir = path.join(__dirname, "../../public/shipping");

    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Properly encode text content for UTF-8 display
   * @param {String} content - Text content to encode
   * @returns {String} - Properly encoded content
   */
  encodeTextContent(content) {
    if (!content) return content;

    // Normalize Unicode and ensure proper UTF-8 encoding
    content = content.toString().normalize("NFC");
    content = Buffer.from(content, "utf8").toString("utf8");

    return content;
  }

  /**
   * Generate a shipping label for an order
   * @param {Number} orderId - Order ID
   * @param {Object} options - Additional options for label generation
   * @returns {Object} - Result containing the path to the generated PDF
   */
  async generateShippingLabel(orderId, options = {}) {
    try {
      // Load order with related data
      const order = await Order.findByPk(orderId, {
        include: [
          { model: OrderItem, as: "items" },
          { model: ShippingDetail, as: "shippingDetail" },
        ],
      });

      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }

      if (!order.shippingDetail) {
        throw new Error(`Shipping details for order ${orderId} not found`);
      }

      // Generate tracking number if not provided
      if (!order.trackingNumber) {
        order.trackingNumber = `TR${Math.floor(Math.random() * 1000000000)
          .toString()
          .padStart(9, "0")}`;
        await order.update({ trackingNumber: order.trackingNumber });
      }

      // Determine carrier
      const carrier = options.carrier || order.carrier || "Generic";

      // Create file path for PDF
      const fileName = `shipping_label_${order.id}_${Date.now()}.pdf`;
      const filePath = path.join(this.outputDir, fileName);

      // Generate barcode/QR code for tracking number
      const barcodeBuffer = await this.generateBarcode(order.trackingNumber);

      // Create PDF document with UTF-8 support
      const doc = new PDFDocument({
        size: "A6",
        margin: 10,
        bufferPages: true,
        pdfVersion: "1.4",
      });

      // Write to file
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Use the appropriate template based on carrier
      switch (carrier.toLowerCase()) {
        case "aras":
          await this.createArasTemplate(doc, order, barcodeBuffer);
          break;
        case "yurtiçi":
        case "yurtici":
          await this.createYurticiTemplate(doc, order, barcodeBuffer);
          break;
        case "mng":
          await this.createMNGTemplate(doc, order, barcodeBuffer);
          break;
        case "ptt":
          await this.createPTTTemplate(doc, order, barcodeBuffer);
          break;
        default:
          await this.createGenericTemplate(doc, order, barcodeBuffer);
      }

      // Finalize PDF
      doc.end();

      // Wait for the PDF to be fully written
      return new Promise((resolve, reject) => {
        stream.on("finish", () => {
          const publicUrl = `/shipping/${fileName}`;

          // Update order with label URL
          order
            .update({ labelUrl: publicUrl })
            .then(() => {
              resolve({
                success: true,
                message: "Shipping label generated successfully",
                data: {
                  orderId: order.id,
                  platformOrderId: order.platformOrderId,
                  trackingNumber: order.trackingNumber,
                  carrier,
                  labelUrl: publicUrl,
                  filePath,
                },
              });
            })
            .catch((error) => {
              logger.error(
                `Failed to update order with label URL: ${error.message}`,
                { error, orderId }
              );
              reject(error);
            });
        });

        stream.on("error", (error) => {
          logger.error(`Error writing PDF file: ${error.message}`, {
            error,
            orderId,
            filePath,
          });
          reject(error);
        });
      });
    } catch (error) {
      logger.error(`Failed to generate shipping label: ${error.message}`, {
        error,
        orderId,
      });

      return {
        success: false,
        message: `Failed to generate shipping label: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Generate a barcode image for a tracking number
   * @param {String} trackingNumber - Tracking number
   * @returns {Buffer} - Buffer containing the barcode image
   */
  async generateBarcode(trackingNumber) {
    return new Promise((resolve, reject) => {
      bwipjs.toBuffer(
        {
          bcid: "code128",
          text: trackingNumber,
          scale: 3,
          height: 10,
          includetext: true,
          textxalign: "center",
        },
        (err, png) => {
          if (err) {
            reject(err);
          } else {
            resolve(png);
          }
        }
      );
    });
  }

  /**
   * Generate a QR code image for a tracking number
   * @param {String} trackingNumber - Tracking number
   * @returns {Buffer} - Buffer containing the QR code image
   */
  async generateQRCode(trackingNumber) {
    return new Promise((resolve, reject) => {
      bwipjs.toBuffer(
        {
          bcid: "qrcode",
          text: trackingNumber,
          scale: 3,
          height: 10,
          includetext: false,
        },
        (err, png) => {
          if (err) {
            reject(err);
          } else {
            resolve(png);
          }
        }
      );
    });
  }

  /**
   * Create a generic shipping label template
   * @param {PDFDocument} doc - PDFDocument instance
   * @param {Object} order - Order object
   * @param {Buffer} barcodeBuffer - Buffer containing barcode image
   */
  async createGenericTemplate(doc, order, barcodeBuffer) {
    const { shippingDetail } = order;

    // Add company logo/header
    doc
      .fontSize(14)
      .text(this.encodeTextContent("Pazar+ Shipping"), { align: "center" });
    doc.moveDown(0.5);

    // Add barcode
    if (barcodeBuffer) {
      doc.image(barcodeBuffer, { width: 200, align: "center" });
      doc.moveDown(0.5);
    }

    // Order information
    doc
      .fontSize(10)
      .text(this.encodeTextContent(`Order #: ${order.platformOrderId}`), {
        align: "left",
      });
    doc.text(
      this.encodeTextContent(`Date: ${new Date().toLocaleDateString()}`)
    );
    doc.moveDown(0.5);

    // Shipping information
    doc
      .fontSize(12)
      .text(this.encodeTextContent("Ship To:"), { underline: true });
    doc
      .fontSize(10)
      .text(this.encodeTextContent(`${shippingDetail.recipientName}`));
    doc.fontSize(10).text(this.encodeTextContent(`${shippingDetail.address}`));
    doc.text(
      this.encodeTextContent(
        `${shippingDetail.city}, ${shippingDetail.state} ${shippingDetail.postalCode}`
      )
    );
    doc.text(this.encodeTextContent(`${shippingDetail.country}`));
    doc.text(this.encodeTextContent(`Phone: ${shippingDetail.phone}`));
    doc.moveDown(0.5);

    // Add tracking information
    doc
      .fontSize(12)
      .text(this.encodeTextContent("Tracking Information:"), {
        underline: true,
      });
    doc
      .fontSize(10)
      .text(this.encodeTextContent(`Tracking #: ${order.trackingNumber}`));
    doc.text(this.encodeTextContent(`Carrier: ${order.carrier || "Generic"}`));
    doc.moveDown(0.5);

    // Order contents summary
    doc
      .fontSize(12)
      .text(this.encodeTextContent("Package Contents:"), { underline: true });
    doc
      .fontSize(10)
      .text(this.encodeTextContent(`Items: ${order.OrderItems.length}`));
    const totalQuantity = order.OrderItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    doc.text(this.encodeTextContent(`Total Quantity: ${totalQuantity}`));

    // Footer
    doc
      .fontSize(8)
      .text(
        this.encodeTextContent(
          "This shipping label was generated by Pazar+ Order Management System"
        ),
        { align: "center" }
      );
  }

  /**
   * Create an Aras Kargo shipping label template
   * @param {PDFDocument} doc - PDFDocument instance
   * @param {Object} order - Order object
   * @param {Buffer} barcodeBuffer - Buffer containing barcode image
   */
  async createArasTemplate(doc, order, barcodeBuffer) {
    const { shippingDetail } = order;

    // Add Aras Kargo header
    doc.fontSize(14).text("ARAS KARGO", { align: "center" });
    doc.moveDown(0.5);

    // Add barcode
    if (barcodeBuffer) {
      doc.image(barcodeBuffer, { width: 200, align: "center" });
      doc.moveDown(0.5);
    }

    // Shipping information box
    doc.rect(50, doc.y, 300, 150).stroke();
    const boxY = doc.y;

    doc
      .fontSize(12)
      .text(this.encodeTextContent("ALICI BİLGİLERİ"), 55, boxY + 5, {
        underline: true,
      });
    doc
      .fontSize(10)
      .text(
        this.encodeTextContent(`${shippingDetail.recipientName}`),
        55,
        boxY + 25
      );
    doc
      .fontSize(10)
      .text(this.encodeTextContent(`${shippingDetail.address}`), 55, boxY + 40);
    doc
      .fontSize(10)
      .text(
        this.encodeTextContent(
          `${shippingDetail.city} / ${shippingDetail.state}`
        ),
        55,
        boxY + 55
      );
    doc
      .fontSize(10)
      .text(
        this.encodeTextContent(`${shippingDetail.postalCode}`),
        55,
        boxY + 70
      );
    doc
      .fontSize(10)
      .text(
        this.encodeTextContent(`Tel: ${shippingDetail.phone}`),
        55,
        boxY + 85
      );

    // Sender information
    doc
      .fontSize(12)
      .text(this.encodeTextContent("GÖNDERİCİ BİLGİLERİ"), 55, boxY + 105, {
        underline: true,
      });
    doc
      .fontSize(10)
      .text(this.encodeTextContent(`Pazar+ / Trendyol`), 55, boxY + 125);

    doc.moveDown(8);

    // Shipping details
    doc
      .fontSize(12)
      .text(this.encodeTextContent("Gönderi Bilgileri:"), { underline: true });
    doc
      .fontSize(10)
      .text(this.encodeTextContent(`Takip No: ${order.trackingNumber}`));
    doc
      .fontSize(10)
      .text(this.encodeTextContent(`Sipariş No: ${order.platformOrderId}`));
    doc
      .fontSize(10)
      .text(
        this.encodeTextContent(
          `Tarih: ${new Date().toLocaleDateString("tr-TR")}`
        )
      );

    // Footer
    doc
      .fontSize(8)
      .text(
        this.encodeTextContent(
          "ARAS KARGO ile gönderilmiştir. Pazar+ Order Management System tarafından oluşturulmuştur."
        ),
        { align: "center" }
      );
  }

  /**
   * Create a Yurtiçi Kargo shipping label template
   * @param {PDFDocument} doc - PDFDocument instance
   * @param {Object} order - Order object
   * @param {Buffer} barcodeBuffer - Buffer containing barcode image
   */
  async createYurticiTemplate(doc, order, barcodeBuffer) {
    const { shippingDetail } = order;

    // Add Yurtiçi Kargo header
    doc.fontSize(14).text("YURTİÇİ KARGO", { align: "center" });
    doc.moveDown(0.5);

    // Add barcode
    if (barcodeBuffer) {
      doc.image(barcodeBuffer, { width: 200, align: "center" });
      doc.moveDown(0.5);
    }

    // Shipping information box
    doc.rect(50, doc.y, 300, 150).stroke();
    const boxY = doc.y;

    doc
      .fontSize(12)
      .text(this.encodeTextContent("TESLİM ALINACAK KİŞİ"), 55, boxY + 5, {
        underline: true,
      });
    doc
      .fontSize(10)
      .text(
        this.encodeTextContent(`${shippingDetail.recipientName}`),
        55,
        boxY + 25
      );
    doc
      .fontSize(10)
      .text(this.encodeTextContent(`${shippingDetail.address}`), 55, boxY + 40);
    doc
      .fontSize(10)
      .text(
        this.encodeTextContent(
          `${shippingDetail.city} / ${shippingDetail.state}`
        ),
        55,
        boxY + 55
      );
    doc
      .fontSize(10)
      .text(
        this.encodeTextContent(`${shippingDetail.postalCode}`),
        55,
        boxY + 70
      );
    doc
      .fontSize(10)
      .text(
        this.encodeTextContent(`Tel: ${shippingDetail.phone}`),
        55,
        boxY + 85
      );

    // Sender information
    doc
      .fontSize(12)
      .text(this.encodeTextContent("GÖNDERİCİ"), 55, boxY + 105, {
        underline: true,
      });
    doc
      .fontSize(10)
      .text(this.encodeTextContent(`Pazar+ / Trendyol`), 55, boxY + 125);

    doc.moveDown(8);

    // Shipping details
    doc
      .fontSize(12)
      .text(this.encodeTextContent("Kargo Bilgileri:"), { underline: true });
    doc
      .fontSize(10)
      .text(this.encodeTextContent(`Takip No: ${order.trackingNumber}`));
    doc
      .fontSize(10)
      .text(this.encodeTextContent(`Sipariş No: ${order.platformOrderId}`));
    doc
      .fontSize(10)
      .text(
        this.encodeTextContent(
          `Tarih: ${new Date().toLocaleDateString("tr-TR")}`
        )
      );

    // Footer
    doc
      .fontSize(8)
      .text(
        this.encodeTextContent(
          "YURTİÇİ KARGO ile gönderilmiştir. Pazar+ Order Management System tarafından oluşturulmuştur."
        ),
        { align: "center" }
      );
  }

  /**
   * Create an MNG Kargo shipping label template
   * @param {PDFDocument} doc - PDFDocument instance
   * @param {Object} order - Order object
   * @param {Buffer} barcodeBuffer - Buffer containing barcode image
   */
  async createMNGTemplate(doc, order, barcodeBuffer) {
    const { shippingDetail } = order;

    // Add MNG Kargo header
    doc
      .fontSize(14)
      .text(this.encodeTextContent("MNG KARGO"), { align: "center" });
    doc.moveDown(0.5);

    // Add barcode
    if (barcodeBuffer) {
      doc.image(barcodeBuffer, { width: 200, align: "center" });
      doc.moveDown(0.5);
    }

    // Shipping information box
    doc.rect(50, doc.y, 300, 150).stroke();
    const boxY = doc.y;

    doc
      .fontSize(12)
      .text(this.encodeTextContent("ALICI"), 55, boxY + 5, { underline: true });
    doc
      .fontSize(10)
      .text(
        this.encodeTextContent(`${shippingDetail.recipientName}`),
        55,
        boxY + 25
      );
    doc
      .fontSize(10)
      .text(this.encodeTextContent(`${shippingDetail.address}`), 55, boxY + 40);
    doc
      .fontSize(10)
      .text(
        this.encodeTextContent(
          `${shippingDetail.city} / ${shippingDetail.state}`
        ),
        55,
        boxY + 55
      );
    doc
      .fontSize(10)
      .text(
        this.encodeTextContent(`${shippingDetail.postalCode}`),
        55,
        boxY + 70
      );
    doc
      .fontSize(10)
      .text(
        this.encodeTextContent(`Tel: ${shippingDetail.phone}`),
        55,
        boxY + 85
      );

    // Sender information
    doc
      .fontSize(12)
      .text(this.encodeTextContent("GÖNDERİCİ"), 55, boxY + 105, {
        underline: true,
      });
    doc
      .fontSize(10)
      .text(this.encodeTextContent(`Pazar+ / Trendyol`), 55, boxY + 125);

    doc.moveDown(8);

    // Shipping details
    doc
      .fontSize(12)
      .text(this.encodeTextContent("Gönderi Detayları:"), { underline: true });
    doc
      .fontSize(10)
      .text(this.encodeTextContent(`Takip No: ${order.trackingNumber}`));
    doc
      .fontSize(10)
      .text(this.encodeTextContent(`Sipariş No: ${order.platformOrderId}`));
    doc
      .fontSize(10)
      .text(
        this.encodeTextContent(
          `Tarih: ${new Date().toLocaleDateString("tr-TR")}`
        )
      );

    // Footer
    doc
      .fontSize(8)
      .text(
        this.encodeTextContent(
          "MNG KARGO ile gönderilmiştir. Pazar+ Order Management System tarafından oluşturulmuştur."
        ),
        { align: "center" }
      );
  }

  /**
   * Create a PTT Kargo shipping label template
   * @param {PDFDocument} doc - PDFDocument instance
   * @param {Object} order - Order object
   * @param {Buffer} barcodeBuffer - Buffer containing barcode image
   */
  async createPTTTemplate(doc, order, barcodeBuffer) {
    const { shippingDetail } = order;

    // Add PTT header
    doc
      .fontSize(14)
      .text(this.encodeTextContent("PTT KARGO"), { align: "center" });
    doc.moveDown(0.5);

    // Add barcode
    if (barcodeBuffer) {
      doc.image(barcodeBuffer, { width: 200, align: "center" });
      doc.moveDown(0.5);
    }

    // Shipping information box
    doc.rect(50, doc.y, 300, 150).stroke();
    const boxY = doc.y;

    doc
      .fontSize(12)
      .text(this.encodeTextContent("GÖNDERİLEN"), 55, boxY + 5, {
        underline: true,
      });
    doc
      .fontSize(10)
      .text(
        this.encodeTextContent(`${shippingDetail.recipientName}`),
        55,
        boxY + 25
      );
    doc
      .fontSize(10)
      .text(this.encodeTextContent(`${shippingDetail.address}`), 55, boxY + 40);
    doc
      .fontSize(10)
      .text(
        this.encodeTextContent(
          `${shippingDetail.city} / ${shippingDetail.state}`
        ),
        55,
        boxY + 55
      );
    doc
      .fontSize(10)
      .text(
        this.encodeTextContent(`${shippingDetail.postalCode}`),
        55,
        boxY + 70
      );
    doc
      .fontSize(10)
      .text(
        this.encodeTextContent(`Tel: ${shippingDetail.phone}`),
        55,
        boxY + 85
      );

    // Sender information
    doc
      .fontSize(12)
      .text(this.encodeTextContent("GÖNDEREN"), 55, boxY + 105, {
        underline: true,
      });
    doc
      .fontSize(10)
      .text(this.encodeTextContent(`Pazar+ / Trendyol`), 55, boxY + 125);

    doc.moveDown(8);

    // Shipping details
    doc
      .fontSize(12)
      .text(this.encodeTextContent("Gönderi Bilgileri:"), { underline: true });
    doc
      .fontSize(10)
      .text(this.encodeTextContent(`Takip No: ${order.trackingNumber}`));
    doc
      .fontSize(10)
      .text(this.encodeTextContent(`Sipariş No: ${order.platformOrderId}`));
    doc
      .fontSize(10)
      .text(
        this.encodeTextContent(
          `Tarih: ${new Date().toLocaleDateString("tr-TR")}`
        )
      );

    // Footer
    doc
      .fontSize(8)
      .text(
        this.encodeTextContent(
          "PTT KARGO ile gönderilmiştir. Pazar+ Order Management System tarafından oluşturulmuştur."
        ),
        { align: "center" }
      );
  }

  /**
   * Generate a bulk shipping label document for multiple orders
   * @param {Array} orderIds - Array of order IDs
   * @param {Object} options - Additional options for label generation
   * @returns {Object} - Result containing the path to the generated PDF
   */
  async generateBulkShippingLabels(orderIds, options = {}) {
    try {
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        throw new Error(
          "No order IDs provided for bulk shipping label generation"
        );
      }

      // Create file path for PDF
      const fileName = `bulk_shipping_labels_${Date.now()}.pdf`;
      const filePath = path.join(this.outputDir, fileName);

      // Create PDF document with UTF-8 support
      const doc = new PDFDocument({
        size: "A6",
        margin: 10,
        autoFirstPage: false,
        bufferPages: true,
        pdfVersion: "1.4",
      });

      // Write to file
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Process each order
      let processedCount = 0;
      const carrier = options.carrier || "Generic";

      for (const orderId of orderIds) {
        try {
          // Load order with related data
          const order = await Order.findByPk(orderId, {
            include: [
              { model: OrderItem, as: "items" },
              { model: ShippingDetail, as: "shippingDetail" },
            ],
          });

          if (!order || !order.shippingDetail) {
            logger.warn(
              `Skipping order ${orderId}: Order or shipping details not found`
            );
            continue;
          }

          // Generate tracking number if not provided
          if (!order.trackingNumber) {
            order.trackingNumber = `TR${Math.floor(Math.random() * 1000000000)
              .toString()
              .padStart(9, "0")}`;
            await order.update({ trackingNumber: order.trackingNumber });
          }

          // Generate barcode for tracking number
          const barcodeBuffer = await this.generateBarcode(
            order.trackingNumber
          );

          // Add a new page for each order
          doc.addPage();

          // Use the appropriate template based on carrier
          switch (carrier.toLowerCase()) {
            case "aras":
              await this.createArasTemplate(doc, order, barcodeBuffer);
              break;
            case "yurtiçi":
            case "yurtici":
              await this.createYurticiTemplate(doc, order, barcodeBuffer);
              break;
            case "mng":
              await this.createMNGTemplate(doc, order, barcodeBuffer);
              break;
            case "ptt":
              await this.createPTTTemplate(doc, order, barcodeBuffer);
              break;
            default:
              await this.createGenericTemplate(doc, order, barcodeBuffer);
          }

          processedCount++;

          // Update order with label URL
          const publicUrl = `/shipping/${fileName}#page=${processedCount}`;
          await order.update({ labelUrl: publicUrl });
        } catch (error) {
          logger.error(
            `Error processing order ${orderId} for bulk shipping label: ${error.message}`,
            { error, orderId }
          );
          // Continue with the next order
        }
      }

      // Finalize PDF
      doc.end();

      // Wait for the PDF to be fully written
      return new Promise((resolve, reject) => {
        stream.on("finish", () => {
          const publicUrl = `/shipping/${fileName}`;

          resolve({
            success: true,
            message: `Generated shipping labels for ${processedCount} orders`,
            data: {
              processedCount,
              totalOrders: orderIds.length,
              carrier,
              labelUrl: publicUrl,
              filePath,
            },
          });
        });

        stream.on("error", (error) => {
          logger.error(`Error writing bulk PDF file: ${error.message}`, {
            error,
            orderIds,
            filePath,
          });
          reject(error);
        });
      });
    } catch (error) {
      logger.error(
        `Failed to generate bulk shipping labels: ${error.message}`,
        { error, orderIds }
      );

      return {
        success: false,
        message: `Failed to generate bulk shipping labels: ${error.message}`,
        error: error.message,
      };
    }
  }
}

module.exports = new PDFGeneratorService();
