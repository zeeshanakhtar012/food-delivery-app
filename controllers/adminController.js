const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const AppUser = require('../models/AppUser');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const Advertisement = require('../models/Advertisement');
const AppConfig = require('../models/AppConfig');
const Discount = require('../models/Discount');
const AuditLog = require('../models/AuditLog');

const signupAdmin = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Basic input validation
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: 'Please provide name, email, password, and phone' });
    }

    // Check if admin already exists
    const existingAdmin = await AppUser.findOne({ email, role: 'super_admin' });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Super admin with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create super admin
    const superAdmin = new AppUser({
      name,
      email,
      password: hashedPassword,
      phone,
      role: 'super_admin',
      isAdmin: true,
      profileImage: 'https://example.com/default-profile.png',
      loyaltyPoints: 0,
      addresses: [],
      orders: [],
      cancelledOrders: [],
      favorites: [],
    });

    await superAdmin.save();

    // Log audit action
    await AuditLog.create({
      action: 'SIGNUP_SUPER_ADMIN',
      entity: 'User',
      entityId: superAdmin._id,
      details: `Super admin signed up with email: ${email}`,
      performedBy: superAdmin._id,
    });

    console.log(`Super admin signed up: ${email}`);
    res.status(201).json({ message: 'Super admin created successfully' });
  } catch (error) {
    console.error(`Signup error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Simplified Signin (Login Super Admin)
const signinAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic input validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find super admin
    const user = await AppUser.findOne({ email, role: 'super_admin' });
    if (!user || user.isDeleted) {
      return res.status(401).json({ message: 'Invalid email or account deactivated' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

// Generate JWT
const token = jwt.sign(
  {
    userId: user._id,
    role: 'super_admin',
    isAdmin: true
  },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

    // Log audit action
    await AuditLog.create({
      action: 'SIGNIN_SUPER_ADMIN',
      entity: 'User',
      entityId: user._id,
      details: `Super admin signed in with email: ${email}`,
      performedBy: user._id,
    });

    console.log(`Super admin signed in: ${email}`);
    res.json({ message: 'Signed in successfully', token });
  } catch (error) {
    console.error(`Signin error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create Restaurant
const createRestaurant = async (req, res) => {
  try {
    const { name, description, address, phone, email, logo } = req.body;

    if (!name || !description || !address || !phone || !email) {
      return res.status(400).json({ message: 'Name, description, address, phone, and email are required' });
    }

    if (!address.street || !address.city || !address.state || !address.postalCode || !address.country) {
      return res.status(400).json({ message: 'All address fields (street, city, state, postalCode, country) are required' });
    }

    const existingRestaurant = await Restaurant.findOne({ email });
    if (existingRestaurant) {
      return res.status(400).json({ message: 'Restaurant email already in use' });
    }

    const restaurant = new Restaurant({
      name,
      description,
      address,
      phone,
      email,
      logo: logo || 'https://example.com/default-logo.png',
      createdBy: req.user.userId,
      isActive: true,
    });

    await restaurant.save();

    await AuditLog.create({
      action: 'CREATE_RESTAURANT',
      entity: 'Restaurant',
      entityId: restaurant._id,
      details: `Restaurant created with name: ${name}`,
      performedBy: req.user.userId,
    });

    console.log(`Restaurant created: ${name}`);
    res.status(201).json({ message: 'Restaurant created successfully', restaurant });
  } catch (error) {
    console.error(`Error creating restaurant: ${error.message}`, error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create Restaurant Admin
const createRestaurantAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, restaurantId } = req.body;

    if (!name || !email || !password || !phone || !restaurantId) {
      return res.status(400).json({ message: 'Name, email, password, phone, and restaurantId are required' });
    }

    if (!mongoose.isValidObjectId(restaurantId)) {
      return res.status(400).json({ message: 'Invalid restaurantId format' });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ message: 'Restaurant not found or inactive' });
    }

    const existingUser = await AppUser.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Email or phone already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const restaurantAdmin = new AppUser({
      name,
      email,
      password: hashedPassword,
      phone,
      role: 'restaurant_admin',
      restaurantId,
      isAdmin: true,
      profileImage: 'https://example.com/default-profile.png',
      loyaltyPoints: 0,
      addresses: [],
      orders: [],
      cancelledOrders: [],
      favorites: [],
    });

    await restaurantAdmin.save();

    await AuditLog.create({
      action: 'CREATE_RESTAURANT_ADMIN',
      entity: 'User',
      entityId: restaurantAdmin._id,
      details: `Restaurant admin created with email: ${email} for restaurant: ${restaurant.name}`,
      performedBy: req.user.userId,
    });

    console.log(`Restaurant admin created: ${email}`);
    res.status(201).json({ message: 'Restaurant admin created successfully', restaurantAdmin });
  } catch (error) {
    console.error(`Error creating restaurant admin: ${error.message}`, error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create Restaurant and Restaurant Admin Together
const createRestaurantWithAdmin = async (req, res) => {
  try {
    const { restaurantData, adminData } = req.body;

    // Validate inputs
    if (!restaurantData || !adminData) {
      return res.status(400).json({ message: 'restaurantData and adminData are required' });
    }

    const { name, description, address, phone, email, logo } = restaurantData;
    const { adminName, adminEmail, adminPassword, adminPhone } = adminData;

    // Validate restaurant data
    if (!name || !description || !address || !phone || !email) {
      return res.status(400).json({ message: 'Restaurant name, description, address, phone, and email are required' });
    }
    if (!address.street || !address.city || !address.state || !address.postalCode || !address.country) {
      return res.status(400).json({ message: 'All restaurant address fields are required' });
    }
    const existingRestaurant = await Restaurant.findOne({ email });
    if (existingRestaurant) {
      return res.status(400).json({ message: 'Restaurant email already in use' });
    }

    // Validate admin data
    if (!adminName || !adminEmail || !adminPassword || !adminPhone) {
      return res.status(400).json({ message: 'Admin name, email, password, and phone are required' });
    }
    const existingUser = await AppUser.findOne({ $or: [{ email: adminEmail }, { phone: adminPhone }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Admin email or phone already in use' });
    }

    // Create restaurant
    const restaurant = new Restaurant({
      name,
      description,
      address,
      phone,
      email,
      logo: logo || 'https://example.com/default-logo.png',
      createdBy: req.user.userId,
      isActive: true,
    });
    await restaurant.save();

    // Create restaurant admin
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const restaurantAdmin = new AppUser({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      phone: adminPhone,
      role: 'restaurant_admin',
      restaurantId: restaurant._id,
      isAdmin: true,
      profileImage: 'https://example.com/default-profile.png',
      loyaltyPoints: 0,
      addresses: [],
      orders: [],
      cancelledOrders: [],
      favorites: [],
    });
    await restaurantAdmin.save();

    // Audit logs
    await AuditLog.create({
      action: 'CREATE_RESTAURANT',
      entity: 'Restaurant',
      entityId: restaurant._id,
      details: `Restaurant created with name: ${name}`,
      performedBy: req.user.userId,
    });
    await AuditLog.create({
      action: 'CREATE_RESTAURANT_ADMIN',
      entity: 'User',
      entityId: restaurantAdmin._id,
      details: `Restaurant admin created with email: ${adminEmail} for restaurant: ${restaurant.name}`,
      performedBy: req.user.userId,
    });

    console.log(`Restaurant and admin created: ${name}, ${adminEmail}`);
    res.status(201).json({
      message: 'Restaurant and admin created successfully',
      restaurant,
      restaurantAdmin,
    });
  } catch (error) {
    console.error(`Error creating restaurant with admin: ${error.message}`, error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Restaurants
const getAllRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ isActive: true })
      .select('name description address email phone logo createdBy')
      .populate('createdBy', 'name email');
    console.log('Restaurants retrieved');
    res.json(restaurants);
  } catch (error) {
    console.error(`Error retrieving restaurants: ${error.message}`, error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Admin Credentials
const updateAdminCredentials = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, phone } = req.body;

    // Find user
    const user = await AppUser.findById(id);
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate role
    if (user.role !== 'super_admin' && user.role !== 'restaurant_admin') {
      return res.status(403).json({ message: 'Can only update admin credentials' });
    }

    // Prepare updates
    const updates = {};
    if (email) {
      const existingEmail = await AppUser.findOne({ email, _id: { $ne: id } });
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      updates.email = email;
    }
    if (phone) {
      const existingPhone = await AppUser.findOne({ phone, _id: { $ne: id } });
      if (existingPhone) {
        return res.status(400).json({ message: 'Phone already in use' });
      }
      updates.phone = phone;
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(password, salt);
    }

    // Update user
    await AppUser.updateOne({ _id: id }, { $set: updates });

    // Log audit action
    const auditLog = new AuditLog({
      action: 'UPDATE_ADMIN_CREDENTIALS',
      entity: 'User',
      entityId: id,
      details: `Updated credentials for admin with email: ${user.email}`,
      performedBy: req.user.userId,
    });
    await auditLog.save();

    console.log(`Admin credentials updated for user: ${user.email}`);
    res.json({ message: 'Admin credentials updated successfully' });
  } catch (error) {
    console.error(`Error updating admin credentials: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Toggle Restaurant Admin Status
const toggleRestaurantAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Find user
    const user = await AppUser.findById(id);
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate role
    if (user.role !== 'restaurant_admin') {
      return res.status(403).json({ message: 'User is not a restaurant admin' });
    }

    // Toggle isDeleted status
    user.isDeleted = !user.isDeleted;
    user.deletedAt = user.isDeleted ? new Date() : null;
    await user.save();

    // Log audit action
    const auditLog = new AuditLog({
      action: user.isDeleted ? 'DEACTIVATE_RESTAURANT_ADMIN' : 'ACTIVATE_RESTAURANT_ADMIN',
      entity: 'User',
      entityId: id,
      details: `Restaurant admin ${user.isDeleted ? 'deactivated' : 'activated'} with email: ${user.email}`,
      performedBy: req.user.userId,
    });
    await auditLog.save();

    console.log(`Restaurant admin ${user.isDeleted ? 'deactivated' : 'activated'}: ${user.email}`);
    res.json({ message: `Restaurant admin ${user.isDeleted ? 'deactivated' : 'activated'} successfully` });
  } catch (error) {
    console.error(`Error toggling restaurant admin status: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update App Configuration
const updateAppConfig = async (req, res) => {
  try {
    const { primaryColor, secondaryColor, logoUrl, splashScreenUrl, enableAds, enableNotifications } = req.body;

    // Validate input
    if (!primaryColor && !secondaryColor && !logoUrl && !splashScreenUrl && enableAds === undefined && enableNotifications === undefined) {
      return res.status(400).json({ message: 'At least one configuration field is required' });
    }

    // Prepare updates
    const updates = {};
    if (primaryColor) updates.primaryColor = primaryColor;
    if (secondaryColor) updates.secondaryColor = secondaryColor;
    if (logoUrl) updates.logoUrl = logoUrl;
    if (splashScreenUrl) updates.splashScreenUrl = splashScreenUrl;
    if (enableAds !== undefined) updates.enableAds = enableAds;
    if (enableNotifications !== undefined) updates.enableNotifications = enableNotifications;
    updates.lastUpdatedBy = req.user.userId;

    // Update or create config
    const config = await AppConfig.findOneAndUpdate(
      {},
      { $set: updates },
      { new: true, upsert: true }
    );

    // Log audit action
    const auditLog = new AuditLog({
      action: 'UPDATE_APP_CONFIG',
      entity: 'AppConfig',
      entityId: config._id,
      details: 'App configuration updated',
      performedBy: req.user.userId,
    });
    await auditLog.save();

    console.log('App configuration updated');
    res.json({ message: 'App configuration updated successfully', config });
  } catch (error) {
    console.error(`Error updating app config: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get App Configuration
const getAppConfig = async (req, res) => {
  try {
    const config = await AppConfig.findOne();
    if (!config) {
      return res.status(404).json({ message: 'App configuration not found' });
    }

    console.log('App configuration retrieved');
    res.json(config);
  } catch (error) {
    console.error(`Error retrieving app config: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create Advertisement
const createAdvertisement = async (req, res) => {
  try {
    const { title, description, imageUrl, foodId, targetUrl, startDate, endDate } = req.body;

    // Validate input
    if (!title || !description || !imageUrl || !startDate || !endDate) {
      return res.status(400).json({ message: 'Title, description, imageUrl, startDate, and endDate are required' });
    }

    // Create advertisement
    const advertisement = new Advertisement({
      title,
      description,
      imageUrl,
      foodId: foodId || null,
      targetUrl: targetUrl || null,
      startDate,
      endDate,
      isActive: true,
      createdBy: req.user.userId,
    });

    await advertisement.save();

    // Log audit action
    const auditLog = new AuditLog({
      action: 'CREATE_ADVERTISEMENT',
      entity: 'Advertisement',
      entityId: advertisement._id,
      details: `Advertisement created with title: ${title}`,
      performedBy: req.user.userId,
    });
    await auditLog.save();

    console.log(`Advertisement created: ${title}`);
    res.status(201).json({ message: 'Advertisement created successfully', advertisement });
  } catch (error) {
    console.error(`Error creating advertisement: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get All Advertisements
const getAllAdvertisements = async (req, res) => {
  try {
    const advertisements = await Advertisement.find().populate('foodId createdBy');
    console.log('Advertisements retrieved');
    res.json(advertisements);
  } catch (error) {
    console.error(`Error retrieving advertisements: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update Advertisement
const updateAdvertisement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, imageUrl, foodId, targetUrl, startDate, endDate, isActive } = req.body;

    // Find advertisement
    const advertisement = await Advertisement.findById(id);
    if (!advertisement) {
      return res.status(404).json({ message: 'Advertisement not found' });
    }

    // Prepare updates
    const updates = {};
    if (title) updates.title = title;
    if (description) updates.description = description;
    if (imageUrl) updates.imageUrl = imageUrl;
    if (foodId !== undefined) updates.foodId = foodId || null;
    if (targetUrl !== undefined) updates.targetUrl = targetUrl || null;
    if (startDate) updates.startDate = startDate;
    if (endDate) updates.endDate = endDate;
    if (isActive !== undefined) updates.isActive = isActive;

    // Update advertisement
    await Advertisement.updateOne({ _id: id }, { $set: updates });

    // Log audit action
    const auditLog = new AuditLog({
      action: 'UPDATE_ADVERTISEMENT',
      entity: 'Advertisement',
      entityId: id,
      details: `Advertisement updated with title: ${title || advertisement.title}`,
      performedBy: req.user.userId,
    });
    await auditLog.save();

    console.log(`Advertisement updated: ${title || advertisement.title}`);
    res.json({ message: 'Advertisement updated successfully' });
  } catch (error) {
    console.error(`Error updating advertisement: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete Advertisement
const deleteAdvertisement = async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete advertisement
    const advertisement = await Advertisement.findById(id);
    if (!advertisement) {
      return res.status(404).json({ message: 'Advertisement not found' });
    }

    await Advertisement.deleteOne({ _id: id });

    // Log audit action
    const auditLog = new AuditLog({
      action: 'DELETE_ADVERTISEMENT',
      entity: 'Advertisement',
      entityId: id,
      details: `Advertisement deleted with title: ${advertisement.title}`,
      performedBy: req.user.userId,
    });
    await auditLog.save();

    console.log(`Advertisement deleted: ${advertisement.title}`);
    res.json({ message: 'Advertisement deleted successfully' });
  } catch (error) {
    console.error(`Error deleting advertisement: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send Push Notification (Placeholder - requires actual implementation)
const sendPushNotification = async (req, res) => {
  try {
    const { title, message, userIds } = req.body;

    // Validate input
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    // Placeholder: Implement actual push notification logic (e.g., using Firebase, OneSignal)
    console.log(`Sending push notification: ${title} - ${message} to users: ${userIds || 'all'}`);

    // Log audit action
    const auditLog = new AuditLog({
      action: 'SEND_NOTIFICATION',
      entity: 'Notification',
      details: `Push notification sent: ${title}`,
      performedBy: req.user.userId,
    });
    await auditLog.save();

    res.json({ message: 'Push notification sent successfully' });
  } catch (error) {
    console.error(`Error sending push notification: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get All Users
const getAllUsers = async (req, res) => {
  try {
    const users = await AppUser.find({ isDeleted: false }).select('-password');
    console.log('Users retrieved');
    res.json(users);
  } catch (error) {
    console.error(`Error retrieving users: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Toggle User Block
const toggleUserBlock = async (req, res) => {
  try {
    const { id } = req.params;

    // Find user
    const user = await AppUser.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent blocking super admins
    if (user.role === 'super_admin') {
      return res.status(403).json({ message: 'Cannot block super admin' });
    }

    // Toggle isDeleted status
    user.isDeleted = !user.isDeleted;
    user.deletedAt = user.isDeleted ? new Date() : null;
    await user.save();

    // Log audit action
    const auditLog = new AuditLog({
      action: user.isDeleted ? 'BLOCK_USER' : 'UNBLOCK_USER',
      entity: 'User',
      entityId: id,
      details: `User ${user.isDeleted ? 'blocked' : 'unblocked'} with email: ${user.email}`,
      performedBy: req.user.userId,
    });
    await auditLog.save();

    console.log(`User ${user.isDeleted ? 'blocked' : 'unblocked'}: ${user.email}`);
    res.json({ message: `User ${user.isDeleted ? 'blocked' : 'unblocked'} successfully` });
  } catch (error) {
    console.error(`Error toggling user block: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Toggle Admin Status
const toggleAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Find user
    const user = await AppUser.findById(id);
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent modifying super admin
    if (user.role === 'super_admin') {
      return res.status(403).json({ message: 'Cannot modify super admin status' });
    }

    // Toggle isAdmin status
    user.isAdmin = !user.isAdmin;
    user.role = user.isAdmin ? 'restaurant_admin' : 'user';
    if (user.role === 'user') {
      user.restaurantId = null; // Clear restaurantId if demoted to user
    }
    await user.save();

    // Log audit action
    const auditLog = new AuditLog({
      action: user.isAdmin ? 'PROMOTE_TO_ADMIN' : 'DEMOTE_FROM_ADMIN',
      entity: 'User',
      entityId: id,
      details: `User ${user.isAdmin ? 'promoted to admin' : 'demoted from admin'} with email: ${user.email}`,
      performedBy: req.user.userId,
    });
    await auditLog.save();

    console.log(`User ${user.isAdmin ? 'promoted to admin' : 'demoted from admin'}: ${user.email}`);
    res.json({ message: `User ${user.isAdmin ? 'promoted to admin' : 'demoted from admin'} successfully` });
  } catch (error) {
    console.error(`Error toggling admin status: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get All Orders
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('userId restaurantId items.productId');
    console.log('Orders retrieved');
    res.json(orders);
  } catch (error) {
    console.error(`Error retrieving orders: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update Order Status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    // Validate input
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    // Find order
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Validate status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Update order
    order.status = status;
    if (reason && status === 'cancelled') {
      order.reason = reason;
    }
    await order.save();

    // Log audit action
    const auditLog = new AuditLog({
      action: 'UPDATE_ORDER_STATUS',
      entity: 'Order',
      entityId: id,
      details: `Order status updated to ${status} for order: ${order.orderId}`,
      performedBy: req.user.userId,
    });
    await auditLog.save();

    console.log(`Order status updated to ${status} for order: ${order.orderId}`);
    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    console.error(`Error updating order status: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get Dashboard Analytics
const getDashboardAnalytics = async (req, res) => {
  try {
    const totalUsers = await AppUser.countDocuments({ isDeleted: false });
    const totalOrders = await Order.countDocuments();
    const totalRestaurants = await Restaurant.countDocuments({ isActive: true });
    const totalRevenue = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    const analytics = {
      totalUsers,
      totalOrders,
      totalRestaurants,
      totalRevenue: totalRevenue[0]?.total || 0,
    };

    console.log('Dashboard analytics retrieved');
    res.json(analytics);
  } catch (error) {
    console.error(`Error retrieving analytics: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create Discount
const createDiscount = async (req, res) => {
  try {
    const { code, description, discountType, value, minOrderAmount, maxDiscountAmount, startDate, endDate } = req.body;

    // Validate input
    if (!code || !discountType || !value || !startDate || !endDate) {
      return res.status(400).json({ message: 'Code, discountType, value, startDate, and endDate are required' });
    }

    // Validate discountType
    if (!['percentage', 'fixed'].includes(discountType)) {
      return res.status(400).json({ message: 'Invalid discount type' });
    }

    // Check if code exists
    const existingDiscount = await Discount.findOne({ code });
    if (existingDiscount) {
      return res.status(400).json({ message: 'Discount code already exists' });
    }

    // Create discount
    const discount = new Discount({
      code,
      description: description || '',
      discountType,
      value,
      minOrderAmount: minOrderAmount || 0,
      maxDiscountAmount: maxDiscountAmount || null,
      startDate,
      endDate,
      isActive: true,
      createdBy: req.user.userId,
    });

    await discount.save();

    // Log audit action
    const auditLog = new AuditLog({
      action: 'CREATE_DISCOUNT',
      entity: 'Discount',
      entityId: discount._id,
      details: `Discount created with code: ${code}`,
      performedBy: req.user.userId,
    });
    await auditLog.save();

    console.log(`Discount created: ${code}`);
    res.status(201).json({ message: 'Discount created successfully', discount });
  } catch (error) {
    console.error(`Error creating discount: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get All Discounts
const getAllDiscounts = async (req, res) => {
  try {
    const discounts = await Discount.find().populate('createdBy');
    console.log('Discounts retrieved');
    res.json(discounts);
  } catch (error) {
    console.error(`Error retrieving discounts: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update Discount
const updateDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, description, discountType, value, minOrderAmount, maxDiscountAmount, startDate, endDate, isActive } = req.body;

    // Find discount
    const discount = await Discount.findById(id);
    if (!discount) {
      return res.status(404).json({ message: 'Discount not found' });
    }

    // Prepare updates
    const updates = {};
    if (code) {
      const existingCode = await Discount.findOne({ code, _id: { $ne: id } });
      if (existingCode) {
        return res.status(400).json({ message: 'Discount code already in use' });
      }
      updates.code = code;
    }
    if (description) updates.description = description;
    if (discountType) {
      if (!['percentage', 'fixed'].includes(discountType)) {
        return res.status(400).json({ message: 'Invalid discount type' });
      }
      updates.discountType = discountType;
    }
    if (value !== undefined) updates.value = value;
    if (minOrderAmount !== undefined) updates.minOrderAmount = minOrderAmount;
    if (maxDiscountAmount !== undefined) updates.maxDiscountAmount = maxDiscountAmount;
    if (startDate) updates.startDate = startDate;
    if (endDate) updates.endDate = endDate;
    if (isActive !== undefined) updates.isActive = isActive;

    // Update discount
    await Discount.updateOne({ _id: id }, { $set: updates });

    // Log audit action
    const auditLog = new AuditLog({
      action: 'UPDATE_DISCOUNT',
      entity: 'Discount',
      entityId: id,
      details: `Discount updated with code: ${code || discount.code}`,
      performedBy: req.user.userId,
    });
    await auditLog.save();

    console.log(`Discount updated: ${code || discount.code}`);
    res.json({ message: 'Discount updated successfully' });
  } catch (error) {
    console.error(`Error updating discount: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete Discount
const deleteDiscount = async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete discount
    const discount = await Discount.findById(id);
    if (!discount) {
      return res.status(404).json({ message: 'Discount not found' });
    }

    await Discount.deleteOne({ _id: id });

    // Log audit action
    const auditLog = new AuditLog({
      action: 'DELETE_DISCOUNT',
      entity: 'Discount',
      entityId: id,
      details: `Discount deleted with code: ${discount.code}`,
      performedBy: req.user.userId,
    });
    await auditLog.save();

    console.log(`Discount deleted: ${discount.code}`);
    res.json({ message: 'Discount deleted successfully' });
  } catch (error) {
    console.error(`Error deleting discount: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get Audit Logs
const getAuditLogs = async (req, res) => {
  try {
    const auditLogs = await AuditLog.find().populate('performedBy').sort({ createdAt: -1 });
    console.log('Audit logs retrieved');
    res.json(auditLogs);
  } catch (error) {
    console.error(`Error retrieving audit logs: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Export all controller functions
module.exports = {
  signupAdmin,
  signinAdmin,
  createRestaurant,
  getAllRestaurants,
  createRestaurantAdmin,
  createRestaurantWithAdmin,
  updateAdminCredentials,
  toggleRestaurantAdminStatus,
  updateAppConfig,
  getAppConfig,
  createAdvertisement,
  getAllAdvertisements,
  updateAdvertisement,
  deleteAdvertisement,
  sendPushNotification,
  getAllUsers,
  toggleUserBlock,
  toggleAdminStatus,
  getAllOrders,
  updateOrderStatus,
  getDashboardAnalytics,
  createDiscount,
  getAllDiscounts,
  updateDiscount,
  deleteDiscount,
  getAuditLogs,
};