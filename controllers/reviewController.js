const Review = require('../models/PostgreSQL/Review');
const { successResponse, errorResponse, paginatedResponse } = require('../helpers/response');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');
const { logCreate, logUpdate, logDelete } = require('../services/auditService');

// Create review
exports.createReview = async (req, res, next) => {
  try {
    const { restaurant_id, food_id, rider_id, order_id, rating, comment, images } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return errorResponse(res, 'Rating must be between 1 and 5', 400);
    }

    // Check if user already reviewed for this order
    if (order_id) {
      if (restaurant_id) {
        const existing = await Review.checkOrderReview(req.user.id, order_id, 'restaurant');
        if (existing) {
          return errorResponse(res, 'You have already reviewed this restaurant for this order', 400);
        }
      }

      if (food_id) {
        const existing = await Review.checkOrderReview(req.user.id, order_id, 'food');
        if (existing) {
          return errorResponse(res, 'You have already reviewed this food for this order', 400);
        }
      }

      if (rider_id) {
        const existing = await Review.checkOrderReview(req.user.id, order_id, 'rider');
        if (existing) {
          return errorResponse(res, 'You have already reviewed this rider for this order', 400);
        }
      }
    }

    const review = await Review.create({
      user_id: req.user.id,
      restaurant_id: restaurant_id || null,
      food_id: food_id || null,
      rider_id: rider_id || null,
      order_id: order_id || null,
      rating: parseInt(rating),
      comment: comment || null,
      images: images || null
    });

    await logCreate(req.user.id, 'user', 'REVIEW', review.id, review, req);

    return successResponse(res, review, 'Review created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// Get reviews by restaurant
exports.getRestaurantReviews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = getPaginationParams(req);

    const result = await Review.findByRestaurantId(id, page, limit);
    const pagination = getPaginationMeta(page, limit, result.total);

    return paginatedResponse(res, result.reviews, pagination, 'Reviews retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get reviews by food
exports.getFoodReviews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = getPaginationParams(req);

    const result = await Review.findByFoodId(id, page, limit);
    const pagination = getPaginationMeta(page, limit, result.total);

    return paginatedResponse(res, result.reviews, pagination, 'Reviews retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get reviews by rider
exports.getRiderReviews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = getPaginationParams(req);

    const result = await Review.findByRiderId(id, page, limit);
    const pagination = getPaginationMeta(page, limit, result.total);

    return paginatedResponse(res, result.reviews, pagination, 'Reviews retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get my reviews
exports.getMyReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = getPaginationParams(req);

    const result = await Review.findByUserId(req.user.id, page, limit);
    const pagination = getPaginationMeta(page, limit, result.total);

    return paginatedResponse(res, result.reviews, pagination, 'Reviews retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Update review
exports.updateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);

    if (!review) {
      return errorResponse(res, 'Review not found', 404);
    }

    if (review.user_id !== req.user.id) {
      return errorResponse(res, 'Access denied', 403);
    }

    const oldValues = { ...review };
    const updated = await Review.update(id, req.body);

    if (!updated) {
      return errorResponse(res, 'No fields to update', 400);
    }

    await logUpdate(req.user.id, 'user', 'REVIEW', id, oldValues, updated, req);

    return successResponse(res, updated, 'Review updated successfully');
  } catch (error) {
    next(error);
  }
};

// Delete review
exports.deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);

    if (!review) {
      return errorResponse(res, 'Review not found', 404);
    }

    if (review.user_id !== req.user.id) {
      return errorResponse(res, 'Access denied', 403);
    }

    await Review.delete(id, req.user.id);
    await logDelete(req.user.id, 'user', 'REVIEW', id, review, req);

    return successResponse(res, null, 'Review deleted successfully');
  } catch (error) {
    next(error);
  }
};

