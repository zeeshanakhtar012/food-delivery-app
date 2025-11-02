const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const FoodAddon = {
  // Create addon
  create: async (addonData) => {
    const { food_id, name, price, is_required = false } = addonData;

    const result = await query(
      `INSERT INTO food_addons (id, food_id, name, price, is_required)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [uuidv4(), food_id, name, price, is_required]
    );

    return result.rows[0];
  },

  // Find by ID
  findById: async (id) => {
    const result = await query('SELECT * FROM food_addons WHERE id = $1', [id]);
    return result.rows[0];
  },

  // Get addons for food
  findByFoodId: async (food_id) => {
    const result = await query(
      'SELECT * FROM food_addons WHERE food_id = $1 ORDER BY is_required DESC, name ASC',
      [food_id]
    );

    return result.rows;
  },

  // Update addon
  update: async (id, updateData) => {
    const { name, price, is_required } = updateData;
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (price !== undefined) {
      updates.push(`price = $${paramCount++}`);
      values.push(price);
    }

    if (is_required !== undefined) {
      updates.push(`is_required = $${paramCount++}`);
      values.push(is_required);
    }

    if (updates.length === 0) return null;

    values.push(id);
    const result = await query(
      `UPDATE food_addons SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  },

  // Delete addon
  delete: async (id) => {
    const result = await query('DELETE FROM food_addons WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  },

  // Get addon prices for array of IDs
  getPrices: async (addon_ids) => {
    if (!addon_ids || addon_ids.length === 0) return [];

    const placeholders = addon_ids.map((_, i) => `$${i + 1}`).join(', ');
    const result = await query(
      `SELECT id, price FROM food_addons WHERE id IN (${placeholders})`,
      addon_ids
    );

    return result.rows;
  }
};

module.exports = FoodAddon;

