const express = require("express");
const router = express.Router();
const qnbFinansInvoiceController = require("../../../controllers/qnbFinansInvoiceController");
const { auth } = require("../../../middleware/auth");

// Apply authentication middleware
router.use(auth);

// QNB Finans invoice routes
router.post(
  "/orders/:orderId/qnb-einvoice",
  qnbFinansInvoiceController.generateEInvoice
);
router.post(
  "/orders/:orderId/qnb-earsiv",
  qnbFinansInvoiceController.generateEArchive
);
router.get(
  "/invoices/:invoiceId/status",
  qnbFinansInvoiceController.getInvoiceStatus
);
router.post(
  "/invoices/:invoiceId/cancel",
  qnbFinansInvoiceController.cancelInvoice
);
router.post("/test-connection", qnbFinansInvoiceController.testConnection);

module.exports = router;
