const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const AuditLog = {
  // Create audit log
  create: async (logData) => {
    const {
      user_id,
      user_type,
      action,
      entity_type,
      entity_id,
      old_values = null,
      new_values = null,
      ip_address = null,
      user_agent = null
    } = logData;

    const result = await query(
      `INSERT INTO audit_logs (id, user_id, user_type, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        uuidv4(),
        user_id || null,
        user_type || null,
        action,
        entity_type || null,
        entity_id || null,
        old_values ? JSON.stringify(old_values) : null,
        new_values ? JSON.stringify(new_values) : null,
        ip_address || null,
        user_agent || null
      ]
    );

    return result.rows[0];
  },

  // Find by ID
  findById: async (id) => {
    const result = await query('SELECT * FROM audit_logs WHERE id = $1', [id]);
    return result.rows[0];
  },

  // Get logs with filters
  getLogs: async (filters = {}, page = 1, limit = 50) => {
    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.user_id) {
      sql += ` AND user_id = $${paramCount++}`;
      params.push(filters.user_id);
    }

    if (filters.user_type) {
      sql += ` AND user_type = $${paramCount++}`;
      params.push(filters.user_type);
    }

    if (filters.action) {
      sql += ` AND action ILIKE $${paramCount++}`;
      params.push(`%${filters.action}%`);
    }

    if (filters.entity_type) {
      sql += ` AND entity_type = $${paramCount++}`;
      params.push(filters.entity_type);
    }

    if (filters.entity_id) {
      sql += ` AND entity_id = $${paramCount++}`;
      params.push(filters.entity_id);
    }

    if (filters.start_date) {
      sql += ` AND created_at >= $${paramCount++}`;
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      sql += ` AND created_at <= $${paramCount++}`;
      params.push(filters.end_date);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
    const countParams = [];
    let countParamCount = 1;

    if (filters.user_id) {
      countSql += ` AND user_id = $${countParamCount++}`;
      countParams.push(filters.user_id);
    }

    if (filters.user_type) {
      countSql += ` AND user_type = $${countParamCount++}`;
      countParams.push(filters.user_type);
    }

    if (filters.action) {
      countSql += ` AND action ILIKE $${countParamCount++}`;
      countParams.push(`%${filters.action}%`);
    }

    if (filters.entity_type) {
      countSql += ` AND entity_type = $${countParamCount++}`;
      countParams.push(filters.entity_type);
    }

    if (filters.entity_id) {
      countSql += ` AND entity_id = $${countParamCount++}`;
      countParams.push(filters.entity_id);
    }

    if (filters.start_date) {
      countSql += ` AND created_at >= $${countParamCount++}`;
      countParams.push(filters.start_date);
    }

    if (filters.end_date) {
      countSql += ` AND created_at <= $${countParamCount++}`;
      countParams.push(filters.end_date);
    }

    const countResult = await query(countSql, countParams);

    return {
      logs: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit
    };
  },

  // Get logs by entity
  getByEntity: async (entity_type, entity_id, page = 1, limit = 50) => {
    return await AuditLog.getLogs({ entity_type, entity_id }, page, limit);
  },

  // Get logs by user
  getByUser: async (user_id, user_type = null, page = 1, limit = 50) => {
    return await AuditLog.getLogs({ user_id, user_type }, page, limit);
  }
};

module.exports = AuditLog;

