const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const Restaurant = {
  // Create restaurant
  create: async (restaurantData) => {
    const { name, email, phone, address, logo_url, theme_color } = restaurantData;
    const result = await query(
      `INSERT INTO restaurants (id, name, email, phone, address, logo_url, theme_color)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [uuidv4(), name, email, phone, address, logo_url || null, theme_color || '#FF5722']
    );
    return result.rows[0];
  },

  // Get all restaurants
  findAll: async () => {
    const result = await query('SELECT * FROM restaurants ORDER BY created_at DESC');
    return result.rows;
  },

  // Get restaurant by ID
  findById: async (id) => {
    const result = await query('SELECT * FROM restaurants WHERE id = $1', [id]);
    return result.rows[0];
  },

  // Get restaurant by email
  findByEmail: async (email) => {
    const result = await query('SELECT * FROM restaurants WHERE email = $1', [email]);
    return result.rows[0];
  },

  // Update restaurant
  update: async (id, restaurantData) => {
    const { name, email, phone, address, logo_url, theme_color, is_active } = restaurantData;
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }
    if (address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      values.push(address);
    }
    if (logo_url !== undefined) {
      updates.push(`logo_url = $${paramCount++}`);
      values.push(logo_url);
    }
    if (theme_color !== undefined) {
      updates.push(`theme_color = $${paramCount++}`);
      values.push(theme_color);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (updates.length === 0) return null;

    values.push(id);
    const result = await query(
      `UPDATE restaurants SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  // Delete restaurant
  delete: async (id) => {
    const result = await query('DELETE FROM restaurants WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  },

  // Freeze/unfreeze restaurant
  toggleActive: async (id) => {
    const result = await query(
      `UPDATE restaurants SET is_active = NOT is_active WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  },
};

module.exports = Restaurant;

