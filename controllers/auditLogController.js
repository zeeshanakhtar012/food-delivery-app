const AuditLog = require('../models/PostgreSQL/AuditLog');
const { successResponse, errorResponse, paginatedResponse } = require('../helpers/response');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

exports.getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = getPaginationParams(req);
    const {
      user_id,
      user_type,
      action,
      entity_type,
      entity_id,
      start_date,
      end_date
    } = req.query;

    const filters = {};
    if (user_id) filters.user_id = user_id;
    if (user_type) filters.user_type = user_type;
    if (action) filters.action = action;
    if (entity_type) filters.entity_type = entity_type;
    if (entity_id) filters.entity_id = entity_id;
    if (start_date) filters.start_date = new Date(start_date);
    if (end_date) filters.end_date = new Date(end_date);

    const result = await AuditLog.getLogs(filters, page, limit);
    const pagination = getPaginationMeta(page, limit, result.total);

    return paginatedResponse(res, result.logs, pagination, 'Audit logs retrieved successfully');
  } catch (error) {
    next(error);
  }
};

exports.getLogsByEntity = async (req, res, next) => {
  try {
    const { entity_type, entity_id } = req.params;
    const { page = 1, limit = 50 } = getPaginationParams(req);

    const result = await AuditLog.getByEntity(entity_type, entity_id, page, limit);
    const pagination = getPaginationMeta(page, limit, result.total);

    return paginatedResponse(res, result.logs, pagination, 'Audit logs retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get logs by user
exports.getLogsByUser = async (req, res, next) => {
  try {
    const { user_id, user_type } = req.params;
    const { page = 1, limit = 50 } = getPaginationParams(req);

    const result = await AuditLog.getByUser(user_id, user_type || null, page, limit);
    const pagination = getPaginationMeta(page, limit, result.total);

    return paginatedResponse(res, result.logs, pagination, 'Audit logs retrieved successfully');
  } catch (error) {
    next(error);
  }
};

