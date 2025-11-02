// middleware/restaurantGuard.js
const { errorResponse } = require('../helpers/response');

module.exports = (req, res, next) => {
  // This guard is ONLY for routes that need a restaurant
  if (!req.user || !req.user.restaurant_id) {
    return errorResponse(res, 'Restaurant access error: No restaurant assigned', 403);
  }
  next();
};