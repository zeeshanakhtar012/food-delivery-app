// controllers/restaurantAdminController.js
const { successResponse, errorResponse } = require('../helpers/response');
const { logCreate, logUpdate, logDelete } = require('../services/auditService');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// === YOUR REAL MODELS ===
const Food = require('../models/PostgreSQL/Food');
const FoodCategory = require('../models/PostgreSQL/FoodCategory');
const Order = require('../models/PostgreSQL/Order');
const Rider = require('../models/PostgreSQL/Rider');
const Admin = require('../models/PostgreSQL/Admin'); // Your real model
const Restaurant = require('../models/PostgreSQL/Restaurant');

// ============== LOGIN ==============
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return errorResponse(res, 'Email and password required', 400);
    }

    const admin = await Admin.findByEmail(email);
    if (!admin) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    if (admin.role !== 'restaurant_admin') {
      return errorResponse(res, 'Access denied. Not a restaurant admin', 403);
    }

    const isValid = await Admin.comparePassword(password, admin.password);
    if (!isValid) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    if (!admin.restaurant_id) {
      return errorResponse(res, 'No restaurant assigned', 403);
    }

    const restaurant = await Restaurant.findById(admin.restaurant_id);
    if (!restaurant || !restaurant.is_active) {
      return errorResponse(res, 'Restaurant is inactive or not found', 403);
    }

    // Generate JWT
    const token = jwt.sign(
      { id: admin.id, role: 'restaurant_admin', restaurant_id: admin.restaurant_id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    await logCreate(admin.id, 'restaurant_admin', 'LOGIN', null, { email }, req);

    return successResponse(res, {
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        restaurant_id: admin.restaurant_id
      }
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

// ============== FOOD MANAGEMENT ==============
exports.createFood = async (req, res, next) => {
  try {
    // Use req.restaurant_id from middleware as primary source, fallback to req.user.restaurant_id
    const restaurantId = req.restaurant_id || req.user?.restaurant_id;
    const userId = req.user?.id;

    if (!restaurantId || !userId) {
      return errorResponse(res, 'Authentication error: Missing restaurant or user info', 401);
    }

    // Ensure req.body exists (should be parsed by multer or express.json())
    if (!req.body) {
      return errorResponse(res, 'Request body is missing', 400);
    }

    // Handle both form-data and JSON requests
    const name = req.body.name;
    const description = req.body.description;
    const category_id = req.body.category_id;
    const price = req.body.price ? parseFloat(req.body.price) : null;
    const preparation_time = req.body.preparation_time ? parseInt(req.body.preparation_time) : 15;
    const is_available = req.body.is_available !== undefined ? 
      (req.body.is_available === 'true' || req.body.is_available === true) : true;

    // Get uploaded files (multer puts them in req.files)
    const foodImages = req.files?.foodImages;

    if (!name || !category_id || !price) {
      return errorResponse(res, 'Name, category, and price required', 400);
    }

    const category = await FoodCategory.findById(category_id);
    if (!category || category.restaurant_id !== restaurantId) {
      return errorResponse(res, 'Invalid category', 403);
    }

    // Build image URL from uploaded file
    const image_url = foodImages && foodImages.length > 0 ? 
      `/uploads/foods/${foodImages[0].filename}` : 
      (req.body.image_url || null);

    const food = await Food.create({
      name,
      description,
      category_id,
      price,
      preparation_time,
      is_available,
      image_url,
      restaurant_id: restaurantId
    });

    await logCreate(userId, 'restaurant_admin', 'FOOD', food.id, food, req);
    return successResponse(res, food, 'Food created', 201);
  } catch (error) {
    next(error);
  }
};

exports.getAllFoods = async (req, res, next) => {
  try {
    const restaurantId = req.restaurant_id || req.user?.restaurant_id;
    if (!restaurantId) {
      return errorResponse(res, 'Authentication error: Missing restaurant info', 401);
    }
    const foods = await Food.findByRestaurantId(restaurantId);
    return successResponse(res, foods, 'Foods retrieved');
  } catch (error) {
    next(error);
  }
};

exports.updateFood = async (req, res, next) => {
  try {
    const restaurantId = req.restaurant_id || req.user?.restaurant_id;
    const userId = req.user?.id;
    
    if (!restaurantId || !userId) {
      return errorResponse(res, 'Authentication error: Missing restaurant or user info', 401);
    }

    const { id } = req.params;
    
    // Ensure req.body exists
    if (!req.body) {
      return errorResponse(res, 'Request body is missing', 400);
    }

    const food = await Food.findById(id);
    if (!food || food.restaurant_id !== restaurantId) {
      return errorResponse(res, 'Food not found', 404);
    }

    // Build updates object from req.body
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.category_id !== undefined) updates.category_id = req.body.category_id;
    if (req.body.price !== undefined) updates.price = parseFloat(req.body.price);
    if (req.body.preparation_time !== undefined) updates.preparation_time = parseInt(req.body.preparation_time);
    if (req.body.is_available !== undefined) {
      updates.is_available = req.body.is_available === 'true' || req.body.is_available === true;
    }

    // Handle image upload
    const foodImages = req.files?.foodImages;
    if (foodImages && foodImages.length > 0) {
      updates.image_url = `/uploads/foods/${foodImages[0].filename}`;
    } else if (req.body.image_url !== undefined) {
      updates.image_url = req.body.image_url;
    }

    const oldValues = { ...food };
    const updated = await Food.update(id, updates);
    if (!updated) return errorResponse(res, 'No changes', 400);

    await logUpdate(userId, 'restaurant_admin', 'FOOD', id, oldValues, updated, req);
    return successResponse(res, updated, 'Food updated');
  } catch (error) {
    next(error);
  }
};

exports.deleteFood = async (req, res, next) => {
  try {
    const restaurantId = req.restaurant_id || req.user?.restaurant_id;
    const userId = req.user?.id;
    
    if (!restaurantId || !userId) {
      return errorResponse(res, 'Authentication error: Missing restaurant or user info', 401);
    }

    const { id } = req.params;
    const food = await Food.findById(id);
    if (!food || food.restaurant_id !== restaurantId) {
      return errorResponse(res, 'Food not found', 404);
    }

    await Food.softDelete(id);
    await logDelete(userId, 'restaurant_admin', 'FOOD', id, food, req);
    return successResponse(res, null, 'Food deleted');
  } catch (error) {
    next(error);
  }
};

// ============== ORDER MANAGEMENT ==============
exports.getAllOrders = async (req, res, next) => {
  try {
    const restaurantId = req.restaurant_id || req.user?.restaurant_id;
    if (!restaurantId) {
      return errorResponse(res, 'Authentication error: Missing restaurant info', 401);
    }
    const orders = await Order.findByRestaurantId(restaurantId);
    return successResponse(res, orders, 'Orders retrieved');
  } catch (error) {
    next(error);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const restaurantId = req.restaurant_id || req.user?.restaurant_id;
    const userId = req.user?.id;
    
    if (!restaurantId || !userId) {
      return errorResponse(res, 'Authentication error: Missing restaurant or user info', 401);
    }

    const { id } = req.params;
    const { status } = req.body;

    // Use the actual order_status enum values from schema
    const validStatuses = ['pending', 'accepted', 'preparing', 'picked_up', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return errorResponse(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const order = await Order.findById(id);
    if (!order || order.restaurant_id !== restaurantId) {
      return errorResponse(res, 'Order not found', 404);
    }

    const oldStatus = order.status;
    await Order.updateStatus(id, status);

    await logUpdate(userId, 'restaurant_admin', 'ORDER', id, { status: oldStatus }, { status }, req);
    return successResponse(res, { id, status }, 'Status updated');
  } catch (error) {
    next(error);
  }
};

// ============== RIDER MANAGEMENT ==============
exports.createRider = async (req, res, next) => {
  try {
    const restaurantId = req.restaurant_id || req.user?.restaurant_id;
    const userId = req.user?.id;
    
    if (!restaurantId || !userId) {
      return errorResponse(res, 'Authentication error: Missing restaurant or user info', 401);
    }

    const { name, phone, email, vehicle_type, password } = req.body;
    if (!name || !phone) return errorResponse(res, 'Name and phone required', 400);

    // Generate random password if not provided
    let generatedPassword = password;
    let passwordGenerated = false;
    
    if (!generatedPassword) {
      // Generate a random 8-character password with letters and numbers
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      generatedPassword = '';
      for (let i = 0; i < 8; i++) {
        generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      passwordGenerated = true;
    }

    const rider = await Rider.create({
      name, phone, email, vehicle_type,
      password: generatedPassword,
      restaurant_id: restaurantId,
      created_by: userId
    });

    // Include password in response so admin can share it with rider
    const responseData = {
      ...rider,
      password: generatedPassword, // Return password so admin can share it
      password_generated: passwordGenerated // Indicate if password was auto-generated
    };

    await logCreate(userId, 'restaurant_admin', 'RIDER', rider.id, rider, req);
    return successResponse(res, responseData, passwordGenerated ? 
      'Rider created. Please share the password with the rider.' : 
      'Rider created', 201);
  } catch (error) {
    next(error);
  }
};

exports.getAllRiders = async (req, res, next) => {
  try {
    const restaurantId = req.restaurant_id || req.user?.restaurant_id;
    if (!restaurantId) {
      return errorResponse(res, 'Authentication error: Missing restaurant info', 401);
    }
    const riders = await Rider.findByRestaurantId(restaurantId);
    return successResponse(res, riders, 'Riders retrieved');
  } catch (error) {
    next(error);
  }
};

// ============== PROFILE ==============
// controllers/restaurantAdminController.js
exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return errorResponse(res, 'Authentication error: Missing user info', 401);
    }

    const admin = await Admin.findById(userId);
    if (!admin) return errorResponse(res, 'Profile not found', 404);

    // Return only the fields you need – never expose password
    const safeAdmin = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      restaurant_id: admin.restaurant_id || null,
      created_at: admin.created_at,
    };

    return successResponse(res, safeAdmin, 'Profile retrieved');
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return errorResponse(res, 'Authentication error: Missing user info', 401);
    }

    const updates = req.body;
    const admin = await Admin.findById(userId);
    if (!admin) return errorResponse(res, 'Profile not found', 404);

    const updated = await Admin.update(userId, updates); // You need this method!
    if (!updated) return errorResponse(res, 'No changes', 400);

    await logUpdate(userId, 'restaurant_admin', 'PROFILE', userId, admin, updated, req);
    return successResponse(res, updated, 'Profile updated');
  } catch (error) {
    next(error);
  }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const restaurantId = req.restaurant_id || req.user?.restaurant_id;
    if (!restaurantId) {
      return errorResponse(res, 'Authentication error: Missing restaurant info', 401);
    }
    const stats = await Order.getAnalytics(restaurantId);
    return successResponse(res, stats, 'Analytics retrieved');
  } catch (error) {
    next(error);
  }
};
exports.getSalesReport = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter[Op.gte] = new Date(startDate);
    if (endDate) dateFilter[Op.lte] = new Date(`${endDate} 23:59:59`);

    const groupFormat = {
      day: '%Y-%m-%d',
      week: '%Y-%u',
      month: '%Y-%m'
    }[groupBy] || '%Y-%m-%d';

    const sales = await Order.findAll({
      attributes: [
        [sequelize.fn('TO_CHAR', sequelize.col('created_at'), groupFormat), 'period'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'order_count'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_sales']
      ],
      where: {
        restaurant_id: restaurantId,
        status: 'delivered',
        ...(Object.keys(dateFilter).length && { created_at: dateFilter })
      },
      group: ['period'],
      order: [[sequelize.literal('period'), 'ASC']],
      raw: true
    });

    return successResponse(res, { groupBy, sales }, 'Sales report generated');
  } catch (error) {
    next(error);
  }
};

