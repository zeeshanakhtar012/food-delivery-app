const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const Cart = {
  // Add to cart
  addItem: async (cartData) => {
    const {
      user_id,
      restaurant_id,
      food_id,
      quantity,
      addon_ids = null,
      special_instructions = null
    } = cartData;

    // Check if item already exists in cart
    const existing = await query(
      'SELECT * FROM cart WHERE user_id = $1 AND restaurant_id = $2 AND food_id = $3',
      [user_id, restaurant_id, food_id]
    );

    if (existing.rows.length > 0) {
      // Update quantity
      const result = await query(
        `UPDATE cart 
         SET quantity = quantity + $1, 
             addon_ids = $2, 
             special_instructions = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [quantity, addon_ids, special_instructions, existing.rows[0].id]
      );
      return result.rows[0];
    } else {
      // Create new cart item
      const result = await query(
        `INSERT INTO cart (id, user_id, restaurant_id, food_id, quantity, addon_ids, special_instructions)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [uuidv4(), user_id, restaurant_id, food_id, quantity, addon_ids, special_instructions]
      );
      return result.rows[0];
    }
  },

  // Get cart for user
  getCart: async (user_id, restaurant_id = null) => {
    let sql = `
      SELECT 
        c.*,
        f.name as food_name,
        f.price as food_price,
        f.image_url as food_image,
        f.description as food_description,
        r.name as restaurant_name,
        r.logo_url as restaurant_logo
      FROM cart c
      JOIN foods f ON c.food_id = f.id
      JOIN restaurants r ON c.restaurant_id = r.id
      WHERE c.user_id = $1
    `;
    const params = [user_id];
    let paramCount = 2;

    if (restaurant_id) {
      sql += ` AND c.restaurant_id = $${paramCount}`;
      params.push(restaurant_id);
      paramCount++;
    }

    sql += ' ORDER BY c.created_at DESC';

    const result = await query(sql, params);

    // Calculate subtotal for each item
    const cartItems = result.rows.map(item => {
      const itemPrice = parseFloat(item.food_price);
      const quantity = parseInt(item.quantity);
      let addonPrice = 0;

      // Calculate addon prices if any
      if (item.addon_ids && item.addon_ids.length > 0) {
        // This would require a query to get addon prices
        // For now, we'll assume addons are handled separately
      }

      return {
        ...item,
        subtotal: (itemPrice * quantity) + addonPrice
      };
    });

    // Calculate total
    const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

    return {
      items: cartItems,
      total: parseFloat(total.toFixed(2)),
      item_count: cartItems.length
    };
  },

  // Update cart item
  updateItem: async (id, updateData) => {
    const { quantity, addon_ids, special_instructions } = updateData;
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (quantity !== undefined) {
      updates.push(`quantity = $${paramCount++}`);
      values.push(quantity);
    }

    if (addon_ids !== undefined) {
      updates.push(`addon_ids = $${paramCount++}`);
      values.push(addon_ids);
    }

    if (special_instructions !== undefined) {
      updates.push(`special_instructions = $${paramCount++}`);
      values.push(special_instructions);
    }

    if (updates.length === 0) return null;

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await query(
      `UPDATE cart SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  },

  // Remove item from cart
  removeItem: async (id, user_id) => {
    const result = await query(
      'DELETE FROM cart WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, user_id]
    );

    return result.rows[0];
  },

  // Clear cart
  clearCart: async (user_id, restaurant_id = null) => {
    let sql = 'DELETE FROM cart WHERE user_id = $1';
    const params = [user_id];

    if (restaurant_id) {
      sql += ' AND restaurant_id = $2';
      params.push(restaurant_id);
    }

    const result = await query(`${sql} RETURNING *`, params);
    return result.rows;
  },

  // Get cart count
  getCartCount: async (user_id) => {
    const result = await query(
      'SELECT COUNT(*) as count FROM cart WHERE user_id = $1',
      [user_id]
    );

    return parseInt(result.rows[0].count);
  }
};

module.exports = Cart;

