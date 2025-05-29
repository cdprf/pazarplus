/**
 * Invoice Generator Service
 * Local PDF invoice generation with Turkish localization
 */

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

class InvoiceGenerator {
  constructor() {
    this.logoPath = path.join(__dirname, "../uploads/company-logo.png");
    this.outputDir = path.join(__dirname, "../uploads/invoices");

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate local PDF invoice
   * @param {Object} order - Order object with items and customer info
   * @param {Object} config - Invoice configuration and company info
   * @returns {Object} - Generation result with PDF path
   */
  async generateInvoice(order, config = {}) {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
        info: {
          Title: `Fatura ${order.id}`,
          Author: config.company?.name || "Pazar+",
          Subject: "Satış Faturası",
          Creator: "Pazar+ Sistem",
        },
      });

      const filename = `invoice-${order.id}-${Date.now()}.pdf`;
      const filepath = path.join(this.outputDir, filename);

      // Pipe PDF to file
      doc.pipe(fs.createWriteStream(filepath));

      // Generate invoice content
      await this.generateHeader(doc, config, order);
      await this.generateInvoiceInfo(doc, order);
      await this.generateCustomerInfo(doc, order);
      await this.generateItemsTable(doc, order, config);
      await this.generateTotals(doc, order, config);
      await this.generateFooter(doc, config);

      // Finalize PDF
      doc.end();

      // Wait for file to be written
      await new Promise((resolve) => {
        doc.on("end", resolve);
      });

