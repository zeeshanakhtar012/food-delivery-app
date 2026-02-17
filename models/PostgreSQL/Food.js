const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const Food = {
  // Create food
  create: async (foodData) => {
    const { restaurant_id, name, description, price, image_url, category_id, preparation_time, is_available, stock_quantity } = foodData;
    const result = await query(
      `INSERT INTO foods (id, restaurant_id, name, description, price, image_url, category_id, preparation_time, is_available, stock_quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        uuidv4(), restaurant_id, name, description || null, price, image_url || null,
        category_id || null, preparation_time || 15, is_available !== false,
        stock_quantity !== undefined ? parseInt(stock_quantity) : 100 // Default to 100
      ]
    );
    return result.rows[0];
  },

  // Get all foods for a restaurant
  findByRestaurantId: async (restaurant_id, is_available_only = false) => {
    let sql = 'SELECT * FROM foods WHERE restaurant_id = $1';
    const params = [restaurant_id];

    if (is_available_only) {
      sql += ' AND is_available = true AND stock_quantity > 0'; // [NEW] Filter out out-of-stock
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    return result.rows;
  },

  // Find food by ID
  findById: async (id) => {
    const result = await query('SELECT * FROM foods WHERE id = $1', [id]);
    return result.rows[0];
  },

  // Update food
  update: async (id, foodData) => {
    const { name, description, price, image_url, category_id, preparation_time, is_available, stock_quantity } = foodData;
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (price !== undefined) {
      updates.push(`price = $${paramCount++}`);
      values.push(price);
    }
    if (image_url !== undefined) {
      updates.push(`image_url = $${paramCount++}`);
      values.push(image_url);
    }
    if (category_id !== undefined) {
      updates.push(`category_id = $${paramCount++}`);
      values.push(category_id);
    }
    if (preparation_time !== undefined) {
      updates.push(`preparation_time = $${paramCount++}`);
      values.push(preparation_time);
    }
    if (is_available !== undefined) {
      updates.push(`is_available = $${paramCount++}`);
      values.push(is_available);
    }
    if (stock_quantity !== undefined) {
      updates.push(`stock_quantity = $${paramCount++}`);
      values.push(parseInt(stock_quantity));
    }

    if (updates.length === 0) return null;

    values.push(id);
    const result = await query(
      `UPDATE foods SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  // Delete food (hard delete)
  delete: async (id) => {
    const result = await query('DELETE FROM foods WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  },

  // Soft delete food (set is_available to false)
  softDelete: async (id) => {
    const result = await query(
      'UPDATE foods SET is_available = false WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  },

  // Get featured foods (top-rated or flagged as featured)
  findFeaturedFoods: async (restaurant_id, limit = 10) => {
    const result = await query(
      `SELECT * FROM foods 
       WHERE restaurant_id = $1 
       AND is_available = true 
       AND (is_featured = true OR rating >= 4.0)
       ORDER BY 
         CASE WHEN is_featured = true THEN 1 ELSE 2 END,
         rating DESC, 
         total_reviews DESC
       LIMIT $2`,
      [restaurant_id, limit]
    );
    return result.rows;
  },
};

module.exports = Food;

