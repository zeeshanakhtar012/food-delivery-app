const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const FoodCategory = {
  // Create category
  create: async (categoryData) => {
    const {
      restaurant_id,
      name,
      description,
      image_url,
      sort_order = 0,
      is_active = true
    } = categoryData;

    const result = await query(
      `INSERT INTO food_categories (id, restaurant_id, name, description, image_url, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [uuidv4(), restaurant_id, name, description || null, image_url || null, sort_order, is_active]
    );

    return result.rows[0];
  },

  // Find by ID
  findById: async (id) => {
    const result = await query('SELECT * FROM food_categories WHERE id = $1', [id]);
    return result.rows[0];
  },

  // Get categories for restaurant
  findByRestaurantId: async (restaurant_id, is_active_only = false) => {
    let sql = 'SELECT * FROM food_categories WHERE restaurant_id = $1';
    const params = [restaurant_id];

    if (is_active_only) {
      sql += ' AND is_active = true';
    }

    sql += ' ORDER BY sort_order ASC, created_at ASC';

    const result = await query(sql, params);
    return result.rows;
  },

  // Update category
  update: async (id, updateData) => {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['name', 'description', 'image_url', 'sort_order', 'is_active'];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    }

    if (updates.length === 0) return null;

    values.push(id);
    const result = await query(
      `UPDATE food_categories SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  },

  // Delete category
  delete: async (id, force = false) => {
    // Check if category has foods
    if (force) {
      await query('DELETE FROM foods WHERE category_id = $1', [id]);
    } else {
      const foodsCheck = await query(
        'SELECT COUNT(*) as count FROM foods WHERE category_id = $1',
        [id]
      );

      if (parseInt(foodsCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete category with existing foods');
      }
    }

    const result = await query('DELETE FROM food_categories WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  },

  // Delete all categories for a restaurant
  deleteAllByRestaurantId: async (restaurant_id) => {
    // Note: Due to FK constraints, users should probably delete foods first, 
    // but we can CASCADE if we want. For now, let's just do it simply.
    const result = await query('DELETE FROM food_categories WHERE restaurant_id = $1 RETURNING *', [restaurant_id]);
    return result.rows;
  }
};

module.exports = FoodCategory;

