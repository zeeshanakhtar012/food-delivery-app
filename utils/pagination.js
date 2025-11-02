/**
 * Pagination utility functions
 */

/**
 * Calculate pagination metadata
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {Object} Pagination metadata
 */
const getPaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages,
    hasNext,
    hasPrev,
    nextPage: hasNext ? page + 1 : null,
    prevPage: hasPrev ? page - 1 : null
  };
};

/**
 * Get pagination parameters from request
 * @param {Object} req - Express request object
 * @returns {Object} Pagination parameters
 */
const getPaginationParams = (req) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

/**
 * Apply pagination to query
 * @param {string} query - SQL query
 * @param {number} limit - Limit
 * @param {number} offset - Offset
 * @returns {string} Paginated query
 */
const applyPagination = (query, limit, offset) => {
  return `${query} LIMIT ${limit} OFFSET ${offset}`;
};

module.exports = {
  getPaginationMeta,
  getPaginationParams,
  applyPagination
};

