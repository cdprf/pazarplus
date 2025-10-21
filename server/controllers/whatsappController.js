const { Order } = require("../models");
const logger = require("../utils/logger");

class WhatsAppController {
  /**
   * Handles incoming webhook messages from a WhatsApp API provider.
   * This method simulates parsing a message, finding an order, and preparing a response.
   */
  async handleWebhook(req, res) {
    try {
      // The request body structure will depend on the WhatsApp API provider (e.g., Twilio, Meta).
      // We'll simulate a simple payload for now.
      const { from, body } = req.body; // 'from' is the user's phone number, 'body' is the message.

      if (!from || !body || !body.message) {
        return res.status(400).json({
          success: false,
          message: "Invalid webhook payload. 'from' and 'body.message' are required.",
        });
      }

      const userMessage = body.message;
      logger.info(`Received WhatsApp message from ${from}: "${userMessage}"`);

      // 1. Parse the message to find an order number.
      // We'll look for a pattern like #... or just a sequence of numbers.
      let responseMessage;
      const lowerCaseMessage = userMessage.toLowerCase();

      if (lowerCaseMessage.includes('iade') || lowerCaseMessage.includes('return')) {
        responseMessage = "İade politikamıza göre, ürünleri teslim aldıktan sonra 14 gün içinde iade edebilirsiniz. Detaylı bilgi için web sitemizi ziyaret edebilirsiniz.";
      } else if (lowerCaseMessage.includes('kargo') || lowerCaseMessage.includes('shipping')) {
        responseMessage = "Standart kargo seçeneğimiz 3-5 iş günü içinde teslimat sağlar. Ekspres kargo seçeneğimiz de mevcuttur.";
      } else {
        const orderNumberMatch = userMessage.match(/#?(\d+)/);
        if (orderNumberMatch) {
          const orderNumber = orderNumberMatch[1];
          logger.info(`Parsed order number ${orderNumber} from message.`);

          const order = await Order.findOne({
            where: { orderNumber: `PZR-${orderNumber}` },
          });

          if (order) {
            responseMessage = `Merhaba! #${orderNumber} numaralı siparişinizin durumu: ${order.orderStatus}.`;
          } else {
            responseMessage = `Merhaba! #${orderNumber} numaralı siparişinizi bulamadık. Lütfen numarayı kontrol edip tekrar deneyin.`;
          }
        } else {
          responseMessage = "Merhaba! Sipariş durumunuzu öğrenmek için lütfen sipariş numaranızı yazın (örn: #12345). İade veya kargo hakkında bilgi almak için 'iade' veya 'kargo' yazabilirsiniz.";
        }
      }

      // 4. Log the response that would be sent back.
      // In a real integration, you would use the WhatsApp API client to send this message back to the user.
      logger.info(`Prepared response for ${from}: "${responseMessage}"`);

      // Acknowledge receipt of the webhook with a 200 OK status.
      res.status(200).json({
        success: true,
        message: "Webhook processed successfully.",
        simulatedResponse: responseMessage,
      });

    } catch (error) {
      logger.error("WhatsApp webhook handler failed:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process WhatsApp webhook.",
        error: error.message,
      });
    }
  }
}

module.exports = new WhatsAppController();