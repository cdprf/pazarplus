const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const optionalAuth = require("../middleware/optionalAuth");

// @route   POST /api/chat
// @desc    Handle an incoming chat message
// @access  Public/Private
router.post("/", optionalAuth, chatController.handleChatMessage);

module.exports = router;