exports.getIncomeReport = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter[Op.gte] = new Date(startDate);
    if (endDate) dateFilter[Op.lte] = new Date(`${endDate} 23:59:59`);

    // Sales
    const salesResult = await Order.findOne({
      attributes: [[sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_amount')), 0), 'total_sales']],
      where: {
        restaurant_id: restaurantId,
        status: 'delivered',
        ...(Object.keys(dateFilter).length && { created_at: dateFilter })
      },
      raw: true
    });

    // Expenses
    const expenseResult = await Expense.findOne({
      attributes: [[sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'total_expenses']],
      where: {
        restaurant_id: restaurantId,
        ...(Object.keys(dateFilter).length && { expense_date: dateFilter })
      },
      raw: true
    });

    const totalSales = parseFloat(salesResult.total_sales) || 0;
    const totalExpenses = parseFloat(expenseResult.total_expenses) || 0;
    const netIncome = totalSales - totalExpenses;

    return successResponse(res, {
      total_sales: totalSales,
      total_expenses: totalExpenses,
      net_income: netIncome,
      period: { startDate, endDate }
    }, 'Income report generated');
  } catch (error) {
    next(error);
  }
};
exports.getTopProducts = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const { limit = 10, sort = 'quantity', order = 'desc' } = req.query;

    const validSort = ['quantity', 'revenue'].includes(sort) ? sort : 'quantity';
    const validOrder = order === 'asc' ? 'ASC' : 'DESC';

    const orderBy = validSort === 'revenue'
      ? sequelize.fn('SUM', sequelize.col('OrderItem.total_price'))
      : sequelize.fn('SUM', sequelize.col('OrderItem.quantity'));

    const topProducts = await OrderItem.findAll({
      attributes: [
        'food_id',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'total_quantity'],
        [sequelize.fn('SUM', sequelize.col('total_price')), 'total_revenue']
      ],
      include: [{
        model: Food,
        attributes: ['name', 'image_url'],
        where: { restaurant_id: restaurantId }
      }],
      where: {
        '$Order.status$': 'delivered'
      },
      include: [{ model: Order, attributes: [] }],
      group: ['food_id', 'Food.id', 'Food.name', 'Food.image_url'],
      order: [[sequelize.literal(orderBy), validOrder]],
      limit: parseInt(limit),
      raw: true
    });

    return successResponse(res, topProducts, 'Top products retrieved');
  } catch (error) {
    next(error);
  }
};

