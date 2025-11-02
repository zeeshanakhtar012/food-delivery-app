const { query } = require('../../config/db');
const Payment = require('./Payment');

// Payment model is already created in paymentService.js, but let's create a proper model
const PaymentModel = {
  // Create payment
  create: async (paymentData) => {
    const {
      order_id,
      user_id,
      amount,
      payment_method,
      payment_status = 'pending',
      transaction_id = null,
      payment_gateway_response = null
    } = paymentData;

    const result = await query(
      `INSERT INTO payments (id, order_id, user_id, amount, payment_method, payment_status, transaction_id, payment_gateway_response)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [order_id, user_id, amount, payment_method, payment_status, transaction_id, payment_gateway_response ? JSON.stringify(payment_gateway_response) : null]
    );

    return result.rows[0];
  },

  // Find by ID
  findById: async (id) => {
    const result = await query(
      `SELECT p.*, 
              o.order_number, o.status as order_status,
              u.name as user_name
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [id]
    );

    return result.rows[0];
  },

  // Find by order ID
  findByOrderId: async (order_id) => {
    const result = await query('SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC', [order_id]);
    return result.rows;
  },

  // Find by user ID
  findByUserId: async (user_id, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT p.*, o.order_number
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) as total FROM payments WHERE user_id = $1',
      [user_id]
    );

    return {
      payments: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit
    };
  },

  // Update payment status
  updateStatus: async (id, status, transaction_id = null) => {
    const result = await query(
      `UPDATE payments 
       SET payment_status = $1, 
           transaction_id = COALESCE($2, transaction_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, transaction_id, id]
    );

    return result.rows[0];
  }
};

module.exports = PaymentModel;

