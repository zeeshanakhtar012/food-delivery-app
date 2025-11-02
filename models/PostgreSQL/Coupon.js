const { query } = require('../../config/db');

const Coupon = {
  // Create coupon
  create: async (couponData) => {
    const {
      restaurant_id,
      code,
      type,
      value,
      min_order_amount,
      max_discount_amount,
      usage_limit,
      valid_from,
      valid_until,
      is_active = true
    } = couponData;

    const result = await query(
      `INSERT INTO coupons (id, restaurant_id, code, type, value, min_order_amount, max_discount_amount, usage_limit, valid_from, valid_until, is_active)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [restaurant_id, code, type, value, min_order_amount || 0, max_discount_amount, usage_limit, valid_from, valid_until, is_active]
    );

    return result.rows[0];
  },

  // Find coupon by code
  findByCode: async (code, restaurant_id = null) => {
    let sql = 'SELECT * FROM coupons WHERE code = $1 AND is_active = true';
    const params = [code];
    let paramCount = 2;

    if (restaurant_id) {
      sql += ` AND (restaurant_id = $${paramCount} OR restaurant_id IS NULL)`;
      params.push(restaurant_id);
    }

    sql += ` AND valid_from <= NOW() AND valid_until >= NOW()`;

    const result = await query(sql, params);
    return result.rows[0];
  },

  // Find coupon by ID
  findById: async (id) => {
    const result = await query('SELECT * FROM coupons WHERE id = $1', [id]);
    return result.rows[0];
  },

  // Get all coupons for restaurant
  findByRestaurantId: async (restaurant_id, is_active_only = false) => {
    let sql = 'SELECT * FROM coupons WHERE restaurant_id = $1';
    const params = [restaurant_id];

    if (is_active_only) {
      sql += ' AND is_active = true AND valid_from <= NOW() AND valid_until >= NOW()';
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    return result.rows;
  },

  // Get available coupons for user
  getAvailableCoupons: async (restaurant_id) => {
    const result = await query(
      `SELECT * FROM coupons 
       WHERE (restaurant_id = $1 OR restaurant_id IS NULL)
       AND is_active = true
       AND valid_from <= NOW()
       AND valid_until >= NOW()
       AND (usage_limit IS NULL OR used_count < usage_limit)
       ORDER BY value DESC`,
      [restaurant_id]
    );

    return result.rows;
  },

  // Apply coupon
  applyCoupon: async (code, order_amount, restaurant_id) => {
    const coupon = await Coupon.findByCode(code, restaurant_id);

    if (!coupon) {
      throw new Error('Invalid or expired coupon code');
    }

    if (order_amount < coupon.min_order_amount) {
      throw new Error(`Minimum order amount of ${coupon.min_order_amount} required`);
    }

    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      throw new Error('Coupon usage limit exceeded');
    }

    let discount_amount = 0;

    if (coupon.type === 'percentage') {
      discount_amount = (order_amount * coupon.value) / 100;
      if (coupon.max_discount_amount && discount_amount > coupon.max_discount_amount) {
        discount_amount = coupon.max_discount_amount;
      }
    } else if (coupon.type === 'fixed_amount') {
      discount_amount = coupon.value;
      if (discount_amount > order_amount) {
        discount_amount = order_amount;
      }
    } else if (coupon.type === 'free_delivery') {
      // This would be handled separately for delivery fees
      discount_amount = 0;
    }

    return {
      coupon,
      discount_amount: parseFloat(discount_amount.toFixed(2))
    };
  },

  // Increment usage count
  incrementUsage: async (code) => {
    const result = await query(
      `UPDATE coupons 
       SET used_count = used_count + 1 
       WHERE code = $1 AND (usage_limit IS NULL OR used_count < usage_limit)
       RETURNING *`,
      [code]
    );

    return result.rows[0];
  },

  // Update coupon
  update: async (id, updateData) => {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['code', 'type', 'value', 'min_order_amount', 'max_discount_amount', 'usage_limit', 'valid_from', 'valid_until', 'is_active'];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    }

    if (updates.length === 0) return null;

    values.push(id);
    const result = await query(
      `UPDATE coupons SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  },

  // Delete coupon
  delete: async (id) => {
    const result = await query('DELETE FROM coupons WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }
};

module.exports = Coupon;

