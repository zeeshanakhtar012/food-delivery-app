/**
 * Filtering utility functions
 */

/**
 * Build WHERE clause from filters
 * @param {Object} filters - Filter object
 * @param {Object} allowedFilters - Allowed filter fields mapping
 * @returns {Object} SQL WHERE clause and parameters
 */
const buildWhereClause = (filters = {}, allowedFilters = {}) => {
  const conditions = [];
  const params = [];
  let paramCount = 1;

  for (const [key, value] of Object.entries(filters)) {
    if (!allowedFilters[key] || value === undefined || value === null || value === '') {
      continue;
    }

    const filterConfig = allowedFilters[key];

    if (filterConfig.operator === 'LIKE') {
      conditions.push(`${filterConfig.column} ILIKE $${paramCount}`);
      params.push(`%${value}%`);
    } else if (filterConfig.operator === 'IN') {
      if (Array.isArray(value) && value.length > 0) {
        const placeholders = value.map(() => `$${paramCount++}`).join(', ');
        conditions.push(`${filterConfig.column} IN (${placeholders})`);
        params.push(...value);
        paramCount--;
      }
    } else if (filterConfig.operator === 'BETWEEN') {
      if (Array.isArray(value) && value.length === 2) {
        conditions.push(`${filterConfig.column} BETWEEN $${paramCount} AND $${paramCount + 1}`);
        params.push(...value);
        paramCount += 2;
        continue;
      }
    } else if (filterConfig.operator === '>=') {
      conditions.push(`${filterConfig.column} >= $${paramCount}`);
      params.push(value);
    } else if (filterConfig.operator === '<=') {
      conditions.push(`${filterConfig.column} <= $${paramCount}`);
      params.push(value);
    } else if (filterConfig.operator === '=') {
      conditions.push(`${filterConfig.column} = $${paramCount}`);
      params.push(value);
    } else {
      conditions.push(`${filterConfig.column} = $${paramCount}`);
      params.push(value);
    }

    paramCount++;
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
};

/**
 * Build ORDER BY clause
 * @param {string} sortBy - Sort field
 * @param {string} sortOrder - Sort order (ASC/DESC)
 * @param {Object} allowedSortFields - Allowed sort fields mapping
 * @returns {string} ORDER BY clause
 */
const buildOrderByClause = (sortBy, sortOrder = 'DESC', allowedSortFields = {}) => {
  if (!sortBy || !allowedSortFields[sortBy]) {
    return `ORDER BY created_at DESC`;
  }

  const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  return `ORDER BY ${allowedSortFields[sortBy]} ${order}`;
};

module.exports = {
  buildWhereClause,
  buildOrderByClause
};

