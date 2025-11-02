const Address = require('../models/PostgreSQL/Address');
const { successResponse, errorResponse } = require('../helpers/response');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');
const { logUpdate, logCreate, logDelete } = require('../services/auditService');

// Create address
exports.createAddress = async (req, res, next) => {
  try {
    const {
      label,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      lat,
      lng,
      is_default,
      contact_name,
      contact_phone
    } = req.body;

    if (!label || !address_line1 || !city || !country || !lat || !lng) {
      return errorResponse(res, 'Label, address_line1, city, country, lat, and lng are required', 400);
    }

    const address = await Address.create({
      user_id: req.user.id,
      label,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      is_default: is_default === true,
      contact_name,
      contact_phone
    });

    await logCreate(req.user.id, 'user', 'ADDRESS', address.id, address, req);

    return successResponse(res, address, 'Address created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// Get all addresses
exports.getAddresses = async (req, res, next) => {
  try {
    const addresses = await Address.findByUserId(req.user.id);
    return successResponse(res, addresses, 'Addresses retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get address by ID
exports.getAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const address = await Address.findById(id);

    if (!address) {
      return errorResponse(res, 'Address not found', 404);
    }

    if (address.user_id !== req.user.id) {
      return errorResponse(res, 'Access denied', 403);
    }

    return successResponse(res, address, 'Address retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Update address
exports.updateAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const address = await Address.findById(id);

    if (!address) {
      return errorResponse(res, 'Address not found', 404);
    }

    if (address.user_id !== req.user.id) {
      return errorResponse(res, 'Access denied', 403);
    }

    const oldValues = { ...address };
    const updated = await Address.update(id, req.body);

    if (!updated) {
      return errorResponse(res, 'No fields to update', 400);
    }

    await logUpdate(req.user.id, 'user', 'ADDRESS', id, oldValues, updated, req);

    return successResponse(res, updated, 'Address updated successfully');
  } catch (error) {
    next(error);
  }
};

// Set default address
exports.setDefaultAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const address = await Address.findById(id);

    if (!address) {
      return errorResponse(res, 'Address not found', 404);
    }

    if (address.user_id !== req.user.id) {
      return errorResponse(res, 'Access denied', 403);
    }

    const updated = await Address.setDefault(id, req.user.id);
    return successResponse(res, updated, 'Default address updated successfully');
  } catch (error) {
    next(error);
  }
};

// Delete address
exports.deleteAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const address = await Address.findById(id);

    if (!address) {
      return errorResponse(res, 'Address not found', 404);
    }

    if (address.user_id !== req.user.id) {
      return errorResponse(res, 'Access denied', 403);
    }

    await Address.delete(id);
    await logDelete(req.user.id, 'user', 'ADDRESS', id, address, req);

    return successResponse(res, null, 'Address deleted successfully');
  } catch (error) {
    next(error);
  }
};

