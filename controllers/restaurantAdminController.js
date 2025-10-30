
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AppUser = require('../models/AppUser');
const Restaurant = require('../models/Restaurant');
const Category = require('../models/Category');
const Food = require('../models/Food');
const Order = require('../models/Order');
const AuditLog = require('../models/AuditLog');
const Expense = require('../models/Expense');
const { parse } = require('json2csv');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Log admin action
const logAdminAction = async (action, entity, entityId, details, performedBy) => {
  try {
    await AuditLog.create({ action, entity, entityId, details, performedBy });
  } catch (error) {
    logger.error('Audit log error', { error: error.message, stack: error.stack });
  }
};

// Restaurant Admin Login - Single query approach (Alternative)
const signinRestaurantAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find user with password for verification AND populate restaurant
    const user = await AppUser.findOne({ 
      email, 
      role: 'restaurant_admin' 
    })
    .select('name email phone role isAdmin profileImage lastLogin addresses loyaltyPoints isVerified createdAt updatedAt restaurantId')
    .populate({
      path: 'restaurantId',
      select: 'name description address phone email logo images isActive',
      match: { isActive: true }
    });

    // Check if user exists and is not deleted
    if (!user || user.isDeleted) {
      return res.status(401).json({ message: 'Invalid email or account deactivated' });
    }

    // Check if restaurant is active
    if (!user.restaurantId || !user.restaurantId.isActive) {
      return res.status(403).json({ message: 'Restaurant account is inactive' });
    }

    // Verify password (fetch password separately since it wasn't selected)
    const userWithPassword = await AppUser.findById(user._id).select('+password');
    const isMatch = await bcrypt.compare(password, userWithPassword.password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Update last login
    userWithPassword.lastLogin = new Date();
    await userWithPassword.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        role: 'restaurant_admin', 
        isAdmin: true, 
        restaurantId: user.restaurantId._id 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Log admin action
    await logAdminAction(
      'SIGNIN_RESTAURANT_ADMIN',
      'User',
      user._id,
      `Restaurant admin signed in with email: ${email} for restaurant: ${user.restaurantId.name}`,
      user._id
    );

    console.log(`Restaurant admin signed in: ${user.name} (${email}) - Restaurant: ${user.restaurantId.name}`);

    // Prepare response with sanitized data
    const restaurantAdminData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isAdmin: user.isAdmin,
      profileImage: user.profileImage,
      lastLogin: userWithPassword.lastLogin, // Use updated lastLogin
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      restaurant: {
        _id: user.restaurantId._id,
        name: user.restaurantId.name,
        description: user.restaurantId.description,
        address: {
          street: user.restaurantId.address.street,
          city: user.restaurantId.address.city,
          state: user.restaurantId.address.state,
          postalCode: user.restaurantId.address.postalCode,
          country: user.restaurantId.address.country
        },
        phone: user.restaurantId.phone,
        email: user.restaurantId.email,
        logo: user.restaurantId.logo,
        images: user.restaurantId.images || [],
        isActive: user.restaurantId.isActive
      },
      addresses: user.addresses || [],
      loyaltyPoints: user.loyaltyPoints || 0,
      isVerified: user.isVerified || false
    };

    res.status(200).json({
      message: 'Signed in successfully',
      token,
      restaurantAdmin: restaurantAdminData,
      expiresIn: 3600
    });

  } catch (error) {
    logger.error('Restaurant admin signin error', { 
      error: error.message, 
      stack: error.stack,
      email: req.body.email 
    });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Restaurant Details
const getRestaurantDetails = async (req, res) => {
  try {
    let restaurantId = req.user.restaurantId;

    if (req.user.role === 'super_admin' && req.query.restaurantId) {
      if (!mongoose.isValidObjectId(req.query.restaurantId)) {
        return res.status(400).json({ message: 'Invalid restaurantId' });
      }
      restaurantId = req.query.restaurantId;
    }

    if (!restaurantId) {
      return res.status(400).json({ message: 'Restaurant ID not provided' });
    }

    const restaurant = await Restaurant.findById(restaurantId)
      .select('name description address email phone logo images isActive')
      .populate('createdBy', 'name email');
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ message: 'Restaurant not found or inactive' });
    }

    console.log(`Restaurant details retrieved for ID: ${restaurantId}`);
    res.json({ message: 'Restaurant details retrieved successfully', restaurant });
  } catch (error) {
    logger.error('Get restaurant details error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Restaurant
const updateRestaurant = async (req, res) => {
  try {
    const { name, description, address, phone, email } = req.body;
    const restaurantImages = req.files?.restaurantImages;

    const restaurant = await Restaurant.findById(req.user.restaurantId);
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ message: 'Restaurant not found or inactive' });
    }

    const updates = {};
    if (name) updates.name = name;
    if (description) updates.description = description;
    if (address) {
      // Parse address if it's a stringified JSON
      let parsedAddress = address;
      if (typeof address === 'string') {
        try {
          parsedAddress = JSON.parse(address);
        } catch (error) {
          return res.status(400).json({ message: 'Invalid address format: must be a valid JSON object' });
        }
      }

      // Validate address fields
      if (
        !parsedAddress.street ||
        !parsedAddress.city ||
        !parsedAddress.state ||
        !parsedAddress.postalCode ||
        !parsedAddress.country
      ) {
        return res.status(400).json({
          message: 'All address fields (street, city, state, postalCode, country) are required',
        });
      }

      updates.address = parsedAddress;
    }
    if (phone) {
      if (!/^\+?[1-9]\d{1,14}$/.test(phone)) {
        return res.status(400).json({ message: 'Invalid phone number format' });
      }
      updates.phone = phone;
    }
    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      const existingRestaurant = await Restaurant.findOne({
        email,
        _id: { $ne: req.user.restaurantId },
      });
      if (existingRestaurant) {
        return res.status(400).json({ message: 'Email already in use by another restaurant' });
      }
      updates.email = email;
    }
    if (restaurantImages) {
      const imageUrls = restaurantImages.map(file => `/uploads/restaurants/${file.filename}`);
      updates.images = [...(restaurant.images || []), ...imageUrls];
      updates.logo = imageUrls[0] || restaurant.logo;
    }

    await Restaurant.updateOne({ _id: req.user.restaurantId }, { $set: updates });
    await logAdminAction(
      'UPDATE_RESTAURANT',
      'Restaurant',
      restaurant._id,
      `Restaurant updated by admin ${req.user.userId}`,
      req.user.userId
    );

    console.log(`Restaurant updated: ${req.user.restaurantId}`);
    res.json({ message: 'Restaurant updated successfully' });
  } catch (error) {
    logger.error('Update restaurant error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add Food Category
const addCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const categoryImages = req.files?.categoryImages;

    if (!name || name.trim().length < 3) {
      return res.status(400).json({ message: 'Category name must be at least 3 characters' });
    }

    const existingCategory = await Category.findOne({ name, restaurantId: req.user.restaurantId });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists for this restaurant' });
    }

    // Handle image upload
    let imageUrl = 'https://images.unsplash.com/photo-1504674900247-0877df9cc926?q=80&w=2070&auto=format&fit=crop'; // Default
    let imagesArray = [];
    if (categoryImages && categoryImages.length > 0) {
      imageUrl = `/uploads/categories/${categoryImages[0].filename}`; // Primary image
      imagesArray = categoryImages.map(file => `/uploads/categories/${file.filename}`);
    }

    const category = new Category({
      name,
      image: imageUrl,
      images: imagesArray,
      restaurantId: req.user.restaurantId,
      createdBy: req.user.userId,
      isActive: true,
    });

    await category.save();

    await logAdminAction(
      'CREATE_CATEGORY',
      'Category',
      category._id,
      `Category ${name} created for restaurant ${req.user.restaurantId} with ${imagesArray.length} images`,
      req.user.userId
    );

    console.log(`Category created: ${name} with image: ${imageUrl}`);
    res.status(201).json({ message: 'Category created successfully', category });
  } catch (error) {
    logger.error('Add category error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Food Category (UPDATED: Now supports image update)
const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const categoryImages = req.files?.categoryImages;

  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }
    if (!name || name.trim().length < 3) {
      return res.status(400).json({ message: 'Category name must be at least 3 characters' });
    }

    const category = await Category.findById(id);
    if (!category || category.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to update this category' });
    }

    const existingCategory = await Category.findOne({
      name,
      restaurantId: req.user.restaurantId,
      _id: { $ne: id },
    });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category name already exists for this restaurant' });
    }

    const updates = { name };
    // Handle image update
    if (categoryImages && categoryImages.length > 0) {
      updates.image = `/uploads/categories/${categoryImages[0].filename}`;
      updates.images = [...(category.images || []), ...categoryImages.map(file => `/uploads/categories/${file.filename}`)];
    }

    await Category.findByIdAndUpdate(id, { $set: updates });

    const updatedCategory = await Category.findById(id); // Fetch updated for response

    await logAdminAction(
      'UPDATE_CATEGORY',
      'Category',
      updatedCategory._id,
      `Category ${name} updated for restaurant ${req.user.restaurantId} with ${categoryImages?.length || 0} new images`,
      req.user.userId
    );

    console.log(`Category updated: ${name}`);
    res.status(200).json({ message: 'Category updated successfully', category: updatedCategory });
  } catch (error) {
    logger.error('Update category error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// NEW: Upload Category Images (dedicated endpoint for adding images to existing category)
const uploadCategoryImages = async (req, res) => {
  const { categoryId } = req.params;
  try {
    if (!mongoose.isValidObjectId(categoryId)) return res.status(400).json({ message: 'Invalid category ID' });

    const categoryImages = req.files?.categoryImages;
    if (!categoryImages || categoryImages.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    const category = await Category.findById(categoryId);
    if (!category || category.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to upload images for this category' });
    }

    const newImageUrls = categoryImages.map(file => `/uploads/categories/${file.filename}`);
    category.images = [...(category.images || []), ...newImageUrls];
    if (!category.image) {
      category.image = newImageUrls[0]; // Set primary if none exists
    }
    await category.save();

    await logAdminAction(
      'UPLOAD_CATEGORY_IMAGES',
      'Category',
      category._id,
      `Uploaded ${categoryImages.length} images for category ${category.name}`,
      req.user.userId
    );

    console.log(`Uploaded ${categoryImages.length} images for category: ${category.name}`);
    res.status(200).json({ message: 'Images uploaded successfully', images: category.images });
  } catch (error) {
    logger.error('Upload category images error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const validateAddFoodInput = (data) => {
  const errors = [];
  if (!data.name || data.name.trim().length < 3) errors.push('Food name must be at least 3 characters');
  if (!data.description || data.description.trim().length < 10) errors.push('Description must be at least 10 characters');
  if (!data.category || !mongoose.isValidObjectId(data.category)) errors.push('Valid category ID is required');
  if (!data.price || data.price < 0) errors.push('Price must be a non-negative number');
  if (data.costPrice && data.costPrice < 0) errors.push('Cost price cannot be negative'); // NEW
  if (data.preparationTime && data.preparationTime < 0) errors.push('Preparation time cannot be negative');
  if (data.nutritionalInfo) {
    if (data.nutritionalInfo.calories < 0) errors.push('Calories cannot be negative');
    if (data.nutritionalInfo.protein < 0) errors.push('Protein cannot be negative');
    if (data.nutritionalInfo.fat < 0) errors.push('Fat cannot be negative');
    if (data.nutritionalInfo.carbohydrates < 0) errors.push('Carbohydrates cannot be negative');
  }
  // NEW: Validate discount
  if (data.discountType && !['percentage', 'fixed'].includes(data.discountType)) errors.push('Invalid discount type');
  if (data.discountValue < 0) errors.push('Discount value cannot be negative');
  if (data.discountType === 'percentage' && data.discountValue > 100) errors.push('Percentage discount cannot exceed 100');
  return errors;
};

// Add Food (UPDATED with discount and auto-expense for costPrice)
const addFood = async (req, res) => {
  const { name, description, category, price, costPrice = 0, ingredients, nutritionalInfo, preparationTime, isAvailable, discountType, discountValue } = req.body;
  const foodImages = req.files?.foodImages;

  try {
    const errors = validateAddFoodInput(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });

    const categoryDoc = await Category.findById(category);
    if (!categoryDoc || categoryDoc.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to add food to this category' });
    }

    const restaurant = await Restaurant.findById(req.user.restaurantId);
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ message: 'Restaurant not found or inactive' });
    }

    if (!restaurant.address || !restaurant.address.city) {
      logger.error('Restaurant address or city missing', {
        restaurantId: req.user.restaurantId,
        address: restaurant.address
      });
      return res.status(400).json({ message: 'Restaurant address or city is not defined' });
    }

    const imageUrls = foodImages ? foodImages.map(file => `/uploads/foods/${file.filename}`) : [];

    // Calculate discounted price if discount provided
    let discountedPrice = price;
    if (discountType && discountValue > 0) {
      if (discountType === 'percentage') {
        discountedPrice = price * (1 - discountValue / 100);
      } else if (discountType === 'fixed') {
        discountedPrice = price - discountValue;
      }
      if (discountedPrice < 0) discountedPrice = 0;
    }

    const food = await Food.create({
      name,
      description,
      category,
      price,
      costPrice, // NEW: Actual cost
      image: imageUrls[0] || 'https://images.unsplash.com/photo-1504674900247-0877df9cc926?q=80&w=2070&auto=format&fit=crop',
      images: imageUrls,
      ingredients: ingredients || [],
      nutritionalInfo: nutritionalInfo || { calories: 0, protein: 0, fat: 0, carbohydrates: 0 },
      preparationTime: preparationTime || 15,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      restaurantId: req.user.restaurantId,
      city: restaurant.address.city,
      discountType: discountType || null,
      discountValue: discountValue || 0,
      discountedPrice,
    });

    // AUTOMATION: Add expense if costPrice > 0
    if (costPrice > 0) {
      const expense = new Expense({
        restaurantId: req.user.restaurantId,
        type: 'inventory',
        description: `Procurement cost for food: ${name}`,
        amount: costPrice,
        category: categoryDoc.name,
        createdBy: req.user.userId
      });
      await expense.save();
      console.log(`Auto-added expense for food ${name}: $${costPrice}`);
    }

    await logAdminAction(
      'CREATE_FOOD',
      'Food',
      food._id,
      `Food ${name} added for restaurant ${req.user.restaurantId}`,
      req.user.userId
    );

    console.log(`Food added: ${name}`);
    res.status(201).json({ message: 'Food added successfully', food });
  } catch (error) {
    logger.error('Add food error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Food (UPDATED with discount, costPrice, and auto-expense adjustment)
const updateFood = async (req, res) => {
  const { id } = req.params;
  const { name, description, category, price, costPrice = 0, ingredients, nutritionalInfo, preparationTime, isAvailable, discountType, discountValue } = req.body;
  const foodImages = req.files?.foodImages;

  try {
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid food ID' });

    const errors = validateAddFoodInput(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });

    const food = await Food.findById(id);
    if (!food || food.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to update this food' });
    }

    const categoryDoc = await Category.findById(category || food.category);
    if (!categoryDoc || categoryDoc.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to use this category' });
    }

    const imageUrls = foodImages ? foodImages.map(file => `/uploads/foods/${file.filename}`) : food.images;

    // Calculate discounted price
    const newPrice = price !== undefined ? price : food.price;
    let newDiscountType = discountType !== undefined ? discountType : food.discountType;
    let newDiscountValue = discountValue !== undefined ? discountValue : food.discountValue;
    let discountedPrice = newPrice;
    if (newDiscountType && newDiscountValue > 0) {
      if (newDiscountType === 'percentage') {
        discountedPrice = newPrice * (1 - newDiscountValue / 100);
      } else if (newDiscountType === 'fixed') {
        discountedPrice = newPrice - newDiscountValue;
      }
      if (discountedPrice < 0) discountedPrice = 0;
    } else {
      newDiscountType = null;
      newDiscountValue = 0;
    }

    const updatedFood = await Food.findByIdAndUpdate(
      id,
      {
        $set: {
          name: name || food.name,
          description: description || food.description,
          category: category || food.category,
          price: newPrice,
          costPrice, // NEW
          image: imageUrls[0] || food.image,
          images: imageUrls,
          ingredients: ingredients || food.ingredients,
          nutritionalInfo: nutritionalInfo || food.nutritionalInfo,
          preparationTime: preparationTime !== undefined ? preparationTime : food.preparationTime,
          isAvailable: isAvailable !== undefined ? isAvailable : food.isAvailable,
          discountType: newDiscountType,
          discountValue: newDiscountValue,
          discountedPrice
        }
      },
      { new: true, runValidators: true }
    );

    // AUTOMATION: Update or add expense if costPrice changed
    const oldCost = food.costPrice || 0;
    if (costPrice > 0 && costPrice !== oldCost) {
      const delta = costPrice - oldCost;
      let expense = await Expense.findOne({ 
        description: { $regex: new RegExp(`^Procurement cost for food: ${updatedFood.name}$`, 'i') },
        restaurantId: req.user.restaurantId 
      });
      if (expense) {
        expense.amount += delta;
        await expense.save();
      } else {
        expense = new Expense({
          restaurantId: req.user.restaurantId,
          type: 'inventory',
          description: `Procurement cost for food: ${updatedFood.name}`,
          amount: costPrice,
          category: categoryDoc.name,
          createdBy: req.user.userId
        });
        await expense.save();
      }
      console.log(`Auto-updated expense for food ${updatedFood.name}: +$${delta}`);
    }

    await logAdminAction(
      'UPDATE_FOOD',
      'Food',
      updatedFood._id,
      `Food ${name || updatedFood.name} updated for restaurant ${req.user.restaurantId}`,
      req.user.userId
    );

    console.log(`Food updated: ${updatedFood.name}`);
    res.status(200).json({ message: 'Food updated successfully', food: updatedFood });
  } catch (error) {
    logger.error('Update food error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// NEW: Add Discount to Food (convenience endpoint, uses updateFood logic)
const addDiscountToFood = async (req, res) => {
  const { id } = req.params;
  const { discountType, discountValue } = req.body;

  try {
    req.body = { ...req.body, discountType, discountValue }; // Pass to updateFood
    await updateFood(req, res);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// NEW: Remove Discount from Food
const removeDiscountFromFood = async (req, res) => {
  const { id } = req.params;

  try {
    req.body = { discountType: null, discountValue: 0 };
    await updateFood(req, res);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Upload Restaurant Images
const uploadRestaurantImages = async (req, res) => {
  try {
    const restaurantImages = req.files?.restaurantImages;
    if (!restaurantImages || restaurantImages.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    const restaurant = await Restaurant.findById(req.user.restaurantId);
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ message: 'Restaurant not found or inactive' });
    }

    const imageUrls = restaurantImages.map(file => `/uploads/restaurants/${file.filename}`);
    restaurant.images = [...(restaurant.images || []), ...imageUrls];
    restaurant.logo = imageUrls[0] || restaurant.logo; // Update logo if new images are uploaded
    await restaurant.save();

    await logAdminAction(
      'UPLOAD_RESTAURANT_IMAGES',
      'Restaurant',
      restaurant._id,
      `Uploaded ${restaurantImages.length} images for restaurant ${req.user.restaurantId}`,
      req.user.userId
    );

    console.log(`Uploaded ${restaurantImages.length} images for restaurant: ${req.user.restaurantId}`);
    res.status(200).json({ message: 'Images uploaded successfully', images: restaurant.images });
  } catch (error) {
    logger.error('Upload restaurant images error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Upload Food Images
const uploadFoodImages = async (req, res) => {
  const { foodId } = req.params;
  try {
    if (!mongoose.isValidObjectId(foodId)) return res.status(400).json({ message: 'Invalid food ID' });

    const foodImages = req.files?.foodImages;
    if (!foodImages || foodImages.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    const food = await Food.findById(foodId);
    if (!food || food.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to upload images for this food' });
    }

    const imageUrls = foodImages.map(file => `/uploads/foods/${file.filename}`);
    food.images = [...(food.images || []), ...imageUrls];
    food.image = imageUrls[0] || food.image; // Update primary image if necessary
    await food.save();

    await logAdminAction(
      'UPLOAD_FOOD_IMAGES',
      'Food',
      food._id,
      `Uploaded ${foodImages.length} images for food ${food.name}`,
      req.user.userId
    );

    console.log(`Uploaded ${foodImages.length} images for food: ${food.name}`);
    res.status(200).json({ message: 'Images uploaded successfully', images: food.images });
  } catch (error) {
    logger.error('Upload food images error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// Delete Food Category
const deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }

    const category = await Category.findById(id);
    if (!category || category.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to delete this category' });
    }

    const foodCount = await Food.countDocuments({ category: id });
    if (foodCount > 0) {
      return res.status(400).json({ message: 'Cannot delete category with associated food items' });
    }

    await Category.findByIdAndDelete(id);

    await logAdminAction(
      'DELETE_CATEGORY',
      'Category',
      category._id,
      `Category ${category.name} deleted for restaurant ${req.user.restaurantId}`,
      req.user.userId
    );

    console.log(`Category deleted: ${category.name}`);
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    logger.error('Delete category error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Food
const deleteFood = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid food ID' });

    const food = await Food.findById(id);
    if (!food || food.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to delete this food' });
    }

    await Food.findByIdAndDelete(id);

    await logAdminAction(
      'DELETE_FOOD',
      'Food',
      food._id,
      `Food ${food.name} deleted for restaurant ${req.user.restaurantId}`,
      req.user.userId
    );

    console.log(`Food deleted: ${food.name}`);
    res.status(200).json({ message: 'Food deleted successfully' });
  } catch (error) {
    logger.error('Delete food error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Restaurant Orders - Enhanced with better error handling
const getRestaurantOrders = async (req, res) => {
  try {
    const { status, sortBy = 'createdAt', order = 'desc', page = 1, limit = 20 } = req.query;
    
    console.log('=== getRestaurantOrders Debug Info ===');
    console.log('Request URL:', req.originalUrl);
    console.log('Query params:', req.query);
    console.log('User info:', {
      userId: req.user.userId,
      role: req.user.role,
      restaurantId: req.user.restaurantId
    });
    console.log('=====================================');

    // Authorization: Only restaurant admin or super admin
    if (req.user.role !== 'restaurant_admin' && req.user.role !== 'super_admin') {
      console.log('Authorization failed:', req.user.role);
      return res.status(403).json({ message: 'Unauthorized to access orders' });
    }

    // Get restaurant ID from JWT token
    let restaurantId = req.user.restaurantId;
    
    console.log('Initial restaurantId from token:', restaurantId);

    // Super admin can specify restaurantId via query param
    if (req.user.role === 'super_admin' && req.query.restaurantId) {
      console.log('Super admin specified restaurantId:', req.query.restaurantId);
      if (!mongoose.isValidObjectId(req.query.restaurantId)) {
        console.log('Invalid restaurantId format:', req.query.restaurantId);
        return res.status(400).json({ message: 'Invalid restaurantId format' });
      }
      restaurantId = req.query.restaurantId;
    }

    // Ensure restaurantId is a valid ObjectId
    if (!mongoose.isValidObjectId(restaurantId)) {
      console.log('restaurantId is not a valid ObjectId:', restaurantId);
      return res.status(400).json({ message: 'Invalid restaurant ID format' });
    }

    console.log('Final restaurantId to query:', restaurantId);

    // Validate restaurant exists and is active
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      console.log('Restaurant not found:', restaurantId);
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    if (!restaurant.isActive) {
      console.log('Restaurant is inactive:', restaurantId);
      return res.status(404).json({ message: 'Restaurant is inactive' });
    }

    console.log('Restaurant found:', restaurant.name, restaurant._id.toString());

    // Build query - IMPORTANT: Convert restaurantId to string to match Order model
    const query = { 
      restaurantId: restaurantId.toString() // Convert ObjectId to string to match your Order schema
    };

    console.log('Order query:', query);

    // Filter by status if provided
    if (status && ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      query.status = status;
      console.log('Added status filter:', status);
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    console.log('Pagination:', { page: pageNum, limit: limitNum, skip });

    // Get total count
    const totalOrders = await Order.countDocuments(query);
    console.log('Total orders found:', totalOrders);

    if (totalOrders === 0) {
      console.log('No orders found for this restaurant');
      return res.status(200).json({
        message: 'No orders found',
        restaurant: {
          _id: restaurant._id,
          name: restaurant.name,
          email: restaurant.email,
          phone: restaurant.phone
        },
        pagination: {
          currentPage: pageNum,
          totalPages: 0,
          totalOrders: 0,
          hasNextPage: false,
          hasPrevPage: false
        },
        revenueStats: { totalRevenue: 0, orderCount: 0 },
        orders: []
      });
    }

    // Sorting
    const sortOptions = {};
    const validSortFields = ['createdAt', 'totalAmount', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    sortOptions[sortField] = order === 'asc' ? 1 : -1;

    console.log('Sort options:', sortOptions);

    // Fetch orders with population
    const orders = await Order.find(query)
      .populate({
        path: 'userId',
        select: 'name email phone profileImage',
        match: { isDeleted: false }
      })
      .populate({
        path: 'items.productId',
        select: 'name description price image images isAvailable',
        match: { 
          restaurantId: restaurantId.toString(), // Match the string format
          isAvailable: true, 
          isDeleted: false 
        }
      })
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    console.log('Orders fetched:', orders.length);

    // Revenue stats
    const revenueStats = await Order.aggregate([
      { 
        $match: { 
          ...query,
          status: 'delivered'
        } 
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      }
    ]);

    // Enhanced orders data
    const enhancedOrders = orders.map(order => ({
      ...order,
      userDisplay: order.userId ? {
        name: order.userId.name || 'Anonymous User',
        email: order.userId.email,
        phone: order.userId.phone || 'N/A',
        profileImage: order.userId.profileImage || null
      } : {
        name: 'Anonymous User',
        email: 'N/A',
        phone: 'N/A',
        profileImage: null
      },
      estimatedDeliveryTime: order.estimatedDeliveryTime || 
        new Date(new Date(order.createdAt).getTime() + (45 * 60 * 1000)),
      items: (order.items || []).map(item => ({
        ...item,
        productDisplay: item.productId ? {
          name: item.productId.name || 'Item not available',
          description: item.productId.description || '',
          price: item.productId.price || item.price,
          image: item.productId.image || 'https://via.placeholder.com/150',
          isAvailable: item.productId.isAvailable !== false
        } : {
          name: 'Item not available',
          description: '',
          price: item.price,
          image: 'https://via.placeholder.com/150',
          isAvailable: false
        },
        subtotal: item.quantity * item.price
      })),
      totalAmount: (order.items || []).reduce((sum, item) => sum + (item.quantity * item.price), 0)
    }));

    console.log(`Orders retrieved successfully for restaurant: ${restaurant.name}`);

    // Log the action
    await logAdminAction(
      'GET_RESTAURANT_ORDERS',
      'Order',
      null,
      `Retrieved ${totalOrders} orders for restaurant ${restaurantId} (page ${page})`,
      req.user.userId
    );

    res.status(200).json({
      message: 'Orders retrieved successfully',
      restaurant: {
        _id: restaurant._id,
        name: restaurant.name,
        email: restaurant.email,
        phone: restaurant.phone
      },
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalOrders / limitNum),
        totalOrders,
        hasNextPage: skip + limitNum < totalOrders,
        hasPrevPage: pageNum > 1
      },
      revenueStats: revenueStats[0] || { totalRevenue: 0, orderCount: 0 },
      orders: enhancedOrders
    });

  } catch (error) {
    console.error('=== getRestaurantOrders ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('========================');
    
    logger.error('Get restaurant orders error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.userId,
      role: req.user?.role,
      restaurantId: req.user?.restaurantId
    });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Restaurant Orders by Restaurant ID (for super admin or specific use cases)
const getRestaurantOrdersById = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { status, sortBy = 'createdAt', order = 'desc', page = 1, limit = 20 } = req.query;

    // Validate restaurantId
    if (!mongoose.isValidObjectId(restaurantId)) {
      return res.status(400).json({ message: 'Invalid restaurantId format' });
    }

    // Check if the restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ message: 'Restaurant not found or inactive' });
    }

    // Authorization: Only super admin or restaurant admin of this restaurant
    if (req.user.role === 'super_admin') {
      // Super admin can access any restaurant
    } else if (req.user.role === 'restaurant_admin' && req.user.restaurantId.toString() !== restaurantId) {
      return res.status(403).json({ message: 'Unauthorized to access this restaurant' });
    }

    // Build query
    const query = { 
      restaurantId: restaurantId 
    };

    // Filter by status if provided
    if (status && ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      query.status = status;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalOrders = await Order.countDocuments(query);

    // Sorting
    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;

    // Fetch orders with detailed population
    const orders = await Order.find(query)
      .populate({
        path: 'userId',
        select: 'name email phone profileImage',
        match: { isDeleted: false }
      })
      .populate({
        path: 'items.productId',
        select: 'name description price image images ingredients isAvailable',
        match: { 
          restaurantId: restaurantId, 
          isAvailable: true, 
          isDeleted: false 
        }
      })
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Calculate total revenue for these orders
    const revenueStats = await Order.aggregate([
      { 
        $match: { 
          ...query,
          status: 'delivered'
        } 
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      }
    ]);

    // Enhanced order data with calculated fields
    const enhancedOrders = orders.map(order => ({
      ...order,
      userDisplay: order.userId ? {
        name: order.userId.name || 'Anonymous User',
        email: order.userId.email,
        phone: order.userId.phone || 'N/A',
        profileImage: order.userId.profileImage || null
      } : {
        name: 'Anonymous User',
        email: 'N/A',
        phone: 'N/A',
        profileImage: null
      },
      estimatedDeliveryTime: order.estimatedDeliveryTime || 
        new Date(new Date(order.createdAt).getTime() + (45 * 60 * 1000)),
      items: order.items.map(item => ({
        ...item,
        productDisplay: item.productId ? {
          name: item.productId.name || 'Item not available',
          description: item.productId.description || '',
          price: item.productId.price || item.price,
          image: item.productId.image || 'https://via.placeholder.com/150',
          isAvailable: item.productId.isAvailable !== false
        } : {
          name: 'Item not available',
          description: '',
          price: item.price,
          image: 'https://via.placeholder.com/150',
          isAvailable: false
        },
        subtotal: item.quantity * item.price
      })),
      totalAmount: order.items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    }));

    console.log(`Orders retrieved for restaurant: ${restaurantId}, page: ${page}, limit: ${limit}, total: ${totalOrders}`);

    await logAdminAction(
      'GET_RESTAURANT_ORDERS_BY_ID',
      'Order',
      null,
      `Retrieved ${totalOrders} orders for restaurant ${restaurantId} (page ${page})`,
      req.user.userId
    );

    res.status(200).json({
      message: 'Orders retrieved successfully',
      restaurant: {
        _id: restaurant._id,
        name: restaurant.name,
        email: restaurant.email,
        phone: restaurant.phone
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOrders / parseInt(limit)),
        totalOrders,
        hasNextPage: skip + parseInt(limit) < totalOrders,
        hasPrevPage: parseInt(page) > 1
      },
      revenueStats: revenueStats[0] || { totalRevenue: 0, orderCount: 0 },
      orders: enhancedOrders
    });

  } catch (error) {
    logger.error('Get restaurant orders by ID error', { 
      error: error.message, 
      stack: error.stack,
      restaurantId: req.params.restaurantId 
    });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Accept Order
const acceptOrder = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid order ID' });

    const order = await Order.findById(id);
    if (!order || order.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to accept this order' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Order must be in pending status to accept' });
    }

    order.status = 'processing';
    await order.save();

    await logAdminAction(
      'ACCEPT_ORDER',
      'Order',
      order._id,
      `Order ${order.orderId} accepted for restaurant ${req.user.restaurantId}`,
      req.user.userId
    );

    console.log(`Order accepted: ${order.orderId}`);
    res.status(200).json({ message: 'Order accepted successfully', order });
  } catch (error) {
    logger.error('Accept order error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reject Order
const rejectOrder = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid order ID' });
    if (!reason) return res.status(400).json({ message: 'Reason is required for rejection' });

    const order = await Order.findById(id);
    if (!order || order.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to reject this order' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Order must be in pending status to reject' });
    }

    order.status = 'cancelled';
    order.reason = reason;
    await order.save();

    await logAdminAction(
      'REJECT_ORDER',
      'Order',
      order._id,
      `Order ${order.orderId} rejected for restaurant ${req.user.restaurantId} with reason: ${reason}`,
      req.user.userId
    );

    console.log(`Order rejected: ${order.orderId}`);
    res.status(200).json({ message: 'Order rejected successfully', order });
  } catch (error) {
    logger.error('Reject order error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Restaurant Order Status
const updateRestaurantOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  try {
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid order ID' });
    if (!status || !['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    if (status === 'cancelled' && !reason) return res.status(400).json({ message: 'Reason is required for cancellation' });

    const order = await Order.findById(id);
    if (!order || order.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to update this order' });
    }

    order.status = status;
    if (status === 'cancelled') order.reason = reason;
    await order.save();

    await logAdminAction(
      'UPDATE_ORDER_STATUS',
      'Order',
      order._id,
      `Order ${order.orderId} status updated to ${status} for restaurant ${req.user.restaurantId}`,
      req.user.userId
    );

    console.log(`Order status updated: ${order.orderId} to ${status}`);
    res.status(200).json({ message: 'Order status updated successfully', order });
  } catch (error) {
    logger.error('Update restaurant order status error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Restaurant Analytics (ENHANCED with totalFoodCost and category breakdown)
const getRestaurantAnalytics = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query; // 'daily', 'monthly', '6months'
    const endDate = new Date();
    let startDate = new Date();
    if (period === 'daily') {
      startDate.setDate(startDate.getDate() - 1);
    } else if (period === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate.setMonth(startDate.getMonth() - 6);
    }

    // Match filter
    const matchFilter = {
      restaurantId: new mongoose.Types.ObjectId(req.user.restaurantId),
      createdAt: { $gte: startDate, $lte: endDate }
    };

    const [orderStats, revenueStats, expenseStats, topFoods, foodCostStats] = await Promise.all([
      // Order stats
      Order.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            pendingOrders: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            deliveredOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
          }
        }
      ]),
      // Revenue (only delivered)
      Order.aggregate([
        { $match: { ...matchFilter, status: 'delivered' } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            averageOrderValue: { $avg: '$totalAmount' }
          }
        }
      ]),
      // Expenses (for balance)
      Expense.aggregate([
        { $match: { ...matchFilter, restaurantId: new mongoose.Types.ObjectId(req.user.restaurantId) } },
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: '$amount' },
            avgExpense: { $avg: '$amount' }
          }
        }
      ]),
      // Top demanded foods (most sold)
      Order.aggregate([
        { $match: matchFilter },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            totalSold: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'foods',
            localField: '_id',
            foreignField: '_id',
            as: 'food'
          }
        },
        { $unwind: { path: '$food', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            name: { $ifNull: ['$food.name', 'Unknown'] },
            totalSold: 1,
            totalRevenue: 1
          }
        }
      ]),
      // NEW: Food cost stats (sum costPrice for active foods)
      Food.aggregate([
        { $match: { 
          restaurantId: new mongoose.Types.ObjectId(req.user.restaurantId), 
          isAvailable: true,
          isDeleted: false 
        } },
        {
          $facet: {
            overall: [
              {
                $group: {
                  _id: null,
                  totalFoodCost: { $sum: '$costPrice' },
                  avgFoodCost: { $avg: '$costPrice' }
                }
              }
            ],
            byCategory: [
              {
                $group: {
                  _id: '$category',
                  totalCost: { $sum: '$costPrice' },
                  foodCount: { $sum: 1 }
                }
              },
              { $sort: { totalCost: -1 } }
            ]
          }
        }
      ])
    ]);

    // Calculate balance
    const totalRevenue = revenueStats[0]?.totalRevenue || 0;
    const totalExpenses = expenseStats[0]?.totalExpenses || 0;
    const totalFoodCost = foodCostStats[0]?.overall[0]?.totalFoodCost || 0;
    const balance = totalRevenue - (totalExpenses + totalFoodCost);

    console.log(`Enhanced analytics retrieved for restaurant: ${req.user.restaurantId}, period: ${period}`);
    res.status(200).json({
      message: 'Analytics retrieved successfully',
      analytics: {
        period,
        orders: orderStats[0] || { totalOrders: 0, pendingOrders: 0, deliveredOrders: 0, cancelledOrders: 0 },
        revenue: revenueStats[0] || { totalRevenue: 0, averageOrderValue: 0 },
        expenses: {
          ...(expenseStats[0] || { totalExpenses: 0, avgExpense: 0 }),
          totalFoodCost, // NEW: Automated
          byCategory: foodCostStats[0]?.byCategory || [] // NEW: Per category
        },
        balance: { 
          current: balance, 
          revenue: totalRevenue, 
          totalExpenses: totalExpenses + totalFoodCost,
          breakdown: { manual: totalExpenses, food: totalFoodCost }
        },
        topDemandedFoods: topFoods
      }
    });
  } catch (error) {
    logger.error('Get restaurant analytics error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// New: Versatile Reports (ENHANCED with foodCosts type and totalFoodCost in balance)
const getReports = async (req, res) => {
  try {
    const { type = 'sales', period = 'daily', startDate, endDate } = req.query;
    const restaurantId = req.user.restaurantId;

    let matchFilter = { restaurantId: new mongoose.Types.ObjectId(restaurantId) };
    if (startDate && endDate) {
      matchFilter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (period === 'daily') {
      const today = new Date();
      matchFilter.createdAt = {
        $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        $lte: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      };
    } else if (period === 'monthly') {
      const today = new Date();
      matchFilter.createdAt = {
        $gte: new Date(today.getFullYear(), today.getMonth(), 1),
        $lte: new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)
      };
    }

    let reportData;
    switch (type) {
      case 'sales':
        reportData = await Order.aggregate([
          { $match: { ...matchFilter, status: 'delivered' } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              totalSales: { $sum: '$totalAmount' },
              orderCount: { $sum: 1 },
              items: { $push: '$items' }
            }
          },
          { $sort: { _id: -1 } }
        ]);
        break;
      case 'topFoods':
        reportData = await Order.aggregate([
          { $match: matchFilter },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.productId',
              name: { $first: '$items.productName' }, // Assume you store productName in items
              totalSold: { $sum: '$items.quantity' },
              totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
            }
          },
          { $sort: { totalSold: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: 'foods',
              localField: '_id',
              foreignField: '_id',
              pipeline: [{ $project: { name: 1 } }],
              as: 'food'
            }
          },
          { $unwind: { path: '$food', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              name: { $ifNull: ['$food.name', '$name'] },
              totalSold: 1,
              totalRevenue: 1
            }
          }
        ]);
        break;
      case 'balance':
        const [revenue, expenses, foodCostAgg] = await Promise.all([
          Order.aggregate([
            { $match: { ...matchFilter, status: 'delivered' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
          ]),
          Expense.aggregate([
            { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId), createdAt: matchFilter.createdAt } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ]),
          Food.aggregate([
            { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId), isAvailable: true } },
            { $group: { _id: null, totalFoodCost: { $sum: '$costPrice' } } }
          ])
        ]);
        const totalFoodCost = foodCostAgg[0]?.totalFoodCost || 0;
        reportData = {
          revenue: revenue[0]?.total || 0,
          expenses: expenses[0]?.total || 0,
          totalFoodCost, // NEW
          balance: (revenue[0]?.total || 0) - (expenses[0]?.total || 0 + totalFoodCost),
          details: { 
            todaySpends: 0 // FIXED: Calculate if needed, e.g., sum today's expenses
          }
        };
        break;
      case 'foodCosts': // NEW: Summed food costs per category
        reportData = await Food.aggregate([
          { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId), isAvailable: true } },
          {
            $group: {
              _id: '$category',
              totalCost: { $sum: '$costPrice' },
              foodCount: { $sum: 1 },
              foods: { $push: { name: '$name', cost: '$costPrice' } }
            }
          },
          { $sort: { totalCost: -1 } }
        ]);
        break;
      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }

    await logAdminAction(
      'GET_REPORT',
      'Report',
      null,
      `Generated ${type} report for period ${period}`,
      req.user.userId
    );

    res.status(200).json({
      message: `Report generated successfully`,
      type,
      period,
      data: reportData
    });
  } catch (error) {
    logger.error('Get reports error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// New: Add Expense (for balancing/spends) - unchanged
const addExpense = async (req, res) => {
  try {
    const { type, description, amount, category } = req.body;

    if (!type || !description || amount <= 0) {
      return res.status(400).json({ message: 'Invalid expense data' });
    }

    const expense = new Expense({
      restaurantId: req.user.restaurantId,
      type,
      description,
      amount,
      category,
      createdBy: req.user.userId
    });

    await expense.save();

    await logAdminAction(
      'ADD_EXPENSE',
      'Expense',
      expense._id,
      `Added expense: ${description} for ${amount}`,
      req.user.userId
    );

    console.log(`Expense added: ${description}`);
    res.status(201).json({ message: 'Expense added successfully', expense });
  } catch (error) {
    logger.error('Add expense error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// New: Get Expenses (for balance details) - unchanged
const getExpenses = async (req, res) => {
  try {
    const { period = 'daily', startDate, endDate } = req.query;
    let filter = { restaurantId: req.user.restaurantId };

    // Similar date filtering as in getReports
    if (period === 'daily') {
      const today = new Date();
      filter.date = {
        $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        $lte: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      };
    } // Add monthly/custom similarly

    const expenses = await Expense.find(filter).sort({ date: -1 }).lean();

    res.status(200).json({
      message: 'Expenses retrieved successfully',
      count: expenses.length,
      expenses
    });
  } catch (error) {
    logger.error('Get expenses error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// New: Download Report as CSV - unchanged
const downloadReport = async (req, res) => {
  try {
    const { type, period, startDate, endDate } = req.query;
    // Call getReports internally, but set format='csv'
    req.query.format = 'csv';
    const reportResponse = await getReports(req, res); // This would need adjustment to return data only

    // Simulate: Get data from getReports (in practice, extract data)
    // For demo, assume reportData is fetched here
    const reportData = []; // Replace with actual data from getReports

    const csv = parse(reportData, { fields: Object.keys(reportData[0] || {}) });
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="restaurant-report-${type}-${period}.csv"`
    });
    res.status(200).send(csv);
  } catch (error) {
    logger.error('Download report error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// Get All Categories (UPDATED: Now includes image and images fields)
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      restaurantId: req.user.restaurantId,
      isActive: true,
    }).select('name image images createdAt');

    console.log(`Categories retrieved for restaurant: ${req.user.restaurantId}`);
    res.status(200).json({
      message: 'Categories retrieved successfully',
      count: categories.length,
      categories,
    });
  } catch (error) {
    logger.error('Get categories error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// At the end of restaurantAdminController.js (or restaurantOwnerAdminController.js), update module.exports
module.exports = {
  signinRestaurantAdmin,
  getRestaurantDetails,
  updateRestaurant,
  addCategory,
  updateCategory,
  deleteCategory,
  addFood,
  getAllCategories,
  updateFood,
  deleteFood,
  getRestaurantOrders,
  getRestaurantOrdersById,
  acceptOrder,
  rejectOrder,
  updateRestaurantOrderStatus,
  getRestaurantAnalytics, // Enhanced
  getReports,
  addExpense,
  getExpenses,
  downloadReport,  
  uploadRestaurantImages,
  uploadFoodImages,
  addDiscountToFood, // NEW
  removeDiscountFromFood, // NEW
  uploadCategoryImages, // NEW: Add this line
};