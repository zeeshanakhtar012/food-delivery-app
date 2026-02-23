const FoodCategory = require('../models/PostgreSQL/FoodCategory');
const { successResponse, errorResponse } = require('../helpers/response');
const { logCreate, logUpdate, logDelete } = require('../services/auditService');

// Create category
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, sort_order, is_active = true } = req.body;
    let { image_url } = req.body;

    if (req.file) {
      image_url = `/uploads/categories/${req.file.filename}`;
    }

    if (!name) {
      return errorResponse(res, 'Category name is required', 400);
    }

    const category = await FoodCategory.create({
      restaurant_id: req.user.restaurant_id,
      name,
      description,
      image_url,
      sort_order: sort_order || 0,
      is_active
    });

    await logCreate(req.user.id, 'restaurant_admin', 'FOOD_CATEGORY', category.id, category, req);

    return successResponse(res, category, 'Category created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// Get all categories
exports.getCategories = async (req, res, next) => {
  try {
    const is_active_only = req.query.active_only === 'true';
    const categories = await FoodCategory.findByRestaurantId(req.user.restaurant_id, is_active_only);

    return successResponse(res, categories, 'Categories retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get category by ID
exports.getCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await FoodCategory.findById(id);

    if (!category) {
      return errorResponse(res, 'Category not found', 404);
    }

    if (category.restaurant_id !== req.user.restaurant_id) {
      return errorResponse(res, 'Access denied', 403);
    }

    return successResponse(res, category, 'Category retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Update category
exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await FoodCategory.findById(id);

    if (!category) {
      return errorResponse(res, 'Category not found', 404);
    }

    if (category.restaurant_id !== req.user.restaurant_id) {
      return errorResponse(res, 'Access denied', 403);
    }

    const oldValues = { ...category };
    const updateData = { ...req.body };

    if (req.file) {
      updateData.image_url = `/uploads/categories/${req.file.filename}`;
    }

    const updated = await FoodCategory.update(id, updateData);

    if (!updated) {
      return errorResponse(res, 'No fields to update', 400);
    }

    await logUpdate(req.user.id, 'restaurant_admin', 'FOOD_CATEGORY', id, oldValues, updated, req);

    return successResponse(res, updated, 'Category updated successfully');
  } catch (error) {
    next(error);
  }
};

// Delete category
exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await FoodCategory.findById(id);

    if (!category) {
      return errorResponse(res, 'Category not found', 404);
    }

    if (category.restaurant_id !== req.user.restaurant_id) {
      return errorResponse(res, 'Access denied', 403);
    }

    try {
      await FoodCategory.delete(id);
    } catch (dbError) {
      if (dbError.message === 'Cannot delete category with existing foods') {
        return errorResponse(res, dbError.message, 400);
      }
      throw dbError;
    }

    await logDelete(req.user.id, 'restaurant_admin', 'FOOD_CATEGORY', id, category, req);

    return successResponse(res, null, 'Category deleted successfully');
  } catch (error) {
    next(error);
  }
};

