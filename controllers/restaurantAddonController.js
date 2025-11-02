const FoodAddon = require('../models/PostgreSQL/FoodAddon');
const { successResponse, errorResponse } = require('../helpers/response');
const { logCreate, logUpdate, logDelete } = require('../services/auditService');

// Create addon
exports.createAddon = async (req, res, next) => {
  try {
    const { food_id, name, price, is_required = false } = req.body;

    if (!food_id || !name || price === undefined) {
      return errorResponse(res, 'Food ID, name, and price are required', 400);
    }

    // Verify food belongs to restaurant
    const Food = require('../models/PostgreSQL/Food');
    const food = await Food.findById(food_id);

    if (!food || food.restaurant_id !== req.user.restaurant_id) {
      return errorResponse(res, 'Food not found or does not belong to restaurant', 404);
    }

    const addon = await FoodAddon.create({
      food_id,
      name,
      price: parseFloat(price),
      is_required
    });

    await logCreate(req.user.id, 'restaurant_admin', 'FOOD_ADDON', addon.id, addon, req);

    return successResponse(res, addon, 'Addon created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// Get addons for food
exports.getFoodAddons = async (req, res, next) => {
  try {
    const { food_id } = req.params;

    // Verify food belongs to restaurant
    const Food = require('../models/PostgreSQL/Food');
    const food = await Food.findById(food_id);

    if (!food || food.restaurant_id !== req.user.restaurant_id) {
      return errorResponse(res, 'Food not found or does not belong to restaurant', 404);
    }

    const addons = await FoodAddon.findByFoodId(food_id);

    return successResponse(res, addons, 'Addons retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Update addon
exports.updateAddon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const addon = await FoodAddon.findById(id);

    if (!addon) {
      return errorResponse(res, 'Addon not found', 404);
    }

    // Verify food belongs to restaurant
    const Food = require('../models/PostgreSQL/Food');
    const food = await Food.findById(addon.food_id);

    if (!food || food.restaurant_id !== req.user.restaurant_id) {
      return errorResponse(res, 'Access denied', 403);
    }

    const oldValues = { ...addon };
    const updated = await FoodAddon.update(id, req.body);

    if (!updated) {
      return errorResponse(res, 'No fields to update', 400);
    }

    await logUpdate(req.user.id, 'restaurant_admin', 'FOOD_ADDON', id, oldValues, updated, req);

    return successResponse(res, updated, 'Addon updated successfully');
  } catch (error) {
    next(error);
  }
};

// Delete addon
exports.deleteAddon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const addon = await FoodAddon.findById(id);

    if (!addon) {
      return errorResponse(res, 'Addon not found', 404);
    }

    // Verify food belongs to restaurant
    const Food = require('../models/PostgreSQL/Food');
    const food = await Food.findById(addon.food_id);

    if (!food || food.restaurant_id !== req.user.restaurant_id) {
      return errorResponse(res, 'Access denied', 403);
    }

    await FoodAddon.delete(id);
    await logDelete(req.user.id, 'restaurant_admin', 'FOOD_ADDON', id, addon, req);

    return successResponse(res, null, 'Addon deleted successfully');
  } catch (error) {
    next(error);
  }
};