exports.getLowStockItems = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const { threshold = 5 } = req.query;

    const items = await Food.findAll({
      attributes: ['id', 'name', 'stock_quantity', 'image_url'],
      where: {
        restaurant_id: restaurantId,
        stock_quantity: { [Op.lte]: parseInt(threshold) },
        is_available: true
      },
      order: [['stock_quantity', 'ASC']]
    });

    return successResponse(res, items, 'Low stock items retrieved');
  } catch (error) {
    next(error);
  }
};
exports.exportReport = async (req, res, next) => {
  try {
    const { type = 'csv', report = 'sales' } = req.query;
    let data = [];
    let filename = `${report}-report-${moment().format('YYYY-MM-DD')}`;

    if (report === 'sales') {
      // Reuse getSalesReport logic
      req.query.groupBy = req.query.groupBy || 'day';
      const salesRes = await exports.getSalesReport(req, res, next);
      data = salesRes.data.sales;
      filename += `-sales.${type}`;
    }

    if (type === 'csv') {
      const parser = new Parser();
      const csv = parser.parse(data);
      res.header('Content-Type', 'text/csv');
      res.attachment(filename);
      return res.send(csv);
    }

    if (type === 'pdf') {
      const doc = new PDFDocument();
      res.header('Content-Type', 'application/pdf');
      res.attachment(filename);
      doc.pipe(res);

      doc.fontSize(16).text(`${report.toUpperCase()} REPORT`, { align: 'center' });
      doc.moveDown();

      data.forEach(item => {
        doc.fontSize(12).text(JSON.stringify(item));
        doc.moveDown(0.5);
      });

      doc.end();
      return;
    }

    return errorResponse(res, 'Invalid export type. Use csv or pdf', 400);
  } catch (error) {
    next(error);
  }
};

