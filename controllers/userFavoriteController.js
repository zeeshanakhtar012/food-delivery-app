const Favorite = require('../models/PostgreSQL/Favorite');
const { successResponse, errorResponse } = require('../helpers/response');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

// Add favorite restaurant
exports.addFavoriteRestaurant = async (req, res, next) => {
  try {
    const { restaurant_id } = req.body;

    if (!restaurant_id) {
      return errorResponse(res, 'Restaurant ID is required', 400);
    }

    const Restaurant = require('../models/PostgreSQL/Restaurant');
    const restaurant = await Restaurant.findById(restaurant_id);

    if (!restaurant || !restaurant.is_active) {
      return errorResponse(res, 'Restaurant not found or inactive', 404);
    }

    const favorite = await Favorite.addRestaurant(req.user.id, restaurant_id);
    return successResponse(res, favorite, 'Restaurant added to favorites', 201);
  } catch (error) {
    next(error);
  }
};

// Remove favorite restaurant
exports.removeFavoriteRestaurant = async (req, res, next) => {
  try {
    const { restaurant_id } = req.params;
    const removed = await Favorite.removeRestaurant(req.user.id, restaurant_id);

    if (!removed) {
      return errorResponse(res, 'Restaurant not in favorites', 404);
    }

    return successResponse(res, null, 'Restaurant removed from favorites');
  } catch (error) {
    next(error);
  }
};

// Get favorite restaurants
exports.getFavoriteRestaurants = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = getPaginationParams(req);
    const result = await Favorite.getFavoriteRestaurants(req.user.id, page, limit);
    const pagination = getPaginationMeta(page, limit, result.total);

    return successResponse(res, result.restaurants, 'Favorite restaurants retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Check if restaurant is favorite
exports.isFavoriteRestaurant = async (req, res, next) => {
  try {
    const { restaurant_id } = req.params;
    const isFavorite = await Favorite.isFavoriteRestaurant(req.user.id, restaurant_id);
    return successResponse(res, { is_favorite: isFavorite }, 'Favorite status retrieved');
  } catch (error) {
    next(error);
  }
};

// Add favorite food
exports.addFavoriteFood = async (req, res, next) => {
  try {
    const { food_id } = req.body;

    if (!food_id) {
      return errorResponse(res, 'Food ID is required', 400);
    }

    const Food = require('../models/PostgreSQL/Food');
    const food = await Food.findById(food_id);

    if (!food || !food.is_available) {
      return errorResponse(res, 'Food not found or unavailable', 404);
    }

    const favorite = await Favorite.addFood(req.user.id, food_id);
    return successResponse(res, favorite, 'Food added to favorites', 201);
  } catch (error) {
    next(error);
  }
};

// Remove favorite food
exports.removeFavoriteFood = async (req, res, next) => {
  try {
    const { food_id } = req.params;
    const removed = await Favorite.removeFood(req.user.id, food_id);

    if (!removed) {
      return errorResponse(res, 'Food not in favorites', 404);
    }

    return successResponse(res, null, 'Food removed from favorites');
  } catch (error) {
    next(error);
  }
};

// Get favorite foods
exports.getFavoriteFoods = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = getPaginationParams(req);
    const result = await Favorite.getFavoriteFoods(req.user.id, page, limit);
    const pagination = getPaginationMeta(page, limit, result.total);

    return successResponse(res, result.foods, 'Favorite foods retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Check if food is favorite
exports.isFavoriteFood = async (req, res, next) => {
  try {
    const { food_id } = req.params;
    const isFavorite = await Favorite.isFavoriteFood(req.user.id, food_id);
    return successResponse(res, { is_favorite: isFavorite }, 'Favorite status retrieved');
  } catch (error) {
    next(error);
  }
};

