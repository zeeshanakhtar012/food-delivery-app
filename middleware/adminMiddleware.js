const AppUser = require('../models/AppUser');

module.exports = async (req, res, next) => {
  try {
    const user = await AppUser.findById(req.user.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  } catch (error) {
    console.error('Admin middleware error:', error.message);
    return res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};