exports.blockRider = async (req, res, next) => {
  try {
    const { id } = req.params;
    const restaurantId = req.user.restaurant_id;
    const { reason } = req.body;

    const rider = await Rider.findById(id);
    if (!rider || rider.restaurant_id !== restaurantId) {
      return errorResponse(res, 'Rider not found', 404);
    }
    if (rider.is_blocked) {
      return errorResponse(res, 'Rider is already blocked', 400);
    }

    const updated = await Rider.update(id, {
      is_blocked: true,
      blocked_at: new Date(),
      blocked_reason: reason || null
    });

    await logUpdate(req.user.id, 'restaurant_admin', 'RIDER_BLOCK', id, { is_blocked: false }, { is_blocked: true }, req);
    return successResponse(res, updated, 'Rider blocked successfully');
  } catch (error) {
    next(error);
  }
};

exports.unblockRider = async (req, res, next) => {
  try {
    const { id } = req.params;
    const restaurantId = req.user.restaurant_id;

    const rider = await Rider.findById(id);
    if (!rider || rider.restaurant_id !== restaurantId) {
      return errorResponse(res, 'Rider not found', 404);
    }
    if (!rider.is_blocked) {
      return errorResponse(res, 'Rider is not blocked', 400);
    }

    const updated = await Rider.update(id, {
      is_blocked: false,
      blocked_at: null,
      blocked_reason: null
    });

    await logUpdate(req.user.id, 'restaurant_admin', 'RIDER_UNBLOCK', id, { is_blocked: true }, { is_blocked: false }, req);
    return successResponse(res, updated, 'Rider unblocked successfully');
  } catch (error) {
    next(error);
  }
};