      return {
        success: true,
        message: "Invoice generated successfully",
        data: {
          pdfPath: filepath,
          pdfUrl: `/uploads/invoices/${filename}`,
          filename,
        },
      };
    } catch (error) {
      logger.error(`Invoice generation error: ${error.message}`, {
        error,
        orderId: order.id,
      });

      return {
        success: false,
        message: `Failed to generate invoice: ${error.message}`,
        error: error.message,
      };
    }
  }

  async generateHeader(doc, config, order) {
    // Company logo (if available)
    if (config.invoice?.fields?.companyLogo && fs.existsSync(this.logoPath)) {
      try {
        doc.image(this.logoPath, 40, 40, { width: 100 });
      } catch (error) {
        logger.warn("Failed to load company logo", { error: error.message });
      }
    }

    // Company information
    const companyY = 40;
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .text(config.company?.name || "Şirket Adı", 160, companyY);

    doc
      .font("Helvetica")
      .fontSize(10)
      .text(config.company?.address || "", 160, companyY + 20)
      .text(
        `${config.company?.district || ""} ${config.company?.city || ""}`,
        160,
        companyY + 35
      )
      .text(`Tel: ${config.company?.phone || ""}`, 160, companyY + 50)
      .text(`E-posta: ${config.company?.email || ""}`, 160, companyY + 65);

    if (config.invoice?.fields?.taxNumber && config.company?.taxNumber) {
      doc.text(`Vergi No: ${config.company.taxNumber}`, 160, companyY + 80);
    }

    // Invoice title
    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .text("SATIŞ FATURASI", 400, companyY, { align: "right" });

    // Draw line
    doc.moveTo(40, 140).lineTo(555, 140).stroke();

    return doc;
  }

  async generateInvoiceInfo(doc, order) {
    const startY = 160;

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("FATURA BİLGİLERİ", 40, startY);

    doc
      .font("Helvetica")
      .fontSize(9)
      .text(`Fatura No: INV-${order.id}`, 40, startY + 20)
      .text(`Tarih: ${new Date().toLocaleDateString("tr-TR")}`, 40, startY + 35)
      .text(`Sipariş No: ${order.orderNumber || order.id}`, 40, startY + 50)
      .text(`Para Birimi: ${order.currency || "TRY"}`, 40, startY + 65);

    return doc;
  }

  async generateCustomerInfo(doc, order) {
    const startY = 160;

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("MÜŞTERİ BİLGİLERİ", 300, startY);

    // Parse shipping address
    let shippingAddress = {};
    try {
      shippingAddress =
        typeof order.shippingAddress === "string"
          ? JSON.parse(order.shippingAddress)
          : order.shippingAddress || {};
    } catch (error) {
      shippingAddress = {};
    }

    doc
      .font("Helvetica")
      .fontSize(9)
      .text(order.customerName || "Müşteri Adı", 300, startY + 20)
      .text(shippingAddress.address || "", 300, startY + 35)
      .text(
        `${shippingAddress.district || ""} ${shippingAddress.city || ""}`,
        300,
        startY + 50
      )
      .text(`Tel: ${order.customerPhone || ""}`, 300, startY + 65);

    if (order.customerEmail) {
      doc.text(`E-posta: ${order.customerEmail}`, 300, startY + 80);
    }

    return doc;
  }

  async generateItemsTable(doc, order, config) {
    const startY = 270;
    const items = order.items || [];

    // Table header
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#333333");

    // Header background
    doc.rect(40, startY, 515, 20).fill("#f0f0f0").stroke();

    // Header text
    doc
      .fillColor("#000000")
      .text("Ürün Adı", 45, startY + 6)
      .text("Miktar", 300, startY + 6)
      .text("Birim Fiyat", 360, startY + 6)
      .text("KDV %", 430, startY + 6)
      .text("Toplam", 480, startY + 6);

    // Table rows
    doc.font("Helvetica").fontSize(8);
    let currentY = startY + 25;

    items.forEach((item, index) => {
      const quantity = item.quantity || 1;
      const unitPrice = item.unitPrice || 0;
      const taxRate = (item.taxRate || 0.18) * 100; // Convert to percentage
      const lineTotal = unitPrice * quantity;

      // Alternate row background
      if (index % 2 === 1) {
        doc
          .rect(40, currentY - 3, 515, 18)
          .fill("#f9f9f9")
          .stroke();
      }

      doc
        .fillColor("#000000")
        .text(item.productName || "Ürün", 45, currentY, { width: 240 })
        .text(quantity.toString(), 300, currentY)
        .text(
          `${unitPrice.toFixed(2)} ${order.currency || "TRY"}`,
          360,
          currentY
        )
        .text(`${taxRate.toFixed(0)}`, 430, currentY)
        .text(
          `${lineTotal.toFixed(2)} ${order.currency || "TRY"}`,
          480,
          currentY
        );

      currentY += 18;

      // Add new page if needed
      if (currentY > 700) {
        doc.addPage();
        currentY = 40;
      }
    });

    // Table border
    doc.rect(40, startY, 515, currentY - startY).stroke();

    return { doc, nextY: currentY + 20 };
  }

  async generateTotals(doc, order, config) {
    const { nextY } = await this.generateItemsTable(doc, order, config);
    let currentY = nextY;

    const items = order.items || [];
    const subtotal = items.reduce(
      (sum, item) => sum + (item.unitPrice || 0) * (item.quantity || 1),
      0
    );
    const totalTax = items.reduce((sum, item) => {
      const lineTotal = (item.unitPrice || 0) * (item.quantity || 1);
      const taxRate = item.taxRate || 0.18;
      return sum + lineTotal * taxRate;
    }, 0);
    const grandTotal = subtotal + totalTax;

    // Totals section
    const totalsX = 350;
    doc.font("Helvetica").fontSize(10);

    // Subtotal
    doc
      .text("Ara Toplam:", totalsX, currentY)
      .text(
        `${subtotal.toFixed(2)} ${order.currency || "TRY"}`,
        totalsX + 100,
        currentY
      );

    currentY += 20;

    // Tax
    if (config.invoice?.includeTax) {
      doc
        .text("KDV:", totalsX, currentY)
        .text(
          `${totalTax.toFixed(2)} ${order.currency || "TRY"}`,
          totalsX + 100,
          currentY
        );
      currentY += 20;
    }

    // Grand total
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("GENEL TOPLAM:", totalsX, currentY)
      .text(
        `${grandTotal.toFixed(2)} ${order.currency || "TRY"}`,
        totalsX + 100,
        currentY
      );

    // Total border
    doc.rect(totalsX - 10, currentY - 40, 200, 70).stroke();

    return doc;
  }

  async generateFooter(doc, config) {
    const footerY = 750;

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#666666")
      .text("Bu fatura elektronik ortamda oluşturulmuştur.", 40, footerY)
      .text(
        `Oluşturma Tarihi: ${new Date().toLocaleString("tr-TR")}`,
        40,
        footerY + 15
      );

    if (config.company?.website) {
      doc.text(`Web: ${config.company.website}`, 40, footerY + 30);
    }

    return doc;
  }

  /**
   * Get invoice by path
   * @param {string} filePath - Path to invoice file
   * @returns {Object} - File stream or error
   */
  getInvoice(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        return {
          success: true,
          stream: fs.createReadStream(filePath),
          filename: path.basename(filePath),
        };
      } else {
        return {
          success: false,
          message: "Invoice file not found",
        };
      }
    } catch (error) {
      logger.error(`Get invoice error: ${error.message}`, { error, filePath });
      return {
        success: false,
        message: "Failed to retrieve invoice",
      };
    }
  }

  /**
   * Delete invoice file
   * @param {string} filePath - Path to invoice file
   * @returns {Object} - Deletion result
   */
  deleteInvoice(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return {
          success: true,
          message: "Invoice deleted successfully",
        };
      } else {
        return {
          success: false,
          message: "Invoice file not found",
        };
      }
    } catch (error) {
      logger.error(`Delete invoice error: ${error.message}`, {
        error,
        filePath,
      });
      return {
        success: false,
        message: "Failed to delete invoice",
      };
    }
  }
}

module.exports = new InvoiceGenerator();
