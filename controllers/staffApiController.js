const RestaurantStaff = require('../models/PostgreSQL/RestaurantStaff');
const Food = require('../models/PostgreSQL/Food');
const FoodCategory = require('../models/PostgreSQL/FoodCategory');
const Table = require('../models/PostgreSQL/Table');
const Order = require('../models/PostgreSQL/Order');
const jwt = require('jsonwebtoken');
const { successResponse, errorResponse } = require('../helpers/response');

// Login for staff (global entry point, similar to User/Admin login)
exports.login = async (req, res, next) => {
    try {
        const { email, password, restaurant_id } = req.body;

        if (!email || !password || !restaurant_id) {
            return errorResponse(res, 'Email, password, and restaurant ID are required', 400);
        }

        // We already have `is_active` check in findByEmail, but we want to know if they exist at all to give a better error message.
        // Let's modify logic: use findByEmailAndRestaurant to get the staff without is_active filter or just find by email directly.
        const result = await require('../config/db').query('SELECT * FROM restaurant_staff WHERE email = $1 AND restaurant_id = $2', [email, restaurant_id]);
        const staff = result.rows[0];

        if (!staff) {
            return errorResponse(res, 'Invalid credentials', 401);
        }

        const isValidPassword = await RestaurantStaff.comparePassword(password, staff.password);

        if (!isValidPassword) {
            return errorResponse(res, 'Invalid credentials', 401);
        }

        if (!staff.is_active) {
            // Emit socket event to admin dashboard
            const io = req.app.get('io');
            if (io) {
                io.to(`restaurant:${restaurant_id}`).emit('staffLoginRequest', {
                    staff_id: staff.id,
                    name: staff.name,
                    email: staff.email,
                    role: staff.role,
                    timestamp: new Date()
                });
            }
            return errorResponse(res, 'Your account is pending approval or has been frozen by the admin. Please wait for approval.', 403);
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: staff.id,
                role: 'staff',
                staff_role: staff.role, // manager, cashier, chef, etc.
                restaurant_id: staff.restaurant_id
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Remove password from response
        delete staff.password;

        return successResponse(
            res,
            { staff, token },
            'Login successful'
        );
    } catch (error) {
        next(error);
    }
};

// Get profile
exports.getProfile = async (req, res, next) => {
    try {
        const staff = await RestaurantStaff.findById(req.user.id);
        if (!staff) {
            return errorResponse(res, 'Staff member not found', 404);
        }

        // Also check if they are still active
        if (!staff.is_active) {
            return errorResponse(res, 'Your account has been paused by the admin.', 403);
        }

        return successResponse(res, staff, 'Profile retrieved');
    } catch (error) {
        next(error);
    }
};

// Check status real-time endpoint
exports.checkStatus = async (req, res, next) => {
    try {
        const staff = await RestaurantStaff.findById(req.user.id);
        if (!staff) {
            return successResponse(res, { is_active: false }, 'Staff member not found');
        }
        return successResponse(res, { is_active: staff.is_active }, 'Status retrieved');
    } catch (error) {
        next(error);
    }
};

// Get the menu (categories and foods) for the staff's restaurant
exports.getMenu = async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurant_id;

        const categories = await FoodCategory.findByRestaurantId(restaurantId, true);
        const foods = await Food.findByRestaurantId(restaurantId, true);

        // Group foods by category
        const menu = categories.map(category => {
            return {
                ...category,
                foods: foods.filter(food => food.category_id === category.id)
            };
        });

        // Add uncategorized foods if any
        const uncategorizedFoods = foods.filter(food => !food.category_id);
        if (uncategorizedFoods.length > 0) {
            menu.push({
                id: null,
                name: 'Uncategorized',
                foods: uncategorizedFoods
            });
        }

        return successResponse(res, menu, 'Menu retrieved successfully');
    } catch (error) {
        next(error);
    }
};

// Get tables
exports.getTables = async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurant_id;
        const tables = await Table.findByRestaurantId(restaurantId);

        // fetch active order for each occupied table
        const tablesWithOrders = await Promise.all(tables.map(async (table) => {
            if (table.status === 'occupied') {
                const activeOrder = await Order.findActiveByTableId(table.id);
                return {
                    ...table,
                    active_order: activeOrder
                };
            }
            return {
                ...table,
                active_order: null
            };
        }));

        return successResponse(res, tablesWithOrders, 'Tables retrieved');
    } catch (error) {
        next(error);
    }
};

