const { handleError, AppError } = require('../utils/errors');
const { ValidationError } = require('joi');
const errorHandler = (err, req, res, next) => {
  // Joi validation errors
  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation error',
        details: err.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      }
    });
  }

  // Custom app errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        ...(err.errors && { errors: err.errors })
      }
    });
  }

  // Default error handling
  return handleError(err, req, res, next);
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

module.exports = {
  errorHandler,
  notFoundHandler
};

