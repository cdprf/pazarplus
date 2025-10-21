const express = require("express");
const router = express.Router();
const whatsappController = require("../controllers/whatsappController");

// @route   POST /api/whatsapp/webhook
// @desc    Handle incoming WhatsApp messages via a webhook
// @access  Public
// This endpoint is public because it will be called by the WhatsApp API provider (e.g., Twilio, Meta).
// Security is typically handled by verifying a signature provided by the service.
router.post("/webhook", whatsappController.handleWebhook);

module.exports = router;