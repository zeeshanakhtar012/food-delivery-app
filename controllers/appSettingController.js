const AppSetting = require('../models/PostgreSQL/AppSetting');
const { successResponse, errorResponse } = require('../helpers/response');
const { logAction } = require('../services/auditService');

// Get setting by key
exports.getSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const setting = await AppSetting.getByKey(key);

    if (!setting) {
      return errorResponse(res, 'Setting not found', 404);
    }

    return successResponse(res, setting, 'Setting retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get all settings
exports.getAllSettings = async (req, res, next) => {
  try {
    const settings = await AppSetting.getAll();
    return successResponse(res, settings, 'Settings retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Create or update setting
exports.upsertSetting = async (req, res, next) => {
  try {
    const { key, value, type = 'string', description } = req.body;

    if (!key || value === undefined) {
      return errorResponse(res, 'Key and value are required', 400);
    }

    const validTypes = ['string', 'number', 'boolean', 'json'];
    if (!validTypes.includes(type)) {
      return errorResponse(res, `Invalid type. Must be one of: ${validTypes.join(', ')}`, 400);
    }

    // Convert value based on type
    let finalValue = value;
    if (type === 'json') {
      finalValue = JSON.stringify(value);
    } else if (type === 'number') {
      finalValue = value.toString();
    } else if (type === 'boolean') {
      finalValue = value ? 'true' : 'false';
    }

    const setting = await AppSetting.upsert(key, finalValue, type, description || null);

    await logAction(req.user.id, 'super_admin', 'UPSERT_SETTING', 'APP_SETTING', setting.id, setting, req);

    return successResponse(res, setting, 'Setting saved successfully');
  } catch (error) {
    next(error);
  }
};

// Update setting value
exports.updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return errorResponse(res, 'Value is required', 400);
    }

    const setting = await AppSetting.getByKey(key);
    if (!setting) {
      return errorResponse(res, 'Setting not found', 404);
    }

    let finalValue = value;
    if (setting.type === 'json') {
      finalValue = JSON.stringify(value);
    } else if (setting.type === 'number') {
      finalValue = value.toString();
    } else if (setting.type === 'boolean') {
      finalValue = value ? 'true' : 'false';
    }

    const updated = await AppSetting.updateValue(key, finalValue);

    await logAction(req.user.id, 'super_admin', 'UPDATE_SETTING', 'APP_SETTING', updated.id, updated, req);

    return successResponse(res, updated, 'Setting updated successfully');
  } catch (error) {
    next(error);
  }
};

// Delete setting
exports.deleteSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const setting = await AppSetting.getByKey(key);

    if (!setting) {
      return errorResponse(res, 'Setting not found', 404);
    }

    await AppSetting.delete(key);
    await logAction(req.user.id, 'super_admin', 'DELETE_SETTING', 'APP_SETTING', null, { key }, req);

    return successResponse(res, null, 'Setting deleted successfully');
  } catch (error) {
    next(error);
  }
};

