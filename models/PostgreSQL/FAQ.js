const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const FAQ = {
  // Create FAQ
  create: async (faqData) => {
    const {
      question,
      answer,
      category,
      is_active = true,
      display_order = 0
    } = faqData;

    const result = await query(
      `INSERT INTO faqs (id, question, answer, category, is_active, display_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [uuidv4(), question, answer, category || null, is_active, display_order]
    );

    return result.rows[0];
  },

  // Find by ID
  findById: async (id) => {
    const result = await query('SELECT * FROM faqs WHERE id = $1', [id]);
    return result.rows[0];
  },

  // Get active FAQs
  getActiveFAQs: async (category = null) => {
    let sql = 'SELECT * FROM faqs WHERE is_active = true';
    const params = [];
    let paramCount = 1;

    if (category) {
      sql += ` AND category = $${paramCount++}`;
      params.push(category);
    }

    sql += ' ORDER BY display_order ASC, created_at ASC';

    const result = await query(sql, params);
    return result.rows;
  },

  // Get all FAQs (admin)
  getAll: async (category = null, page = 1, limit = 20) => {
    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM faqs WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (category) {
      sql += ` AND category = $${paramCount++}`;
      params.push(category);
    }

    sql += ` ORDER BY display_order ASC, created_at ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    const countSql = category
      ? 'SELECT COUNT(*) as total FROM faqs WHERE category = $1'
      : 'SELECT COUNT(*) as total FROM faqs';

    const countResult = await query(countSql, category ? [category] : []);

    return {
      faqs: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit
    };
  },

  // Update FAQ
  update: async (id, updateData) => {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['question', 'answer', 'category', 'is_active', 'display_order'];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    }

    if (updates.length === 0) return null;

    values.push(id);
    const result = await query(
      `UPDATE faqs SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  },

  // Delete FAQ
  delete: async (id) => {
    const result = await query('DELETE FROM faqs WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  },

  // Get categories
  getCategories: async () => {
    const result = await query(
      'SELECT DISTINCT category FROM faqs WHERE category IS NOT NULL AND is_active = true ORDER BY category ASC'
    );

    return result.rows.map(row => row.category);
  }
};

module.exports = FAQ;

