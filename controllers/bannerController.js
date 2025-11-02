const Banner = require('../models/PostgreSQL/Banner');
const { successResponse, errorResponse, paginatedResponse } = require('../helpers/response');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');
const { logCreate, logUpdate, logDelete } = require('../services/auditService');
const { uploadImage } = require('../services/uploadService');

// Create banner (Super Admin or Restaurant Admin)
exports.createBanner = async (req, res, next) => {
  try {
    const {
      title,
      description,
      image_url,
      link_url,
      restaurant_id,
      is_active = true,
      display_order = 0,
      start_date,
      end_date
    } = req.body;

    if (!image_url) {
      return errorResponse(res, 'Image URL is required', 400);
    }

    // Super admin can create for any restaurant, restaurant admin only for their restaurant
    const finalRestaurantId = req.user.role === 'super_admin' 
      ? (restaurant_id || null)
      : req.user.restaurant_id;

    const banner = await Banner.create({
      title,
      description,
      image_url,
      link_url,
      restaurant_id: finalRestaurantId,
      is_active,
      display_order,
      start_date: start_date ? new Date(start_date) : null,
      end_date: end_date ? new Date(end_date) : null
    });

    await logCreate(req.user.id, req.user.role, 'BANNER', banner.id, banner, req);

    return successResponse(res, banner, 'Banner created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// Get active banners (Public)
exports.getActiveBanners = async (req, res, next) => {
  try {
    const { restaurant_id } = req.query;
    const banners = await Banner.getActiveBanners(restaurant_id || null);

    return successResponse(res, banners, 'Active banners retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get all banners (Admin)
exports.getAllBanners = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, restaurant_id } = getPaginationParams(req);

    // Super admin can see all, restaurant admin only their restaurant
    const finalRestaurantId = req.user.role === 'super_admin' 
      ? (restaurant_id || null)
      : req.user.restaurant_id;

    const result = await Banner.getAll(finalRestaurantId, page, limit);
    const pagination = getPaginationMeta(page, limit, result.total);

    return paginatedResponse(res, result.banners, pagination, 'Banners retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get banner by ID
exports.getBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findById(id);

    if (!banner) {
      return errorResponse(res, 'Banner not found', 404);
    }

    // Restaurant admin can only access their restaurant's banners
    if (req.user.role === 'restaurant_admin' && banner.restaurant_id !== req.user.restaurant_id && banner.restaurant_id !== null) {
      return errorResponse(res, 'Access denied', 403);
    }

    return successResponse(res, banner, 'Banner retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Update banner
exports.updateBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findById(id);

    if (!banner) {
      return errorResponse(res, 'Banner not found', 404);
    }

    // Restaurant admin can only update their restaurant's banners
    if (req.user.role === 'restaurant_admin' && banner.restaurant_id !== req.user.restaurant_id && banner.restaurant_id !== null) {
      return errorResponse(res, 'Access denied', 403);
    }

    const oldValues = { ...banner };
    const updated = await Banner.update(id, req.body);

    if (!updated) {
      return errorResponse(res, 'No fields to update', 400);
    }

    await logUpdate(req.user.id, req.user.role, 'BANNER', id, oldValues, updated, req);

    return successResponse(res, updated, 'Banner updated successfully');
  } catch (error) {
    next(error);
  }
};

// Delete banner
exports.deleteBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findById(id);

    if (!banner) {
      return errorResponse(res, 'Banner not found', 404);
    }

    // Restaurant admin can only delete their restaurant's banners
    if (req.user.role === 'restaurant_admin' && banner.restaurant_id !== req.user.restaurant_id && banner.restaurant_id !== null) {
      return errorResponse(res, 'Access denied', 403);
    }

    await Banner.delete(id);
    await logDelete(req.user.id, req.user.role, 'BANNER', id, banner, req);

    return successResponse(res, null, 'Banner deleted successfully');
  } catch (error) {
    next(error);
  }
};

