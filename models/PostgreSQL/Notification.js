const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const Notification = {
  // Create notification
  create: async (notificationData) => {
    const {
      user_id,
      rider_id,
      restaurant_id,
      order_id,
      type,
      title,
      message,
      data = null
    } = notificationData;

    const result = await query(
      `INSERT INTO notifications (id, user_id, rider_id, restaurant_id, order_id, type, title, message, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [uuidv4(), user_id, rider_id, restaurant_id, order_id, type, title, message, data ? JSON.stringify(data) : null]
    );

    return result.rows[0];
  },

  // Find by ID
  findById: async (id) => {
    const result = await query('SELECT * FROM notifications WHERE id = $1', [id]);
    return result.rows[0];
  },

  // Get notifications for user
  getForUser: async (user_id, page = 1, limit = 20, unread_only = false) => {
    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM notifications WHERE user_id = $1';
    const params = [user_id];
    let paramCount = 2;

    if (unread_only) {
      sql += ` AND is_read = false`;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    const countSql = unread_only
      ? 'SELECT COUNT(*) as total FROM notifications WHERE user_id = $1 AND is_read = false'
      : 'SELECT COUNT(*) as total FROM notifications WHERE user_id = $1';

    const countResult = await query(countSql, [user_id]);

    return {
      notifications: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit
    };
  },

  // Get notifications for rider
  getForRider: async (rider_id, page = 1, limit = 20, unread_only = false) => {
    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM notifications WHERE rider_id = $1';
    const params = [rider_id];
    let paramCount = 2;

    if (unread_only) {
      sql += ` AND is_read = false`;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    const countSql = unread_only
      ? 'SELECT COUNT(*) as total FROM notifications WHERE rider_id = $1 AND is_read = false'
      : 'SELECT COUNT(*) as total FROM notifications WHERE rider_id = $1';

    const countResult = await query(countSql, [rider_id]);

    return {
      notifications: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit
    };
  },

  // Get notifications for restaurant
  getForRestaurant: async (restaurant_id, page = 1, limit = 20, unread_only = false) => {
    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM notifications WHERE restaurant_id = $1';
    const params = [restaurant_id];
    let paramCount = 2;

    if (unread_only) {
      sql += ` AND is_read = false`;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    const countSql = unread_only
      ? 'SELECT COUNT(*) as total FROM notifications WHERE restaurant_id = $1 AND is_read = false'
      : 'SELECT COUNT(*) as total FROM notifications WHERE restaurant_id = $1';

    const countResult = await query(countSql, [restaurant_id]);

    return {
      notifications: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit
    };
  },

  // Mark as read
  markAsRead: async (id, user_id = null, rider_id = null, restaurant_id = null) => {
    let sql = 'UPDATE notifications SET is_read = true WHERE id = $1';
    const params = [id];

    if (user_id) {
      sql += ' AND user_id = $2';
      params.push(user_id);
    } else if (rider_id) {
      sql += ' AND rider_id = $2';
      params.push(rider_id);
    } else if (restaurant_id) {
      sql += ' AND restaurant_id = $2';
      params.push(restaurant_id);
    }

    const result = await query(`${sql} RETURNING *`, params);
    return result.rows[0];
  },

  // Mark all as read
  markAllAsRead: async (user_id = null, rider_id = null, restaurant_id = null) => {
    let sql = 'UPDATE notifications SET is_read = true WHERE is_read = false';
    const params = [];
    let paramCount = 1;

    if (user_id) {
      sql += ` AND user_id = $${paramCount++}`;
      params.push(user_id);
    } else if (rider_id) {
      sql += ` AND rider_id = $${paramCount++}`;
      params.push(rider_id);
    } else if (restaurant_id) {
      sql += ` AND restaurant_id = $${paramCount++}`;
      params.push(restaurant_id);
    }

    const result = await query(sql, params);
    return result.rowCount;
  },

  // Get unread count
  getUnreadCount: async (user_id = null, rider_id = null, restaurant_id = null) => {
    let sql = 'SELECT COUNT(*) as count FROM notifications WHERE is_read = false';
    const params = [];
    let paramCount = 1;

    if (user_id) {
      sql += ` AND user_id = $${paramCount++}`;
      params.push(user_id);
    } else if (rider_id) {
      sql += ` AND rider_id = $${paramCount++}`;
      params.push(rider_id);
    } else if (restaurant_id) {
      sql += ` AND restaurant_id = $${paramCount++}`;
      params.push(restaurant_id);
    }

    const result = await query(sql, params);
    return parseInt(result.rows[0].count);
  },

  // Delete notification
  delete: async (id, user_id = null, rider_id = null, restaurant_id = null) => {
    let sql = 'DELETE FROM notifications WHERE id = $1';
    const params = [id];
    let paramCount = 2;

    if (user_id) {
      sql += ` AND user_id = $${paramCount++}`;
      params.push(user_id);
    } else if (rider_id) {
      sql += ` AND rider_id = $${paramCount++}`;
      params.push(rider_id);
    } else if (restaurant_id) {
      sql += ` AND restaurant_id = $${paramCount++}`;
      params.push(restaurant_id);
    }

    const result = await query(`${sql} RETURNING *`, params);
    return result.rows[0];
  }
};

module.exports = Notification;

