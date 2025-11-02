const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const Review = {
  // Create review
  create: async (reviewData) => {
    const {
      user_id,
      restaurant_id,
      food_id,
      rider_id,
      order_id,
      rating,
      comment,
      images = null
    } = reviewData;

    const result = await query(
      `INSERT INTO reviews (id, user_id, restaurant_id, food_id, rider_id, order_id, rating, comment, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [uuidv4(), user_id, restaurant_id || null, food_id || null, rider_id || null, order_id || null, rating, comment || null, images]
    );

    return result.rows[0];
  },

  // Find review by ID
  findById: async (id) => {
    const result = await query(
      `SELECT r.*, 
              u.name as user_name, u.avatar_url as user_avatar,
              res.name as restaurant_name,
              f.name as food_name,
              rid.name as rider_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN restaurants res ON r.restaurant_id = res.id
       LEFT JOIN foods f ON r.food_id = f.id
       LEFT JOIN riders rid ON r.rider_id = rid.id
       WHERE r.id = $1`,
      [id]
    );

    return result.rows[0];
  },

  // Get reviews by restaurant
  findByRestaurantId: async (restaurant_id, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT r.*, 
              u.name as user_name, u.avatar_url as user_avatar
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.restaurant_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [restaurant_id, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) as total FROM reviews WHERE restaurant_id = $1',
      [restaurant_id]
    );

    return {
      reviews: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit
    };
  },

  // Get reviews by food
  findByFoodId: async (food_id, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT r.*, 
              u.name as user_name, u.avatar_url as user_avatar
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.food_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [food_id, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) as total FROM reviews WHERE food_id = $1',
      [food_id]
    );

    return {
      reviews: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit
    };
  },

  // Get reviews by rider
  findByRiderId: async (rider_id, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT r.*, 
              u.name as user_name, u.avatar_url as user_avatar
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.rider_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [rider_id, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) as total FROM reviews WHERE rider_id = $1',
      [rider_id]
    );

    return {
      reviews: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit
    };
  },

  // Get reviews by user
  findByUserId: async (user_id, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT r.*, 
              res.name as restaurant_name, res.logo_url as restaurant_logo,
              f.name as food_name,
              rid.name as rider_name
       FROM reviews r
       LEFT JOIN restaurants res ON r.restaurant_id = res.id
       LEFT JOIN foods f ON r.food_id = f.id
       LEFT JOIN riders rid ON r.rider_id = rid.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) as total FROM reviews WHERE user_id = $1',
      [user_id]
    );

    return {
      reviews: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit
    };
  },

  // Check if user already reviewed order
  checkOrderReview: async (user_id, order_id, review_type) => {
    const typeMap = {
      restaurant: 'restaurant_id',
      food: 'food_id',
      rider: 'rider_id'
    };

    const column = typeMap[review_type];
    if (!column) return null;

    const result = await query(
      `SELECT * FROM reviews WHERE user_id = $1 AND order_id = $2 AND ${column} IS NOT NULL`,
      [user_id, order_id]
    );

    return result.rows[0];
  },

  // Update review
  update: async (id, updateData) => {
    const { rating, comment, images } = updateData;
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (rating !== undefined) {
      updates.push(`rating = $${paramCount++}`);
      values.push(rating);
    }

    if (comment !== undefined) {
      updates.push(`comment = $${paramCount++}`);
      values.push(comment);
    }

    if (images !== undefined) {
      updates.push(`images = $${paramCount++}`);
      values.push(images);
    }

    if (updates.length === 0) return null;

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await query(
      `UPDATE reviews SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  },

  // Delete review
  delete: async (id, user_id) => {
    const result = await query(
      'DELETE FROM reviews WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, user_id]
    );

    return result.rows[0];
  }
};

module.exports = Review;

