const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const ChatMessage = {
  // Create message
  create: async (messageData) => {
    const {
      order_id,
      sender_id,
      sender_type,
      receiver_id,
      receiver_type,
      message
    } = messageData;

    const result = await query(
      `INSERT INTO chat_messages (id, order_id, sender_id, sender_type, receiver_id, receiver_type, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [uuidv4(), order_id || null, sender_id, sender_type, receiver_id, receiver_type, message]
    );

    return result.rows[0];
  },

  // Get messages for order
  getOrderMessages: async (order_id, page = 1, limit = 50) => {
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT * FROM chat_messages 
       WHERE order_id = $1 
       ORDER BY created_at ASC
       LIMIT $2 OFFSET $3`,
      [order_id, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) as total FROM chat_messages WHERE order_id = $1',
      [order_id]
    );

    return {
      messages: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit
    };
  },

  // Get conversation between two users
  getConversation: async (user1_id, user1_type, user2_id, user2_type, order_id = null) => {
    let sql = `
      SELECT * FROM chat_messages 
      WHERE (
        (sender_id = $1 AND sender_type = $2 AND receiver_id = $3 AND receiver_type = $4)
        OR
        (sender_id = $3 AND sender_type = $4 AND receiver_id = $1 AND receiver_type = $2)
      )
    `;
    const params = [user1_id, user1_type, user2_id, user2_type];
    let paramCount = 5;

    if (order_id) {
      sql += ` AND order_id = $${paramCount++}`;
      params.push(order_id);
    }

    sql += ` ORDER BY created_at ASC`;

    const result = await query(sql, params);
    return result.rows;
  },

  // Mark messages as read
  markAsRead: async (receiver_id, receiver_type, order_id = null) => {
    let sql = `
      UPDATE chat_messages 
      SET is_read = true 
      WHERE receiver_id = $1 AND receiver_type = $2 AND is_read = false
    `;
    const params = [receiver_id, receiver_type];
    let paramCount = 3;

    if (order_id) {
      sql += ` AND order_id = $${paramCount++}`;
      params.push(order_id);
    }

    const result = await query(sql, params);
    return result.rowCount;
  },

  // Get unread count
  getUnreadCount: async (receiver_id, receiver_type, order_id = null) => {
    let sql = `
      SELECT COUNT(*) as count 
      FROM chat_messages 
      WHERE receiver_id = $1 AND receiver_type = $2 AND is_read = false
    `;
    const params = [receiver_id, receiver_type];
    let paramCount = 3;

    if (order_id) {
      sql += ` AND order_id = $${paramCount++}`;
      params.push(order_id);
    }

    const result = await query(sql, params);
    return parseInt(result.rows[0].count);
  }
};

module.exports = ChatMessage;

