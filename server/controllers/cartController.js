const { Cart, CartItem, Product, Supplier, SupplierPrice } = require("../models");
const logger = require("../utils/logger");

class CartController {
  // Helper to get or create a cart for a user or a guest
  async _getOrCreateCart(userId, sessionId) {
    if (userId) {
      const [cart] = await Cart.findOrCreate({ where: { userId } });
      return cart;
    }
    if (sessionId) {
      const [cart] = await Cart.findOrCreate({ where: { sessionId } });
      return cart;
    }
    return null;
  }

  /**
   * Get the current user's or guest's cart.
   */
  async getCart(req, res) {
    try {
      const userId = req.user ? req.user.id : null;
      const sessionId = !userId ? req.query.sessionId || req.body.sessionId : null;

      if (!userId && !sessionId) {
        return res.status(400).json({ success: false, message: "User ID or Session ID is required." });
      }

      const whereClause = userId ? { userId } : { sessionId };
      const cart = await Cart.findOne({
        where: whereClause,
        include: [
          {
            model: CartItem,
            as: "items",
            include: [
              { model: Product, as: "product" },
              { model: Supplier, as: "supplier" },
            ],
          },
        ],
      });

      if (!cart) {
        // If no cart, create one and return it empty
        const newCart = await this._getOrCreateCart(userId, sessionId);
        return res.json({ success: true, data: newCart });
      }

      res.json({ success: true, data: cart });
    } catch (error) {
      logger.error("Failed to get cart:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve cart.",
        error: error.message,
      });
    }
  }

  /**
   * Add an item to the cart.
   */
  async addItemToCart(req, res) {
    try {
      const userId = req.user ? req.user.id : null;
      const { productId, supplierId, quantity, sessionId } = req.body;

      if (!userId && !sessionId) {
        return res.status(400).json({ success: false, message: "User ID or Session ID is required to add items to cart." });
      }

      if (!productId || !supplierId || !quantity) {
        return res.status(400).json({
          success: false,
          message: "productId, supplierId, and quantity are required.",
        });
      }

      const cart = await this._getOrCreateCart(userId, sessionId);

      const supplierPrice = await SupplierPrice.findOne({
        where: { productId, supplierId },
      });

      if (!supplierPrice) {
        return res.status(404).json({
          success: false,
          message: "This product is not available from the selected supplier.",
        });
      }

      let cartItem = await CartItem.findOne({
        where: { cartId: cart.id, productId, supplierId },
      });

      if (cartItem) {
        cartItem.quantity += parseInt(quantity, 10);
        await cartItem.save();
      } else {
        cartItem = await CartItem.create({
          cartId: cart.id,
          productId,
          supplierId,
          quantity: parseInt(quantity, 10),
          price: supplierPrice.priceTl,
        });
      }

      const updatedCart = await Cart.findByPk(cart.id, {
        include: [{ model: CartItem, as: "items", include: [{ model: Product, as: "product" }, { model: Supplier, as: "supplier" }] }],
      });

      res.status(201).json({ success: true, data: updatedCart });
    } catch (error) {
      logger.error("Failed to add item to cart:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add item to cart.",
        error: error.message,
      });
    }
  }

  /**
   * Update an item's quantity in the cart.
   */
  async updateCartItem(req, res) {
    try {
      const userId = req.user ? req.user.id : null;
      const { itemId } = req.params;
      const { quantity, sessionId } = req.body;

      if (!userId && !sessionId) {
        return res.status(400).json({ success: false, message: "User ID or Session ID is required." });
      }

      if (!quantity || parseInt(quantity, 10) <= 0) {
        return res.status(400).json({
            success: false,
            message: "A valid quantity greater than 0 is required.",
        });
      }

      const whereClause = userId ? { userId } : { sessionId };
      const cart = await Cart.findOne({ where: whereClause });
      if (!cart) {
        return res.status(404).json({ success: false, message: "Cart not found." });
      }

      const cartItem = await CartItem.findOne({
        where: { id: itemId, cartId: cart.id },
      });

      if (!cartItem) {
        return res.status(404).json({ success: false, message: "Item not found in cart." });
      }

      cartItem.quantity = parseInt(quantity, 10);
      await cartItem.save();

      const updatedCart = await Cart.findByPk(cart.id, {
        include: [{ model: CartItem, as: "items", include: [{ model: Product, as: "product" }, { model: Supplier, as: "supplier" }] }],
      });

      res.json({ success: true, data: updatedCart });
    } catch (error) {
      logger.error("Failed to update cart item:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update cart item.",
        error: error.message,
      });
    }
  }

  /**
   * Remove an item from the cart.
   */
  async removeCartItem(req, res) {
    try {
      const userId = req.user ? req.user.id : null;
      const { itemId } = req.params;
      const { sessionId } = req.body;

      if (!userId && !sessionId) {
        return res.status(400).json({ success: false, message: "User ID or Session ID is required." });
      }

      const whereClause = userId ? { userId } : { sessionId };
      const cart = await Cart.findOne({ where: whereClause });
      if (!cart) {
        return res.status(404).json({ success: false, message: "Cart not found." });
      }

      const cartItem = await CartItem.findOne({
        where: { id: itemId, cartId: cart.id },
      });

      if (!cartItem) {
        return res.status(404).json({ success: false, message: "Item not found in cart." });
      }

      await cartItem.destroy();

      const updatedCart = await Cart.findByPk(cart.id, {
        include: [{ model: CartItem, as: "items", include: [{ model: Product, as: "product" }, { model: Supplier, as: "supplier" }] }],
      });

      res.json({ success: true, data: updatedCart });
    } catch (error) {
      logger.error("Failed to remove item from cart:", error);
      res.status(500).json({
        success: false,
        message: "Failed to remove item from cart.",
        error: error.message,
      });
    }
  }
}

module.exports = new CartController();