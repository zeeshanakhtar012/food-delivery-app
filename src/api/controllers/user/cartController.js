const mongoose = require('mongoose');
const Cart = require('../../../models/Cart');
const Food = require('../../../models/Food');
const AuditLog = require('../../../models/AuditLog');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.userId })
      .populate('items.foodId', 'name price restaurantId city');
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    res.status(200).json({
      message: 'Cart retrieved successfully',
      cart
    });
  } catch (error) {
    logger.error('Get cart error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.addToCart = async (req, res) => {
  const { foodId, quantity } = req.body;
  try {
    if (!mongoose.isValidObjectId(foodId)) {
      return res.status(400).json({ message: 'Invalid food ID' });
    }
    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }
    const food = await Food.findById(foodId);
    if (!food || !food.isAvailable) {
      return res.status(404).json({ message: 'Food not found or unavailable' });
    }
    let cart = await Cart.findOne({ userId: req.user.userId });
    if (!cart) {
      cart = await Cart.create({
        userId: req.user.userId,
        restaurantId: food.restaurantId,
        city: food.city,
        items: [{ foodId, quantity, price: food.price }]
      });
    } else {
      if (cart.restaurantId !== food.restaurantId || cart.city !== food.city) {
        return res.status(400).json({ message: 'Cart can only contain items from one restaurant and city' });
      }
      const itemIndex = cart.items.findIndex(item => item.foodId.toString() === foodId);
      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
      } else {
        cart.items.push({ foodId, quantity, price: food.price });
      }
      await cart.save();
    }
    await AuditLog.create({
      action: 'Add to Cart',
      entity: 'Cart',
      entityId: cart._id,
      restaurantId: food.restaurantId,
      details: `Added ${quantity} of food ${food.name} to cart`,
      performedBy: req.user.userId
    });
    res.status(200).json({
      message: 'Item added to cart successfully',
      cart
    });
  } catch (error) {
    logger.error('Add to cart error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateCartItem = async (req, res) => {
  const { foodId } = req.params;
  const { quantity } = req.body;
  try {
    if (!mongoose.isValidObjectId(foodId)) {
      return res.status(400).json({ message: 'Invalid food ID' });
    }
    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }
    const cart = await Cart.findOne({ userId: req.user.userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    const itemIndex = cart.items.findIndex(item => item.foodId.toString() === foodId);
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }
    cart.items[itemIndex].quantity = quantity;
    await cart.save();
    await AuditLog.create({
      action: 'Update Cart Item',
      entity: 'Cart',
      entityId: cart._id,
      restaurantId: cart.restaurantId,
      details: `Updated quantity of food ${foodId} to ${quantity}`,
      performedBy: req.user.userId
    });
    res.status(200).json({
      message: 'Cart item updated successfully',
      cart
    });
  } catch (error) {
    logger.error('Update cart item error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.removeFromCart = async (req, res) => {
  const { foodId } = req.params;
  try {
    if (!mongoose.isValidObjectId(foodId)) {
      return res.status(400).json({ message: 'Invalid food ID' });
    }
    const cart = await Cart.findOne({ userId: req.user.userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    const itemIndex = cart.items.findIndex(item => item.foodId.toString() === foodId);
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }
    cart.items.splice(itemIndex, 1);
    await cart.save();
    await AuditLog.create({
      action: 'Remove from Cart',
      entity: 'Cart',
      entityId: cart._id,
      restaurantId: cart.restaurantId,
      details: `Removed food ${foodId} from cart`,
      performedBy: req.user.userId
    });
    res.status(200).json({
      message: 'Item removed from cart successfully',
      cart
    });
  } catch (error) {
    logger.error('Remove from cart error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOneAndDelete({ userId: req.user.userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    await AuditLog.create({
      action: 'Clear Cart',
      entity: 'Cart',
      entityId: cart._id,
      restaurantId: cart.restaurantId,
      details: 'Cleared cart',
      performedBy: req.user.userId
    });
    res.status(200).json({ message: 'Cart cleared successfully' });
  } catch (error) {
    logger.error('Clear cart error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};