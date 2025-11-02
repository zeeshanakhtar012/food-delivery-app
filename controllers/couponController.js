const Coupon = require('../models/PostgreSQL/Coupon');
const { successResponse, errorResponse, paginatedResponse } = require('../helpers/response');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');
const { logCreate, logUpdate, logDelete } = require('../services/auditService');

// Create coupon (Restaurant Admin)
exports.createCoupon = async (req, res, next) => {
  try {
    const {
      code,
      type,
      value,
      min_order_amount,
      max_discount_amount,
      usage_limit,
      valid_from,
      valid_until,
      is_active = true
    } = req.body;

    if (!code || !type || !value || !valid_from || !valid_until) {
      return errorResponse(res, 'Code, type, value, valid_from, and valid_until are required', 400);
    }

    const validTypes = ['percentage', 'fixed_amount', 'free_delivery'];
    if (!validTypes.includes(type)) {
      return errorResponse(res, `Invalid coupon type. Must be one of: ${validTypes.join(', ')}`, 400);
    }

    // Check if code already exists
    const existing = await Coupon.findByCode(code);
    if (existing) {
      return errorResponse(res, 'Coupon code already exists', 400);
    }

    const coupon = await Coupon.create({
      restaurant_id: req.user.restaurant_id,
      code,
      type,
      value: parseFloat(value),
      min_order_amount: min_order_amount ? parseFloat(min_order_amount) : 0,
      max_discount_amount: max_discount_amount ? parseFloat(max_discount_amount) : null,
      usage_limit: usage_limit ? parseInt(usage_limit) : null,
      valid_from: new Date(valid_from),
      valid_until: new Date(valid_until),
      is_active
    });

    await logCreate(req.user.id, 'restaurant_admin', 'COUPON', coupon.id, coupon, req);

    return successResponse(res, coupon, 'Coupon created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// Get all coupons (Restaurant Admin)
exports.getCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.findByRestaurantId(req.user.restaurant_id);
    return successResponse(res, coupons, 'Coupons retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get coupon by ID
exports.getCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return errorResponse(res, 'Coupon not found', 404);
    }

    if (coupon.restaurant_id !== req.user.restaurant_id) {
      return errorResponse(res, 'Access denied', 403);
    }

    return successResponse(res, coupon, 'Coupon retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Update coupon
exports.updateCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return errorResponse(res, 'Coupon not found', 404);
    }

    if (coupon.restaurant_id !== req.user.restaurant_id) {
      return errorResponse(res, 'Access denied', 403);
    }

    const oldValues = { ...coupon };
    const updated = await Coupon.update(id, req.body);

    if (!updated) {
      return errorResponse(res, 'No fields to update', 400);
    }

    await logUpdate(req.user.id, 'restaurant_admin', 'COUPON', id, oldValues, updated, req);

    return successResponse(res, updated, 'Coupon updated successfully');
  } catch (error) {
    next(error);
  }
};

// Delete coupon
exports.deleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return errorResponse(res, 'Coupon not found', 404);
    }

    if (coupon.restaurant_id !== req.user.restaurant_id) {
      return errorResponse(res, 'Access denied', 403);
    }

    await Coupon.delete(id);
    await logDelete(req.user.id, 'restaurant_admin', 'COUPON', id, coupon, req);

    return successResponse(res, null, 'Coupon deleted successfully');
  } catch (error) {
    next(error);
  }
};

// Get available coupons (User)
exports.getAvailableCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.getAvailableCoupons(req.user.restaurant_id);
    return successResponse(res, coupons, 'Available coupons retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Apply coupon (User)
exports.applyCoupon = async (req, res, next) => {
  try {
    const { code, order_amount } = req.body;

    if (!code || !order_amount) {
      return errorResponse(res, 'Coupon code and order amount are required', 400);
    }

    const result = await Coupon.applyCoupon(code, parseFloat(order_amount), req.user.restaurant_id);
    return successResponse(res, result, 'Coupon applied successfully');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

