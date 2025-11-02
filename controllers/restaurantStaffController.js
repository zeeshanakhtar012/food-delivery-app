const RestaurantStaff = require('../models/PostgreSQL/RestaurantStaff');
const jwt = require('jsonwebtoken');
const { successResponse, errorResponse } = require('../helpers/response');
const { logCreate, logUpdate, logDelete } = require('../services/auditService');

// Create staff
exports.createStaff = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password || !role) {
      return errorResponse(res, 'Name, email, password, and role are required', 400);
    }

    const validRoles = ['manager', 'cashier', 'chef'];
    if (!validRoles.includes(role)) {
      return errorResponse(res, `Invalid role. Must be one of: ${validRoles.join(', ')}`, 400);
    }

    // Check if email exists
    const existing = await RestaurantStaff.findByEmailAndRestaurant(email, req.user.restaurant_id);
    if (existing) {
      return errorResponse(res, 'Email already exists for this restaurant', 400);
    }

    const staff = await RestaurantStaff.create({
      restaurant_id: req.user.restaurant_id,
      name,
      email,
      password,
      phone,
      role
    });

    await logCreate(req.user.id, 'restaurant_admin', 'RESTAURANT_STAFF', staff.id, staff, req);

    return successResponse(res, staff, 'Staff member created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// Get all staff
exports.getStaff = async (req, res, next) => {
  try {
    const { role } = req.query;
    const staff = await RestaurantStaff.findByRestaurantId(req.user.restaurant_id, role || null);

    return successResponse(res, staff, 'Staff retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get staff by ID
exports.getStaffById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const staff = await RestaurantStaff.findById(id);

    if (!staff) {
      return errorResponse(res, 'Staff member not found', 404);
    }

    // Staff is accessed via restaurant, so we need to check restaurant_id
    // Since staff table has restaurant_id, we verify access through restaurant admin's restaurant_id
    const allStaff = await RestaurantStaff.findByRestaurantId(req.user.restaurant_id);
    const found = allStaff.find(s => s.id === id);

    if (!found) {
      return errorResponse(res, 'Access denied', 403);
    }

    return successResponse(res, staff, 'Staff member retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Update staff
exports.updateStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const staff = await RestaurantStaff.findById(id);

    if (!staff) {
      return errorResponse(res, 'Staff member not found', 404);
    }

    // Verify staff belongs to restaurant
    const allStaff = await RestaurantStaff.findByRestaurantId(req.user.restaurant_id);
    const found = allStaff.find(s => s.id === id);

    if (!found) {
      return errorResponse(res, 'Access denied', 403);
    }

    const oldValues = { ...staff };
    const updated = await RestaurantStaff.update(id, req.body);

    if (!updated) {
      return errorResponse(res, 'No fields to update', 400);
    }

    await logUpdate(req.user.id, 'restaurant_admin', 'RESTAURANT_STAFF', id, oldValues, updated, req);

    return successResponse(res, updated, 'Staff member updated successfully');
  } catch (error) {
    next(error);
  }
};

// Delete staff
exports.deleteStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const staff = await RestaurantStaff.findById(id);

    if (!staff) {
      return errorResponse(res, 'Staff member not found', 404);
    }

    // Verify staff belongs to restaurant
    const allStaff = await RestaurantStaff.findByRestaurantId(req.user.restaurant_id);
    const found = allStaff.find(s => s.id === id);

    if (!found) {
      return errorResponse(res, 'Access denied', 403);
    }

    await RestaurantStaff.delete(id);
    await logDelete(req.user.id, 'restaurant_admin', 'RESTAURANT_STAFF', id, staff, req);

    return successResponse(res, null, 'Staff member deleted successfully');
  } catch (error) {
    next(error);
  }
};

