const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { isAuthenticated } = require("../middleware/auth");

// @route   POST /api/chat
// @desc    Handle an incoming chat message
// @access  Private
router.post("/", isAuthenticated, chatController.handleChatMessage);

module.exports = router;