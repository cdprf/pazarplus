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

      // TODO: Replace this with a real AI service call.
      // This is a mock response for development and testing purposes.
      const mockResponse = {
        intent: "part_inquiry",
        entities: {
          part_name: "brake pads",
          vehicle_model: "BMW 3 Series",
        },
        responseText: `I understand you're looking for brake pads for a BMW 3 Series. I can help with that. What year is your vehicle?`,
      };

      // Log the chat message and the mocked response
      await AIChatLog.create({
        userId,
        sessionId,
        message,
        response: mockResponse.responseText,
        intent: mockResponse.intent,
        entities: mockResponse.entities,
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