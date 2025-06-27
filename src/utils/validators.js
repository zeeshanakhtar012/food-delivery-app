const mongoose = require('mongoose');

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePhone = (phone) => {
  const re = /^\+?[\d\s-]{10,}$/;
  return re.test(phone);
};

const validateMongoId = (id) => {
  return mongoose.isValidObjectId(id);
};

const validateFoodInput = ({ name, description, category, price, restaurantId, city }) => {
  const errors = [];
  if (!name || name.length < 2) errors.push('Name must be at least 2 characters');
  if (!description || description.length < 10) errors.push('Description must be at least 10 characters');
  if (!category || !validateMongoId(category)) errors.push('Valid category ID is required');
  if (!price || price <= 0) errors.push('Price must be greater than 0');
  if (!restaurantId || !validateMongoId(restaurantId)) errors.push('Valid restaurant ID is required');
  if (!city) errors.push('City is required');
  return errors;
};

const validateUserInput = ({ name, email, password, phone }) => {
  const errors = [];
  if (!name || name.length < 2) errors.push('Name must be at least 2 characters');
  if (!email || !validateEmail(email)) errors.push('Valid email is required');
  if (!password || password.length < 6) errors.push('Password must be at least 6 characters');
  if (!phone || !validatePhone(phone)) errors.push('Valid phone number is required');
  return errors;
};

module.exports = {
  validateEmail,
  validatePhone,
  validateMongoId,
  validateFoodInput,
  validateUserInput
};