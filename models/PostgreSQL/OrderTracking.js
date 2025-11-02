const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const OrderTracking = {
  // Create tracking entry
  create: async (trackingData) => {
    const { order_id, rider_id, current_lat, current_lng } = trackingData;
    const result = await query(
      `INSERT INTO order_tracking (id, order_id, rider_id, current_lat, current_lng)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [uuidv4(), order_id, rider_id, current_lat, current_lng]
    );
    return result.rows[0];
  },

  // Get latest tracking for an order
  getLatestByOrderId: async (order_id) => {
    const result = await query(
      `SELECT * FROM order_tracking 
       WHERE order_id = $1 
       ORDER BY timestamp DESC 
       LIMIT 1`,
      [order_id]
    );
    return result.rows[0];
  },

  // Get all tracking entries for an order
  getByOrderId: async (order_id) => {
    const result = await query(
      `SELECT * FROM order_tracking 
       WHERE order_id = $1 
       ORDER BY timestamp DESC`,
      [order_id]
    );
    return result.rows;
  },

  // Get tracking entries for a rider
  getByRiderId: async (rider_id, limit = 50) => {
    const result = await query(
      `SELECT * FROM order_tracking 
       WHERE rider_id = $1 
       ORDER BY timestamp DESC 
       LIMIT $2`,
      [rider_id, limit]
    );
    return result.rows;
  },
};

module.exports = OrderTracking;

