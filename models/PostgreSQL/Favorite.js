const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const Favorite = {
  // Add favorite restaurant
  addRestaurant: async (user_id, restaurant_id) => {
    const result = await query(
      `INSERT INTO favorite_restaurants (id, user_id, restaurant_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, restaurant_id) DO NOTHING
       RETURNING *`,
      [uuidv4(), user_id, restaurant_id]
    );

    return result.rows[0];
  },

  // Remove favorite restaurant
  removeRestaurant: async (user_id, restaurant_id) => {
    const result = await query(
      'DELETE FROM favorite_restaurants WHERE user_id = $1 AND restaurant_id = $2 RETURNING *',
      [user_id, restaurant_id]
    );

    return result.rows[0];
  },

  // Get favorite restaurants
  getFavoriteRestaurants: async (user_id, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT fr.*, 
              r.name, r.email, r.phone, r.address, r.logo_url, r.rating, r.total_reviews,
              r.delivery_time_minutes, r.min_order_amount, r.delivery_fee, r.is_open
       FROM favorite_restaurants fr
       JOIN restaurants r ON fr.restaurant_id = r.id
       WHERE fr.user_id = $1 AND r.is_active = true
       ORDER BY fr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total 
       FROM favorite_restaurants fr
       JOIN restaurants r ON fr.restaurant_id = r.id
       WHERE fr.user_id = $1 AND r.is_active = true`,
      [user_id]
    );

    return {
      restaurants: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit
    };
  },

  // Check if restaurant is favorite
  isFavoriteRestaurant: async (user_id, restaurant_id) => {
    const result = await query(
      'SELECT * FROM favorite_restaurants WHERE user_id = $1 AND restaurant_id = $2',
      [user_id, restaurant_id]
    );

    return result.rows.length > 0;
  },

  // Add favorite food
  addFood: async (user_id, food_id) => {
    const result = await query(
      `INSERT INTO favorite_foods (id, user_id, food_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, food_id) DO NOTHING
       RETURNING *`,
      [uuidv4(), user_id, food_id]
    );

    return result.rows[0];
  },

  // Remove favorite food
  removeFood: async (user_id, food_id) => {
    const result = await query(
      'DELETE FROM favorite_foods WHERE user_id = $1 AND food_id = $2 RETURNING *',
      [user_id, food_id]
    );

    return result.rows[0];
  },

  // Get favorite foods
  getFavoriteFoods: async (user_id, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT ff.*, 
              f.name, f.description, f.price, f.image_url, f.category, f.rating,
              r.name as restaurant_name, r.logo_url as restaurant_logo
       FROM favorite_foods ff
       JOIN foods f ON ff.food_id = f.id
       JOIN restaurants r ON f.restaurant_id = r.id
       WHERE ff.user_id = $1 AND f.is_available = true AND r.is_active = true
       ORDER BY ff.created_at DESC
       LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total 
       FROM favorite_foods ff
       JOIN foods f ON ff.food_id = f.id
       JOIN restaurants r ON f.restaurant_id = r.id
       WHERE ff.user_id = $1 AND f.is_available = true AND r.is_active = true`,
      [user_id]
    );

    return {
      foods: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit
    };
  },

  // Check if food is favorite
  isFavoriteFood: async (user_id, food_id) => {
    const result = await query(
      'SELECT * FROM favorite_foods WHERE user_id = $1 AND food_id = $2',
      [user_id, food_id]
    );

    return result.rows.length > 0;
  }
};

module.exports = Favorite;

