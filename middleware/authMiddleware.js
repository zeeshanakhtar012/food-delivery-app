const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET;

module.exports = async (req, res, next) => {
  try {
    console.log('Auth middleware: Checking for Authorization header');
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      console.log('Auth middleware: No token provided');
      return res.status(401).json({ message: 'No token provided' });
    }

    console.log('Auth middleware: Verifying token');
    const decoded = jwt.verify(token, jwtSecret);
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      isAdmin: decoded.isAdmin,
      restaurantId: decoded.restaurantId,
    };
    console.log('Auth middleware: Token verified, user:', req.user);
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ message: 'Invalid token' });
  }
};