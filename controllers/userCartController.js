const Cart = require('../models/PostgreSQL/Cart');
const { successResponse, errorResponse } = require('../helpers/response');
const { logAction } = require('../services/auditService');

// Add to cart
exports.addToCart = async (req, res, next) => {
  try {
    const { food_id, quantity, addon_ids, special_instructions } = req.body;

    if (!food_id || !quantity) {
      return errorResponse(res, 'Food ID and quantity are required', 400);
    }

    const Food = require('../models/PostgreSQL/Food');
    const food = await Food.findById(food_id);

    if (!food || food.restaurant_id !== req.user.restaurant_id) {
      return errorResponse(res, 'Food not found or does not belong to restaurant', 404);
    }

    if (!food.is_available) {
      return errorResponse(res, 'Food is not available', 400);
    }

    const cartItem = await Cart.addItem({
      user_id: req.user.id,
      restaurant_id: req.user.restaurant_id,
      food_id,
      quantity: parseInt(quantity),
      addon_ids: addon_ids || null,
      special_instructions: special_instructions || null
    });

    return successResponse(res, cartItem, 'Item added to cart successfully', 201);
  } catch (error) {
    next(error);
  }
};

// Get cart
exports.getCart = async (req, res, next) => {
  try {
    const cart = await Cart.getCart(req.user.id, req.query.restaurant_id || req.user.restaurant_id);
    return successResponse(res, cart, 'Cart retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Update cart item
exports.updateCartItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, addon_ids, special_instructions } = req.body;

    const updateData = {};
    if (quantity !== undefined) updateData.quantity = parseInt(quantity);
    if (addon_ids !== undefined) updateData.addon_ids = addon_ids;
    if (special_instructions !== undefined) updateData.special_instructions = special_instructions;

    const updated = await Cart.updateItem(id, updateData);

    if (!updated) {
      return errorResponse(res, 'Cart item not found or no changes', 404);
    }

    return successResponse(res, updated, 'Cart item updated successfully');
  } catch (error) {
    next(error);
  }
};

// Remove from cart
exports.removeFromCart = async (req, res, next) => {
  try {
    const { id } = req.params;
    const removed = await Cart.removeItem(id, req.user.id);

    if (!removed) {
      return errorResponse(res, 'Cart item not found', 404);
    }

    return successResponse(res, null, 'Item removed from cart successfully');
  } catch (error) {
    next(error);
  }
};

// Clear cart
exports.clearCart = async (req, res, next) => {
  try {
    await Cart.clearCart(req.user.id, req.query.restaurant_id || req.user.restaurant_id);
    return successResponse(res, null, 'Cart cleared successfully');
  } catch (error) {
    next(error);
  }
};

// Get cart count
exports.getCartCount = async (req, res, next) => {
  try {
    const count = await Cart.getCartCount(req.user.id);
    return successResponse(res, { count }, 'Cart count retrieved successfully');
  } catch (error) {
    next(error);
  }
};

