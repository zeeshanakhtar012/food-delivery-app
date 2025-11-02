const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const Banner = {
  // Create banner
  create: async (bannerData) => {
    const {
      title,
      description,
      image_url,
      link_url,
      restaurant_id,
      is_active = true,
      display_order = 0,
      start_date,
      end_date
    } = bannerData;

    const result = await query(
      `INSERT INTO banners (id, title, description, image_url, link_url, restaurant_id, is_active, display_order, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [uuidv4(), title || null, description || null, image_url, link_url || null, restaurant_id || null, is_active, display_order, start_date || null, end_date || null]
    );

    return result.rows[0];
  },

  // Find by ID
  findById: async (id) => {
    const result = await query('SELECT * FROM banners WHERE id = $1', [id]);
    return result.rows[0];
  },

  // Get active banners
  getActiveBanners: async (restaurant_id = null) => {
    let sql = `
      SELECT * FROM banners 
      WHERE is_active = true 
      AND (start_date IS NULL OR start_date <= NOW())
      AND (end_date IS NULL OR end_date >= NOW())
    `;
    const params = [];
    let paramCount = 1;

    if (restaurant_id) {
      sql += ` AND (restaurant_id = $${paramCount++} OR restaurant_id IS NULL)`;
      params.push(restaurant_id);
    }

    sql += ' ORDER BY display_order ASC, created_at DESC';

    const result = await query(sql, params);
    return result.rows;
  },

  // Get all banners (admin)
  getAll: async (restaurant_id = null, page = 1, limit = 20) => {
    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM banners WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (restaurant_id) {
      sql += ` AND (restaurant_id = $${paramCount++} OR restaurant_id IS NULL)`;
      params.push(restaurant_id);
    }

    sql += ` ORDER BY display_order ASC, created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    const countSql = restaurant_id
      ? 'SELECT COUNT(*) as total FROM banners WHERE restaurant_id = $1 OR restaurant_id IS NULL'
      : 'SELECT COUNT(*) as total FROM banners';

    const countResult = await query(countSql, restaurant_id ? [restaurant_id] : []);

    return {
      banners: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit
    };
  },

  // Update banner
  update: async (id, updateData) => {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['title', 'description', 'image_url', 'link_url', 'restaurant_id', 'is_active', 'display_order', 'start_date', 'end_date'];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    }

    if (updates.length === 0) return null;

    values.push(id);
    const result = await query(
      `UPDATE banners SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  },

  // Delete banner
  delete: async (id) => {
    const result = await query('DELETE FROM banners WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }
};

module.exports = Banner;

