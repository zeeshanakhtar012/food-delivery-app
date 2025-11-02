const { query } = require('../../config/db');

const Analytics = {
  // Get restaurant analytics
  getRestaurantAnalytics: async (restaurant_id) => {
    // Total orders
    const totalOrdersResult = await query(
      'SELECT COUNT(*) as count FROM orders WHERE restaurant_id = $1',
      [restaurant_id]
    );
    const totalOrders = parseInt(totalOrdersResult.rows[0].count);

    // Total revenue
    const revenueResult = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total 
       FROM orders 
       WHERE restaurant_id = $1 AND status = 'delivered'`,
      [restaurant_id]
    );
    const totalRevenue = parseFloat(revenueResult.rows[0].total);

    // Orders by status
    const ordersByStatusResult = await query(
      `SELECT status, COUNT(*) as count 
       FROM orders 
       WHERE restaurant_id = $1 
       GROUP BY status`,
      [restaurant_id]
    );
    const ordersByStatus = ordersByStatusResult.rows.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count);
      return acc;
    }, {});

    // Top 5 best-selling foods
    const topFoodsResult = await query(
      `SELECT f.id, f.name, f.price, f.image_url, 
              SUM(oi.quantity) as total_sold,
              SUM(oi.quantity * oi.price) as total_revenue
       FROM order_items oi
       JOIN foods f ON oi.food_id = f.id
       JOIN orders o ON oi.order_id = o.id
       WHERE o.restaurant_id = $1 AND o.status = 'delivered'
       GROUP BY f.id, f.name, f.price, f.image_url
       ORDER BY total_sold DESC
       LIMIT 5`,
      [restaurant_id]
    );
    const topFoods = topFoodsResult.rows;

    // Active riders count
    const activeRidersResult = await query(
      'SELECT COUNT(*) as count FROM riders WHERE restaurant_id = $1 AND is_available = true',
      [restaurant_id]
    );
    const activeRiders = parseInt(activeRidersResult.rows[0].count);

    // Total riders count
    const totalRidersResult = await query(
      'SELECT COUNT(*) as count FROM riders WHERE restaurant_id = $1',
      [restaurant_id]
    );
    const totalRiders = parseInt(totalRidersResult.rows[0].count);

    // Active customers count
    const activeCustomersResult = await query(
      `SELECT COUNT(DISTINCT user_id) as count 
       FROM orders 
       WHERE restaurant_id = $1 
       AND created_at >= NOW() - INTERVAL '30 days'`,
      [restaurant_id]
    );
    const activeCustomers = parseInt(activeCustomersResult.rows[0].count);

    // Total customers count
    const totalCustomersResult = await query(
      'SELECT COUNT(*) as count FROM users WHERE restaurant_id = $1',
      [restaurant_id]
    );
    const totalCustomers = parseInt(totalCustomersResult.rows[0].count);

    return {
      totalOrders,
      totalRevenue,
      ordersByStatus,
      topFoods,
      riders: {
        active: activeRiders,
        total: totalRiders
      },
      customers: {
        active: activeCustomers,
        total: totalCustomers
      }
    };
  },

  // Get super admin analytics (all restaurants)
  getAllRestaurantsAnalytics: async () => {
    // Total restaurants
    const restaurantsResult = await query('SELECT COUNT(*) as count FROM restaurants');
    const totalRestaurants = parseInt(restaurantsResult.rows[0].count);

    // Active restaurants
    const activeRestaurantsResult = await query(
      'SELECT COUNT(*) as count FROM restaurants WHERE is_active = true'
    );
    const activeRestaurants = parseInt(activeRestaurantsResult.rows[0].count);

    // Total orders across all restaurants
    const totalOrdersResult = await query('SELECT COUNT(*) as count FROM orders');
    const totalOrders = parseInt(totalOrdersResult.rows[0].count);

    // Total revenue across all restaurants
    const revenueResult = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total 
       FROM orders 
       WHERE status = 'delivered'`
    );
    const totalRevenue = parseFloat(revenueResult.rows[0].total);

    // Restaurant-wise analytics
    const restaurantsAnalyticsResult = await query(
      `SELECT 
         r.id, r.name, r.email, r.is_active,
         COUNT(DISTINCT o.id) as total_orders,
         COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END), 0) as revenue,
         COUNT(DISTINCT CASE WHEN u.id IS NOT NULL THEN u.id END) as total_customers,
         COUNT(DISTINCT CASE WHEN rid.id IS NOT NULL THEN rid.id END) as total_riders
       FROM restaurants r
       LEFT JOIN orders o ON r.id = o.restaurant_id
       LEFT JOIN users u ON r.id = u.restaurant_id
       LEFT JOIN riders rid ON r.id = rid.restaurant_id
       GROUP BY r.id, r.name, r.email, r.is_active
       ORDER BY r.created_at DESC`
    );

    return {
      totalRestaurants,
      activeRestaurants,
      totalOrders,
      totalRevenue,
      restaurants: restaurantsAnalyticsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        is_active: row.is_active,
        total_orders: parseInt(row.total_orders),
        revenue: parseFloat(row.revenue),
        total_customers: parseInt(row.total_customers),
        total_riders: parseInt(row.total_riders)
      }))
    };
  },
};

module.exports = Analytics;

