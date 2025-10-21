const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const optionalAuth = require("../middleware/optionalAuth");
const { body, param } = require('express-validator');

// @route   GET /api/cart
// @desc    Get the user's or guest's cart
// @access  Public/Private
router.get("/", optionalAuth, cartController.getCart);

// @route   POST /api/cart
// @desc    Add an item to the cart
// @access  Public/Private
router.post(
  "/",
  optionalAuth,
  [
    body('productId').isUUID().withMessage('Valid productId is required.'),
    body('supplierId').isUUID().withMessage('Valid supplierId is required.'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1.'),
    body('sessionId').optional().isString().withMessage('sessionId must be a string.'),
  ],
  cartController.addItemToCart
);

// @route   PUT /api/cart/items/:itemId
// @desc    Update the quantity of a cart item
// @access  Public/Private
router.put(
  "/items/:itemId",
  optionalAuth,
  [
    param('itemId').isUUID().withMessage('Valid itemId is required.'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1.'),
    body('sessionId').optional().isString().withMessage('sessionId must be a string.'),
  ],
  cartController.updateCartItem
);

// @route   DELETE /api/cart/items/:itemId
// @desc    Remove an item from the cart
// @access  Public/Private
router.delete(
  "/items/:itemId",
  optionalAuth,
  [
    param('itemId').isUUID().withMessage('Valid itemId is required.'),
    body('sessionId').optional().isString().withMessage('sessionId must be a string.'),
  ],
  cartController.removeCartItem
);

module.exports = router;