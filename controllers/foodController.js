const mongoose = require('mongoose');
const Food = require('../models/Food');
const Comment = require('../models/Comment');
const Rating = require('../models/Rating');
const Order = require('../models/Order');
const User = require('../models/User');
const Cart = require('../models/Cart');
const AuditLog = require('../models/AuditLog');
const winston = require('winston');

// Debug model imports
console.log('Winston logger initialized');
console.log('Food model:', Food);
console.log('Comment model:', Comment);
console.log('Rating model:', Rating);
console.log('Order model:', Order);
console.log('User model:', User);
console.log('Cart model:', Cart);
console.log('AuditLog model:', AuditLog);

// Configure Winston logger
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Input validation helper for adding food
const validateAddFoodInput = (data) => {
  const errors = [];
  if (!data.name || data.name.trim().length < 3) {
    errors.push('Food name must be at least 3 characters long');
  }
  if (!data.description || data.description.trim().length < 10) {
    errors.push('Description must be at least 10 characters long');
  }
  if (!data.category || ![
    'Fast Food', 'Pizza', 'Burger', 'Desserts', 'Beverages', 'Salads', 'Pasta',
    'Seafood', 'Vegetarian', 'Vegan', 'Grill', 'Breakfast', 'Asian', 'Italian', 'Mexican'
  ].includes(data.category)) {
    errors.push('Invalid category');
  }
  if (!data.price || data.price < 0) {
    errors.push('Price must be a non-negative number');
  }
  if (data.preparationTime && data.preparationTime < 0) {
    errors.push('Preparation time cannot be negative');
  }
  if (data.nutritionalInfo) {
    if (data.nutritionalInfo.calories < 0) errors.push('Calories cannot be negative');
    if (data.nutritionalInfo.protein < 0) errors.push('Protein cannot be negative');
    if (data.nutritionalInfo.fat < 0) errors.push('Fat cannot be negative');
    if (data.nutritionalInfo.carbohydrates < 0) errors.push('Carbohydrates cannot be negative');
  }
  if (!data.restaurantId || !mongoose.isValidObjectId(data.restaurantId)) {
    errors.push('Valid restaurant ID is required');
  }
  if (!data.city || data.city.trim().length === 0) {
    errors.push('City is required');
  }
  return errors;
};

// Log action for cart and favorites operations
const logAction = async (action, entity, entityId, details, performedBy) => {
  try {
    await AuditLog.create({
      action,
      entity,
      entityId,
      details,
      performedBy
    });
  } catch (error) {
    logger.error('Audit log error', { error: error.message, stack: error.stack });
  }
};

