const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const Rider = {
  // Create rider
  create: async (riderData) => {
    const { name, email, password, phone, vehicle_number, vehicle_type, restaurant_id } = riderData;
    
    // If password not provided, generate a default password (rider can change later)
    const defaultPassword = password || 'rider123'; // You may want to make this configurable
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    // Support both vehicle_number and vehicle_type (map vehicle_type to vehicle_number)
    const vehicleNumber = vehicle_number || vehicle_type || null;
    
    const result = await query(
      `INSERT INTO riders (id, name, email, password, phone, vehicle_number, restaurant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, phone, vehicle_number, restaurant_id, is_available, created_at`,
      [uuidv4(), name, email || null, hashedPassword, phone, vehicleNumber, restaurant_id]
    );
    return result.rows[0];
  },

  // Find rider by email and restaurant_id
  findByEmailAndRestaurant: async (email, restaurant_id) => {
    const result = await query(
      'SELECT * FROM riders WHERE email = $1 AND restaurant_id = $2',
      [email, restaurant_id]
    );
    return result.rows[0];
  },

  // Find rider by ID
  findById: async (id) => {
    const result = await query(
      `SELECT id, name, email, phone, vehicle_number, restaurant_id, 
              current_lat, current_lng, is_available, created_at 
       FROM riders WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },

  // Get all riders for a restaurant
  findByRestaurantId: async (restaurant_id) => {
    const result = await query(
      `SELECT id, name, email, phone, vehicle_number, restaurant_id, 
              current_lat, current_lng, is_available, created_at 
       FROM riders WHERE restaurant_id = $1 ORDER BY created_at DESC`,
      [restaurant_id]
    );
    return result.rows;
  },

  // Update rider location
  updateLocation: async (id, lat, lng) => {
    const result = await query(
      `UPDATE riders SET current_lat = $1, current_lng = $2 WHERE id = $3 
       RETURNING id, current_lat, current_lng`,
      [lat, lng, id]
    );
    return result.rows[0];
  },

  // Update rider availability
  updateAvailability: async (id, is_available) => {
    const result = await query(
      `UPDATE riders SET is_available = $1 WHERE id = $2 
       RETURNING id, is_available`,
      [is_available, id]
    );
    return result.rows[0];
  },

  // Verify password
  comparePassword: async (candidatePassword, hashedPassword) => {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  },
};

module.exports = Rider;

