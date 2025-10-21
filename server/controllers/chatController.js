const { AIChatLog, User } = require("../models");
const logger = require("../utils/logger");

class ChatController {
  /**
   * Handle incoming chat messages, log them, and return an AI response.
   */
  async handleChatMessage(req, res) {
    try {
      const { message, sessionId } = req.body;
      const userId = req.user ? req.user.id : null;

      if (!message || !sessionId) {
        return res.status(400).json({
          success: false,
          message: "Message and sessionId are required.",
        });
      }

      // Enhanced simulation logic based on keywords
      let intent = 'unknown';
      let entities = {};
      let responseText = "Size nasıl yardımcı olabilirim? 'Sipariş durumumu öğrenmek istiyorum', 'iade politikası nedir?' veya 'kargo seçenekleri nelerdir?' gibi sorular sorabilirsiniz.";

      const lowerCaseMessage = message.toLowerCase();

      if (lowerCaseMessage.includes('sipariş') || lowerCaseMessage.includes('order')) {
        intent = 'order_status_inquiry';
        const orderNumberMatch = lowerCaseMessage.match(/#?(\d+)/);
        if (orderNumberMatch) {
          entities.orderNumber = orderNumberMatch[1];
          responseText = `Sipariş #${entities.orderNumber} için durumu kontrol ediyorum. Lütfen bir saniye bekleyin.`;
        } else {
          responseText = "Sipariş durumunu öğrenmek için lütfen sipariş numaranızı belirtin (örn: #12345).";
        }
      } else if (lowerCaseMessage.includes('iade') || lowerCaseMessage.includes('return')) {
        intent = 'return_policy_inquiry';
        responseText = "İade politikamıza göre, ürünleri teslim aldıktan sonra 14 gün içinde iade edebilirsiniz. Daha fazla bilgi için web sitemizdeki iade politikasını inceleyebilirsiniz.";
      } else if (lowerCaseMessage.includes('kargo') || lowerCaseMessage.includes('shipping')) {
        intent = 'shipping_info_inquiry';
        responseText = "Standart kargo seçeneğimiz 3-5 iş günü içinde teslimat sağlar. Ayrıca, ek ücret karşılığında ekspres kargo seçeneğimiz de mevcuttur.";
      }

      // Log the chat message and the simulated response
      await AIChatLog.create({
        userId,
        sessionId,
        message,
        response: responseText,
        intent: intent,
        entities: entities,
      });

      logger.info(`Chat message logged for session: ${sessionId}`);

      res.json({
        success: true,
        data: {
          response: mockResponse.responseText,
          intent: mockResponse.intent,
          entities: mockResponse.entities,
        },
      });
    } catch (error) {
      logger.error("Failed to handle chat message:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process chat message",
        error: error.message,
      });
    }
  }
}

module.exports = new ChatController();