// Get all foods (public)
exports.getAllFoods = async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, sortBy = 'createdAt', order = 'desc' } = req.query;
    const query = { isAvailable: true };

    if (category) query.category = category;
    if (search) query.$text = { $search: search };
    if (minPrice) query.price = { ...query.price, $gte: Number(minPrice) };
    if (maxPrice) query.price = { ...query.price, $lte: Number(maxPrice) };

    const sort = { [sortBy]: order === 'asc' ? 1 : -1 };

    const foods = await Food.find(query)
      .select('name description category price image averageRating ratingCount preparationTime restaurantId city')
      .sort(sort)
      .limit(50);

    res.status(200).json({
      message: 'Foods retrieved successfully',
      count: foods.length,
      foods
    });
  } catch (error) {
    logger.error('Get foods error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Get food details by ID (public)
exports.getFoodDetails = async (req, res) => {
  console.log('getFoodDetails endpoint hit with id:', req.params.id, 'at', new Date());
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid food ID' });
    }

    const food = await Food.findById(id)
      .select('-__v')
      .populate({
        path: 'comments',
        select: 'content userId createdAt',
        populate: {
          path: 'userId',
          select: 'name profileImage'
        },
        options: { sort: { createdAt: -1 }, limit: 20 }
      });

    if (!food) {
      return res.status(404).json({ message: 'Food not found' });
    }

    res.status(200).json({
      message: 'Food details retrieved successfully',
      food
    });
  } catch (error) {
    logger.error('Get food details error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Add food (admin only)
exports.addFood = async (req, res) => {
  console.log('Add food endpoint hit:', req.body);
  const { name, description, category, price, image, ingredients, nutritionalInfo, preparationTime, isAvailable, restaurantId, city } = req.body;

  try {
    const errors = validateAddFoodInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const food = await Food.create({
      name,
      description,
      category,
      price,
      image: image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc926?q=80&w=2070&auto=format&fit=crop',
      ingredients: ingredients || [],
      nutritionalInfo: nutritionalInfo || { calories: 0, protein: 0, fat: 0, carbohydrates: 0 },
      preparationTime: preparationTime || 15,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      restaurantId,
      city
    });

    await logAction(
      'Add Food',
      'Food',
      food._id,
      `Added food ${food.name} for restaurant ${restaurantId} in city ${city}`,
      req.user.userId
    );

    res.status(201).json({
      message: 'Food added successfully',
      food: {
        _id: food._id,
        name: food.name,
        description: food.description,
        category: food.category,
        price: food.price,
        image: food.image,
        ingredients: food.ingredients,
        nutritionalInfo: food.nutritionalInfo,
        preparationTime: food.preparationTime,
        isAvailable: food.isAvailable,
        restaurantId: food.restaurantId,
        city: food.city,
        createdAt: food.createdAt
      }
    });
  } catch (error) {
    logger.error('Add food error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Update food prices by category (admin only)
exports.updatePricesByCategory = async (req, res) => {
  console.log('Update prices by category endpoint hit:', req.body);
  const { category, priceAdjustment, adjustmentType } = req.body;

  try {
    // Input validation
    if (!category || ![
      'Fast Food', 'Pizza', 'Burger', 'Desserts', 'Beverages', 'Salads', 'Pasta',
      'Seafood', 'Vegetarian', 'Vegan', 'Grill', 'Breakfast', 'Asian', 'Italian', 'Mexican'
    ].includes(category)) {
      return res.status(400).json({ message: 'Valid category is required' });
    }
    if (!priceAdjustment || priceAdjustment <= 0) {
      return res.status(400).json({ message: 'Price adjustment must be a positive number' });
    }
    if (!adjustmentType || !['fixed', 'percentage'].includes(adjustmentType)) {
      return res.status(400).json({ message: 'Adjustment type must be "fixed" or "percentage"' });
    }

    // Define the update query based on adjustment type
    const updateQuery = adjustmentType === 'fixed'
      ? { $inc: { price: priceAdjustment } }
      : { $mul: { price: 1 + priceAdjustment / 100 } };

    // Perform the update
    const result = await Food.updateMany(
      { category, isAvailable: true },
      updateQuery,
      { runValidators: true }
    );

    res.status(200).json({
      message: 'Prices updated successfully',
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    logger.error('Update prices by category error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Add item to cart
exports.addToCart = async (req, res) => {
  console.log('Add to cart endpoint hit:', req.body);
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
      return res.status(400).json({ message: 'Food item is not available' });
    }

    let cart = await Cart.findOne({ userId: req.user.userId });
    if (!cart) {
      cart = await Cart.create({
        userId: req.user.userId,
        items: [],
        totalAmount: 0
      });
    }

    const existingItemIndex = cart.items.findIndex(item => item.foodId.toString() === foodId);
    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].price = food.price;
    } else {
      cart.items.push({
        foodId,
        quantity,
        price: food.price
      });
    }

    await cart.save();

    await logAction(
      'Add to Cart',
      'Cart',
      cart._id,
      `Added ${quantity} of ${food.name} to cart`,
      req.user.userId
    );

    res.status(200).json({
      message: 'Item added to cart successfully',
      cart
    });
  } catch (error) {
    logger.error('Add to cart error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Get cart
exports.getCart = async (req, res) => {
  console.log('getCart endpoint hit for user:', req.user?.userId, 'at', new Date());
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ message: 'Unauthorized access' });
  }
  try {
    const cart = await Cart.findOne({ userId: req.user.userId })
      .populate('items.foodId', 'name description category price image isAvailable');
    if (!cart) {
      return res.status(200).json({
        message: 'Cart is empty',
        cart: { userId: req.user.userId, items: [], totalAmount: 0 }
      });
    }
    // Filter out invalid or unavailable items
    cart.items = cart.items.filter(item => item.foodId && item.foodId.isAvailable);
    await cart.save();
    res.status(200).json({
      message: 'Cart retrieved successfully',
      cart
    });
  } catch (error) {
    logger.error('Get cart error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Update cart item quantity
exports.updateCartItem = async (req, res) => {
  console.log('Update cart item endpoint hit:', req.body);
  const { foodId, quantity } = req.body;

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

    const food = await Food.findById(foodId);
    if (!food || !food.isAvailable) {
      return res.status(400).json({ message: 'Food item is not available' });
    }

    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].price = food.price;
    await cart.save();

    await logAction(
      'Update Cart Item',
      'Cart',
      cart._id,
      `Updated quantity of ${food.name} to ${quantity}`,
      req.user.userId
    );

    res.status(200).json({
      message: 'Cart item updated successfully',
      cart
    });
  } catch (error) {
    logger.error('Update cart item error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Remove item from cart
exports.removeCartItem = async (req, res) => {
  console.log('Remove cart item endpoint hit:', req.params);
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

    const food = await Food.findById(foodId);
    cart.items.splice(itemIndex, 1);
    await cart.save();

    await logAction(
      'Remove Cart Item',
      'Cart',
      cart._id,
      `Removed ${food ? food.name : 'item'} from cart`,
      req.user.userId
    );

    res.status(200).json({
      message: 'Item removed from cart successfully',
      cart
    });
  } catch (error) {
    logger.error('Remove cart item error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Clear cart
exports.clearCart = async (req, res) => {
  console.log('Clear cart endpoint hit');
  try {
    const cart = await Cart.findOne({ userId: req.user.userId });
    if (!cart) {
      return res.status(200).json({
        message: 'Cart is already empty',
        cart: { userId: req.user.userId, items: [], totalAmount: 0 }
      });
    }

    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();

    await logAction(
      'Clear Cart',
      'Cart',
      cart._id,
      'Cleared all items from cart',
      req.user.userId
    );

    res.status(200).json({
      message: 'Cart cleared successfully',
      cart
    });
  } catch (error) {
    logger.error('Clear cart error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Place order using cart
exports.placeOrder = async (req, res) => {
  console.log('Place order endpoint hit:', req.body);
  const { deliveryAddressId, deliveryAddress, paymentMethod, items } = req.body;

  try {
    if (!paymentMethod) {
      return res.status(400).json({ message: 'Payment method is required' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order items are required' });
    }

    const user = await User.findById(req.user.userId);
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: 'User not found' });
    }

    let shippingAddress;
    if (deliveryAddressId) {
      if (!mongoose.isValidObjectId(deliveryAddressId)) {
        return res.status(400).json({ message: 'Invalid delivery address ID' });
      }
      shippingAddress = user.addresses.id(deliveryAddressId);
      if (!shippingAddress) {
        return res.status(404).json({ message: 'Delivery address not found' });
      }
    } else if (deliveryAddress) {
      const { street, city, state, postalCode, country } = deliveryAddress;
      if (!street || !city || !state || !postalCode || !country) {
        return res.status(400).json({ message: 'All address fields are required' });
      }
      shippingAddress = { street, city, state, postalCode, country };
    } else {
      return res.status(400).json({ message: 'Delivery address or address ID is required' });
    }

    const orderItems = [];
    let totalAmount = 0;
    let restaurantId = null;

    for (const item of items) {
      const food = await Food.findById(item.foodId);
      if (!food || !food.isAvailable) {
        return res.status(400).json({ message: `Food item ${item.foodId} is not available` });
      }
      if (!item.quantity || item.quantity < 1) {
        return res.status(400).json({ message: `Invalid quantity for food item ${item.foodId}` });
      }
      if (!food.restaurantId) {
        return res.status(400).json({ message: `Restaurant ID not found for food item ${item.foodId}` });
      }
      if (restaurantId && restaurantId !== food.restaurantId.toString()) {
        return res.status(400).json({ message: 'All items must be from the same restaurant' });
      }
      restaurantId = food.restaurantId;
      const itemTotal = food.price * item.quantity;
      totalAmount += itemTotal;
      orderItems.push({
        productId: food._id,
        quantity: item.quantity,
        price: food.price
      });
    }

    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const order = await Order.create({
      orderId,
      userId: req.user.userId,
      restaurantId,
      city: shippingAddress.city,
      items: orderItems,
      totalAmount,
      status: 'pending',
      shipping: shippingAddress
    });

    user.orders.push(order._id);
    user.loyaltyPoints += Math.floor(totalAmount / 10);
    await user.save();

    // Clear cart after order placement
    const cart = await Cart.findOne({ userId: req.user.userId });
    if (cart) {
      cart.items = [];
      cart.totalAmount = 0;
      await cart.save();
    }

    await logAction(
      'Place Order',
      'Order',
      order._id,
      `Placed order ${order.orderId} with total ${totalAmount}`,
      req.user.userId
    );

    res.status(201).json({
      message: 'Order placed successfully',
      order: {
        orderId: order.orderId,
        totalAmount: order.totalAmount,
        status: order.status,
        items: order.items,
        shipping: order.shipping,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    logger.error('Place order error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Track order status
exports.trackOrder = async (req, res) => {
  console.log('Track order endpoint hit:', req.params);
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    const order = await Order.findOne({ _id: id, userId: req.user.userId })
      .select('orderId status totalAmount shipping estimatedDeliveryTime createdAt items')
      .populate('items.productId', 'name price image');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(200).json({
      message: 'Order tracking retrieved successfully',
      order
    });
  } catch (error) {
    logger.error('Track order error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add food to favorites
exports.addToFavorites = async (req, res) => {
  console.log('Add to favorites endpoint hit:', req.body);
  const { foodId } = req.body;

  try {
    if (!mongoose.isValidObjectId(foodId)) {
      return res.status(400).json({ message: 'Invalid food ID' });
    }

    const food = await Food.findById(foodId);
    if (!food || !food.isAvailable) {
      return res.status(400).json({ message: 'Food item is not available' });
    }

    const user = await User.findById(req.user.userId);
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.favorites.includes(foodId)) {
      return res.status(400).json({ message: 'Food already in favorites' });
    }

    user.favorites.push(foodId);
    await user.save();

    await logAction(
      'Add to Favorites',
      'User',
      user._id,
      `Added food ${food.name} to favorites`,
      req.user.userId
    );

    res.status(200).json({
      message: 'Food added to favorites successfully',
      favorite: {
        foodId: food._id,
        name: food.name,
        price: food.price,
        image: food.image
      }
    });
  } catch (error) {
    logger.error('Add to favorites error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Remove food from favorites
exports.removeFromFavorites = async (req, res) => {
  console.log('Remove from favorites endpoint hit:', req.params);
  const { foodId } = req.params;

  try {
    if (!mongoose.isValidObjectId(foodId)) {
      return res.status(400).json({ message: 'Invalid food ID' });
    }

    const user = await User.findById(req.user.userId);
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: 'User not found' });
    }

    const favoriteIndex = user.favorites.indexOf(foodId);
    if (favoriteIndex === -1) {
      return res.status(404).json({ message: 'Food not found in favorites' });
    }

    const food = await Food.findById(foodId);
    user.favorites.splice(favoriteIndex, 1);
    await user.save();

    await logAction(
      'Remove from Favorites',
      'User',
      user._id,
      `Removed food ${food ? food.name : 'item'} from favorites`,
      req.user.userId
    );

    res.status(200).json({
      message: 'Food removed from favorites successfully'
    });
  } catch (error) {
    logger.error('Remove from favorites error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user favorites
exports.getFavorites = async (req, res) => {
  console.log('Get favorites endpoint hit');
  try {
    const user = await User.findById(req.user.userId)
      .select('favorites')
      .populate('favorites', 'name description category price image isAvailable');

    if (!user || user.isDeleted) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'Favorites retrieved successfully',
      favorites: user.favorites
    });
  } catch (error) {
    logger.error('Get favorites error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};