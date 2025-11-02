const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const Order = {
  // Create order
  create: async (orderData) => {
    const { user_id, restaurant_id, total_amount, delivery_lat, delivery_lng, items } = orderData;
    
    // Start transaction - create order
    const orderResult = await query(
      `INSERT INTO orders (id, user_id, restaurant_id, total_amount, delivery_lat, delivery_lng)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [uuidv4(), user_id, restaurant_id, total_amount, delivery_lat, delivery_lng]
    );
    
    const order = orderResult.rows[0];

    // Create order items
    if (items && items.length > 0) {
      for (const item of items) {
        await query(
          `INSERT INTO order_items (id, order_id, food_id, quantity, price)
           VALUES ($1, $2, $3, $4, $5)`,
          [uuidv4(), order.id, item.food_id, item.quantity, item.price]
        );
      }
    }

    // Fetch order with items
    return await Order.findById(order.id);
  },

  // Find order by ID
  findById: async (id) => {
    const orderResult = await query('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderResult.rows.length === 0) return null;

    const order = orderResult.rows[0];
    const itemsResult = await query(
      `SELECT oi.*, f.name as food_name, f.image_url as food_image
       FROM order_items oi
       JOIN foods f ON oi.food_id = f.id
       WHERE oi.order_id = $1`,
      [id]
    );
    
    return {
      ...order,
      items: itemsResult.rows
    };
  },

  // Get all orders for a restaurant
  findByRestaurantId: async (restaurant_id, status = null) => {
    let sql = `
      SELECT o.*, 
             u.name as user_name, u.phone as user_phone,
             r.name as rider_name, r.phone as rider_phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN riders r ON o.rider_id = r.id
      WHERE o.restaurant_id = $1
    `;
    const params = [restaurant_id];

    if (status) {
      sql += ' AND o.status = $2';
      params.push(status);
    }

    sql += ' ORDER BY o.created_at DESC';

    const result = await query(sql, params);
    
    // Fetch items for each order
    for (const order of result.rows) {
      const itemsResult = await query(
        `SELECT oi.*, f.name as food_name, f.image_url as food_image
         FROM order_items oi
         JOIN foods f ON oi.food_id = f.id
         WHERE oi.order_id = $1`,
        [order.id]
      );
      order.items = itemsResult.rows;
    }

    return result.rows;
  },

  // Get orders for a user
  findByUserId: async (user_id) => {
    const result = await query(
      `SELECT o.*, 
              r.name as restaurant_name, r.logo_url as restaurant_logo
       FROM orders o
       JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC`,
      [user_id]
    );

    // Fetch items for each order
    for (const order of result.rows) {
      const itemsResult = await query(
        `SELECT oi.*, f.name as food_name, f.image_url as food_image
         FROM order_items oi
         JOIN foods f ON oi.food_id = f.id
         WHERE oi.order_id = $1`,
        [order.id]
      );
      order.items = itemsResult.rows;
    }

    return result.rows;
  },

  // Get assigned orders for a rider
  findByRiderId: async (rider_id) => {
    const result = await query(
      `SELECT o.*, 
              u.name as user_name, u.phone as user_phone,
              r.name as restaurant_name
       FROM orders o
       JOIN users u ON o.user_id = u.id
       JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.rider_id = $1 AND o.status NOT IN ('delivered', 'cancelled')
       ORDER BY o.created_at DESC`,
      [rider_id]
    );

    // Fetch items for each order
    for (const order of result.rows) {
      const itemsResult = await query(
        `SELECT oi.*, f.name as food_name, f.image_url as food_image
         FROM order_items oi
         JOIN foods f ON oi.food_id = f.id
         WHERE oi.order_id = $1`,
        [order.id]
      );
      order.items = itemsResult.rows;
    }

    return result.rows;
  },

  // Update order status
  updateStatus: async (id, status, rider_id = null) => {
    const updates = ['status = $1'];
    const values = [status];
    let paramCount = 2;

    if (rider_id !== null) {
      updates.push(`rider_id = $${paramCount++}`);
      values.push(rider_id);
    }

    values.push(id);
    const result = await query(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  // Get analytics for a restaurant
  getAnalytics: async (restaurant_id) => {
    // Get total orders count
    const totalOrdersResult = await query(
      'SELECT COUNT(*) as count FROM orders WHERE restaurant_id = $1',
      [restaurant_id]
    );
    const totalOrders = parseInt(totalOrdersResult.rows[0].count);

    // Get total revenue
    const revenueResult = await query(
      'SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE restaurant_id = $1 AND status != $2',
      [restaurant_id, 'cancelled']
    );
    const totalRevenue = parseFloat(revenueResult.rows[0].total || 0);

    // Get orders by status
    const statusResult = await query(
      `SELECT status, COUNT(*) as count 
       FROM orders 
       WHERE restaurant_id = $1 
       GROUP BY status`,
      [restaurant_id]
    );
    const ordersByStatus = {};
    statusResult.rows.forEach(row => {
      ordersByStatus[row.status] = parseInt(row.count);
    });

    // Get recent orders (last 30 days)
    const recentOrdersResult = await query(
      `SELECT COUNT(*) as count 
       FROM orders 
       WHERE restaurant_id = $1 
       AND created_at >= NOW() - INTERVAL '30 days'`,
      [restaurant_id]
    );
    const recentOrders = parseInt(recentOrdersResult.rows[0].count);

    // Get average order value
    const avgOrderResult = await query(
      `SELECT COALESCE(AVG(total_amount), 0) as avg 
       FROM orders 
       WHERE restaurant_id = $1 
       AND status != $2`,
      [restaurant_id, 'cancelled']
    );
    const avgOrderValue = parseFloat(avgOrderResult.rows[0].avg || 0);

    return {
      totalOrders,
      totalRevenue,
      recentOrders,
      avgOrderValue,
      ordersByStatus
    };
  },
};

module.exports = Order;

