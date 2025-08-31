const Order = require('../models/orderModel');
const Food = require('../models/foodModel');

exports.getSalesStats = async (req, res) => {
  try {
    const { restaurantId } = req.query;

    // Total sales and order count
    const orders = await Order.find({ restaurant: restaurantId });
    const totalSales = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    const orderCount = orders.length;

    // Top-selling foods
    const foodSales = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        foodSales[item.food] = (foodSales[item.food] || 0) + item.quantity;
      });
    });

    // Get top 5 foods
    const topFoods = Object.entries(foodSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([foodId, quantity]) => ({ foodId, quantity }));

    res.json({ totalSales, orderCount, topFoods });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};