exports.getRiderPerformance = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const { rider_id, startDate, endDate } = req.query;

    const where = { restaurant_id: restaurantId };
    if (rider_id) where.id = rider_id;
    if (startDate || endDate) {
      where['$Orders.created_at$'] = {};
      if (startDate) where['$Orders.created_at$'][Op.gte] = new Date(startDate);
      if (endDate) where['$Orders.created_at$'][Op.lte] = new Date(`${endDate} 23:59:59`);
    }

    const riders = await Rider.findAll({
      attributes: [
        'id', 'name', 'phone',
        [sequelize.fn('COUNT', sequelize.col('Orders.id')), 'total_deliveries'],
        [sequelize.fn('AVG', sequelize.fn('EXTRACT', sequelize.literal('EPOCH FROM (Orders.delivered_at - Orders.picked_up_at)'))), 'avg_delivery_time'],
        [sequelize.fn('AVG', sequelize.col('Orders.rider_rating')), 'avg_rating']
      ],
      include: [{
        model: Order,
        attributes: [],
        where: { status: 'delivered', rider_id: sequelize.col('Rider.id') }
      }],
      where,
      group: ['Rider.id'],
      raw: true
    });

    riders.forEach(r => {
      r.avg_delivery_time = r.avg_delivery_time ? Math.round(parseFloat(r.avg_delivery_time) / 60) : null; // in minutes
      r.avg_rating = r.avg_rating ? parseFloat(r.avg_rating).toFixed(1) : null;
    });

    return successResponse(res, riders, 'Rider performance retrieved');
  } catch (error) {
    next(error);
  }
};

exports.getProductsSummary = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;

    const summary = await OrderItem.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.literal('DISTINCT food_id')), 'unique_products_sold'],
        [sequelize.fn('SUM', sequelize.col('quantity')), 'total_units_sold'],
        [sequelize.fn('SUM', sequelize.col('total_price')), 'total_revenue'],
        [sequelize.fn('AVG', sequelize.col('unit_price')), 'avg_price']
      ],
      include: [{
        model: Food,
        attributes: [],
        where: { restaurant_id: restaurantId }
      }],
      where: { '$Order.status$': 'delivered' },
      include: [{ model: Order, attributes: [] }],
      raw: true
    });

    const result = summary[0] || {};
    result.avg_sale_per_product = result.total_units_sold && result.unique_products_sold
      ? (result.total_units_sold / result.unique_products_sold).toFixed(2)
      : 0;

    return successResponse(res, result, 'Products summary retrieved');
  } catch (error) {
    next(error);
  }
};

exports.getCategoryPerformance = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;

    const performance = await OrderItem.findAll({
      attributes: [
        'Food.FoodCategory.name',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'total_quantity'],
        [sequelize.fn('SUM', sequelize.col('total_price')), 'total_revenue']
      ],
      include: [{
        model: Food,
        attributes: [],
        include: [{
          model: FoodCategory,
          attributes: [],
          where: { restaurant_id: restaurantId }
        }]
      }],
      where: { '$Order.status$': 'delivered' },
      include: [{ model: Order, attributes: [] }],
      group: ['Food.FoodCategory.id', 'Food.FoodCategory.name'],
      raw: true
    });

    return successResponse(res, performance, 'Category performance retrieved');
  } catch (error) {
    next(error);
  }
};

exports.getIncomeSummary = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const { period = 'day' } = req.query;

    const format = { day: '%Y-%m-%d', week: '%Y-%u', month: '%Y-%m' }[period];

    const summary = await Order.findAll({
      attributes: [
        [sequelize.fn('TO_CHAR', sequelize.col('created_at'), format), 'period'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'gross_income']
      ],
      where: { restaurant_id: restaurantId, status: 'delivered' },
      group: ['period'],
      order: [[sequelize.literal('period'), 'ASC']],
      raw: true
    });

    return successResponse(res, { period, summary }, 'Income summary retrieved');
  } catch (error) {
    next(error);
  }
};

exports.getIncomeTrends = async (req, res, next) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const days = parseInt(req.query.days) || 30;

    const startDate = moment().subtract(days, 'days').startOf('day').toDate();

    const trends = await Order.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'daily_income']
      ],
      where: {
        restaurant_id: restaurantId,
        status: 'delivered',
        created_at: { [Op.gte]: startDate }
      },
      group: [sequelize.fn('DATE', sequelize.col('created_at'))],
      order: [[sequelize.literal('date'), 'ASC']],
      raw: true
    });

    return successResponse(res, { days, trends }, 'Income trends retrieved');
  } catch (error) {
    next(error);
  }
};