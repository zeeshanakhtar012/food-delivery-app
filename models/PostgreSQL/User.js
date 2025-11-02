const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const User = {
  // Create user
  create: async (userData) => {
    const { name, email, password, phone, restaurant_id } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await query(
      `INSERT INTO users (id, name, email, password, phone, restaurant_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, phone, restaurant_id, created_at`,
      [uuidv4(), name, email, hashedPassword, phone || null, restaurant_id]
    );
    return result.rows[0];
  },

  // Find user by email and restaurant_id
  findByEmailAndRestaurant: async (email, restaurant_id) => {
    const result = await query(
      'SELECT * FROM users WHERE email = $1 AND restaurant_id = $2',
      [email, restaurant_id]
    );
    return result.rows[0];
  },

  // Find user by ID
  findById: async (id) => {
    const result = await query(
      `SELECT id, name, email, phone, restaurant_id, created_at 
       FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },

  // Get all users for a restaurant
  findByRestaurantId: async (restaurant_id) => {
    const result = await query(
      `SELECT id, name, email, phone, restaurant_id, created_at 
       FROM users WHERE restaurant_id = $1 ORDER BY created_at DESC`,
      [restaurant_id]
    );
    return result.rows;
  },

  // Verify password
  comparePassword: async (candidatePassword, hashedPassword) => {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  },
};

module.exports = User;

