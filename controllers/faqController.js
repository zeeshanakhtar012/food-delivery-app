const FAQ = require('../models/PostgreSQL/FAQ');
const { successResponse, errorResponse, paginatedResponse } = require('../helpers/response');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');
const { logCreate, logUpdate, logDelete } = require('../services/auditService');

// Create FAQ (Super Admin only)
exports.createFAQ = async (req, res, next) => {
  try {
    const { question, answer, category, is_active = true, display_order = 0 } = req.body;

    if (!question || !answer) {
      return errorResponse(res, 'Question and answer are required', 400);
    }

    const faq = await FAQ.create({
      question,
      answer,
      category: category || null,
      is_active,
      display_order
    });

    await logCreate(req.user.id, 'super_admin', 'FAQ', faq.id, faq, req);

    return successResponse(res, faq, 'FAQ created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// Get active FAQs (Public)
exports.getActiveFAQs = async (req, res, next) => {
  try {
    const { category } = req.query;
    const faqs = await FAQ.getActiveFAQs(category || null);

    return successResponse(res, faqs, 'Active FAQs retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get all FAQs (Super Admin)
exports.getAllFAQs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category } = getPaginationParams(req);
    const result = await FAQ.getAll(category || null, page, limit);
    const pagination = getPaginationMeta(page, limit, result.total);

    return paginatedResponse(res, result.faqs, pagination, 'FAQs retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get FAQ by ID
exports.getFAQ = async (req, res, next) => {
  try {
    const { id } = req.params;
    const faq = await FAQ.findById(id);

    if (!faq) {
      return errorResponse(res, 'FAQ not found', 404);
    }

    return successResponse(res, faq, 'FAQ retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Update FAQ
exports.updateFAQ = async (req, res, next) => {
  try {
    const { id } = req.params;
    const faq = await FAQ.findById(id);

    if (!faq) {
      return errorResponse(res, 'FAQ not found', 404);
    }

    const oldValues = { ...faq };
    const updated = await FAQ.update(id, req.body);

    if (!updated) {
      return errorResponse(res, 'No fields to update', 400);
    }

    await logUpdate(req.user.id, 'super_admin', 'FAQ', id, oldValues, updated, req);

    return successResponse(res, updated, 'FAQ updated successfully');
  } catch (error) {
    next(error);
  }
};

// Delete FAQ
exports.deleteFAQ = async (req, res, next) => {
  try {
    const { id } = req.params;
    const faq = await FAQ.findById(id);

    if (!faq) {
      return errorResponse(res, 'FAQ not found', 404);
    }

    await FAQ.delete(id);
    await logDelete(req.user.id, 'super_admin', 'FAQ', id, faq, req);

    return successResponse(res, null, 'FAQ deleted successfully');
  } catch (error) {
    next(error);
  }
};

// Get FAQ categories
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await FAQ.getCategories();
    return successResponse(res, categories, 'FAQ categories retrieved successfully');
  } catch (error) {
    next(error);
  }
};

