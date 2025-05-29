const fs = require("fs");
const path = require("path");
const { Parser } = require("json2csv");
const ExcelJS = require("exceljs");
const logger = require("../../../utils/logger");
const { Order, OrderItem, User, ShippingDetail } = require("../../../models");
const { Op } = require("sequelize");

class ExportService {
  constructor() {
    this.exportDir = path.join(__dirname, "../../public/exports");

    // Create export directory if it doesn't exist
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  /**
   * Export orders to CSV file
   * @param {Object} filters - Filters to apply to orders
   * @param {String} userId - User ID for filename
   * @returns {Object} - Export result with file path
   */
  async exportOrdersToCSV(filters = {}, userId) {
    try {
      const orders = await this.fetchOrders(filters);

      if (orders.length === 0) {
        return {
          success: false,
          message: "No orders found matching the filters",
        };
      }

      // Flatten order data for CSV
      const flattenedOrders = orders.map((order) =>
        this.flattenOrderData(order)
      );

      // Define CSV fields
      const fields = [
        { label: "Order ID", value: "orderId" },
        { label: "Platform Order ID", value: "platformOrderId" },
        { label: "Platform", value: "platformId" },
        { label: "Order Date", value: "orderDate" },
        { label: "Status", value: "orderStatus" },
        { label: "Customer Name", value: "customerName" },
        { label: "Customer Email", value: "customerEmail" },
        { label: "Customer Phone", value: "customerPhone" },
        { label: "Total Amount", value: "totalAmount" },
        { label: "Currency", value: "currency" },
        { label: "Recipient Name", value: "recipientName" },
        { label: "Address", value: "address" },
        { label: "City", value: "city" },
        { label: "State", value: "state" },
        { label: "Postal Code", value: "postalCode" },
        { label: "Country", value: "country" },
        { label: "Phone", value: "phone" },
        { label: "Shipping Method", value: "shippingMethod" },
        { label: "Tracking Number", value: "trackingNumber" },
        { label: "Carrier", value: "carrier" },
        { label: "Items", value: "itemCount" },
        { label: "Notes", value: "notes" },
      ];

      // Create parser and generate CSV
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(flattenedOrders);

      // Generate filename and save CSV
      const timestamp = Date.now();
      const filename = `orders_export_${userId}_${timestamp}.csv`;
      const filePath = path.join(this.exportDir, filename);

      fs.writeFileSync(filePath, csv);

      return {
        success: true,
        message: `Successfully exported ${orders.length} orders to CSV`,
        data: {
          filename,
          url: `/exports/${filename}`,
          filePath,
          totalOrders: orders.length,
        },
      };
    } catch (error) {
      logger.error(`Failed to export orders to CSV: ${error.message}`, {
        error,
      });

      return {
        success: false,
        message: `Failed to export orders to CSV: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Export orders to Excel file
   * @param {Object} filters - Filters to apply to orders
   * @param {String} userId - User ID for filename
   * @returns {Object} - Export result with file path
   */
  async exportOrdersToExcel(filters = {}, userId) {
    try {
      const orders = await this.fetchOrders(filters);

      if (orders.length === 0) {
        return {
          success: false,
          message: "No orders found matching the filters",
        };
      }

      // Flatten order data for Excel
      const flattenedOrders = orders.map((order) =>
        this.flattenOrderData(order)
      );

      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Pazar+ Order Management";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Orders");

      // Define columns
      worksheet.columns = [
        { header: "Order ID", key: "orderId", width: 10 },
        { header: "Platform Order ID", key: "platformOrderId", width: 20 },
        { header: "Platform", key: "platformId", width: 15 },
        { header: "Order Date", key: "orderDate", width: 20 },
        { header: "Status", key: "orderStatus", width: 15 },
        { header: "Customer Name", key: "customerName", width: 25 },
        { header: "Customer Email", key: "customerEmail", width: 30 },
        { header: "Customer Phone", key: "customerPhone", width: 20 },
        { header: "Total Amount", key: "totalAmount", width: 15 },
        { header: "Currency", key: "currency", width: 10 },
        { header: "Recipient Name", key: "recipientName", width: 25 },
        { header: "Address", key: "address", width: 40 },
        { header: "City", key: "city", width: 20 },
        { header: "State", key: "state", width: 20 },
        { header: "Postal Code", key: "postalCode", width: 15 },
        { header: "Country", key: "country", width: 15 },
        { header: "Phone", key: "phone", width: 20 },
        { header: "Shipping Method", key: "shippingMethod", width: 20 },
        { header: "Tracking Number", key: "trackingNumber", width: 25 },
        { header: "Carrier", key: "carrier", width: 15 },
        { header: "Items", key: "itemCount", width: 10 },
        { header: "Notes", key: "notes", width: 40 },
      ];

      // Add header row with styling
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      // Add data rows
      flattenedOrders.forEach((order) => {
        worksheet.addRow(order);
      });

      // Add autofilter
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 22 },
      };

      // Format date columns
      worksheet.getColumn("orderDate").numFmt = "yyyy-mm-dd hh:mm:ss";

      // Format number columns
      worksheet.getColumn("totalAmount").numFmt = "#,##0.00";

      // Generate filename and save Excel file
      const timestamp = Date.now();
      const filename = `orders_export_${userId}_${timestamp}.xlsx`;
      const filePath = path.join(this.exportDir, filename);

      await workbook.xlsx.writeFile(filePath);

      return {
        success: true,
        message: `Successfully exported ${orders.length} orders to Excel`,
        data: {
          filename,
          url: `/exports/${filename}`,
          filePath,
          totalOrders: orders.length,
        },
      };
    } catch (error) {
      logger.error(`Failed to export orders to Excel: ${error.message}`, {
        error,
      });

      return {
        success: false,
        message: `Failed to export orders to Excel: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Export order items to CSV file
   * @param {Object} filters - Filters to apply to orders
   * @param {String} userId - User ID for filename
   * @returns {Object} - Export result with file path
   */
  async exportOrderItemsToCSV(filters = {}, userId) {
    try {
      const orders = await this.fetchOrders(filters);

      if (orders.length === 0) {
        return {
          success: false,
          message: "No orders found matching the filters",
        };
      }

      // Extract and flatten order items
      const orderItems = [];

      orders.forEach((order) => {
        if (order.OrderItems && order.OrderItems.length > 0) {
          order.OrderItems.forEach((item) => {
            orderItems.push({
              orderId: order.id,
              platformOrderId: order.platformOrderId,
              platformId: order.platformId,
              orderDate: order.orderDate,
              orderStatus: order.orderStatus,
              customerName: order.customerName,
              itemId: item.id,
              platformProductId: item.platformProductId,
              sku: item.sku,
              barcode: item.barcode,
              title: item.title,
              quantity: item.quantity,
              price: item.price,
              currency: item.currency || order.currency,
              variantInfo: item.variantInfo
                ? JSON.stringify(item.variantInfo)
                : "",
              total: (item.quantity * item.price).toFixed(2),
            });
          });
        }
      });

      if (orderItems.length === 0) {
        return {
          success: false,
          message: "No order items found matching the filters",
        };
      }

      // Define CSV fields
      const fields = [
        { label: "Order ID", value: "orderId" },
        { label: "Platform Order ID", value: "platformOrderId" },
        { label: "Platform", value: "platformId" },
        { label: "Order Date", value: "orderDate" },
        { label: "Order Status", value: "orderStatus" },
        { label: "Customer Name", value: "customerName" },
        { label: "Item ID", value: "itemId" },
        { label: "Product ID", value: "platformProductId" },
        { label: "SKU", value: "sku" },
        { label: "Barcode", value: "barcode" },
        { label: "Title", value: "title" },
        { label: "Quantity", value: "quantity" },
        { label: "Price", value: "price" },
        { label: "Currency", value: "currency" },
        { label: "Variant", value: "variantInfo" },
        { label: "Total", value: "total" },
      ];

      // Create parser and generate CSV
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(orderItems);

      // Generate filename and save CSV
      const timestamp = Date.now();
      const filename = `order_items_export_${userId}_${timestamp}.csv`;
      const filePath = path.join(this.exportDir, filename);

      fs.writeFileSync(filePath, csv);

      return {
        success: true,
        message: `Successfully exported ${orderItems.length} order items to CSV`,
        data: {
          filename,
          url: `/exports/${filename}`,
          filePath,
          totalItems: orderItems.length,
        },
      };
    } catch (error) {
      logger.error(`Failed to export order items to CSV: ${error.message}`, {
        error,
      });

      return {
        success: false,
        message: `Failed to export order items to CSV: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Fetch orders with related data based on filters
   * @param {Object} filters - Filters to apply
   * @returns {Array} - Orders with related data
   */
  async fetchOrders(filters = {}) {
    const { status, platform, startDate, endDate, search, orderIds } = filters;

    // Build query conditions
    const whereConditions = {};

    if (status) {
      whereConditions.orderStatus = status;
    }

    if (platform) {
      whereConditions.platformId = platform;
    }

    if (startDate && endDate) {
      whereConditions.orderDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    } else if (startDate) {
      whereConditions.orderDate = {
        [Op.gte]: new Date(startDate),
      };
    } else if (endDate) {
      whereConditions.orderDate = {
        [Op.lte]: new Date(endDate),
      };
    }

    if (search) {
      whereConditions[Op.or] = [
        { platformOrderId: { [Op.like]: `%${search}%` } },
        { customerName: { [Op.like]: `%${search}%` } },
        { customerEmail: { [Op.like]: `%${search}%` } },
      ];
    }

    if (orderIds && orderIds.length > 0) {
      whereConditions.id = {
        [Op.in]: orderIds,
      };
    }

    // Fetch orders with related data
    const orders = await Order.findAll({
      where: whereConditions,
      include: [{ model: OrderItem }, { model: ShippingDetail }],
      order: [["orderDate", "DESC"]],
      // Use limit for large exports?
      // limit: 1000
    });

    return orders;
  }

  /**
   * Flatten order data for export
   * @param {Object} order - Order object with related data
   * @returns {Object} - Flattened order data
   */
  flattenOrderData(order) {
    const shippingDetail = order.ShippingDetail || {};

    return {
      orderId: order.id,
      platformOrderId: order.platformOrderId,
      platformId: order.platformId,
      orderDate: order.orderDate,
      orderStatus: order.orderStatus,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      totalAmount: order.totalAmount,
      currency: order.currency,
      recipientName: shippingDetail.recipientName,
      address: shippingDetail.address,
      city: shippingDetail.city,
      state: shippingDetail.state,
      postalCode: shippingDetail.postalCode,
      country: shippingDetail.country,
      phone: shippingDetail.phone,
      shippingMethod: shippingDetail.shippingMethod,
      trackingNumber: order.trackingNumber || shippingDetail.trackingNumber,
      carrier: order.carrier || shippingDetail.carrier,
      itemCount: order.OrderItems ? order.OrderItems.length : 0,
      notes: order.notes,
    };
  }
}

module.exports = new ExportService();
