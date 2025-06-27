const winston = require('winston');

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

module.exports = (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    if (req.user.role === 'admin' && !req.user.restaurantId) {
      return res.status(403).json({ message: 'No restaurant assigned to admin' });
    }
    next();
  } catch (error) {
    logger.error('Admin middleware error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};