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
       RETURNING id, name, email, phone, vehicle_number, restaurant_id, is_available, is_active, is_blocked, created_at`,
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
              current_lat, current_lng, is_available, status, is_active, is_blocked,
              wallet_balance, total_earnings, created_at 
       FROM riders WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },

  // Get all riders for a restaurant
  findByRestaurantId: async (restaurant_id) => {
    const result = await query(
      `SELECT id, name, email, phone, vehicle_number, restaurant_id, 
              current_lat, current_lng, is_available, status, is_active, is_blocked,
              wallet_balance, total_earnings, created_at 
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
  // Update rider details
  update: async (id, data) => {
    const keys = Object.keys(data);
    if (keys.length === 0) return null;

    let updateValues = [];
    let setQueries = keys.map((key, index) => {
      updateValues.push(data[key]);
      return `${key} = $${index + 1}`;
    });

    updateValues.push(id);
    const queryStr = `
      UPDATE riders 
      SET ${setQueries.join(', ')} 
      WHERE id = $${keys.length + 1} 
      RETURNING id, name, email, phone, vehicle_number, restaurant_id, is_available, is_active, is_blocked, created_at
    `;

    const result = await query(queryStr, updateValues);
    return result.rows[0];
  },

  // Delete rider
  delete: async (id) => {
    const result = await query('DELETE FROM riders WHERE id = $1 RETURNING id', [id]);
    return result.rows[0];
  },

  // Get all riders (Super Admin)
  findAll: async () => {
    const result = await query(
      `SELECT rid.id, rid.name, rid.email, rid.phone, rid.vehicle_number, rid.restaurant_id, 
              rid.current_lat, rid.current_lng, rid.is_available, rid.status, 
              rid.wallet_balance, rid.total_earnings, rid.created_at, rid.is_active, rid.is_blocked, r.name as restaurant_name 
       FROM riders rid LEFT JOIN restaurants r ON rid.restaurant_id = r.id ORDER BY rid.created_at DESC`
    );
    return result.rows;
  },

  // Freeze/unfreeze rider
  toggleActive: async (id) => {
    const result = await query(
      `UPDATE riders SET is_active = NOT is_active WHERE id = $1 RETURNING id, is_active`,
      [id]
    );
    return result.rows[0];
  },
};

module.exports = Rider;