// Create a new dine-in order
exports.createOrder = async (req, res, next) => {
    try {
        const { table_id, items, guest_count } = req.body;
        const restaurantId = req.user.restaurant_id;

        if (!table_id || !items || !items.length) {
            return errorResponse(res, 'Table ID and items are required', 400);
        }

        // Verify table belongs to restaurant
        const table = await Table.findById(table_id);
        if (!table || table.restaurant_id !== restaurantId) {
            return errorResponse(res, 'Invalid table', 400);
        }

        if (table.status === 'occupied') {
            return errorResponse(res, 'Table is already occupied. Use add-items endpoint instead.', 400);
        }

        // Calculate total amount from prices (should ideally verify from DB, simulating simple sum here for POC, but let's do it safely)
        let totalAmount = 0;
        const processedItems = await Promise.all(items.map(async (item) => {
            const food = await Food.findById(item.food_id);
            if (!food || food.restaurant_id !== restaurantId) {
                throw new Error(`Invalid food item: ${item.food_id}`);
            }
            const quantity = parseInt(item.quantity) || 1;
            const price = parseFloat(food.price);
            totalAmount += (price * quantity);

            // Handle addon calculation if needed, skipping complex addons for this straightforward API

            return {
                food_id: food.id,
                quantity,
                price,
                addons: item.addons || []
            };
        }));

        const newOrder = await Order.create({
            user_id: null, // Staff created order doesn't have an app user associated by default
            restaurant_id: restaurantId,
            total_amount: totalAmount,
            delivery_lat: 0.0, // Prevent NOT NULL constraint errors
            delivery_lng: 0.0,
            table_id,
            guest_count: guest_count || 1,
            order_type: 'dine_in',
            status: 'pending', // could be 'preparing' or 'pending'
            staff_id: req.user.id, // Record which staff member placed this order
            items: processedItems
        });

        // The Order.create method already updates table status to occupied.
        // Let's emit a socket event to update the admin dashboards
        const io = req.app.get('io');
        if (io) {
            io.to(`restaurant:${restaurantId}`).emit('newOrder', newOrder);
            io.to(`restaurant:${restaurantId}`).emit('tableStatusUpdate', {
                table_id,
                status: 'occupied'
            });
        }

        return successResponse(res, newOrder, 'Order created successfully', 201);
    } catch (error) {
        if (error.message.startsWith('Invalid food item')) {
            return errorResponse(res, error.message, 400);
        }
        next(error);
    }
};

// Add items to an existing active order for a table
exports.addItemsToOrder = async (req, res, next) => {
    try {
        const { id } = req.params; // Order ID
        const { items } = req.body;
        const restaurantId = req.user.restaurant_id;

        if (!items || !items.length) {
            return errorResponse(res, 'Items are required', 400);
        }

        const order = await Order.findById(id);
        if (!order || order.restaurant_id !== restaurantId || order.status === 'completed' || order.status === 'cancelled') {
            return errorResponse(res, 'Invalid or inactive order', 400);
        }

        let additionalAmount = 0;
        const processedItems = await Promise.all(items.map(async (item) => {
            const food = await Food.findById(item.food_id);
            if (!food || food.restaurant_id !== restaurantId) {
                throw new Error(`Invalid food item: ${item.food_id}`);
            }
            const quantity = parseInt(item.quantity) || 1;
            const price = parseFloat(food.price);
            additionalAmount += (price * quantity);

            return {
                food_id: food.id,
                quantity,
                price,
                addons: item.addons || []
            };
        }));

        const updatedOrder = await Order.addItems(id, processedItems);

        const io = req.app.get('io');
        if (io) {
            io.to(`restaurant:${restaurantId}`).emit('orderUpdated', updatedOrder);
        }

        return successResponse(res, updatedOrder, 'Items added to order successfully');
    } catch (error) {
        if (error.message.startsWith('Invalid food item')) {
            return errorResponse(res, error.message, 400);
        }
        next(error);
    }
};

// Cancel an order
exports.cancelOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const restaurantId = req.user.restaurant_id;

        const order = await Order.findById(id);
        if (!order || order.restaurant_id !== restaurantId) {
            return errorResponse(res, 'Order not found', 404);
        }

        const updatedOrder = await Order.updateStatus(id, 'cancelled');

        const io = req.app.get('io');
        if (io) {
            io.to(`restaurant:${restaurantId}`).emit('orderUpdated', updatedOrder);
            if (updatedOrder.table_id) {
                io.to(`restaurant:${restaurantId}`).emit('tableStatusUpdate', {
                    table_id: updatedOrder.table_id,
                    status: 'available'
                });
            }
        }

        return successResponse(res, updatedOrder, 'Order cancelled successfully');
    } catch (error) {
        next(error);
    }
};
