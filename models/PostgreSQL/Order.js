const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

const Order = {
  // Create order
  create: async (orderData) => {
    const {
      user_id, restaurant_id, total_amount,
      delivery_lat, delivery_lng, items,
      table_id, guest_count, order_type, status,
      reservation_id // [NEW]
    } = orderData;

    // Start transaction - create order
    // user_id can be null now
    const orderResult = await query(
      `INSERT INTO orders (
         id, user_id, restaurant_id, total_amount, 
         delivery_lat, delivery_lng, table_id, guest_count, 
         order_type, status, reservation_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        uuidv4(), user_id || null, restaurant_id, total_amount,
        delivery_lat || null, delivery_lng || null,
        table_id || null, guest_count || null,
        order_type || 'delivery', status || 'pending',
        reservation_id || null
      ]
    );

    const order = orderResult.rows[0];

    // Create order items
    if (items && items.length > 0) {
      for (const item of items) {
        // [NEW] Insert with addons
        await query(
          `INSERT INTO order_items (id, order_id, food_id, quantity, price, addons)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            uuidv4(), order.id, item.food_id, item.quantity, item.price,
            JSON.stringify(item.addons || [])
          ]
        );

        // [NEW] Decrement stock
        await query(
          `UPDATE foods SET stock_quantity = stock_quantity - $1 WHERE id = $2`,
          [item.quantity, item.food_id]
        );
      }
    }

    // If assigned to a table, update table status to occupied
    if (table_id && status !== 'completed' && status !== 'cancelled') {
      const Table = require('./Table'); // Lazy load to avoid circular dependency if any
      await Table.update(table_id, { status: 'occupied' });
    }

    // [NEW] If reservation attached, mark as completed
    if (reservation_id) {
      await query(
        `UPDATE reservations SET status = 'completed' WHERE id = $1`,
        [reservation_id]
      );
    }

    // Fetch order with items
    return await Order.findById(order.id);
  },

  // Find order by ID
  findById: async (id) => {
    const orderResult = await query(
      `SELECT o.*, 
              t.table_number
       FROM orders o
       LEFT JOIN restaurant_tables t ON o.table_id = t.id
       WHERE o.id = $1`,
      [id]
    );
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
             r.name as rider_name, r.phone as rider_phone,
             t.table_number
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN riders r ON o.rider_id = r.id
      LEFT JOIN restaurant_tables t ON o.table_id = t.id
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
       LEFT JOIN users u ON o.user_id = u.id -- Changed to LEFT JOIN as user might be null now
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

    // If order is completed or cancelled, free up the table
    if (result.rows.length > 0 && (status === 'delivered' || status === 'completed' || status === 'cancelled' || status === 'picked_up')) {
      const order = result.rows[0];
      if (order.table_id) {
        const Table = require('./Table');
        await Table.update(order.table_id, { status: 'available' });
      }
    }

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

    // Get orders by type (Dine-in, Takeaway, Delivery)
    const typeResult = await query(
      `SELECT order_type, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue
       FROM orders
       WHERE restaurant_id = $1 AND status != 'cancelled'
       GROUP BY order_type`,
      [restaurant_id]
    );
    const salesByType = {
      delivery: { count: 0, revenue: 0 },
      pickup: { count: 0, revenue: 0 },
      dine_in: { count: 0, revenue: 0 },
      takeaway: { count: 0, revenue: 0 } // Mapping generic takeaway if used
    };

    typeResult.rows.forEach(row => {
      const type = row.order_type || 'unknown';
      salesByType[type] = {
        count: parseInt(row.count),
        revenue: parseFloat(row.revenue)
      };
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

    // Get last 7 days daily sales for chart
    const chartResult = await query(
      `SELECT
         TO_CHAR(DATE(created_at), 'Mon DD') as name,
         COALESCE(SUM(total_amount), 0)::float as sales,
         COUNT(id)::int as orders
       FROM orders
       WHERE restaurant_id = $1
         AND status != 'cancelled'
         AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at), name
       ORDER BY DATE(created_at) ASC`,
      [restaurant_id]
    );
    const last7DaysSales = chartResult.rows;

    // Get 5 most recent orders for the dashboard feed
    const recentListResult = await query(
      `SELECT o.id, o.status, o.total_amount, o.order_type, o.created_at,
              o.customer_name, t.table_number
       FROM orders o
       LEFT JOIN restaurant_tables t ON o.table_id = t.id
       WHERE o.restaurant_id = $1
       ORDER BY o.created_at DESC
       LIMIT 5`,
      [restaurant_id]
    );
    const recentOrdersList = recentListResult.rows;

    return {
      totalOrders,
      totalRevenue,
      recentOrders,
      avgOrderValue,
      ordersByStatus,
      salesByType,
      last7DaysSales,
      recentOrdersList,
    };
  },

  // Add items to existing order
  addItems: async (orderId, newItems) => {
    let currentOrder = await Order.findById(orderId);
    if (!currentOrder) return null;

    let additionalAmount = 0;

    // Insert new items
    for (const item of newItems) {
      await query(
        `INSERT INTO order_items (id, order_id, food_id, quantity, price)
         VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), orderId, item.food_id, item.quantity, item.price]
      );
      additionalAmount += item.quantity * item.price;
    }

    // Update total amount
    const newTotal = parseFloat(currentOrder.total_amount) + additionalAmount;
    const result = await query(
      `UPDATE orders SET total_amount = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [newTotal, orderId]
    );

    return await Order.findById(orderId);
  },

  // Find active order for a table
  findActiveByTableId: async (tableId) => {
    const result = await query(
      `SELECT * FROM orders 
       WHERE table_id = $1 
         AND status NOT IN ('delivered', 'cancelled', 'picked_up')
       LIMIT 1`,
      [tableId]
    );
    if (result.rows.length === 0) return null;
    return await Order.findById(result.rows[0].id);
  }
};

module.exports = Order;

